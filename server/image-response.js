import {createHash} from 'node:crypto';
// Cache in this browser only. Cookie variation separates authenticated sessions.
export function imageResponse(bytes,mimeType,request,{versioned=true}={}) {
 const etag='"'+createHash('sha256').update(bytes).digest('hex')+'"';
 const headers={
  'Content-Type':mimeType,
  'Cache-Control':`private, max-age=${versioned ? 86400 : 300}, must-revalidate`,
  'ETag':etag,
  'Vary':'Cookie',
  'X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"default-src 'none'; sandbox",
 };
 const candidates=request?.headers.get('if-none-match')?.split(',').map(value=>value.trim().replace(/^W\//,'')) || [];
 if(candidates.includes(etag)||candidates.includes('*'))return new Response(null,{status:304,headers});
 return new Response(bytes,{headers});
}
