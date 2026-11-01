import http from "@/api/http";
import { queryClient } from "@/lib/queryClient";

export interface TrashItem {
  id: string;
  name: string;
  path: string;
  is_file: boolean;
  ready: boolean;
  deleted_at: string;
  expires_at: string;
}

export interface TrashPage {
  data: TrashItem[];
  meta: { current_page: number; last_page: number; total: number };
}

export const moveFilesToTrash = async (
  server: string,
  root: string,
  files: string[],
): Promise<void> => {
  try {
    await http.post(`/api/client/servers/${server}/trash`, { root, files });
  } finally {
    // A failed batch may still contain successfully moved files. Refresh both
    // successful and uncertain results before reopening the trash page.
    await queryClient.invalidateQueries({ queryKey: [server, "trash"] });
  }
};
export const getTrash = async (
  server: string,
  page = 1,
): Promise<TrashPage> => {
  const { data } = await http.get(`/api/client/servers/${server}/trash`, {
    params: { page },
  });
  return data;
};
export const restoreTrashItem = async (
  server: string,
  item: string,
): Promise<void> => {
  await http.post(`/api/client/servers/${server}/trash/${item}/restore`);
};
export const deleteTrashItem = async (
  server: string,
  item: string,
): Promise<void> => {
  await http.delete(`/api/client/servers/${server}/trash/${item}`);
};
