import fs from 'node:fs';
import {defineConfig} from 'vite';
export default defineConfig({plugins:[{name:'shoelace-assets',buildStart(){fs.mkdirSync('public/shoelace',{recursive:true});fs.cpSync('node_modules/@shoelace-style/shoelace/dist/assets','public/shoelace/assets',{recursive:true})}}],server:{host:'127.0.0.1',proxy:{'/api':{target:'http://127.0.0.1:8787',changeOrigin:false}}}});
