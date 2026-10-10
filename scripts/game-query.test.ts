import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import dgram from 'node:dgram';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QueryOptions {
    type: string;
    port: number;
    host?: string;
    givenPortOnly?: boolean;
}

const query = (target: QueryOptions): Promise<any> =>
    new Promise((resolve, reject) => {
        const tsxCli = path.resolve(__dirname, '../node_modules/tsx/dist/cli.mjs');
        const scriptPath = path.join(__dirname, 'game-query.ts');
        const child = spawn(process.execPath, [tsxCli, scriptPath]);
        let output = '';
        child.stdout.on('data', (chunk) => {
            output += chunk;
        });
        child.on('error', reject);
        child.on('close', (code) => {
            try {
                assert.equal(code, 0);
                resolve(JSON.parse(output));
            } catch (error) {
                reject(error);
            }
        });
        child.stdin.end(JSON.stringify({ host: '127.0.0.1', givenPortOnly: true, ...target }));
    });

const varint = (number: number): Buffer => {
    const bytes: number[] = [];
    do {
        let byte = number & 127;
        number >>>= 7;
        if (number) byte |= 128;
        bytes.push(byte);
    } while (number);
    return Buffer.from(bytes);
};

test('Minecraft Java status counts include a legitimately empty server', async () => {
    for (const online of [7, 0]) {
        const sockets = new Set<net.Socket>();
        const server = net.createServer((socket) => {
            sockets.add(socket);
            socket.on('close', () => sockets.delete(socket));
            // A status response can be sent after receiving the handshake.
            socket.once('data', () => {
                const json = Buffer.from(
                    JSON.stringify({
                        version: { name: 'Fixture', protocol: 47 },
                        players: { online, max: 20 },
                        description: { text: 'Query test' },
                    })
                );
                const packet = Buffer.concat([Buffer.from([0]), varint(json.length), json]);
                socket.write(Buffer.concat([varint(packet.length), packet]));
            });
            socket.on('error', () => {});
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
        try {
            assert.deepEqual(await query({ type: 'protocol-minecraftvanilla', port: (server.address() as net.AddressInfo).port }), {
                status: 'available',
                players: online,
                max_players: 20,
            });
        } finally {
            for (const socket of sockets) socket.destroy();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    }
});

test('Minecraft Bedrock ping reads its advertised player counts', async () => {
    const server = dgram.createSocket('udp4');
    server.on('message', (message, remote) => {
        assert.equal(message[0], 0x01);
        const status = Buffer.from('MCPE;Fixture;685;1.21;3;10;1;test;Survival;1;19132;19133;');
        const length = Buffer.alloc(2);
        length.writeUInt16BE(status.length);
        server.send(
            Buffer.concat([
                Buffer.from([0x1c]),
                message.subarray(1, 9),
                Buffer.alloc(8),
                message.subarray(9, 25),
                length,
                status,
            ]),
            remote.port,
            remote.address
        );
    });
    await new Promise<void>((resolve) => server.bind(0, '127.0.0.1', () => resolve()));
    try {
        assert.deepEqual(await query({ type: 'protocol-minecraftbedrock', port: server.address().port }), {
            status: 'available',
            players: 3,
            max_players: 10,
        });
    } finally {
        server.close();
    }
});

test('Source A2S_INFO reads counts without requesting player names', async () => {
    const server = dgram.createSocket('udp4');
    let requests = 0;
    server.on('message', (message, remote) => {
        requests++;
        assert.equal(message[4], 0x54, 'Only the A2S_INFO request should be sent');
        const cstring = (text: string) => Buffer.from(text + '\0');
        const appid = Buffer.alloc(2);
        appid.writeUInt16LE(440);
        const response = Buffer.concat([
            Buffer.from([255, 255, 255, 255, 0x49, 17]),
            cstring('Fixture'),
            cstring('test_map'),
            cstring('tf'),
            cstring('Team Fortress'),
            appid,
            Buffer.from([5, 24, 0, 100, 108, 0, 1]),
            cstring('1.0'),
            Buffer.from([0]),
        ]);
        server.send(response, remote.port, remote.address);
    });
    await new Promise<void>((resolve) => server.bind(0, '127.0.0.1', () => resolve()));
    try {
        assert.deepEqual(await query({ type: 'protocol-valve', port: server.address().port }), {
            status: 'available',
            players: 5,
            max_players: 24,
        });
        assert.equal(requests, 1);
    } finally {
        server.close();
    }
});

test('Unreachable games return unavailable within the timeout', async () => {
    const started = Date.now();
    assert.deepEqual(await query({ type: 'protocol-minecraftvanilla', port: 1 }), { status: 'unavailable' });
    assert.ok(Date.now() - started < 6000);
});

test('Invalid targets cannot initiate a query', async () => {
    assert.deepEqual(await query({ type: 'protocol-valve', port: -1 }), { status: 'unavailable' });
});

test('A silent UDP game cannot leave the runner waiting indefinitely', async () => {
    const server = dgram.createSocket('udp4');
    await new Promise<void>((resolve) => server.bind(0, '127.0.0.1', () => resolve()));
    const started = Date.now();
    try {
        assert.deepEqual(await query({ type: 'protocol-valve', port: server.address().port }), {
            status: 'unavailable',
        });
        assert.ok(Date.now() - started < 6000);
    } finally {
        server.close();
    }
});

