const {PGlite}=require("@electric-sql/pglite");
const fs=require("node:fs"),assert=require("node:assert/strict");
const ids=Array.from({length:9},(_,i)=>"00000000-0000-0000-0000-"+String(i+1).padStart(12,"0"));
const [A,B,C,D,E,TASK,CONV,DEAL,MSG]=ids;
(async()=>{
 const db=new PGlite();
 await db.exec([
 "create role anon;create role authenticated;create schema auth;create schema storage;",
 "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
 "grant usage on schema public,auth,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
 "create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);",
 "create table public.services(id uuid primary key,owner_id uuid,title text,status text default 'active');",
 "create table public.demands(like public.services including all);",
 "create table public.community_posts(id uuid primary key,author_id uuid,title text);create table public.community_comments(id uuid primary key,author_id uuid,body text);",
 "create table public.conversations(id uuid primary key,owner_id uuid,other_id uuid,post_type text,post_id uuid);",
 "create table public.deals(id uuid primary key,conversation_id uuid,status text default 'confirming',workflow_status text default 'active',updated_at timestamptz default now());",
 "create table public.messages(id uuid primary key,conversation_id uuid,sender_id uuid,content text,created_at timestamptz default now(),read_at timestamptz);",
 "create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
 "create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;",
 "alter table storage.objects enable row level security;grant select,insert,update,delete on public.services,public.demands,public.community_posts,public.community_comments,public.messages,public.deals,public.conversations,storage.objects to authenticated;",
 "alter table public.services enable row level security;create policy base_read on public.services for select using(true);create policy base_write on public.services for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());",
 "insert into auth.users values('"+A+"','2604635611@qq.com',null,false),('"+B+"','publisher@test.invalid',now(),false),('"+C+"','partner@test.invalid',now(),false),('"+D+"','voter@test.invalid',now(),false),('"+E+"','unverified@test.invalid',null,false);",
 "insert into public.services values('"+TASK+"','"+B+"','Test task','active');insert into public.conversations values('"+CONV+"','"+B+"','"+C+"','service','"+TASK+"');insert into public.deals(id,conversation_id) values('"+DEAL+"','"+CONV+"');insert into public.messages(id,conversation_id,sender_id,content) values('"+MSG+"','"+CONV+"','"+B+"','Agreed time is 4 pm');",
 "create function complete_post() returns trigger language plpgsql security definer set search_path='' as $$begin if new.status='done' and old.status<>'done' then update public.services set status='completed' where id=(select post_id from public.conversations where id=new.conversation_id);end if;return new;end$$;create trigger complete_post after update on public.deals for each row execute function complete_post();"
 ].join("\n"));
 const sql=fs.readFileSync(require("node:path").join(__dirname,"../supabase/2026_court_and_admin.sql"),"utf8");
 const fail=async(fn,pattern)=>{let error;try{await fn()}catch(e){error=e}assert.ok(error,"Expected rejection");if(pattern)assert.match(error.message,pattern)};
 await fail(()=>db.exec(sql),/verified account/);await db.exec("rollback");
 await db.query("update auth.users set email_confirmed_at=now() where id=$1",[A]);
 await db.exec(sql);await db.exec(sql);
 await db.exec("create policy older_broad_storage on storage.objects for all to anon,authenticated using(true) with check(true);grant select,insert,update,delete on storage.objects to anon;");
 const as=async(id,role="authenticated")=>{await db.exec("reset role;set role "+role);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??""])};
 const q=(sql,args=[])=>db.query(sql,args);
 await as(B);assert.equal((await q("select public.is_market_admin() value")).rows[0].value,false);
 await fail(()=>q("insert into public.market_admins(user_id) values($1)",[B]),/permission/);
 await fail(()=>q("select public.admin_set_mute($1,1,'test mute')",[C]),/Administrator/);
 await fail(()=>q("select public.admin_remove_content('service',$1,'test remove')",[TASK]),/Administrator/);
 await as(D);await fail(()=>q("select public.open_deal_arbitration($1)",[DEAL]),/participant/);
 await as(B);await q("select public.open_deal_arbitration($1)",[DEAL]);await q("select public.open_deal_arbitration($1)",[DEAL]);
 const caseId=(await q("select id from public.court_cases")).rows[0].id;
 await fail(()=>q("update public.deals set workflow_status='active' where id=$1",[DEAL]),/locked/);
 await fail(()=>q("select public.cast_court_vote($1,'owner')",[caseId]),/eligible/);
 const file=B+"/"+caseId+"/proof.png";
 await q("insert into storage.objects(bucket_id,name) values('court-evidence',$1)",[file]);
 assert.equal((await q("update storage.objects set name=$1 where name=$2 returning id",[file+".changed",file])).rows.length,0);
 assert.equal((await q("delete from storage.objects where name=$1 returning id",[file])).rows.length,0);
 await as(D);assert.equal((await q("select * from storage.objects")).rows.length,0);
 await as(B);await fail(()=>q("select public.submit_court_evidence($1,'My detailed statement',$2,$3)",[caseId,[C+"/"+caseId+"/fake.png"],[]]),/attachment/);
 await fail(()=>q("select public.submit_court_evidence($1,'My detailed statement',$2,$3)",[caseId,[],[DEAL]]),/chat record/);
 await q("select public.submit_court_evidence($1,'My detailed statement',$2,$3)",[caseId,[file],[MSG]]);
 await fail(()=>q("select public.submit_court_evidence($1,'Replace my statement',$2,$3)",[caseId,[],[]]),/unique/);
 await fail(()=>q("insert into storage.objects(bucket_id,name) values('court-evidence',$1)",[B+"/"+caseId+"/late.png"]),/row-level/);
 await as(D);assert.equal((await q("select * from public.court_evidence")).rows.length,0);assert.equal((await q("select * from storage.objects")).rows.length,0);
 await as(C);assert.equal((await q("select * from public.court_evidence")).rows.length,1);
 await q("select public.submit_court_evidence($1,'The partner detailed statement',$2,$3)",[caseId,[],[]]);
 await as(D);assert.equal((await q("select * from public.court_evidence")).rows.length,2);assert.equal((await q("select * from storage.objects")).rows.length,1);
 await as(E);await fail(()=>q("select public.cast_court_vote($1,'owner')",[caseId]),/eligible/);
 await as(B);await fail(()=>q("select public.cast_court_vote($1,'owner')",[caseId]),/eligible/);
 await as(D);await q("select public.cast_court_vote($1,'owner')",[caseId]);await fail(()=>q("select public.cast_court_vote($1,'other')",[caseId]),/unique/);
 assert.equal(Number((await q("select total from public.court_vote_totals($1)",[caseId])).rows[0].total),1);
 await fail(()=>q("select public.admin_resolve_court($1,'owner','Final verdict reason')",[caseId]),/Administrator/);
 await fail(()=>q("update public.court_cases set verdict='owner' where id=$1",[caseId]),/permission/);
 await as(A);assert.equal((await q("select public.is_market_admin() value")).rows[0].value,true);
 await q("select public.admin_set_mute($1,2,'Repeated harassment')",[B]);
 await as(B);await fail(()=>q("insert into public.messages(id,conversation_id,sender_id,content) values(gen_random_uuid(),$1,$2,'Hello')",[CONV,B]),/muted/);
 await fail(()=>q("update public.services set title='New title' where id=$1",[TASK]),/muted/);
 await as(A);await q("select public.admin_set_mute($1,0,'Mute lifted after review')",[B]);
 await as(B);await q("update public.services set title='New title' where id=$1",[TASK]);
 await fail(()=>q("delete from public.services where id=$1",[TASK]),/transaction history/);
 await fail(()=>q("update public.services set moderation_deleted=true where id=$1",[TASK]),/Administrator/);
 await as(A);await q("select public.admin_remove_content('service',$1,'Removed after review')",[TASK]);
 await as(D);assert.equal((await q("select * from public.services")).rows.length,0);
 await as(A);assert.equal((await q("select * from public.services")).rows.length,1);
 await q("select public.admin_resolve_court($1,'owner','Publisher evidence was supported by agreed chat')",[caseId]);
 assert.equal((await q("select status from public.court_cases")).rows[0].status,"closed");
 assert.equal((await q("select status from public.deals")).rows[0].status,"done");
 assert.equal((await q("select status from public.services")).rows[0].status,"completed");
 assert.equal((await q("select * from public.admin_actions")).rows.length,4);
 await as(D);await fail(()=>q("select public.cast_court_vote($1,'owner')",[caseId]),/eligible/);
 await as(B);await fail(()=>q("select public.open_deal_arbitration($1)",[DEAL]),/open deal/);
 await as(null,"anon");await fail(()=>q("select public.admin_set_mute($1,1,'bad actor')",[C]),/permission/);
 assert.equal((await q("select * from storage.objects")).rows.length,0);
 await db.exec("reset role;insert into storage.objects(bucket_id,name) values('avatars','public-avatar.png');set role anon;");
 assert.equal((await q("select name from storage.objects")).rows[0].name,"public-avatar.png");
 await db.close();console.log("PASS: migration replay, verified admin, court RLS, private uploads, immutable evidence/votes, mute/unmute, soft deletion, final ruling and audit.");
})().catch(e=>{console.error(e);process.exitCode=1});
