import {test,expect,vi} from 'vitest';
import {exportVariants} from '../src/modules/variants/VariantExcel.jsx';
import {downloadTransfer} from '../src/modules/transfer/transfer.js';
vi.mock('../src/modules/transfer/transfer.js',()=>({downloadTransfer:vi.fn(),formatLabel:vi.fn(),readTransferFile:vi.fn()}));
test.each(['xls','csv','json','xml'])('complete variant export supplies identical columns and absolute photo URLs for %s',async format=>{
 const p={id:1,name:'Baklava',productCode:'100',variants:[],customImage:'/baklava.jpg'};
 const v={id:'v1',size:'S',price:100,quantity:3,weight:120,images:[{id:'photo'}]};
 await exportVariants([{p,v}],[],[p],[],format,{origin:'https://usta.test'});
 const [columns,rows,actualFormat]=downloadTransfer.mock.calls.at(-1);
 expect(actualFormat).toBe(format);expect(columns.length).toBeLessThanOrEqual(64);expect(rows[0]).toHaveLength(columns.length);
 const result=Object.fromEntries(columns.map((key,i)=>[key,rows[0][i]]));
 expect(result['Ürün fotoğraf linkleri']).toContain('https://usta.test/baklava.jpg');expect(result['Varyant fotoğraf linkleri']).toBe('https://usta.test/api/media/photo/content');expect(JSON.parse(result['Varyant tüm verileri (JSON)'])).toEqual(v);
});
