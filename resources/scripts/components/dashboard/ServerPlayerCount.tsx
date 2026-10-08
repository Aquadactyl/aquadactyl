import React, { useRef, useState } from 'react';
import useSWR from 'swr';
import { Users } from 'lucide-react';
import getGameQuery from '@/api/server/getGameQuery';
import { Server } from '@/api/server/getServer';

export default ({ server, state }: { server: Server; state: string }) => {
    const running = state === 'running';
    const pendingPolls = useRef(0);
    const [refreshInterval, setRefreshInterval] = useState(30000);
    const { data, error } = useSWR(
        running && server.gameQueryType ? ['game-query', server.uuid, server.gameQueryType] : null,
        () => getGameQuery(server.uuid),
        {
            refreshInterval,
            revalidateOnFocus: false,
            errorRetryInterval: 30000,
            onSuccess: (result) => {
                setRefreshInterval(result.status === 'pending' && pendingPolls.current++ === 0 ? 5000 : 30000);
            },
        }
    );
    if (!server.gameQueryType) return null;
    const value = !running
        ? state === 'offline'
            ? 'Offline'
            : state === 'starting'
            ? 'Starting...'
            : 'Unavailable'
        : error || data?.status === 'unavailable' || data?.status === 'unsupported'
        ? 'Unavailable'
        : data?.status === 'available'
        ? String(data.players) + (data.maxPlayers ? ' / ' + data.maxPlayers : '')
        : 'Checking...';
    const description = !running
        ? 'Player counts are queried while the server is running.'
        : error || data?.status === 'unavailable' || data?.status === 'unsupported'
        ? 'The game did not respond. Check the game query settings and query port.'
        : data?.checkedAt
        ? 'Last checked ' + data.checkedAt.toLocaleTimeString()
        : 'Waiting for the game query.';
    return (
        <span className={'server-player-count'} title={description} aria-label={'Players: ' + value}>
            <Users size={12} aria-hidden />
            <span>Players</span>
            <strong>{value}</strong>
        </span>
    );
};
