import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {render,cleanup,fireEvent} from '@testing-library/react';
import {CatalogProvider} from '../src/app/CatalogContext.jsx';
import {defaultRegionalDefinitions} from '../src/regional-definitions.js';
import RegionalDefinitions from '../src/modules/settings/RegionalDefinitions.jsx';
import {settle} from './shadow-queries.js';
afterEach(cleanup);
const snapshot={revision:0,products:[],categories:[],...defaultRegionalDefinitions()};
test('all approved currencies and languages appear in settings with defaults',async()=>{
 const screen=render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><RegionalDefinitions kind="currencies" canWrite/></CatalogProvider>);await settle();
 expect(document.querySelectorAll('tbody tr')).toHaveLength(9);expect(document.body.textContent).toContain('Türk lirası');
 screen.unmount();render(<CatalogProvider snapshot={snapshot} notify={vi.fn()}><RegionalDefinitions kind="languages" canWrite/></CatalogProvider>);await settle();
 expect(document.querySelectorAll('tbody tr')).toHaveLength(14);expect(document.body.textContent).toContain('简体中文');
 fireEvent.click(document.querySelector('tbody sl-button'));await settle();expect(document.querySelector('sl-dialog')).not.toBeNull();
});
