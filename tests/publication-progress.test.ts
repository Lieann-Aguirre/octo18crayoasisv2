import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationProgressText,publicationStillPending,type PublicationProgress} from '../src/lib/publication-progress';
const status:PublicationProgress={state:'Queued',savedRevision:8,publishedRevision:6,configured:true,active:null};
test('a saved edit is pending until its revision is verified live',()=>{
 assert(publicationStillPending(status,8));assert.match(publicationProgressText(status,8),/no further action/i);
 const live={...status,state:'Live',publishedRevision:8};assert.equal(publicationStillPending(live,8),false);assert.match(publicationProgressText(live,8),/Saved and live/);
});
test('older active builds never imply the latest edit is live or requires another publish click',()=>{
 const building={...status,state:'Building',active:{revision:7}};
 assert.match(publicationProgressText(building,8),/automatically next/);assert(publicationStillPending(building,8));
});
test('configuration, failure and later builds retain truthful saved-edit messages',()=>{
 const missing={...status,configured:false};assert.match(publicationProgressText(missing,8),/Saved revision 8/);assert.equal(publicationStillPending(missing,8),false);
 const failed={...status,state:'Failed',error:'Build rejected'};assert.match(publicationProgressText(failed,8),/Your edit is kept/);assert.equal(publicationStillPending(failed,8),false);
 assert.match(publicationProgressText({...status,state:'Building',publishedRevision:9,active:{revision:10}},8),/Saved and live/);
});
