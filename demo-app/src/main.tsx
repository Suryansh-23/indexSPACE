import React from 'react';
import ReactDOM from 'react-dom/client';

// ── Swap layout by changing this import ──
// import App from './App_BasicTradingLayout';
// import App from './App_ShapeCutterTradingLayout';
// import App from './App_BinaryPanel';
// import App from './App_TimelineBinaryTradingLayout';
// import App from './App_DistRange';
// import App from './App_CustomShapeLayout';
// import App from './App_AllComponents';
import App from './App_StarterKitCapture';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
