/* Preflight checks for Image Studio v2. No rendering side effects. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.YESImageStudioV2Quality=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const HEX=/^#[0-9a-fA-F]{6}$/;
  function validHex(value){return typeof value==="string"&&HEX.test(value);}
  function luminance(hex){
    if(!validHex(hex))throw new TypeError("A six-digit hex color is required");
    const raw=hex.slice(1),rgb=[0,2,4].map(i=>parseInt(raw.slice(i,i+2),16)/255);
    const linear=rgb.map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));
    return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
  }
  function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
  function finiteRect(rect){
    return !!rect&&["x","y","width","height"].every(k=>Number.isFinite(rect[k])&&rect[k]>=0);
  }
  function rectInside(rect,bounds){
    return finiteRect(rect)&&finiteRect(bounds)&&rect.x>=bounds.x&&rect.y>=bounds.y&&
      rect.x+rect.width<=bounds.x+bounds.width&&rect.y+rect.height<=bounds.y+bounds.height;
  }
  function inspect(input){
    const issues=[],warnings=[];
    const canvas=input&&input.canvas,layout=input&&input.layout,template=input&&input.template,poem=input&&input.poemLayout;
    if(!canvas||!layout||!template||!poem)throw new TypeError("Canvas, template, layout and poemLayout are required");
    const width=canvas.width,height=canvas.height;
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||
      !layout.canvas||width!==layout.canvas.width||height!==layout.canvas.height)
      issues.push({code:"CANVAS_SIZE_MISMATCH",severity:"error"});
    const safeArea=layout.safeArea||{};
    const margins=["left","right","top","bottom"];
    if(margins.some(k=>!Number.isFinite(safeArea[k])||safeArea[k]<0||safeArea[k]>=1)||
      safeArea.left+safeArea.right>=1||safeArea.top+safeArea.bottom>=1){
      issues.push({code:"INVALID_SAFE_AREA",severity:"error"});
    }
    const safe={x:(safeArea.left||0)*width,y:(safeArea.top||0)*height,
      width:width*(1-(safeArea.left||0)-(safeArea.right||0)),
      height:height*(1-(safeArea.top||0)-(safeArea.bottom||0))};
    const p=layout.poem||{};
    const poemRect={x:(1-(Number(p.x)||0)-(Number(p.w)||0))*width,
      y:(Number(p.y)||0)*height,width:(Number(p.w)||0)*width,height:(Number(p.h)||0)*height};
    if(!["x","y","w","h"].every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=1)||
      p.x+p.w>1||p.y+p.h>1||!rectInside(poemRect,{x:0,y:0,width,height}))
      issues.push({code:"POEM_OUTSIDE_CANVAS",severity:"error"});
    if(poem.overflow)issues.push({code:"POEM_OVERFLOW",severity:"error",details:poem.warning});
    if(!Number.isFinite(poem.fontSize)||poem.fontSize<1)issues.push({code:"INVALID_FONT_SIZE",severity:"error"});
    if(!Array.isArray(poem.lines))issues.push({code:"INVALID_POEM_LINES",severity:"error"});
    const palette=template.palette||{};
    let ratio=null;
    if(!validHex(palette.text)||!validHex(palette.background)){
      issues.push({code:"INVALID_PALETTE_COLOR",severity:"error"});
    }else{
      ratio=contrast(palette.text,palette.background);
      if(ratio<4.5)warnings.push({code:"LOW_TEXT_CONTRAST",ratio,minimum:4.5});
    }
    if(!rectInside(poemRect,safe))warnings.push({code:"POEM_OUTSIDE_SAFE_AREA"});
    const author=layout.author;
    if(author){
      if(!Number.isFinite(author.x)||!Number.isFinite(author.y)||author.x<0||author.x>1||author.y<0||author.y>1)
        issues.push({code:"AUTHOR_OUTSIDE_CANVAS",severity:"error"});
    }
    if(template.background&&template.background.texture)warnings.push({code:"TEXTURE_NOT_AVAILABLE",assetId:template.background.texture.id});
    if(template.frame&&template.frame.id!=="none")warnings.push({code:"FRAME_NOT_AVAILABLE",assetId:template.frame.id});
    if(layout.ornaments&&layout.ornaments.length)warnings.push({code:"ORNAMENTS_NOT_AVAILABLE",count:layout.ornaments.length});
    return {ok:issues.length===0,issues,warnings,metrics:{contrastRatio:ratio===null?null:Number(ratio.toFixed(2)),
      safeArea:safe,poemArea:poemRect,canvas:{width,height},lineCount:Array.isArray(poem.lines)?poem.lines.length:0,
      fontSize:Number.isFinite(poem.fontSize)?poem.fontSize:null,overflow:!!poem.overflow}};
  }
  return {validHex,contrast,inspect};
});
