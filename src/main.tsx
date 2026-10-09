import React from 'react';
import {createRoot} from 'react-dom/client';
const root=createRoot(document.getElementById('root')!);
// 網站首頁與預覽網址共用已驗收的簡化介面。
import('./BluePreview').then(({default:Preview})=>root.render(<React.StrictMode><Preview/></React.StrictMode>));
