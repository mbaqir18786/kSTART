import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

import './styles/transition.css';
import './styles/fonts.css';
import './styles/globals.css';
import './styles/menu.css';
import './styles/home.css';
import './styles/about.css';
import './styles/work.css';
import './styles/contact.css';
import './styles/footer.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
