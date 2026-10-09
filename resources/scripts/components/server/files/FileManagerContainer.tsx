import React, { useEffect, useMemo, useDeferredValue, startTransition } from 'react';
import { httpErrorToHuman } from '@/api/http';
import Fade from '@/components/elements/Fade';
import Spinner from '@/components/elements/Spinner';
import FileObjectRow from '@/components/server/files/FileObjectRow';
import FileManagerBreadcrumbs from '@/components/server/files/FileManagerBreadcrumbs';
import { FileObject } from '@/api/server/files/loadDirectory';
import NewDirectoryButton from '@/components/server/files/NewDirectoryButton';
import { NavLink, useLocation } from 'react-router';
import Can from '@/components/elements/Can';
import { ServerError } from '@/components/elements/ScreenBlock';
import { Button } from '@/components/elements/button/index';
import { ServerContext } from '@/state/server';
import useFileManagerQuery from '@/plugins/useFileManagerQuery';
import FileManagerStatus from '@/components/server/files/FileManagerStatus';
import MassActionsBar from '@/components/server/files/MassActionsBar';
import UploadButton from '@/components/server/files/UploadButton';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import useFlash from '@/plugins/useFlash';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import { FileActionCheckbox } from '@/components/server/files/SelectFileCheckbox';
import { hashToPath } from '@/helpers';
import style from './style.module.css';

import BeforeContent from '@blueprint/components/Server/Files/Browse/BeforeContent';
import FileButtons from '@blueprint/components/Server/Files/Browse/FileButtons';
import AfterContent from '@blueprint/components/Server/Files/Browse/AfterContent';

const sortFiles = (files: FileObject[]): FileObject[] => {
    const copied = [...files];
    copied.sort((a, b) => a.name.localeCompare(b.name));
    copied.sort((a, b) => (a.isFile === b.isFile ? 0 : a.isFile ? 1 : -1));
    return copied.filter((file, index) => index === 0 || file.name !== copied[index - 1].name);
};

export default () => {
    const id = ServerContext.useStoreState((state) => state.server.data!.id);
    const { hash } = useLocation();
    const { data: files, error, mutate } = useFileManagerQuery();
    const directory = ServerContext.useStoreState((state) => state.files.directory);
    const { clearFlashes } = useFlash();
    const setDirectory = ServerContext.useStoreActions((actions) => actions.files.setDirectory);

    const setSelectedFiles = ServerContext.useStoreActions((actions) => actions.files.setSelectedFiles);
    const selectedFilesLength = ServerContext.useStoreState((state) => state.files.selectedFiles.length);

    const sortedFiles = useMemo(() => (files ? sortFiles(files.slice(0, 250)) : null), [files]);
    const deferredSortedFiles = useDeferredValue(sortedFiles);

    useEffect(() => {
        clearFlashes('files');
        setSelectedFiles([]);
        startTransition(() => {
            setDirectory(hashToPath(hash));
        });
    }, [hash]);

    useEffect(() => {
        mutate();
    }, [directory]);

    const onSelectAllClick = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFiles(e.currentTarget.checked ? files?.map((file) => file.name) || [] : []);
    };

    if (error) {
        return <ServerError message={httpErrorToHuman(error)} onRetry={() => mutate()} />;
    }

    return (
        <ServerContentBlock title={'File Manager'} showFlashKey={'files'}>
            <ErrorBoundary>
                <BeforeContent />
                <div className={'mb-4 flex flex-wrap-reverse md:flex-nowrap'}>
                    <FileManagerBreadcrumbs
                        renderLeft={
                            <FileActionCheckbox
                                type={'checkbox'}
                                className={'mx-4'}
                                checked={selectedFilesLength === (files?.length === 0 ? -1 : files?.length)}
                                onChange={onSelectAllClick}
                            />
                        }
                    />
                    <Can action={'file.create'}>
                        <div className={style.manager_actions}>
                            <FileManagerStatus />
                            <FileButtons />
                            <NewDirectoryButton />
                            <UploadButton />
                            <NavLink to={`/server/${id}/files/new${window.location.hash}`}>
                                <Button>New File</Button>
                            </NavLink>
                        </div>
                    </Can>
                </div>
            </ErrorBoundary>
            {!files ? (
                <Spinner size={'large'} centered />
            ) : (
                <>
                    {!files.length ? (
                        <p className={'text-center text-sm text-neutral-400'}>This directory seems to be empty.</p>
                    ) : (
                        <Fade timeout={150}>
                            <div>
                                {files.length > 250 && (
                                    <div className={'mb-px rounded bg-yellow-400 p-3'}>
                                        <p className={'text-center text-sm text-yellow-900'}>
                                            This directory is too large to display in the browser, limiting the output
                                            to the first 250 files.
                                        </p>
                                    </div>
                                )}
                                {(deferredSortedFiles || []).map((file) => (
                                    <FileObjectRow key={file.key} file={file} />
                                ))}
                                <MassActionsBar />
                            </div>
                        </Fade>
                    )}
                </>
            )}
            <AfterContent />
        </ServerContentBlock>
    );
};
