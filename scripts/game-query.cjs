const { GameDig } = require('gamedig');

const finish = (result) => {
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
};
const failed = () => finish({ status: 'unavailable' });
const timer = setTimeout(failed, 5000);
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
    input += chunk;
    if (input.length > 4096) failed();
});
process.stdin.on('end', async () => {
    try {
        const target = JSON.parse(input);
        if (
            typeof target.type !== 'string' ||
            typeof target.host !== 'string' ||
            !Number.isInteger(target.port) ||
            target.port < 1 ||
            target.port > 65535
        )
            return failed();
        const result = await GameDig.query({
            type: target.type,
            host: target.host,
            port: target.port,
            givenPortOnly: target.givenPortOnly === true,
            maxRetries: 0,
            socketTimeout: 1000,
            attemptTimeout: 3000,
            requestPlayers: false,
            requestRules: false,
            portCache: false,
        });
        clearTimeout(timer);
        finish({ status: 'available', players: result.numplayers, max_players: result.maxplayers });
    } catch {
        failed();
    }
});
