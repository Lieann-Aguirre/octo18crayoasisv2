import {publicationErrors,settingsSchema,type Catalog} from '../src/lib/model';
import type {Env} from './index';
export async function publicationStatus(env:Env){
 const q=await env.DB.prepare('SELECT * FROM publication_queue WHERE id=1').first<{saved_revision:number;published_revision:number;paused:number;error:string|null}>();
 if(!q)throw Error('Apply publication queue migration');
 const active=await env.DB.prepare("SELECT id,state,revision FROM publications WHERE state IN ('pending','building') LIMIT 1").first<{id:string;state:string;revision:number}>();
 const configured=Boolean(env.PAGES_DEPLOY_HOOK&&env.CATALOG_BUILD_TOKEN&&env.CF_ACCOUNT_ID&&env.CF_PAGES_PROJECT&&env.CF_API_TOKEN);
 const state=q.paused?'Failed':active?(active.state==='building'?'Building':'Queued'):q.saved_revision<=q.published_revision?'Live':configured?'Queued':'Saved';
 return {state,savedRevision:q.saved_revision,publishedRevision:q.published_revision,active,configured,error:q.error,message:!configured?'Saved—publishing needs configuration':q.error||state};
}
export async function advancePublication(env:Env){
 const status=await publicationStatus(env);
 if(status.active||status.state==='Failed'||!status.configured||status.savedRevision<=status.publishedRevision)return status;
 const id=crypto.randomUUID();
 // The snapshot and revision are captured in ONE SQL statement. The partial unique index arbitrates concurrent workers.
 await env.DB.prepare(`INSERT OR IGNORE INTO publications(id,data,revision)
 SELECT ?,json_object('publicationId',?,'settings',json((SELECT data FROM settings WHERE id=1)),
 'products',json(COALESCE((SELECT json_group_array(json(data)) FROM products WHERE json_extract(data,'$.status')='published'),'[]'))),saved_revision
 FROM publication_queue WHERE id=1 AND paused=0 AND saved_revision>published_revision
 AND NOT EXISTS(SELECT 1 FROM publications WHERE state IN ('pending','building'))`).bind(id,id).run();
 const row=await env.DB.prepare('SELECT data FROM publications WHERE id=?').bind(id).first<{data:string}>();
 if(!row)return publicationStatus(env);
 try{
  const catalog=JSON.parse(row.data) as Catalog;
  if(!catalog.settings)throw Error('Business settings are missing');catalog.settings=settingsSchema.parse(catalog.settings);
  const errors=catalog.products.flatMap(p=>[...publicationErrors(p),...(!catalog.settings.categories.some(c=>c.slug===p.category)?['Select an existing category']:[])].map(e=>`${p.name}: ${e}`));
  if(new Set(catalog.products.map(p=>p.slug)).size!==catalog.products.length)errors.push('Duplicate product URLs');
  if(errors.length)throw Error(errors.join('\n'));
  const url=new URL(env.PAGES_DEPLOY_HOOK);if(url.protocol!=='https:'||url.hostname!=='api.cloudflare.com')throw Error('Use a Cloudflare Pages deploy hook');
  const response=await fetch(url,{method:'POST',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Pages rejected publication. Check deploy hook configuration.');
  // Hook response IDs are not assumed to be Pages deployment IDs. Build callback records the actual deployment URL.
 }catch(error){
  const message=error instanceof Error?error.message:'Publishing failed';
  await env.DB.batch([
   env.DB.prepare("UPDATE publications SET state='failed',error=? WHERE id=? AND state IN ('pending','building')").bind(message,id),
   env.DB.prepare('UPDATE publication_queue SET paused=1,error=? WHERE id=1').bind(message)
  ]);
 }
 return publicationStatus(env);
}
export async function retryPublication(env:Env){await env.DB.prepare('UPDATE publication_queue SET paused=0,error=NULL WHERE id=1').run();return advancePublication(env);}
