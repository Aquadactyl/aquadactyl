import React from 'react';
import { useStoreState } from '@/state/hooks';

export default ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
    const enabled = useStoreState((state) => Boolean(state.user.data?.blurSensitiveData));
    return (
        <span
            data-sensitive
            tabIndex={enabled ? 0 : undefined}
            onPointerDown={(event) => {
                if (enabled && event.pointerType === 'touch') event.currentTarget.focus();
            }}
            {...props}
        >
            {children}
        </span>
    );
};
