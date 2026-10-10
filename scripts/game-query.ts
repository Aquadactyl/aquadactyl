import { GameDig } from 'gamedig';

interface QueryTarget {
    type: string;
    host: string;
    port: number;
    givenPortOnly?: boolean;
}

interface QueryResultAvailable {
    status: 'available';
    players: number;
    max_players: number;
}

interface QueryResultUnavailable {
    status: 'unavailable';
}

type QueryResult = QueryResultAvailable | QueryResultUnavailable;

const finish = (result: QueryResult): void => {
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
};

const failed = (): void => finish({ status: 'unavailable' });

const timer = setTimeout(failed, 5000);

let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk: string) => {
    input += chunk;
    if (input.length > 4096) failed();
});

process.stdin.on('end', async () => {
    try {
        const target: unknown = JSON.parse(input);
        if (
            typeof target !== 'object' ||
            target === null ||
            typeof (target as QueryTarget).type !== 'string' ||
            typeof (target as QueryTarget).host !== 'string' ||
            !Number.isInteger((target as QueryTarget).port) ||
            (target as QueryTarget).port < 1 ||
            (target as QueryTarget).port > 65535
        ) {
            return failed();
        }

        const validTarget = target as QueryTarget;

        const result = await GameDig.query({
            type: validTarget.type,
            host: validTarget.host,
            port: validTarget.port,
            givenPortOnly: validTarget.givenPortOnly === true,
            maxRetries: 0,
            socketTimeout: 1000,
            attemptTimeout: 3000,
            requestPlayers: false,
            requestRules: false,
            portCache: false,
        });

        clearTimeout(timer);
        finish({
            status: 'available',
            players: result.numplayers,
            max_players: result.maxplayers,
        });
    } catch {
        failed();
    }
});

