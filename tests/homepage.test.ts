import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAROUSEL_DELAY,canAdvance,moveSlide,swipeDirection,type CarouselState} from '../src/lib/carousel-state';
import {campaigns,categoryPhotography,selectFeatured,selectPaperHighlights,selectCampaignProducts} from '../src/lib/homepage';
import type {Product} from '../src/lib/model';
const products=JSON.parse(readFileSync('data/products.json','utf8')) as Product[];
const ready=():CarouselState=>({index:0,count:3,userPaused:false,reducedMotion:false,hovered:false,focused:false,inView:true,documentVisible:true});

test('carousel advances only when every autoplay safety condition permits it',()=>{
 assert.equal(CAROUSEL_DELAY,7000);assert(canAdvance(ready()));
 for(const blocker of ['userPaused','reducedMotion','hovered','focused'] as const)assert.equal(canAdvance({...ready(),[blocker]:true}),false,blocker);
 for(const blocker of ['inView','documentVisible'] as const)assert.equal(canAdvance({...ready(),[blocker]:false}),false,blocker);
 assert.equal(canAdvance({...ready(),count:1}),false);
});
test('manual carousel navigation wraps and remains paused until explicitly played',()=>{
 const previous=moveSlide(ready(),-1,true);assert.equal(previous.index,2);assert(previous.userPaused);assert.equal(canAdvance(previous),false);
 const played={...previous,userPaused:false};assert(canAdvance(played));assert.equal(moveSlide(played,3).index,0);assert.equal(moveSlide(played,3).userPaused,false);
 const paused=moveSlide(previous,0);assert(paused.userPaused);assert.equal(ready().index,0);
});
test('swipes ignore small movements and vertical scrolling',()=>{
 assert.equal(swipeDirection(-90,10),1);assert.equal(swipeDirection(90,10),-1);
 for(const [dx,dy] of [[20,2],[49,0],[50,100],[80,70],[0,100]])assert.equal(swipeDirection(dx,dy),0);
});
test('featured curation respects explicit selections, caps at eight and never changes catalog flags',()=>{
 const original=JSON.stringify(products);const fallback=selectFeatured(products);assert.equal(fallback.length,8);assert.equal(new Set(fallback.map(p=>p.id)).size,8);assert.equal(JSON.stringify(products),original);
 const marked=products.map((p,i)=>({...p,featured:i===10||i===20}));assert.deepEqual(selectFeatured(marked).map(p=>p.id),[marked[10].id,marked[20].id]);assert.equal(selectFeatured([]).length,0);
});
test('paper highlights avoid featured products when enough alternatives exist',()=>{
 const featured=selectFeatured(products),paper=selectPaperHighlights(products,featured);assert.equal(paper.length,4);assert(paper.every(p=>p.category==='paper-printing'));assert(paper.every(p=>!featured.some(f=>f.id===p.id)));
 assert.equal(selectPaperHighlights(products.filter(p=>p.category!=='paper-printing'),featured).length,0);
});
test('campaign and category photography resolves to catalog products and survives removals',()=>{
 for(const [category,id] of Object.entries(categoryPhotography))assert(products.some(p=>p.id===id&&p.category===category),category);
 for(const campaign of campaigns){const selected=selectCampaignProducts(products,campaign.productIds,campaign.fallbackCategory);assert.equal(selected.length,2);assert.equal(new Set(selected.map(p=>p.id)).size,2);const removed=products.filter(p=>!campaign.productIds.some(id=>id===p.id));assert(selectCampaignProducts(removed,campaign.productIds,campaign.fallbackCategory).every(p=>p.category===campaign.fallbackCategory));}
 assert.deepEqual(selectCampaignProducts([],[], 'paper-printing'),[]);
});
