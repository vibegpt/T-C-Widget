import net from 'node:net';
// Tiny RESP2 client keeps integration tests independent of a second Redis SDK.
export class TestRedis {
  constructor(url) {
    this.url=new URL(url);
    if (!['localhost','127.0.0.1'].includes(this.url.hostname)) throw Error('Integration tests require an isolated local Redis instance.');
  }
  async command(...args) {
    const chunks=[Buffer.from('*'+args.length+'\r\n')];
    for (const arg of args) {const value=Buffer.from(String(arg));chunks.push(Buffer.from('$'+value.length+'\r\n'),value,Buffer.from('\r\n'));}
    return new Promise((resolve,reject)=>{
      const socket=net.connect(Number(this.url.port)||6379,this.url.hostname);let buffer=Buffer.alloc(0);
      socket.setTimeout(5000,()=>socket.destroy(Error('Redis timeout')));
      socket.on('connect',()=>socket.write(Buffer.concat(chunks)));socket.on('error',reject);
      socket.on('data',data=>{buffer=Buffer.concat([buffer,data]);try {const parsed=parse(buffer,0);if(parsed){socket.end();resolve(parsed[0]);}}catch(e){socket.destroy();reject(e);}});
    });
  }
  eval(script,keys,args) {return this.command('EVAL',script,keys.length,...keys,...args);}
  async get(key) {const v=await this.command('GET',key);if(v===null)return null;try{return JSON.parse(v);}catch{return v;}}
  set(key,value,options={}) {return this.command('SET',key,typeof value==='string'?value:JSON.stringify(value),...(options.ex?['EX',options.ex]:[]),...(options.nx?['NX']:[]));}
  async hgetall(key) {const result=await this.command('HGETALL',key);return result.length?Object.fromEntries(Array.from({length:result.length/2},(_,i)=>result.slice(i*2,i*2+2))):null;}
  del(...keys) {return this.command('DEL',...keys);}
}
function parse(buffer,offset) {
  const end=buffer.indexOf('\r\n',offset);if(end<0)return null;
  const kind=String.fromCharCode(buffer[offset]),line=buffer.subarray(offset+1,end).toString(),after=end+2;
  if(kind==='+')return [line,after];if(kind==='-')throw Error(line);if(kind===':')return [Number(line),after];
  if(kind==='$'){const size=Number(line);if(size===-1)return [null,after];if(buffer.length<after+size+2)return null;return [buffer.subarray(after,after+size).toString(),after+size+2];}
  if(kind==='*'){const count=Number(line);let next=after;const values=[];for(let i=0;i<count;i++){const value=parse(buffer,next);if(!value)return null;values.push(value[0]);next=value[1];}return [values,next];}
  throw Error('Unsupported Redis response');
}
