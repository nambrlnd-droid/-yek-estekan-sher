/* PNG export manager for Image Studio v2. Export is opt-in and never mutates legacy settings. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.YESImageStudioV2Export=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const FORMATS=["square","portrait","story","landscape"];
  const MAX_PIXELS=12000000;
  function safeName(value){
    const name=String(value||"poem").normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f]/g,"-").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,80);
    return name||"poem";
  }
  function validateCanvas(canvas,format){
    if(!canvas||typeof canvas.toBlob!=="function")throw new TypeError("A canvas supporting PNG Blob export is required");
    if(!FORMATS.includes(format))throw new Error("Unsupported export format: "+format);
    if(!(canvas.width>0&&canvas.height>0)||canvas.width*canvas.height>MAX_PIXELS)throw new Error("Canvas dimensions are invalid or exceed the export safety limit");
  }
  function toBlob(canvas){
    return new Promise((resolve,reject)=>{
      try{
        canvas.toBlob(blob=>{
          if(!blob){reject(new Error("Browser could not encode the canvas as PNG"));return;}
          if(blob.type!=="image/png"){reject(new Error("Unexpected export MIME type: "+blob.type));return;}
          resolve(blob);
        },"image/png");
      }catch(error){reject(error);}
    });
  }
  async function exportPNG(options){
    const opts=options||{},result=opts.renderResult;
    if(!result||!result.canvas)throw new TypeError("A successful renderer result is required");
    if(result.blocked||!result.rendered)throw new Error("Export blocked: renderer did not produce a complete poem");
    if(!result.quality||!result.quality.ok)throw new Error("Export blocked: quality preflight contains errors");
    if(opts.rejectWarnings===true&&result.quality.warnings&&result.quality.warnings.length)throw new Error("Export blocked: quality preflight contains warnings");
    validateCanvas(result.canvas,result.format);
    const expected=opts.expectedDimensions;
    if(expected&&(result.canvas.width!==expected.width||result.canvas.height!==expected.height))throw new Error("Export dimensions do not match the selected format");
    const blob=await toBlob(result.canvas);
    if(blob.size===0)throw new Error("PNG export is empty");
    return {blob,mime:blob.type,bytes:blob.size,width:result.canvas.width,height:result.canvas.height,
      format:result.format,templateId:result.templateId,warnings:(result.quality.warnings||[]).slice(),filename:safeName(opts.filename||result.templateId||"poem")+".png"};
  }
  function download(exported,environment){
    if(!exported||!exported.blob||exported.mime!=="image/png")throw new TypeError("A verified PNG export result is required");
    const env=environment||((typeof document!=="undefined"&&typeof URL!=="undefined")?{document,URL}:null);
    if(!env||!env.document||!env.URL)throw new Error("Browser download APIs are unavailable");
    const url=env.URL.createObjectURL(exported.blob);
    try{
      const link=env.document.createElement("a");
      link.href=url;link.download=exported.filename;link.hidden=true;
      env.document.body.appendChild(link);link.click();link.remove();
    }finally{env.URL.revokeObjectURL(url);}
    return {downloaded:true,filename:exported.filename};
  }
  return {FORMATS,MAX_PIXELS,safeName,exportPNG,download};
});
