import React from 'react';
import {test,expect,afterEach,vi} from 'vitest';
import {render,cleanup,fireEvent} from '@testing-library/react';
import ProductIdentity from '../src/components/ui/ProductIdentity.jsx';
import TableText from '../src/components/ui/TableText.jsx';
import {settle} from './shadow-queries.js';
afterEach(cleanup);
test('product and variant identity buttons share fixed image and text slots, retain actions and truncation',async()=>{
 const onClick=vi.fn();const name='Narlı Fıstıklı Duble Lokum Büyük Boy';
 render(<><ProductIdentity product={{name,customImage:'/api/media/a/content'}} onClick={onClick}><strong><TableText value={name}/></strong><small>1111104 · 4 varyant</small></ProductIdentity><ProductIdentity product={{name:'Varyant'}} className="variant-identity" textClassName="variant-cell-main"><strong>Varyant</strong><small>SKU · Kutu</small></ProductIdentity></>);
 await settle();
 const cells=document.querySelectorAll('.product-cell');expect(cells).toHaveLength(2);
 expect(cells[0].querySelector('img').getAttribute('src')).toBe('/api/media/a/content?size=thumb');
 expect(cells[0].querySelector('strong').textContent).toBe(Array.from(name).slice(0,25).join('')+'…');
 expect(cells[1].querySelector('.product-image .image-placeholder')).toBeTruthy();
 fireEvent.click(cells[0]);expect(onClick).toHaveBeenCalledTimes(1);
});
