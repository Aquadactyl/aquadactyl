import http from "@/api/http";

export interface ServerFolder {
  id: number;
  name: string;
}
const endpoint = "/api/client/account/server-folders";

export async function getServerFolders(): Promise<ServerFolder[]> {
  const { data } = await http.get(endpoint);
  return data.data;
}
export async function saveServerFolder(
  name: string,
  id?: number,
): Promise<void> {
  if (id === undefined) await http.post(endpoint, { name });
  else await http.put(`${endpoint}/${id}`, { name });
}
export async function deleteServerFolder(id: number): Promise<void> {
  await http.delete(`${endpoint}/${id}`);
}
export async function assignServerFolder(
  uuid: string,
  folderId: number | null,
): Promise<void> {
  await http.put(`${endpoint}/servers/${uuid}`, { folder_id: folderId });
}
