import React from 'react';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/translations/tr.js';
import {setBasePath} from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import {setDefaultAnimation} from '@shoelace-style/shoelace/dist/utilities/animation-registry.js';
setBasePath('/shoelace');
const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
for(const name of ['dialog.show','dialog.hide','drawer.showStart','drawer.hideStart','dropdown.show','dropdown.hide','select.show','select.hide'])if(reduced)setDefaultAnimation(name,{keyframes:[],options:{duration:0}});
export default function ShoelaceTheme({children}){return children}
