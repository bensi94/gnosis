import { createRoot } from 'react-dom/client';
import { App } from './App';
import './globals.css';

// Apply dark mode at the HTML level so body/scrollbars also get dark variables
document.documentElement.classList.add('dark');

const container = document.getElementById('root');
if (!container) throw new Error('No #root element found');

createRoot(container).render(<App />);
