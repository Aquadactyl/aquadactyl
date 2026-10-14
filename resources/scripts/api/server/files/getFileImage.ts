import http from "@/api/http";

export default async (
  server: string,
  file: string,
  signal: AbortSignal,
): Promise<Blob> => {
  const { data } = await http.get<Blob>(
    `/api/client/servers/${server}/files/contents`,
    {
      params: { file },
      responseType: "blob",
      signal,
    },
  );
  return data;
};
