import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/installers',timeout:180000,workers:1,reporter:'list'});
