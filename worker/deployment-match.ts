export type PagesDeployment={id:string;url?:string;aliases?:string[];environment?:string;latest_stage?:{status:string;name:string}};
function safeDeploymentUrl(url:string|undefined,project:string){try{const u=new URL(url||'');return u.protocol==='https:'&&u.hostname.endsWith(`.${project}.pages.dev`);}catch{return false;}}
function normalized(url:string){try{return new URL(url).origin;}catch{return '';}}
/** Prefer recorded metadata; recover missing/alias callbacks using the immutable marker on successful deployment URLs. */
export async function matchDeployment(deployments:PagesDeployment[],record:{deployment_id:string;deployment_url:string},project:string,publicationId:string){
 const direct=deployments.find(d=>d.id===record.deployment_id||Boolean(record.deployment_url)&&[d.url,...d.aliases||[]].some(url=>url&&normalized(url)===normalized(record.deployment_url)));
 if(direct)return direct;
 const candidates=deployments.filter(d=>d.latest_stage?.name==='deploy'&&d.latest_stage.status==='success'&&d.environment!=='preview'&&safeDeploymentUrl(d.url,project)).slice(0,5);
 const matches=await Promise.all(candidates.map(async deployment=>{
  try{const response=await fetch(`${normalized(deployment.url!)}/publication.json`,{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)return null;const marker=await response.json() as {publicationId?:string};return marker.publicationId===publicationId?deployment:null;}catch{return null;}
 }));
 return matches.find(d=>d!==null)||undefined;
}
