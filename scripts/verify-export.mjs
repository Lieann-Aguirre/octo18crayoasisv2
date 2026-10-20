import {readFile,readdir,access} from 'node:fs/promises';import path from 'node:path';
const catalog=JSON.parse(await readFile('data/build-catalog.json','utf8'));const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat();const htmls=(await walk('dist')).filter(p=>p.endsWith('.html'));const errors=[];const titles=new Set();
for(const file of htmls){const html=await readFile(file,'utf8');const title=html.match(/<title>(.*?)<\/title>/)?.[1];if(!title)errors.push(`${file}: missing title`);if(titles.has(title))errors.push(`${file}: duplicate title`);titles.add(title);if(!html.includes('name="description"'))errors.push(`${file}: missing description`);if(catalog.preview&&!html.includes('noindex, nofollow'))errors.push(`${file}: preview must be noindex`);for(const match of html.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[?#][^"]*)?"/g)){const url=match[1];if(url.startsWith('//')||url.startsWith('/api/')||url.startsWith('/media/'))continue;const target=path.join('dist',decodeURIComponent(url));try{await access(url.endsWith('/')?path.join(target,'index.html'):target);}catch{errors.push(`${file}: missing internal target ${url}`);}}
 for(const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)){try{JSON.parse(match[1]);}catch{errors.push(`${file}: invalid JSON-LD`);}}
}
for(const p of catalog.products.filter(p=>p.status==='published')){const html=await readFile(`dist/products/${p.slug}/index.html`,'utf8');if(p.variants.some(v=>v.price<=0)&&html.includes('AggregateOffer'))errors.push(`${p.id}: unpriced offer markup`);if(/historicalStock|weightKg/.test(html))errors.push(`${p.id}: private source data leaked`);}
// A new marker beside stale product HTML must fail the build, not masquerade as a new catalog.
for(const p of catalog.products.filter(p=>p.status==='published')){
 const html=await readFile(`dist/products/${p.slug}/index.html`,'utf8');
 const embedded=html.match(/<script[^>]*id="product-data"[^>]*>([\s\S]*?)<\/script>/)?.[1];
 try{const data=JSON.parse(embedded||'{}');if(data.id!==p.id||data.name!==p.name||data.description!==p.description)errors.push(`${p.id}: stale generated product payload`);}catch{errors.push(`${p.id}: invalid product payload`);}
}
if(!catalog.preview){for(const file of htmls){const html=await readFile(file,'utf8');if(!html.includes(`name="octo18-publication" content="${catalog.publicationId}"`))errors.push(`${file}: stale publication metadata`);}}
const home=await readFile('dist/index.html','utf8');
const campaignTags=[...home.matchAll(/<div\b[^>]*\bdata-carousel-slide\b[^>]*>/g)].map(m=>m[0]);
if(campaignTags.length<1||campaignTags.filter(tag=>! /\shidden(?:[\s=>])/.test(tag)).length!==1)errors.push('Homepage: exactly one campaign must be visible without JavaScript');
if(campaignTags.filter(tag=>/\sinert(?:[\s=>])/.test(tag)).length!==campaignTags.length-1)errors.push('Homepage: inactive campaigns must be inert');
for(const img of home.matchAll(/<img\b[^>]*\bdata-carousel-src=[^>]*>/g))if(/\s(?:src|srcset)=/.test(img[0]))errors.push('Homepage: deferred carousel images must not download before selection');
const categoryCards=(home.match(/class="category-tile photographic-category"/g)||[]).length;
const stockedCategories=new Set(catalog.products.filter(p=>p.status==='published').map(p=>p.category));
if(categoryCards!==stockedCategories.size)errors.push('Homepage: stocked category highlights do not match catalog');
const font=await readFile('dist/fonts/InterVariable.woff2');
if(font.subarray(0,4).toString()!=='wOF2')errors.push('Invalid local Inter WOFF2 file');
if(errors.length)throw Error(errors.slice(0,25).join('\n'));console.log(`Verified ${htmls.length} HTML pages: internal links/assets, metadata, JSON-LD, product payload consistency, price gating, preview indexing and progressive homepage rendering.`);
