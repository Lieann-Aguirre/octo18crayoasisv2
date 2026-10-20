import type {Product} from './model';

// Build-time editorial selections. Missing/hidden products fall back to the same category.
export const categoryPhotography:Record<string,string>={
 'pens-writing':'20273922063',
 pencils:'51867065643',
 'notebooks-record-books':'51867065641',
 'paper-printing':'44817085596',
 'filing-envelopes':'51967065633',
 adhesives:'55017070500',
 'office-accessories':'51867065609',
};
export const featuredFallback=['20273922063','21473918946','55117070441','51867065641','55017070500','17092877362','51867065609','44817085596'];
export const campaigns=[
 {key:'school',label:'School essentials',eyebrow:'For lessons, projects and fresh starts',title:'Ready for your next bright idea.',description:'Find dependable pencils, smooth-writing pens and the little things that make school days feel organised.',href:'/collections/school/',action:'Explore school supplies',productIds:['20273922063','51867065643'],fallbackCategory:'pencils'},
 {key:'office',label:'Office essentials',eyebrow:'Make room for better workdays',title:'A well-stocked desk. A clearer day.',description:'Bring your workspace together with record books, writing tools and practical office essentials.',href:'/collections/office/',action:'Explore office supplies',productIds:['51867065641','51867065609'],fallbackCategory:'office-accessories'},
 {key:'paper',label:'Paper & printing supplies',eyebrow:'From everyday copies to important projects',title:'The right paper for your next print run.',description:'Explore paper by size, weight and pack. Choose your options and review an estimate before requesting a quotation.',href:'/categories/paper-printing/',action:'Browse paper supplies',productIds:['44817085596','55317070495'],fallbackCategory:'paper-printing'},
] as const;

export function selectFeatured(products:Product[]){
 const marked=products.filter(p=>p.featured);
 const preferred=featuredFallback.map(id=>products.find(p=>p.id===id)).filter((p):p is Product=>Boolean(p));
 return (marked.length?marked:[...preferred,...products.filter(p=>!featuredFallback.includes(p.id))]).slice(0,8);
}
export function selectCampaignProducts(products:Product[],ids:readonly string[],category:string){
 const selected=ids.map(id=>products.find(p=>p.id===id)).filter((p):p is Product=>Boolean(p));
 return [...selected,...products.filter(p=>p.category===category&&!selected.some(s=>s.id===p.id))].slice(0,2);
}
export function selectPaperHighlights(products:Product[],featured:Product[]){
 const paper=products.filter(p=>p.category==='paper-printing');
 return [...paper.filter(p=>!featured.some(f=>f.id===p.id)),...paper.filter(p=>featured.some(f=>f.id===p.id))].slice(0,4);
}
