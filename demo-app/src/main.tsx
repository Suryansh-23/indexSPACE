import React from 'react';
import ReactDOM from 'react-dom/client';

// ── Swap layout by changing this import ──
// import App from './App_TradePanel';
import App from './App_ShapeCutter';
// import App from './App_ShapeCutterPositions';
// import App from './App_Both';
// import App from './App_BinaryPanel';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
