import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/components/App';

// Import Blueprint extensions css
import './blueprint/css/extensions.css';

// Enable language support.
import './i18n';

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
