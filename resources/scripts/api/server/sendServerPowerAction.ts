import http from '@/api/http';
export type PowerAction = 'start' | 'restart' | 'stop';
export default async (uuid: string, signal: PowerAction): Promise<void> => {
    await http.post('/api/client/servers/' + uuid + '/power', { signal });
};
