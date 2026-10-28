import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import FormatMenu from '../src/modules/transfer/FormatMenu.jsx';
import { settle } from './shadow-queries.js';
afterEach(cleanup);
test('transfer menu offers four formats and returns the selected format', async () => {
 const select = vi.fn(); render(<FormatMenu direction="import" onSelect={select} />); await settle();
 expect(document.querySelector('sl-button').textContent).toContain('İçe aktar');
 const items = [...document.querySelectorAll('sl-menu-item')];
 expect(items.map(item => item.value)).toEqual(['json','csv','xml','xls']);
 fireEvent(document.querySelector('sl-menu'), new CustomEvent('sl-select', {bubbles:true, detail:{item:items[3]}}));
 expect(select).toHaveBeenCalledWith('xls');
});
