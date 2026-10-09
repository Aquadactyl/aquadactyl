import React from 'react';

enum Shape {
    Default,
    IconSquare,
}

enum Size {
    Default,
    Small,
    Large,
}

enum Variant {
    Primary,
    Secondary,
}

export const Options = { Shape, Size, Variant };

export type ButtonProps = React.ComponentPropsWithoutRef<'button'> & {
    shape?: Shape;
    size?: Size;
    variant?: Variant;
};
