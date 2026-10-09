import { cleanDirectoryPath } from '@/helpers';

export interface FileUploadData {
    loaded: number;
    readonly abort: AbortController;
    readonly total: number;
}

export interface ServerFileState {
    directory: string;
    selectedFiles: string[];
    uploads: Record<string, FileUploadData>;
}

export interface ServerFileActions {
    setDirectory: (payload: string) => void;
    setSelectedFiles: (payload: string[]) => void;
    appendSelectedFile: (payload: string) => void;
    removeSelectedFile: (payload: string) => void;
    pushFileUpload: (payload: { name: string; data: FileUploadData }) => void;
    setUploadProgress: (payload: { name: string; loaded: number }) => void;
    clearFileUploads: () => void;
    removeFileUpload: (payload: string) => void;
    cancelFileUpload: (payload: string) => void;
}

export type ServerFileStore = ServerFileState & ServerFileActions;

export const createFilesSlice = (set: (fn: (state: any) => any) => void): ServerFileStore => ({
    directory: '/',
    selectedFiles: [],
    uploads: {},

    setDirectory: (payload) =>
        set((state) => ({
            files: {
                ...state.files,
                directory: cleanDirectoryPath(payload),
            },
        })),

    setSelectedFiles: (payload) =>
        set((state) => ({
            files: {
                ...state.files,
                selectedFiles: payload,
            },
        })),

    appendSelectedFile: (payload) =>
        set((state) => ({
            files: {
                ...state.files,
                selectedFiles: state.files.selectedFiles.filter((f: string) => f !== payload).concat(payload),
            },
        })),

    removeSelectedFile: (payload) =>
        set((state) => ({
            files: {
                ...state.files,
                selectedFiles: state.files.selectedFiles.filter((f: string) => f !== payload),
            },
        })),

    clearFileUploads: () =>
        set((state) => {
            Object.values(state.files.uploads as Record<string, FileUploadData>).forEach((upload) =>
                upload.abort.abort(),
            );

            return {
                files: {
                    ...state.files,
                    uploads: {},
                },
            };
        }),

    pushFileUpload: (payload) =>
        set((state) => ({
            files: {
                ...state.files,
                uploads: {
                    ...state.files.uploads,
                    [payload.name]: payload.data,
                },
            },
        })),

    setUploadProgress: ({ name, loaded }) =>
        set((state) => {
            if (!state.files.uploads[name]) return state;

            return {
                files: {
                    ...state.files,
                    uploads: {
                        ...state.files.uploads,
                        [name]: {
                            ...state.files.uploads[name],
                            loaded,
                        },
                    },
                },
            };
        }),

    removeFileUpload: (payload) =>
        set((state) => {
            const { [payload]: _, ...uploads } = state.files.uploads;

            return {
                files: {
                    ...state.files,
                    uploads,
                },
            };
        }),

    cancelFileUpload: (payload) =>
        set((state) => {
            const upload = state.files.uploads[payload];
            if (upload) {
                upload.abort.abort();
            }

            const { [payload]: _, ...uploads } = state.files.uploads;

            return {
                files: {
                    ...state.files,
                    uploads,
                },
            };
        }),
});

export default createFilesSlice;
