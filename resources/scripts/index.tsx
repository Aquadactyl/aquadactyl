import '@/lib/react-compat';
import React from 'react';
import ReactDOM from 'react-dom';
import App from '@/components/App';

// Import Blueprint extensions css
import './blueprint/css/extensions.css';

// Enable language support.
import './i18n';

ReactDOM.render(<App />, document.getElementById('app'));
