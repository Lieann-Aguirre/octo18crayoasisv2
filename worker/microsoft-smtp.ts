export interface SmtpConfig {
  MICROSOFT_TENANT_ID:string; MICROSOFT_CLIENT_ID:string; MICROSOFT_CLIENT_SECRET:string;
  SMTP_USER:string; NOTIFY_FROM:string; NOTIFY_TO:string;
}
export interface Mail {id:string;subject:string;text:string;replyTo:string}
type Connection = Pick<Socket,'readable'|'writable'|'opened'|'closed'|'close'|'startTls'>;
export type Connector = () => Promise<Connection>;
const mailbox=(value:string)=>{
  if(!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(value))throw new Error('Invalid notification mailbox');
  return value;
};
const base64=(value:string)=>btoa(Array.from(new TextEncoder().encode(value),b=>String.fromCharCode(b)).join(''));
export function messageData(config:SmtpConfig,mail:Mail){
  if(!/^[a-zA-Z0-9-]+$/.test(mail.id)||/[\r\n]/.test(mail.subject))throw new Error('Invalid mail headers');
  const from=mailbox(config.NOTIFY_FROM),to=mailbox(config.NOTIFY_TO),reply=mailbox(mail.replyTo);
  return [`From: ${from}`,`To: ${to}`,`Reply-To: ${reply}`,`Subject: =?UTF-8?B?${base64(mail.subject)}?=`,
    `Message-ID: <quote-${mail.id}@${from.split('@')[1]}>`,`Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',
    base64(mail.text).match(/.{1,76}/g)?.join('\r\n')||''].join('\r\n')+'\r\n.\r\n';
}
class Session {
  reader; writer; buffer=''; decoder=new TextDecoder();
  constructor(socket:Connection){this.reader=socket.readable.getReader();this.writer=socket.writable.getWriter();}
  release(){this.reader.releaseLock();this.writer.releaseLock();}
  async write(value:string){await this.writer.write(new TextEncoder().encode(value));}
  async response(expected:number){
    const lines:string[]=[];
    for(let count=0;count<100;count++){
      while(!this.buffer.includes('\r\n')){
        const part=await this.reader.read();if(part.done)throw new Error('SMTP connection ended');
        this.buffer+=this.decoder.decode(part.value,{stream:true});
        if(this.buffer.length>65536)throw new Error('SMTP response too large');
      }
      const index=this.buffer.indexOf('\r\n'),line=this.buffer.slice(0,index);this.buffer=this.buffer.slice(index+2);
      if(!/^\d{3}(?:[ -]|$)/.test(line)||Number(line.slice(0,3))!==expected)throw new Error('SMTP command rejected');
      lines.push(line);if(line[3]!=='-')return lines.join('\n');
    }
    throw new Error('SMTP response too long');
  }
  async command(value:string,code:number){await this.write(value+'\r\n');return this.response(code);}
}
const connectMicrosoft:Connector=async()=>{
  const {connect}=await import('cloudflare:sockets');
  return connect({hostname:'smtp.office365.com',port:587},{secureTransport:'starttls',allowHalfOpen:false});
};
/** Fixed Microsoft endpoint: credentials are never sent to a configurable host. */
export async function sendMicrosoftSmtp(config:SmtpConfig,mail:Mail,connect:Connector=connectMicrosoft){
  const data=messageData(config,mail);mailbox(config.SMTP_USER);
  if(config.SMTP_USER.toLowerCase()!==config.NOTIFY_FROM.toLowerCase())throw new Error('Sender must match SMTP mailbox');
  const guid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!guid.test(config.MICROSOFT_TENANT_ID)||!guid.test(config.MICROSOFT_CLIENT_ID)||!config.MICROSOFT_CLIENT_SECRET)throw new Error('Microsoft credentials missing');
  const tokenResponse=await fetch(`https://login.microsoftonline.com/${config.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,{
    method:'POST',body:new URLSearchParams({client_id:config.MICROSOFT_CLIENT_ID,client_secret:config.MICROSOFT_CLIENT_SECRET,grant_type:'client_credentials',scope:'https://outlook.office365.com/.default'}),signal:AbortSignal.timeout(10000)});
  if(!tokenResponse.ok)throw new Error('Microsoft token request failed');
  const token=await tokenResponse.json() as {access_token?:string};
  if(!token.access_token||/[\x00-\x20]/.test(token.access_token))throw new Error('Invalid Microsoft token');
  let cancelled=false;let socket:Connection|undefined;let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    await Promise.race([(async()=>{
      socket=await connect();if(cancelled){await socket.close().catch(()=>{});throw new Error('SMTP timeout');}void socket.closed.catch(()=>{});await socket.opened;let session=new Session(socket);
      await session.response(220);
      const greeting=await session.command('EHLO octo18crayoasis.online',250);
      if(!/^250[ -]STARTTLS\b/im.test(greeting))throw new Error('SMTP requires STARTTLS');
      await session.command('STARTTLS',220);session.release();socket=socket.startTls();void socket.closed.catch(()=>{});await socket.opened;
      session=new Session(socket);
      const secureGreeting=await session.command('EHLO octo18crayoasis.online',250);
      if(!/^250[ -]AUTH .*\bXOAUTH2\b/im.test(secureGreeting))throw new Error('SMTP requires XOAUTH2');
      await session.command('AUTH XOAUTH2',334);
      await session.command(base64(`user=${config.SMTP_USER}\x01auth=Bearer ${token.access_token}\x01\x01`),235);
      await session.command(`MAIL FROM:<${config.NOTIFY_FROM}>`,250);
      await session.command(`RCPT TO:<${config.NOTIFY_TO}>`,250);
      await session.command('DATA',354);await session.write(data);await session.response(250);
      // The DATA acknowledgement establishes acceptance; QUIT failure must not retry accepted mail.
    })(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('SMTP timeout')),15000);})]);
  }finally{cancelled=true;if(timer)clearTimeout(timer);if(socket)await socket.close().catch(()=>{});}
}
