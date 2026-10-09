/// <reference types="vite/client" />

declare module '*.jpg';
declare module '*.png';
declare module '*.svg';
declare module '*.css';

declare namespace React {
    interface FunctionComponent<P = {}> {
        (props: P & { children?: ReactNode | undefined }, context?: any): ReactElement<any, any> | null;
    }
}
