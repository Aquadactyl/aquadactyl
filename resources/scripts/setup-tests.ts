import '@testing-library/jest-dom';
import React from 'react';

if (!('useId' in React)) {
    let id = 0;
    (React as any).useId = () => `:r${id++}:`;
}
