import SensitiveValue from '@/components/elements/SensitiveValue';
import React, { useEffect, useState } from 'react';
import { ArrowRight, Cpu, HardDrive, MemoryStick, Network, Server as ServerIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Server } from '@/api/server/getServer';
import getServerResourceUsage, { ServerStats } from '@/api/server/getServerResourceUsage';
import { bytesToString, ip, mbToBytes } from '@/lib/formatters';

import BeforeEntryName from '@blueprint/components/Dashboard/Serverlist/ServerRow/BeforeEntryName';
import AfterEntryName from '@blueprint/components/Dashboard/Serverlist/ServerRow/AfterEntryName';
import BeforeEntryDescription from '@blueprint/components/Dashboard/Serverlist/ServerRow/BeforeEntryDescription';
import AfterEntryDescription from '@blueprint/components/Dashboard/Serverlist/ServerRow/AfterEntryDescription';
import ResourceLimits from '@blueprint/components/Dashboard/Serverlist/ServerRow/ResourceLimits';

const isAlarmState = (current: number, limit: number): boolean => limit > 0 && current / mbToBytes(limit) >= 0.9;

export default ({ server, className }: { server: Server; className?: string }) => {
    const [stats, setStats] = useState<ServerStats | null>(null);
    const [unavailable, setUnavailable] = useState(false);
    const isSuspended = server.status === 'suspended' || !!stats?.isSuspended;

    useEffect(() => {
        if (isSuspended || server.isNodeUnderMaintenance) return;
        let active = true;
        const getStats = () => {
            getServerResourceUsage(server.uuid)
                .then((data) => {
                    if (active) {
                        setStats(data);
                        setUnavailable(false);
                    }
                })
                .catch(() => {
                    if (active) {
                        setStats(null);
                        setUnavailable(true);
                    }
                });
        };
        getStats();
        const timer = setInterval(getStats, 30000);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [server.uuid, isSuspended, server.isNodeUnderMaintenance]);

    const allocation = server.allocations.find((allocation) => allocation.isDefault);
    const address = allocation
        ? (allocation.alias || ip(allocation.ip)) + ':' + allocation.port
        : 'No address assigned';
    const state = isSuspended
        ? 'suspended'
        : server.isNodeUnderMaintenance
        ? 'maintenance'
        : server.isTransferring
        ? 'transferring'
        : server.status
        ? server.status
        : unavailable
        ? 'unavailable'
        : stats?.status || 'loading';
    const statusLabels: Record<string, string> = {
        suspended: 'Suspended',
        maintenance: 'Maintenance',
        transferring: 'Transferring',
        installing: 'Installing',
        install_failed: 'Install failed',
        restoring_backup: 'Restoring',
        unavailable: 'Unavailable',
        running: 'Running',
        offline: 'Offline',
        starting: 'Starting',
        stopping: 'Stopping',
        loading: 'Connecting',
    };
    const showStats =
        stats && !isSuspended && !server.isNodeUnderMaintenance && !server.status && !server.isTransferring;
    const resources = [
        {
            label: 'CPU',
            icon: Cpu,
            value: showStats ? stats.cpuUsagePercent.toFixed(1) + '%' : '—',
            limit: server.limits.cpu ? server.limits.cpu + '%' : 'Unlimited',
            alarm: !!showStats && server.limits.cpu > 0 && stats.cpuUsagePercent >= server.limits.cpu * 0.9,
        },
        {
            label: 'Memory',
            icon: MemoryStick,
            value: showStats ? bytesToString(stats.memoryUsageInBytes) : '—',
            limit: server.limits.memory ? bytesToString(mbToBytes(server.limits.memory)) : 'Unlimited',
            alarm: !!showStats && isAlarmState(stats.memoryUsageInBytes, server.limits.memory),
        },
        {
            label: 'Disk',
            icon: HardDrive,
            value: showStats ? bytesToString(stats.diskUsageInBytes) : '—',
            limit: server.limits.disk ? bytesToString(mbToBytes(server.limits.disk)) : 'Unlimited',
            alarm: !!showStats && isAlarmState(stats.diskUsageInBytes, server.limits.disk),
        },
    ];

    return (
        <Link to={'/server/' + server.id} className={'server-row' + (className ? ' ' + className : '')}>
            <div className={'server-identity'}>
                <div className={'server-row-icon'}>
                    <ServerIcon size={20} aria-hidden />
                </div>
                <div className={'server-identity-copy'}>
                    <BeforeEntryName />
                    <p className={'server-row-name'}>{server.name}</p>
                    <AfterEntryName />
                    {!!server.description && (
                        <div>
                            <BeforeEntryDescription />
                            <p className={'server-row-description'}>{server.description}</p>
                            <AfterEntryDescription />
                        </div>
                    )}
                    <span className={'server-address'}>
                        <Network size={12} aria-hidden />
                        <SensitiveValue>{address}</SensitiveValue>
                    </span>
                </div>
            </div>
            <div className={'server-resources'}>
                {resources.map(({ label, icon: Icon, value, limit, alarm }) => (
                    <div key={label} className={alarm ? 'server-resource-alarm' : undefined}>
                        <span className={'server-resource-label'}>
                            <Icon size={12} aria-hidden /> {label}
                        </span>
                        <span className={'server-resource-value'}>{value}</span>
                        <span className={'server-resource-limit'}>{limit === 'Unlimited' ? limit : 'of ' + limit}</span>
                    </div>
                ))}
                {showStats && <ResourceLimits />}
            </div>
            <span className={'server-state'} data-state={state}>
                {statusLabels[state] || 'Unavailable'}
            </span>
            <ArrowRight className={'server-row-arrow'} size={16} aria-hidden />
        </Link>
    );
};
