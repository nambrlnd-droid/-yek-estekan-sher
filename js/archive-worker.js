/* Off-main-thread gzip decompression and JSON parsing for archive shards. */
self.onmessage=async event=>{
 try{
  if(typeof DecompressionStream==="undefined")throw new Error("DecompressionStream is unavailable in this worker");
  const stream=new Blob([event.data]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text=await new Response(stream).text();
  const records=JSON.parse(text);
  if(!Array.isArray(records))throw new Error("Archive shard is not an array");
  self.postMessage({records});
 }catch(error){self.postMessage({error:String(error&&error.message||error)});}
};
