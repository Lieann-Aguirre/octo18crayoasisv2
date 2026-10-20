import type {Env} from './index';
import {API_VERSION,RELEASE} from '../src/lib/release';
export async function diagnostics(env:Env){
 const groups={
  administrator:['ACCESS_TEAM_DOMAIN','ACCESS_AUD','ADMIN_EMAIL'],
  publishing:['PAGES_DEPLOY_HOOK','CATALOG_BUILD_TOKEN','CF_API_TOKEN','CF_ACCOUNT_ID','CF_PAGES_PROJECT'],
  quotations:['SITE_ORIGIN','TURNSTILE_SECRET'],
  notifications:['MICROSOFT_TENANT_ID','MICROSOFT_CLIENT_ID','MICROSOFT_CLIENT_SECRET','SMTP_USER','NOTIFY_FROM','NOTIFY_TO']
 };
 const configuration=Object.fromEntries(Object.entries(groups).map(([name,keys])=>[name,{missing:keys.filter(key=>!String(env[key as keyof Env]||'').trim())}]));
 let database:{ready:boolean;missingTables:string[];error?:string;visibleProducts?:number;livePublication?:string|null}={ready:false,missingTables:[]};
 try{
  const rows=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all<{name:string}>();
  database.missingTables=['products','settings','publications','publication_queue','quotes','rate_limits','audit_log'].filter(name=>!rows.results.some(row=>row.name===name));
  database.ready=!database.missingTables.length;
  if(database.ready){
   const columns=await env.DB.prepare('PRAGMA table_info(publications)').all<{name:string}>();
   if(!columns.results.some(c=>c.name==='revision')){database.ready=false;database.error='Apply migration 0002_publication_queue.sql';}
   database.visibleProducts=(await env.DB.prepare("SELECT COUNT(*) AS count FROM products WHERE json_extract(data,'$.status')='published'").first<{count:number}>())?.count||0;
   database.livePublication=(await env.DB.prepare("SELECT id FROM publications WHERE state='success' ORDER BY created_at DESC,rowid DESC LIMIT 1").first<{id:string}>())?.id||null;
  }
 }catch{database.error='D1 is unavailable or its binding is incorrect';}
 return {apiVersion:API_VERSION,release:RELEASE,configuration,database};
}
