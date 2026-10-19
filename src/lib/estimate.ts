import type {Product} from './model';
export type EstimateInput={productId:string;variantId:string;quantity:number};
export type EstimateLine=EstimateInput&{name:string;variant:string;unit:string;unitPriceCents:number|null;subtotalCents:number|null;available:boolean};
export type QuoteEstimate={currency:'PHP';publicationId:string;items:EstimateLine[];grandTotalCents:number;unpricedCount:number};
// Small runtime guard for browser/API responses; avoids shipping the admin catalog validator.
export function isQuoteEstimate(value:unknown):value is QuoteEstimate{
 if(!value||typeof value!=='object')return false;const e=value as Record<string,unknown>;
 if(e.currency!=='PHP'||typeof e.publicationId!=='string'||!Array.isArray(e.items)||e.items.length>100||!Number.isSafeInteger(e.grandTotalCents)||Number(e.grandTotalCents)<0||!Number.isInteger(e.unpricedCount)||Number(e.unpricedCount)<0)return false;
 return e.items.every((x:unknown)=>{if(!x||typeof x!=='object')return false;const i=x as Record<string,unknown>;return ['productId','variantId','name','variant','unit'].every(k=>typeof i[k]==='string')&&typeof i.available==='boolean'&&Number.isInteger(i.quantity)&&Number(i.quantity)>0&&Number(i.quantity)<=1000000&&['unitPriceCents','subtotalCents'].every(k=>i[k]===null||(Number.isSafeInteger(i[k])&&Number(i[k])>=0));});
}
export function calculateEstimate(items:EstimateInput[],products:Product[],publicationId='preview'):QuoteEstimate{
 let grandTotalCents=0,unpricedCount=0;
 const lines=items.map(item=>{if(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>1000000)throw Error('Enter a whole-number quantity from 1 to 1,000,000.');
 const p=products.find(p=>p.id===item.productId),v=p?.variants.find(v=>v.id===item.variantId);
 const unitPriceCents=p?.priceApproved&&v&&v.price>0?Math.round(v.price*100):null;
 const subtotalCents=unitPriceCents===null?null:unitPriceCents*item.quantity;
 if(subtotalCents===null)unpricedCount++;else grandTotalCents+=subtotalCents;
 if(!Number.isSafeInteger(grandTotalCents))throw Error('This estimate is too large. Please request a smaller quantity or contact us directly.');
 return {...item,name:p?.name||'Unavailable product',variant:v?.name||'Unavailable option',unit:p?.unit||'',unitPriceCents,subtotalCents,available:Boolean(p&&v)};});
 return {currency:'PHP',publicationId,items:lines,grandTotalCents,unpricedCount};
}
export const php=(cents:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(cents/100);
export function samePricing(a:QuoteEstimate,b:QuoteEstimate){return a.currency===b.currency&&a.unpricedCount===b.unpricedCount&&a.grandTotalCents===b.grandTotalCents&&a.items.length===b.items.length&&a.items.every((x,i)=>{const y=b.items[i];return x.productId===y.productId&&x.variantId===y.variantId&&x.quantity===y.quantity&&x.unit===y.unit&&x.available===y.available&&x.unitPriceCents===y.unitPriceCents&&x.subtotalCents===y.subtotalCents;});}
export function estimateText(estimate?:QuoteEstimate){if(!estimate)return 'Estimate not recorded';if(!estimate.items.length)return 'Free-form request — pricing to be confirmed.';return estimate.items.map(i=>`${i.name} | ${i.variant} | ${i.quantity} × ${i.unitPriceCents===null?'Price on request':php(i.unitPriceCents)} | Subtotal: ${i.subtotalCents===null?'Price on request':php(i.subtotalCents)}`).join('\n')+`\n${estimate.unpricedCount?'Priced-items subtotal':'Estimated Grand Total'}: ${php(estimate.grandTotalCents)}${estimate.unpricedCount?' (unpriced items excluded)':''}\nExcludes delivery and separately quoted services. Subject to final quotation.`;}
