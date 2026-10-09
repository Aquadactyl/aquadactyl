import React from 'react';
import ReactDOM from 'react-dom';
import App from '@/components/App';

// React 16 polyfill for packages expecting React 18+ useId (e.g. boring-avatars)
if (!('useId' in React)) {
    let id = 0;
    (React as any).useId = () => `:r${id++}:`;
}

// Import Blueprint extensions css
import './blueprint/css/extensions.css';

// Enable language support.
import './i18n';

ReactDOM.render(<App />, document.getElementById('app'));
