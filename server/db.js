import {upgradeHierarchy} from '../src/hierarchy.js';
import {mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

// All writes use one transaction. PostgreSQL locks the catalog row; SQLite
// serializes transactions on the local connection. No serverless disk storage.
export async function openDatabase(env=process.env){
 if(env.DATABASE_URL){
  const {Pool}=await import('pg');
  const pool=new Pool({connectionString:env.DATABASE_URL,max:3,connectionTimeoutMillis:8000,idleTimeoutMillis:10000});
  const wrap=client=>({query:async(sql,args=[])=>{let i=0;const r=await client.query(sql.replace(/\?/g,()=>'$'+(++i)),args);return {rows:r.rows,changes:r.rowCount}},dialect:'postgres'});
  return {dialect:'postgres',query:(...args)=>wrap(pool).query(...args),transaction:async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(wrap(c));await c.query('COMMIT');return result}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}},close:()=>pool.end()};
 }
 if(env.NETLIFY==='true'||env.NODE_ENV==='production')throw new Error('DATABASE_URL must be configured in production.');
 const {DatabaseSync}=await import('node:sqlite');const file=env.SQLITE_PATH||resolve('data/pm1864.sqlite');if(file!==':memory:')await mkdir(dirname(file),{recursive:true});
 const db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 const tx={dialect:'sqlite',query:async(sql,args=[])=>{const statement=db.prepare(sql);if(/^\s*(SELECT|WITH)/i.test(sql))return {rows:statement.all(...args),changes:0};const result=statement.run(...args);return {rows:[],changes:result.changes}}};let tail=Promise.resolve();
 const transaction=fn=>{const result=tail.then(async()=>{db.exec('BEGIN IMMEDIATE');try{const value=await fn(tx);db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e}});tail=result.catch(()=>{});return result};
 return {dialect:'sqlite',query:(sql,args)=>transaction(t=>t.query(sql,args)),transaction,close:async()=>{await tail;db.close()}};
}

export async function migrate(db,seed){
 await db.transaction(async tx=>{
  if(tx.dialect==='postgres')await tx.query('SELECT pg_advisory_xact_lock(18641864)');
  await tx.query('CREATE TABLE IF NOT EXISTS app_catalog (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, document TEXT NOT NULL)');
  await tx.query('CREATE TABLE IF NOT EXISTS app_sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at BIGINT NOT NULL)');
  await tx.query('CREATE TABLE IF NOT EXISTS app_media (id TEXT PRIMARY KEY,name TEXT NOT NULL,mime_type TEXT NOT NULL,size INTEGER NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)');
  await tx.query('CREATE TABLE IF NOT EXISTS app_users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT NOT NULL, active INTEGER NOT NULL, must_change_password INTEGER NOT NULL, version INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)');
  if(tx.dialect==='postgres')await tx.query("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'light'");
  else{const columns=(await tx.query("SELECT name FROM pragma_table_info('app_users')")).rows;if(!columns.some(column=>column.name==='theme'))await tx.query("ALTER TABLE app_users ADD COLUMN theme TEXT NOT NULL DEFAULT 'light'")}
  await tx.query('INSERT INTO app_catalog (id, revision, document) VALUES (1, 0, ?) ON CONFLICT (id) DO NOTHING',[JSON.stringify({...seed,schemaVersion:2})]);
  const row=(await tx.query('SELECT revision, document FROM app_catalog WHERE id=1'+(tx.dialect==='postgres'?' FOR UPDATE':''))).rows[0];const doc=JSON.parse(row.document);if(doc.schemaVersion!==2){upgradeHierarchy(doc);await tx.query('UPDATE app_catalog SET revision=?,document=? WHERE id=1',[Number(row.revision)+1,JSON.stringify(doc)])}
 });
}
