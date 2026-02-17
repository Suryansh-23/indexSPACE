import React from 'react';
import ReactDOM from 'react-dom/client';

// ── Swap layout by changing this import ──
// import App from './App_TradePanel';
import App from './App_ShapeCutter';
// import App from './App_ShapeCutterPositions';
// import App from './App_Both';  Cluttered remove
// import App from './App_BinaryPanel';
// import App from './App_TimelineBinary';
// import App from './App_DistRange';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
