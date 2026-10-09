import React, { useEffect, useMemo, useState } from 'react';
import Select from '@/components/elements/Select';
import Input from '@/components/elements/Input';
import { X } from 'lucide-react';
import { activityCategory, activityEventLabel } from './events';

interface Props {
    events: string[];
    hash: Record<string, string>;
    hasFilters: boolean;
    onChange: (values: Record<string, string | undefined>) => void;
    onClear: () => void;
}
export default ({ events, hash, hasFilters, onChange, onClear }: Props) => {
    const [ip, setIp] = useState(hash.ip || '');
    useEffect(() => setIp(hash.ip || ''), [hash.ip]);
    const groups = useMemo(() => {
        const values = new Map<string, { label: string; events: string[] }>();
        events.forEach((event) => {
            const category = activityCategory(event);
            const group = values.get(category.prefix) || { label: category.label, events: [] };
            group.events.push(event);
            values.set(category.prefix, group);
        });
        return Array.from(values.entries()).sort((a, b) => a[1].label.localeCompare(b[1].label));
    }, [events]);
    const eventValue = hash.event_exact ? `event:${hash.event_exact}` : hash.event ? `category:${hash.event}` : '';
    const knownValue = groups.some(
        ([prefix, group]) =>
            eventValue === `category:${prefix}` || group.events.some((event) => eventValue === `event:${event}`),
    );
    return (
        <section className={'activity-filters'} aria-label={'Activity filters'}>
            <div className={'activity-filter-grid'}>
                <label className={'activity-filter-event'}>
                    <span>Event type</span>
                    <Select
                        aria-label={'Event type'}
                        value={eventValue}
                        onChange={(event) => {
                            const value = event.currentTarget.value;
                            onChange({
                                event: value.startsWith('category:') ? value.slice(9) : undefined,
                                event_exact: value.startsWith('event:') ? value.slice(6) : undefined,
                            });
                        }}
                    >
                        <option value={''}>All activity</option>
                        {eventValue && !knownValue && (
                            <option value={eventValue}>{activityEventLabel(hash.event_exact || hash.event)}</option>
                        )}
                        {groups.map(([prefix, group]) => (
                            <optgroup key={prefix} label={group.label}>
                                <option value={`category:${prefix}`}>All {group.label.toLowerCase()} activity</option>
                                {group.events.map((event) => (
                                    <option key={event} value={`event:${event}`}>
                                        {activityEventLabel(event)}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </Select>
                </label>
                <label>
                    <span>Time range</span>
                    <Select
                        aria-label={'Time range'}
                        value={hash.period || ''}
                        onChange={(event) => onChange({ period: event.currentTarget.value || undefined })}
                    >
                        <option value={''}>All time</option>
                        <option value={'24h'}>Last 24 hours</option>
                        <option value={'7d'}>Last 7 days</option>
                        <option value={'30d'}>Last 30 days</option>
                        <option value={'90d'}>Last 90 days</option>
                    </Select>
                </label>
                <label>
                    <span>Source</span>
                    <Select
                        aria-label={'Source'}
                        value={hash.source || ''}
                        onChange={(event) => onChange({ source: event.currentTarget.value || undefined })}
                    >
                        <option value={''}>All sources</option>
                        <option value={'web'}>Panel</option>
                        <option value={'api'}>API</option>
                        <option value={'sftp'}>SFTP</option>
                        <option value={'system'}>System</option>
                    </Select>
                </label>
                <label>
                    <span>Order</span>
                    <Select
                        aria-label={'Order'}
                        value={hash.sort || ''}
                        onChange={(event) => onChange({ sort: event.currentTarget.value || undefined })}
                    >
                        <option value={''}>Newest first</option>
                        <option value={'oldest'}>Oldest first</option>
                    </Select>
                </label>
            </div>
            <div className={'activity-filter-bottom'}>
                <form
                    className={'activity-ip-filter'}
                    onSubmit={(event) => {
                        event.preventDefault();
                        onChange({ ip: ip.trim() || undefined });
                    }}
                >
                    <label htmlFor={'activity-ip'}>IP address</label>
                    <div>
                        <Input
                            data-sensitive
                            id={'activity-ip'}
                            value={ip}
                            onChange={(event) => setIp(event.currentTarget.value)}
                            placeholder={'Filter by IP address'}
                        />
                        <button type={'submit'} className={'panel-link-button'}>
                            Apply
                        </button>
                    </div>
                </form>
                {hasFilters && (
                    <button type={'button'} className={'activity-clear'} onClick={onClear}>
                        <X className={'h-4 w-4'} /> Clear filters
                    </button>
                )}
            </div>
        </section>
    );
};
