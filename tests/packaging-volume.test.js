import test from 'node:test';
import assert from 'node:assert/strict';
import {packagingVolume,packagingVolumeLabel} from '../src/modules/packaging/packaging-volume.js';
test('internal millimetres convert consistently to cubic centimetres and litres',()=>{
 assert.deepEqual(packagingVolume({length:200,width:100,height:50}),{cm3:1000,litres:1});
 assert.deepEqual(packagingVolume({length:100.5,width:100,height:10}),{cm3:100.5,litres:0.1005});
 assert.equal(packagingVolumeLabel({length:200,width:100,height:50}),'≈ 1.000 cm³ · 1 L');
});
test('missing or invalid dimensions never produce a volume',()=>{
 for(const height of [null,undefined,0,-1,NaN,Infinity,'50'])assert.equal(packagingVolume({length:100,width:100,height}),null);
 assert.equal(packagingVolumeLabel({}), '');
});
test('cylindrical boxes use internal diameter and height instead of bounding dimensions',()=>{
 const volume=packagingVolume({shape:'cylinder',diameter:100,height:100,length:999,width:999});
 assert.ok(Math.abs(volume.cm3-250*Math.PI)<0.000001);
 assert.equal(packagingVolume({name:'Kırmızı Silindir Metal Lokum Kutusu',length:100,width:100,height:100}),null);
});
