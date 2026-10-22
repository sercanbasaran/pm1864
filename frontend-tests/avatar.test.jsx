import React,{useState} from 'react';
import {test,expect,beforeEach,afterEach,vi} from 'vitest';
import {render,cleanup,waitFor} from '@testing-library/react';
import {screen,settle} from './shadow-queries.js';
import userEvent from '@testing-library/user-event';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/security.js';
import {App} from '../src/app/App.jsx';
let api,cookie,user,click;
const data='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6B9sAAAAASUVORK5CYII=';
beforeEach(async()=>{
 window.history.replaceState(null,'','/#account');
 api=await createApp({env:{SQLITE_PATH:':memory:',ADMIN_EMAIL:'avatar@example.test',ADMIN_NAME:'Avatar Kontrol',ADMIN_PASSWORD_HASH:await hashPassword('Avatar-ui-test-1864')}});cookie='';
 vi.stubGlobal('fetch',vi.fn(async(path,options={})=>{const response=await api.handle(new Request('http://localhost'+path,{...options,headers:{...options.headers,origin:'http://localhost',cookie}}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response}));
 user=(await(await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'avatar@example.test',password:'Avatar-ui-test-1864'})})).json()).user;
 click=userEvent.setup();
});
afterEach(async()=>{cleanup();vi.unstubAllGlobals();await api.close()});
async function show(){const catalog=await api.service.read();function Harness(){const [current,setCurrent]=useState(user),[snapshot,setSnapshot]=useState(catalog);return <App user={current} snapshot={snapshot} onLogout={vi.fn()} onUserUpdated={async updated=>{setCurrent(updated);setSnapshot(await api.service.read())}}/>}render(<Harness/>);await screen.findByRole('heading',{name:'Profil fotoğrafı'});await settle()}
const photo=()=>new File([Uint8Array.from(Buffer.from(data,'base64'))],'avatar.png',{type:'image/png'});
test('account photo uploads, replaces, survives reopening and removes with initials fallback',async()=>{
 await show();await click.upload(screen.getByLabelText('Profil fotoğrafı dosyası'),photo());await screen.findByRole('button',{name:'Fotoğrafı değiştir'});user=(await(await fetch('/api/session')).json()).user;expect(user.avatarUrl).toContain('/api/profile/avatar?user=');await waitFor(()=>expect(document.querySelector('.profile-area sl-avatar').image).toBe(user.avatarUrl));expect(document.querySelector('.account-avatar').image).toBe(user.avatarUrl);expect((await(await fetch('/api/media')).json()).assets).toHaveLength(0);
 const first=user.avatarUrl;await click.upload(screen.getByLabelText('Profil fotoğrafı dosyası'),photo());await waitFor(async()=>expect((await(await fetch('/api/session')).json()).user.avatarUrl).not.toBe(first));user=(await(await fetch('/api/session')).json()).user;
 cleanup();await show();expect(document.querySelector('.profile-area sl-avatar').image).toBe(user.avatarUrl);await click.click(screen.getByRole('button',{name:'Fotoğrafı kaldır'}));await screen.findByRole('button',{name:'Fotoğraf yükle'});expect((await(await fetch('/api/session')).json()).user.avatarUrl).toBe('');await waitFor(()=>expect(document.querySelector('.profile-area sl-avatar').image).toBe(''));expect(document.querySelector('.profile-area sl-avatar').initials).toBe('AK');expect(screen.queryByRole('button',{name:'Fotoğrafı kaldır'})).toBeNull();
});
test('oversized photo is rejected in the account screen and the existing avatar is preserved',async()=>{
 await show();await click.upload(screen.getByLabelText('Profil fotoğrafı dosyası'),photo());await screen.findByRole('button',{name:'Fotoğrafı değiştir'});const before=(await(await fetch('/api/session')).json()).user;
 await click.upload(screen.getByLabelText('Profil fotoğrafı dosyası'),new File([new Uint8Array(2*1024*1024+1)],'large.png',{type:'image/png'}));expect(await screen.findByText('PNG, JPEG, WEBP veya GIF biçiminde en fazla 2 MB fotoğraf seçin.')).toBeTruthy();expect(document.querySelector('.account-avatar').image).toBe(before.avatarUrl);expect((await(await fetch('/api/session')).json()).user.version).toBe(before.version);
});
