import { defineConfig } from 'astro/config';
import {existsSync} from 'node:fs';
if(existsSync('.env'))process.loadEnvFile('.env');
export default defineConfig({site:process.env.SITE_URL || 'https://octo18.example',output:'static',trailingSlash:'always',vite:{server:{proxy:{'/api':'http://127.0.0.1:8787','/media':'http://127.0.0.1:8787'}}}});
