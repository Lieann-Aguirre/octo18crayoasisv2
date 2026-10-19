import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {productSchema,publicationErrors} from '../src/lib/model.ts';
const path='data/products.json';
const products=JSON.parse(await readFile(path,'utf8'));
const now=new Date().toISOString();
const paperIds=products.filter(p=>/paper/i.test(p.name)&&!/^Paperclips\b/i.test(p.name)).map(p=>p.id);
if(paperIds.length!==20)throw Error('Expected exactly 20 paper products; review matches before approving.');
await mkdir('data/approval-archive',{recursive:true});
await writeFile(`data/approval-archive/catalog-${now.replace(/[:.]/g,'-')}.json`,JSON.stringify(products,null,2));
for(const product of products){
 if(paperIds.includes(product.id))product.category='paper-printing';
 product.contentApproved=true;product.packConfirmed=true;product.priceApproved=true;product.status='published';
 for(const image of product.images){image.review.status='Approved';image.review.suitable='Yes';image.review.reviewedBy='Owner approval via chat';image.review.reviewedAt=now;}
 productSchema.parse(product);
 const errors=publicationErrors(product);if(errors.length)throw Error(`${product.id}: ${errors.join('; ')}`);
}
await writeFile(path,JSON.stringify(products,null,2)+'\n');
// Patch approvals only in D1: retain current dashboard descriptions, prices, units and image recommendations.
const ids=products.map(p=>`'${p.id.replaceAll("'","''")}'`).join(',');
const sql=`UPDATE products SET data=json_set(data,'$.contentApproved',json('true'),'$.packConfirmed',json('true'),'$.priceApproved',json('true'),'$.status','published','$.images',json(COALESCE((SELECT json_group_array(json(json_set(image.value,'$.review.status','Approved','$.review.suitable','Yes','$.review.reviewedBy','Owner approval via chat','$.review.reviewedAt','${now}'))) FROM json_each(products.data,'$.images') AS image),'[]'))),updated_at=datetime('now') WHERE id IN (${ids});\n`;
const paperSql=`UPDATE products SET data=json_set(data,'$.category','paper-printing'),updated_at=datetime('now') WHERE id IN (${paperIds.map(id=>`'${id.replaceAll("'","''")}'`).join(',')});\n`;
await writeFile('data/approve-catalog.sql',sql+paperSql);
console.log(`Approved ${products.length} products, ${products.reduce((n,p)=>n+p.variants.length,0)} variants and ${products.reduce((n,p)=>n+p.images.length,0)} images locally. D1 approval-only SQL: data/approve-catalog.sql. Publication remains separate.`);
