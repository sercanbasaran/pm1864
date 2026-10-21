import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {readFile,writeFile} from 'node:fs/promises';
import {hashPassword} from '../server/security.js';
const rl=createInterface({input:stdin,output:stdout});
try{let existing='';try{existing=await readFile('.env','utf8')}catch(e){if(e.code!=='ENOENT')throw e}if(existing){const answer=await rl.question('.env mevcut. Yeni yönetici hesabıyla değiştirmek için EVET yazın: ');if(answer!=='EVET')process.exit()}
 const email=(await rl.question('Yönetici e-posta adresi: ')).trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Geçerli bir e-posta girin.');
 // Password is read in raw mode and never echoed to stdout.
 if(!stdin.isTTY)throw new Error('Parola kurulumu için etkileşimli terminal gerekli.');
 rl.close();stdout.write('Yönetici parolası (en az 12 karakter, gizli): ');stdin.setRawMode(true);stdin.resume();let password='';await new Promise((resolve,reject)=>{const onData=data=>{for(const char of data.toString()){if(char==='\u0003'){stdin.off('data',onData);reject(new Error('İptal edildi.'));return}if(char==='\r'||char==='\n'){stdin.off('data',onData);resolve();return}if(char==='\u007f'||char==='\b')password=password.slice(0,-1);else password+=char}};stdin.on('data',onData)});stdin.setRawMode(false);stdin.pause();stdout.write('\n');const hash=await hashPassword(password);password='';
 const kept=existing.split(/\r?\n/).filter(line=>!/^ADMIN_(EMAIL|PASSWORD_HASH)=/.test(line)).join('\n').trim();await writeFile('.env',`${kept?kept+'\n':''}ADMIN_EMAIL=${JSON.stringify(email)}\nADMIN_PASSWORD_HASH=${JSON.stringify(hash)}\n`,{mode:0o600});console.log('Yönetici ayarları .env dosyasına kaydedildi. Bu dosyayı GitHub’a yüklemeyin.');
}catch(e){console.error(e.message);process.exitCode=1}finally{if(stdin.isTTY)stdin.setRawMode(false);stdin.pause();rl.close()}
