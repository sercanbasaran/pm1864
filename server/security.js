import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export const digest=value=>createHash('sha256').update(value).digest('hex');
export async function hashPassword(password){if(password.length<12)throw new Error('Password must have at least 12 characters.');const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64);return `scrypt:${salt}:${key.toString('hex')}`}
export async function checkPassword(password,hash){if(typeof password!=='string'||password.length>512)return false;const [kind,salt,key]=String(hash||'').split(':');if(kind!=='scrypt'||!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(key))return false;const actual=await scrypt(password,salt,64);return timingSafeEqual(actual,Buffer.from(key,'hex'))}
export function readCookie(request){return request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('pm1864_session='))?.slice(15)||''}
export function cookie(token,secure,clear=false){return `pm1864_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:28800}${secure?'; Secure':''}`}
export const newSessionToken=()=>randomBytes(32).toString('base64url');
