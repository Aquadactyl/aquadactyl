import http from "@/api/http";

export default async (serverId: string, content: string): Promise<string> => {
  const { data } = await http.post(
    `/api/client/servers/${serverId}/console/share`,
    { content },
  );
  return data.url;
};
