import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const script=resolve('scripts/sync-catalog.mjs');
function scratch(){const root=mkdtempSync(join(tmpdir(),'octo18-build-audit-'));mkdirSync(join(root,'public/product-images'),{recursive:true});mkdirSync(join(root,'data'));writeFileSync(join(root,'data/products.json'),'[]');writeFileSync(join(root,'data/settings.json'),'{}');writeFileSync(join(root,'public/publication.json'),'{"publicationId":"stale"}');return root;}
function remove(root:string){assert(resolve(root).startsWith(resolve(tmpdir())+'\\'));assert(root.includes('octo18-build-audit-'));rmSync(root,{recursive:true,force:true});}
test('Pages build cannot silently deploy a preview when catalog API configuration is missing',()=>{const root=scratch();try{const result=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8',env:{...process.env,CF_PAGES:'1',CATALOG_API_URL:'',CATALOG_BUILD_TOKEN:'',ALLOW_CATALOG_PREVIEW:'',REQUIRE_APPROVED_CATALOG:''}});assert.notEqual(result.status,0);assert.match(result.stderr,/Pages must use the live catalog API/);assert(!existsSync(join(root,'public/publication.json')));}finally{remove(root);}});
test('local previews remove stale live-publication markers',()=>{const root=scratch();try{const result=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8',env:{...process.env,CF_PAGES:'',CATALOG_API_URL:'',CATALOG_BUILD_TOKEN:'',REQUIRE_APPROVED_CATALOG:''}});assert.equal(result.status,0,result.stderr);assert(!existsSync(join(root,'public/publication.json')));}finally{remove(root);}});

test('production sync records exact payload fingerprint and refuses a pinned obsolete publication',()=>{
 for(const pinned of [false,true]){const root=scratch();try{
 const setup=`globalThis.fetch=async input=>new Response(JSON.stringify({publicationId:String(input).includes('publication=')?'old':'current',revision:6,products:[],settings:{}}),{headers:{'Content-Type':'application/json'}});await import(${JSON.stringify(pathToFileURL(script).href)});`;
 const result=spawnSync(process.execPath,['--input-type=module','--eval',setup],{cwd:root,encoding:'utf8',env:{...process.env,CF_PAGES:'1',CF_PAGES_URL:'',CATALOG_API_URL:'https://shop.test',CATALOG_BUILD_TOKEN:'test',PUBLICATION_ID:pinned?'old':''}});
 if(pinned){assert.notEqual(result.status,0);assert.match(result.stderr,/pins an obsolete snapshot/);}else{assert.equal(result.status,0,result.stderr);const marker=JSON.parse(readFileSync(join(root,'public/publication.json'),'utf8'));assert.equal(marker.publicationId,'current');assert.equal(marker.revision,6);assert.match(marker.fingerprint,/^[a-f0-9]{64}$/);}
 }finally{remove(root);}}
});
