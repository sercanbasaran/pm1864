import React from 'react';
import {test,expect,vi,afterEach} from 'vitest';
import {render,cleanup,fireEvent} from '@testing-library/react';
import CardNavigation from '../src/modules/products/CardNavigation.jsx';
afterEach(cleanup);
test('public navigation links to the adjacent card and disables the missing direction',()=>{
 render(<CardNavigation navigation={{previous:null,next:{name:'Baklava',href:'/p/baklava'}}}/>);
 const buttons=[...document.querySelectorAll('sl-button')];expect(buttons[0].disabled).toBe(true);expect(buttons[1].href).toBe('/p/baklava');
});
test('management navigation uses the application route',()=>{
 const onNavigate=vi.fn();render(<CardNavigation navigation={{next:{name:'Variant',route:'variants/1/card?variant=v'}}} onNavigate={onNavigate}/>);
 fireEvent.click(document.querySelectorAll('sl-button')[1]);expect(onNavigate).toHaveBeenCalledWith('variants/1/card?variant=v');
});
