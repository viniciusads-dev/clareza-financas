import {z} from 'zod';
import {addMonths,cardDue,splitAmount,type State,type Transaction} from '../../shared/finance';
import {authenticate,HttpError,newToken,requireSameOrigin,requireScope,requireSession,tokenHash} from './auth';
export interface Env {DB:D1Database}
const cents=z.number().int().min(0).max(100000000000);
const amount=cents.min(1);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T12:00:00Z');return !isNaN(+d)&&d.toISOString().slice(0,10)===v;},'Data inválida');
const name=z.string().trim().min(1).max(100);
const id=z.string().min(1).max(100);
const color=z.string().regex(/^#[\da-fA-F]{6}$/);
const schemas={
 accounts:z.object({name,kind:z.enum(['checking','cash','credit']),opening:z.number().int().min(-100000000000).max(100000000000),color,limit:cents,closing:z.number().int().min(1).max(31),due:z.number().int().min(1).max(31)}).strict(),
 transactions:z.object({title:name,amount,type:z.enum(['expense','income','transfer']),category:name,accountId:id,toId:id.optional(),date,status:z.enum(['paid','pending']),invoiceMonth:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),installments:z.number().int().min(1).max(48).default(1)}).strict(),
 budgets:z.object({category:name,amount,month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)}).strict(),
 goals:z.object({name,target:amount,saved:cents,date,color}).strict(),
};
const tokenInput=z.object({name:z.string().trim().min(1).max(60),scopes:z.array(z.enum(['finance:read','finance:write'])).min(1).max(2),expiresInDays:z.number().int().min(1).max(365).optional()}).strict();
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"}});}
export async function readState(db:D1Database,owner:string):Promise<State>{const {results}=await db.prepare('SELECT id, kind, data FROM finance_records WHERE owner = ? ORDER BY created, id').bind(owner).all<{id:string;kind:keyof State;data:string}>();const state:State={accounts:[],transactions:[],budgets:[],goals:[]};for(const r of results){if(r.kind in state)(state[r.kind] as unknown[]).push({...JSON.parse(r.data),id:r.id});}return state;}
function insert(db:D1Database,owner:string,kind:string,data:object,recordId=crypto.randomUUID()){return db.prepare('INSERT INTO finance_records (id, owner, kind, data, created) VALUES (?, ?, ?, ?, ?)').bind(recordId,owner,kind,JSON.stringify(data),Date.now());}
async function body(request:Request){if(!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'Envie dados em JSON.');if(Number(request.headers.get('content-length')??0)>16000)throw new HttpError(413,'Solicitação muito grande.');const reader=request.body?.getReader();let size=0;const chunks:Uint8Array[]=[];if(reader){while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();throw new HttpError(413,'Solicitação muito grande.');}chunks.push(value);}}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const text=new TextDecoder().decode(bytes);try{return JSON.parse(text);}catch{throw new HttpError(400,'Dados inválidos.');}}
export async function handleApi(request:Request,env:Env):Promise<Response>{
 try {
  const url=new URL(request.url);
  if(!request.headers.get('authorization')&&!request.headers.get('oai-authenticated-user-id'))throw new HttpError(401,'Autentique-se pela sua sessão ou com um Bearer token válido.');
  if(!env.DB)throw new HttpError(503,'Não foi possível acessar seus dados. Tente novamente.');
  const actor=await authenticate(request,env.DB);
  if(!actor)throw new HttpError(401,'Autentique-se pela sua sessão ou com um Bearer token válido.');
  const owner=actor.owner;
  const path=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean);
  if(path[0]==='auth'&&path[1]==='tokens'){
   requireSession(actor);
   if(request.method==='GET'){
    const {results}=await env.DB.prepare('SELECT id, name, prefix, scopes, created, expires_at, revoked_at, last_used_at FROM finance_api_tokens WHERE owner = ? ORDER BY created DESC').bind(owner).all();
    return json({tokens:results});
   }
   requireSameOrigin(request,url,actor);
   if(request.method==='POST'){
    const input=tokenInput.safeParse(await body(request));if(!input.success)throw new HttpError(400,input.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));
    const active=await env.DB.prepare('SELECT COUNT(*) AS count FROM finance_api_tokens WHERE owner = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)').bind(owner,Date.now()).first<{count:number}>();
    if((active?.count??0)>=10)throw new HttpError(409,'Você já possui 10 tokens ativos. Revogue um antes de criar outro.');
    const token=newToken(), created=Date.now(), expiresAt=input.data.expiresInDays?created+input.data.expiresInDays*86400000:null, id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO finance_api_tokens (id, owner, name, token_hash, prefix, scopes, created, expires_at, revoked_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)').bind(id,owner,input.data.name,await tokenHash(token),token.slice(0,13),JSON.stringify([...new Set(input.data.scopes)]),created,expiresAt).run();
    return json({id,name:input.data.name,token,scopes:[...new Set(input.data.scopes)],expiresAt},201);
   }
   if(request.method==='DELETE'&&path[2]){
    const result=await env.DB.prepare('UPDATE finance_api_tokens SET revoked_at = ? WHERE id = ? AND owner = ? AND revoked_at IS NULL').bind(Date.now(),path[2],owner).run();
    const changes=(result as {meta?:{changes?:number};changes?:number}).meta?.changes ?? (result as {changes?:number}).changes ?? 0;
    if(!changes)throw new HttpError(404,'Token não encontrado ou já revogado.');
    return json({ok:true});
   }
   throw new HttpError(405,'Operação não permitida.');
  }
  if(request.method==='GET'&&path[0]==='state'){requireScope(actor,'finance:read');return json(await readState(env.DB,owner));}
  if(!['POST','PUT','DELETE'].includes(request.method))throw new HttpError(405,'Operação não permitida.');
  requireScope(actor,'finance:write');
  requireSameOrigin(request,url,actor);
  const key=request.headers.get('idempotency-key');if(!key||!z.string().uuid().safeParse(key).success)throw new HttpError(400,'Chave de operação inválida.');
  const requestId=owner+':'+key;
  const prior=await env.DB.prepare('SELECT id FROM finance_requests WHERE id = ? AND owner = ?').bind(requestId,owner).first();
  if(prior)return json({ok:true,replayed:true});
  const recent=await env.DB.prepare('SELECT COUNT(*) AS count FROM finance_requests WHERE owner = ? AND created > ?').bind(owner,Date.now()-60000).first<{count:number}>();
  if((recent?.count??0)>=90)throw new HttpError(429,'Muitas alterações de uma vez. Aguarde um minuto.');
  const kind=path[0] as keyof typeof schemas;if(!Object.hasOwn(schemas,kind))throw new HttpError(404,'Recurso não encontrado.');
  const state=await readState(env.DB,owner);const list=state[kind];const record=path[1]?list.find(r=>r.id===path[1]):undefined;
  if(path[1]&&!record)throw new HttpError(404,'Registro não encontrado.');
  if(request.method!=='POST'&&!record)throw new HttpError(404,'Registro não encontrado.');
  const statements:D1PreparedStatement[]=[env.DB.prepare('INSERT INTO finance_requests (id, owner, created) VALUES (?, ?, ?)').bind(requestId,owner,Date.now())];
  if(request.method==='DELETE'){
   if(kind==='accounts'&&state.transactions.some(t=>t.accountId===record!.id||t.toId===record!.id))throw new HttpError(409,'Esta conta possui lançamentos. Exclua ou mova os lançamentos primeiro.');
   statements.push(env.DB.prepare('DELETE FROM finance_records WHERE id = ? AND owner = ? AND kind = ?').bind(record!.id,owner,kind));
  }else{
   const input=await body(request);const parsed=schemas[kind].safeParse(input);if(!parsed.success)throw new HttpError(400,parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));
   const data=parsed.data;
   if(kind==='transactions'){
    const t=schemas.transactions.parse(data);const account=state.accounts.find(a=>a.id===t.accountId);if(!account)throw new HttpError(400,'Escolha uma conta válida.');
    if(t.type==='transfer'){const dest=state.accounts.find(a=>a.id===t.toId);if(!dest||dest.id===account.id||account.kind==='credit')throw new HttpError(400,'Escolha contas válidas para a transferência.');if(t.status!=='paid')throw new HttpError(400,'Transferências devem estar concluídas.');}
    if(account.kind==='credit'&&t.type==='income')throw new HttpError(400,'Registre o pagamento do cartão como transferência.');
    if(t.installments>1&&(account.kind!=='credit'||t.type!=='expense'))throw new HttpError(400,'Parcelamento disponível para despesas no cartão.');
    if(t.amount<t.installments)throw new HttpError(400,'O valor deve cobrir ao menos um centavo por parcela.');
    if(request.method==='PUT'){
      const old=record as Transaction;if(old.installments&&old.installments>1)throw new HttpError(400,'Exclua a parcela e registre a correção para preservar as demais parcelas.');
      if(t.installments>1)throw new HttpError(400,'Cadastre uma nova compra para parcelar.');
      statements.push(env.DB.prepare('UPDATE finance_records SET data = ? WHERE id = ? AND owner = ? AND kind = ?').bind(JSON.stringify({...t,date:t.date,installments:1}),record!.id,owner,kind));
    }else{
     const groupId=crypto.randomUUID();const first=account.kind==='credit'&&t.type==='expense'?cardDue(t.date,account.closing,account.due):t.date;
     for(const [i,value] of splitAmount(t.amount,t.installments).entries()){statements.push(insert(env.DB,owner,kind,{...t,amount:value,date:addMonths(first,i),purchaseDate:t.date,groupId,installment:i+1}));}
    }
   }else{
    if(kind==='budgets'){const b=schemas.budgets.parse(data);if(state.budgets.some(x=>x.id!==record?.id&&x.month===b.month&&x.category===b.category))throw new HttpError(409,'Já existe um orçamento para esta categoria neste mês.');}
    if(request.method==='PUT'){statements.push(env.DB.prepare('UPDATE finance_records SET data = ? WHERE id = ? AND owner = ? AND kind = ?').bind(JSON.stringify(data),record!.id,owner,kind));}else statements.push(insert(env.DB,owner,kind,data));
   }
  }
  await env.DB.batch(statements);return json({ok:true},request.method==='POST'?201:200);
 }catch(error){if(error instanceof HttpError)return json({error:error.message},error.code);console.error('Finance API error',error instanceof Error?error.name:'unknown');return json({error:'Não foi possível concluir a operação. Seus campos foram preservados. Tente novamente.'},503);}
}
export default {fetch:handleApi};
export { tokenHash } from './auth';
