/* Local asset manager: deny-by-default; no remote URLs or unlicensed files. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.YESImageStudioV2Assets=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const DEFAULT_MANIFEST="assets/image-studio/licenses/manifest.json";
  const SAFE_ID=/^[a-z0-9][a-z0-9._-]*$/i;
  const SAFE_PATH=/^(assets\/image-studio\/(backgrounds|textures|ornaments|fonts)\/[a-z0-9._/-]+)$/i;
  function assert(ok,message){if(!ok)throw new Error("Image Studio assets: "+message);}
  function validateManifest(manifest){
    assert(manifest&&manifest.schemaVersion==="1.0.0","unsupported license manifest version");
    assert(manifest.policy==="deny-by-default","license policy must deny by default");
    assert(Array.isArray(manifest.assets),"assets must be an array");
    const ids=new Set(),paths=new Set();
    manifest.assets.forEach(asset=>{
      assert(asset&&typeof asset.id==="string"&&SAFE_ID.test(asset.id),"invalid asset ID");
      assert(!ids.has(asset.id),"duplicate asset ID: "+asset.id);ids.add(asset.id);
      assert(typeof asset.path==="string"&&SAFE_PATH.test(asset.path)&&!asset.path.includes(".."),"unsafe or non-local asset path");
      assert(!paths.has(asset.path),"duplicate asset path: "+asset.path);paths.add(asset.path);
      assert(typeof asset.kind==="string"&&["background","texture","ornament","font"].includes(asset.kind),"invalid asset kind");
      assert(typeof asset.license==="string"&&asset.license.trim().length>0,"missing license identifier");
      assert(typeof asset.licenseUrl==="string"&&/^https:\/\//.test(asset.licenseUrl),"missing verifiable license URL");
      assert(typeof asset.source==="string"&&asset.source.trim().length>0,"missing origin/source");
      assert(typeof asset.attribution==="string","attribution must be explicit, use empty string when not required");
      assert(typeof asset.fileSha256==="string"&&/^[a-f0-9]{64}$/i.test(asset.fileSha256),"missing SHA-256 file digest");
    });
    return true;
  }
  function create(manifest,options){
    validateManifest(manifest);
    const opts=options||{},fetcher=opts.fetch||(typeof fetch==="function"?fetch:null);
    const base=opts.basePath||"";
    const byId=new Map(manifest.assets.map(asset=>[asset.id,Object.freeze({...asset})]));
    return Object.freeze({
      list(){return Array.from(byId.values());},
      get(id){return byId.get(id)||null;},
      listByKind(kind){return Array.from(byId.values()).filter(asset=>asset.kind===kind);},
      async load(id){
        const asset=byId.get(id);
        if(!asset)throw new Error("Asset is not approved in the license manifest: "+id);
        if(!fetcher)throw new Error("Fetch is unavailable");
        const response=await fetcher(base+asset.path);
        if(!response||!response.ok)throw new Error("Local asset unavailable: "+asset.path);
        const bytes=await response.arrayBuffer();
        if(typeof crypto!=="undefined"&&crypto.subtle){
          const digest=await crypto.subtle.digest("SHA-256",bytes);
          const actual=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
          assert(actual.toLowerCase()===asset.fileSha256.toLowerCase(),"asset digest mismatch: "+id);
        }else if(opts.requireDigest!==false){
          throw new Error("SHA-256 verification is unavailable in this environment");
        }
        return {id:asset.id,kind:asset.kind,path:asset.path,bytes,mime:response.headers&&response.headers.get?response.headers.get("content-type"):null};
      }
    });
  }
  async function load(url,options){
    const opts=options||{},fetcher=opts.fetch||(typeof fetch==="function"?fetch:null);
    if(!fetcher)throw new Error("Fetch is unavailable");
    const response=await fetcher(url||DEFAULT_MANIFEST);
    if(!response||!response.ok)throw new Error("Unable to load local asset license manifest");
    return create(await response.json(),opts);
  }
  return {DEFAULT_MANIFEST,validateManifest,create,load};
});
