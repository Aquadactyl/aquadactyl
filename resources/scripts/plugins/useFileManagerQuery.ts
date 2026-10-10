import { useTanStackQuery } from '@/lib/queryClient';
import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import { cleanDirectoryPath } from '@/helpers';
import { ServerContext } from '@/state/server';

export const getDirectoryQueryKey = (
  uuid: string,
  directory: string,
): string[] => [uuid, 'files', directory];
export const getDirectorySwrKey = getDirectoryQueryKey;

export default () => {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const directory = ServerContext.useStoreState(
    (state) => state.files.directory,
  );

  return useTanStackQuery<FileObject[]>(
    getDirectoryQueryKey(uuid, directory),
    () => loadDirectory(uuid, cleanDirectoryPath(directory)),
    {
      retry: 2,
    },
  );
};
