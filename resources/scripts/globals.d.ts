/// <reference types="vite/client" />
import 'react';

declare module 'react' {
    interface FunctionComponent<P = {}> {
        (props: P & { children?: ReactNode | undefined }, context?: any): ReactNode;
    }

    interface VoidFunctionComponent<P = {}> {
        (props: P, context?: any): ReactNode;
    }
}

declare module '*.jpg';
declare module '*.png';
declare module '*.svg';
declare module '*.css';
