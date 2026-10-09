import React from 'react';

const reactWithUseId = React as typeof React & { useId?: () => string };
let nextId = 0;

// Keep IDs stable across renders for components using useId with React 16.
if (!reactWithUseId.useId) {
    reactWithUseId.useId = function useId() {
        const [id] = React.useState(() => `:r${nextId++}:`);

        return id;
    };
}
