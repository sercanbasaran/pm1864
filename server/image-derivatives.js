import sharp from 'sharp';
import {imageProfiles} from '../src/image-sizes.js';
sharp.cache({memory:32,files:0,items:32});
sharp.concurrency(1);
let tail=Promise.resolve();
export function createDerivatives(data, profiles = Object.keys(imageProfiles)) {
 const job=tail.then(()=>renderDerivatives(data, profiles));
 tail=job.catch(()=>{});
 return job;
}
async function renderDerivatives(data, profiles) {
 const result=[];
 for(const [profile,size] of Object.entries(imageProfiles).filter(([profile])=>profiles.includes(profile))) {
  const output=await sharp(data,{limitInputPixels:40000000,failOn:'warning',pages:1}).rotate().resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:80,effort:3}).toBuffer({resolveWithObject:true});
  result.push({profile,data:output.data.toString('base64'),size:output.data.length,width:output.info.width,height:output.info.height});
 }
 return result;
}
