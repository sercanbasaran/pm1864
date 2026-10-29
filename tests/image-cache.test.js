import {setImageCacheUser} from '../src/image-cache-scope.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {imageResponse} from '../server/image-response.js';
import {imageUrl} from '../src/image-sizes.js';
test('image cache stays private, remains fresh for a day and validates without retransmitting bytes',()=>{
 const bytes=Buffer.from('image-data');const response=imageResponse(bytes,'image/webp',new Request('https://test.example/api/media/id/content?size=thumb'));
 assert.equal(response.headers.get('cache-control'),'private, max-age=86400, must-revalidate');assert.equal(response.headers.get('vary'),'Cookie');
 const etag=response.headers.get('etag');
 const cached=imageResponse(bytes,'image/webp',new Request('https://test.example/image',{headers:{'if-none-match':`"old", W/${etag}`}}));assert.equal(cached.status,304);assert.equal(cached.body,null);
 const changed=imageResponse(Buffer.from('new-image'),'image/webp',new Request('https://test.example/image',{headers:{'if-none-match':etag}}));assert.equal(changed.status,200);assert.notEqual(changed.headers.get('etag'),etag);
});
test('replacement images and profile versions use different cache keys while unversioned avatars have short freshness',()=>{
 assert.notEqual(imageUrl('/api/media/old/content'),imageUrl('/api/media/new/content'));
 assert.notEqual(imageUrl('/api/profile/avatar?user=user1&v=1'),imageUrl('/api/profile/avatar?user=user1&v=2'));
 assert.match(imageResponse(Buffer.from('x'),'image/webp',null,{versioned:false}).headers.get('cache-control'),/max-age=300/);
});

test('switching accounts gives private image URLs a different browser cache key',()=>{
 try {
 setImageCacheUser('first-user');const first=imageUrl('/api/media/same-id/content','thumb');
 setImageCacheUser('second-user');const second=imageUrl('/api/media/same-id/content','thumb');
 assert.notEqual(first,second);assert.match(second,/viewer=second-user/);
 setImageCacheUser(null);assert.equal(imageUrl('/api/media/same-id/content','thumb'),'/api/media/same-id/content?size=thumb');
 }finally{setImageCacheUser(null);}
});
