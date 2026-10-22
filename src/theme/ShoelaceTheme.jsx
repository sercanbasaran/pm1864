import React,{useLayoutEffect} from 'react';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import '@shoelace-style/shoelace/dist/translations/tr.js';
import {setBasePath} from '@shoelace-style/shoelace/dist/utilities/base-path.js';
setBasePath('/shoelace');
export default function ShoelaceTheme({children,theme}){
 useLayoutEffect(()=>{
  if(theme===undefined)return;
  const selected=theme==='dark'?'dark':'light',root=document.documentElement;
  root.classList.toggle('sl-theme-dark',selected==='dark');
  root.classList.toggle('sl-theme-light',selected==='light');
  root.style.colorScheme=selected;
 },[theme]);
 return children;
}
