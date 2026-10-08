import React, { useRef } from 'react';
import usePrivacyMode from '@/plugins/usePrivacyMode';

export default ({ children, onClick, onPointerDown, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
    const enabled = usePrivacyMode();
    const revealTouchClick = useRef(false);
    return (
        <span
            data-sensitive
            tabIndex={enabled ? 0 : undefined}
            onPointerDown={(event) => {
                revealTouchClick.current =
                    enabled && event.pointerType === 'touch' && document.activeElement !== event.currentTarget;
                if (revealTouchClick.current) event.currentTarget.focus();
                onPointerDown?.(event);
            }}
            onClick={(event) => {
                // The first tap reveals the value; another tap can follow its link or copy it.
                if (revealTouchClick.current) {
                    revealTouchClick.current = false;
                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.focus();
                    return;
                }
                onClick?.(event);
            }}
            {...props}
        >
            {children}
        </span>
    );
};
