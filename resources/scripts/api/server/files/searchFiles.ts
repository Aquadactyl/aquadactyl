import http from "@/api/http";

export default async (
  server: string,
  directory: string,
  query: string,
): Promise<string[]> => {
  const { data } = await http.get(`/api/servers/${server}/files/search`, {
    params: { directory, query },
  });

  return Array.isArray(data)
    ? data.filter((path): path is string => typeof path === "string")
    : [];
};
