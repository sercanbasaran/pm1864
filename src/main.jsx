import React from 'react';
import ShoelaceTheme from './theme/ShoelaceTheme.jsx';
import {createRoot} from 'react-dom/client';
import PublicProductPage from './modules/products/PublicProductPage.jsx';
import BackendGate from './app/BackendGate.jsx';
import {App} from './app/App.jsx';
import './theme/primary.css';
import './layout.css';
export {App} from './app/App.jsx';
export function RootApp(){return <ShoelaceTheme>{window.location.pathname.startsWith('/p/')?<PublicProductPage/>:<BackendGate>{({user,catalog,onLogout,onUserUpdated})=><App key={user.id} snapshot={catalog} user={user} onLogout={onLogout} onUserUpdated={onUserUpdated}/>}</BackendGate>}</ShoelaceTheme>}
const root=document.getElementById('root');
if(root)createRoot(root).render(<RootApp/>);
