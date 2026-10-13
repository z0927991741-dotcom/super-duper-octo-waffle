import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',timeout:90000,workers:1,use:{baseURL:'http://127.0.0.1:4173',headless:true,launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}},webServer:{command:'node server.mjs',port:4173,reuseExistingServer:true}});
