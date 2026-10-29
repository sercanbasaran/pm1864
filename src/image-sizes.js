export const imageProfiles = Object.freeze({thumb:128,tile:480,detail:1200});
// API images retain their existing access checks; only a bounded size is requested.
export function imageUrl(source, profile='thumb') {
 if(!source || !imageProfiles[profile])return source || '';
 if(/^\/api\/(?:profile\/avatar|media\/[^/]+\/content|(?:product|variant|category)-pages\/[^/]+\/images\/[^/]+|public\/products\/[^/]+\/image)(?:\?|$)/.test(source)) {
  const [path,query='']=source.split('?');const params=new URLSearchParams(query);params.set('size',profile);return path+'?'+params;
 }
 // Public legacy assets on the known source site can use Netlify's image cache.
 const remote=/^https:\/\/hm1864\.netlify\.app\//.test(source);
 const local=/^\/(?!api\/|\.netlify\/|\/)[^?]+\.(?:png|jpe?g|webp|gif)(?:\?|$)/i.test(source);
 if(import.meta.env?.PROD && (remote || local))return '/.netlify/images?'+new URLSearchParams({url:source,w:String(imageProfiles[profile]),h:String(imageProfiles[profile]),fit:'contain',fm:'webp',q:'80'});
 return source;
}
