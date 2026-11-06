import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory=await mkdtemp(path.join(tmpdir(),'mitrai-speech-test-'));
const testDatabaseUrl=process.env.TEST_DATABASE_URL;
if(!testDatabaseUrl)throw new Error('Set TEST_DATABASE_URL to a dedicated, disposable Supabase test database. Tests never use DATABASE_URL.');
if(testDatabaseUrl===process.env.DATABASE_URL)throw new Error('TEST_DATABASE_URL must be separate from DATABASE_URL to protect application data.');
const port=process.env.MITRAI_SPEECH_TEST_PORT || '3109', base=`http://localhost:${port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',port],{
  env:{...process.env,DATABASE_URL:testDatabaseUrl,MITRAI_DATA_DIR:directory,APP_ORIGIN:base,SPEECH_ENGINE:'local'},stdio:['ignore','pipe','pipe'],
});
let output='',exited=false;
server.stdout.on('data',(data)=>output+=data);server.stderr.on('data',(data)=>output+=data);
server.on('exit',()=>exited=true);
try {
  let ready=false;
  for(let i=0;i<80;i++){
    if(exited)throw new Error(output);
    try{if((await fetch(`${base}/api/auth`)).ok){ready=true;break;}}catch{}
    await new Promise((resolve)=>setTimeout(resolve,250));
  }
  if(!ready)throw new Error('Speech test server did not start.');
  const child=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','--test','tests/speech-api.test.ts'],{env:{...process.env,MITRAI_SPEECH_TEST_URL:base},stdio:'inherit'});
  const code=await new Promise((resolve)=>child.on('exit',resolve));if(code!==0)process.exitCode=1;
}finally{
  if(!exited){server.kill('SIGTERM');await new Promise((resolve)=>server.once('exit',resolve));}
  await rm(directory,{recursive:true,force:true});
}
