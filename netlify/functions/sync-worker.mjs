import {getApp} from '../../server/app.js';
import {processJobs} from '../../server/worker.js';
export default async function(){const app=await getApp();const result=await processJobs(app.service);return new Response(JSON.stringify(result),{headers:{'content-type':'application/json'}})}
export const config={schedule:'* * * * *'};
