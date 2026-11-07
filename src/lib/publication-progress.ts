export type PublicationProgress={state:string;savedRevision:number;publishedRevision:number;configured:boolean;active?:{revision:number}|null;error?:string|null;message?:string};
export function publicationProgressText(status:PublicationProgress,target:number){
 if(status.publishedRevision>=target)return `Saved and live on the website. Revision ${target}.`;
 if(!status.configured)return `Saved revision ${target}. Automatic publishing needs a one-time deployment configuration update. Your edit is kept.`;
 if(status.state==='Failed')return `Saved revision ${target}. Publishing failed: ${status.error||status.message||'Check the deployment log.'} Your edit is kept; saving again retries publication.`;
 if(status.active&&status.active.revision<target)return `Saved revision ${target}. An earlier build is finishing; your update will publish automatically next. No further action is needed.`;
 return `Saved revision ${target}. ${status.state==='Building'?'Building the website':'Publication queued'}. Your update will go live automatically; no further action is needed.`;
}
export function publicationStillPending(status:PublicationProgress,target:number){return status.configured&&status.state!=='Failed'&&status.publishedRevision<target;}
