import React from 'react';
import {test,expect,vi,afterEach} from 'vitest';
import {render,cleanup} from '@testing-library/react';
import EditorPage from '../src/components/layout/EditorPage.jsx';
import {settle} from './shadow-queries.js';
afterEach(cleanup);
test('opening or remounting an editor does not focus the page heading or steal focus from another control',async()=>{
 const trigger=document.createElement('button');trigger.textContent='Editörü aç';document.body.append(trigger);trigger.focus();
 const view=render(<EditorPage title="Kategori düzenle" onClose={vi.fn()}><p>Kategori bilgileri</p></EditorPage>);await settle();
 expect(document.activeElement).toBe(trigger);
 expect(document.querySelector('.page-editor-header h2').hasAttribute('tabindex')).toBe(false);
 view.unmount();
 const reopened=render(<EditorPage title="Kategori düzenle" onClose={vi.fn()}><p>Kategori bilgileri</p></EditorPage>);await settle();
 expect(document.activeElement).toBe(trigger);
 reopened.unmount();trigger.remove();
});
