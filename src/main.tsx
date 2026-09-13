import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { perf } from './utils/perf';
import './index.css';

perf.mark('app-boot');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
