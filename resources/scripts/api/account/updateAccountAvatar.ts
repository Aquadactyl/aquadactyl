import http, { FractalResponseData } from '@/api/http';

export const uploadAccountAvatar = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append('avatar', file);
  const { data } = await http.post<FractalResponseData>(
    '/api/client/account/avatar',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );

  return data.attributes.avatar_url;
};

export const removeAccountAvatar = async (): Promise<void> => {
  await http.delete('/api/client/account/avatar');
};
