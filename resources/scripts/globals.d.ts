/// <reference types="vite/client" />
import 'react';
import { ComponentType, ReactElement } from 'react';
import { StyledComponentProps } from 'styled-components';

declare module 'react' {
    interface FunctionComponent<P = {}> {
        (props: P & { children?: ReactNode | undefined }, context?: any): ReactNode;
    }

    interface VoidFunctionComponent<P = {}> {
        (props: P, context?: any): ReactNode;
    }
}

declare module 'styled-components' {
    interface StyledComponentBase<
        C extends string | ComponentType<any>,
        T extends object,
        O extends object = {},
        A extends keyof any = never,
    > extends ForwardRefExoticBase<StyledComponentProps<C, T, O, A>> {
        (
            props: StyledComponentProps<C, T, O, A> & { as?: Element | string; forwardedAs?: never | undefined },
        ): ReactElement<StyledComponentProps<C, T, O, A>>;
    }
}

declare module '*.jpg';
declare module '*.png';
declare module '*.svg';
declare module '*.css';
