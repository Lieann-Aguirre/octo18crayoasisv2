/** Hash the exact public build payload, independent of transport metadata. */
export async function catalogFingerprint(catalog:{products:unknown[];settings:unknown}){
 const bytes=new TextEncoder().encode(JSON.stringify({products:catalog.products,settings:catalog.settings}));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
}
