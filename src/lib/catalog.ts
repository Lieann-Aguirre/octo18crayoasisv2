import raw from '../../data/build-catalog.json';
import {settingsSchema,type Catalog,type Product} from './model';

export const catalog=raw as Catalog;
export const settings=settingsSchema.parse(catalog.settings);
export const categories=settings.categories;
export const products=catalog.products.filter(p=>p.status==='published');
export const money=(n:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:2}).format(n);
export const price=(p:Product)=>{const prices=p.variants.map(v=>v.price).filter(v=>v>0);return prices.length?`From ${money(Math.min(...prices))}`:'Price on request';};
export const wa=(message:string)=>`https://wa.me/${settings.phone.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
export const image=(p:Product)=>p.images.find(i=>i.role==='cover')?.url||'/placeholder.svg';
export const summary=(p:Product)=>p.description.replace(/\s+/g,' ').slice(0,155)||`${p.name}. Ask Octo18 Crayoasis Stationery in Manila for pricing and availability.`;
