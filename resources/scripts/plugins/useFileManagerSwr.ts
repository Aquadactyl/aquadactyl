import { useTanStackQuery } from '@/lib/queryClient';
import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import { cleanDirectoryPath } from '@/helpers';
import { ServerContext } from '@/state/server';

export const getDirectorySwrKey = (uuid: string, directory: string): string[] => [uuid, 'files', directory];

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const directory = ServerContext.useStoreState((state) => state.files.directory);

    return useTanStackQuery<FileObject[]>(
        getDirectorySwrKey(uuid, directory),
        () => loadDirectory(uuid, cleanDirectoryPath(directory)),
        {
            retry: 2,
        },
    );
};
