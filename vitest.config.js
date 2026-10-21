import {defineConfig} from 'vitest/config';
export default defineConfig({test:{environment:'jsdom',include:['frontend-tests/**/*.test.jsx'],pool:'forks',maxWorkers:1,testTimeout:20000}});
