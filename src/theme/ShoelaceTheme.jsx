import React from 'react';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/translations/tr.js';
import {setBasePath} from '@shoelace-style/shoelace/dist/utilities/base-path.js';
setBasePath('/shoelace');
export default function ShoelaceTheme({children}){return children}
