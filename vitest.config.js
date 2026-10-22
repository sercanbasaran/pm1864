import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:[{find:/^@lit\/react$/,replacement:fileURLToPath(new URL('./node_modules/@lit/react/development/index.js',import.meta.url))}]},test:{server:{deps:{inline:[/@shoelace-style\/shoelace/,/@lit\/react/]}},setupFiles:['./frontend-tests/setup.js'],environment:'jsdom',include:['frontend-tests/**/*.test.jsx'],pool:'forks',maxWorkers:1,testTimeout:30000}});
