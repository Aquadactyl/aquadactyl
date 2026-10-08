import http from '@/api/http';

export default async (enabled: boolean): Promise<boolean> => {
    const { data } = await http.put('/api/client/account/privacy', { blur_sensitive_data: enabled });
    return data.attributes.blur_sensitive_data;
};
