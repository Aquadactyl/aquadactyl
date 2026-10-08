import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, Play, RotateCw, Square, Terminal } from 'lucide-react';
import { Server } from '@/api/server/getServer';
import sendServerPowerAction, { PowerAction } from '@/api/server/sendServerPowerAction';
import { httpErrorToHuman } from '@/api/http';

interface Props {
    server: Server;
    state: string;
    onPower: (action: PowerAction) => void;
    onRefresh: () => void;
}
export default ({ server, state, onPower, onRefresh }: Props) => {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const permissions = server.userPermissions || [];
    const can = (permission: string) => permissions.includes('*') || permissions.includes(permission);
    const blocked = !['running', 'offline', 'starting'].includes(state) || pending;
    const act = async (action: PowerAction) => {
        setPending(true);
        setError('');
        try {
            await sendServerPowerAction(server.uuid, action);
            onPower(action);
        } catch (error) {
            setError(httpErrorToHuman(error));
        } finally {
            setPending(false);
            onRefresh();
        }
    };
    if (!['websocket.connect', 'file.read', 'control.start', 'control.restart', 'control.stop'].some(can)) return null;
    return (
        <div className={'server-quick-area'}>
            <div className={'server-quick-actions'} aria-label={'Quick actions for ' + server.name}>
                {can('websocket.connect') && (
                    <Link to={'/server/' + server.id} className={'server-quick-link'}>
                        <Terminal size={14} aria-hidden />
                        Console
                    </Link>
                )}
                {can('file.read') && (
                    <Link to={'/server/' + server.id + '/files'} className={'server-quick-link'}>
                        <Folder size={14} aria-hidden />
                        Files
                    </Link>
                )}
                <div className={'server-quick-power'}>
                    {can('control.start') && (
                        <button
                            type={'button'}
                            aria-label={'Start ' + server.name}
                            title={'Start server'}
                            disabled={blocked || state !== 'offline'}
                            onClick={() => act('start')}
                        >
                            <Play size={14} aria-hidden />
                            Start
                        </button>
                    )}
                    {can('control.restart') && (
                        <button
                            type={'button'}
                            aria-label={'Restart ' + server.name}
                            title={'Restart server'}
                            disabled={blocked || state !== 'running'}
                            onClick={() => act('restart')}
                        >
                            <RotateCw size={14} aria-hidden />
                            Restart
                        </button>
                    )}
                    {can('control.stop') && (
                        <button
                            type={'button'}
                            aria-label={'Stop ' + server.name}
                            title={'Stop server'}
                            disabled={blocked || state === 'offline'}
                            className={'server-quick-stop'}
                            onClick={() => act('stop')}
                        >
                            <Square size={14} aria-hidden />
                            Stop
                        </button>
                    )}
                </div>
            </div>
            {error && (
                <p className={'server-quick-error'} role={'alert'}>
                    {error}
                </p>
            )}
        </div>
    );
};
