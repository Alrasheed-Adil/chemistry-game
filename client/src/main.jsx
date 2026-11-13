import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { GameProvider } from './game.jsx';
import { LangProvider } from './i18n.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </LangProvider>
  </StrictMode>,
);
