/* Preflight checks for Image Studio v2. No rendering side effects. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.YESImageStudioV2Quality=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function luminance(hex){
    const raw=hex.replace("#",""),rgb=[0,2,4].map(i=>parseInt(raw.slice(i,i+2),16)/255);
    const linear=rgb.map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));
    return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
  }
  function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
  function rectInside(rect,bounds){
    return rect.x>=bounds.x&&rect.y>=bounds.y&&rect.x+rect.width<=bounds.x+bounds.width&&rect.y+rect.height<=bounds.y+bounds.height;
  }
  function inspect(input){
    const issues=[],warnings=[];
    const canvas=input.canvas,layout=input.layout,template=input.template,poem=input.poemLayout;
    if(!canvas||!layout||!template||!poem)throw new TypeError("Canvas, template, layout and poemLayout are required");
    const width=canvas.width,height=canvas.height;
    if(width!==layout.canvas.width||height!==layout.canvas.height)issues.push({code:"CANVAS_SIZE_MISMATCH",severity:"error"});
    const safe={x:layout.safeArea.left*width,y:layout.safeArea.top*height,width:width*(1-layout.safeArea.left-layout.safeArea.right),height:height*(1-layout.safeArea.top-layout.safeArea.bottom)};
    const poemRect={x:layout.poem.x*width,y:layout.poem.y*height,width:layout.poem.w*width,height:layout.poem.h*height};
    if(!rectInside(poemRect,{x:0,y:0,width,height}))issues.push({code:"POEM_OUTSIDE_CANVAS",severity:"error"});
    if(poem.overflow)issues.push({code:"POEM_OVERFLOW",severity:"error",details:poem.warning});
    if(poem.fontSize<1)issues.push({code:"INVALID_FONT_SIZE",severity:"error"});
    const ratio=contrast(template.palette.text,template.palette.background);
    if(ratio<4.5)warnings.push({code:"LOW_TEXT_CONTRAST",ratio,minimum:4.5});
    if(!rectInside(poemRect,safe))warnings.push({code:"POEM_OUTSIDE_SAFE_AREA"});
    const author=layout.author;
    if(author&&Number.isFinite(author.x)&&Number.isFinite(author.y)){
      const ax=author.x*width,ay=author.y*height;
      if(ax<0||ax>width||ay<0||ay>height)issues.push({code:"AUTHOR_OUTSIDE_CANVAS",severity:"error"});
    }
    if(template.background&&template.background.texture)warnings.push({code:"TEXTURE_NOT_AVAILABLE",assetId:template.background.texture.id});
    if(template.frame&&template.frame.id!=="none")warnings.push({code:"FRAME_NOT_AVAILABLE",assetId:template.frame.id});
    if(layout.ornaments&&layout.ornaments.length)warnings.push({code:"ORNAMENTS_NOT_AVAILABLE",count:layout.ornaments.length});
    return {ok:issues.length===0,issues,warnings,metrics:{contrastRatio:Number(ratio.toFixed(2)),safeArea:safe,poemArea:poemRect,canvas:{width,height},lineCount:poem.lines.length,fontSize:poem.fontSize,overflow:poem.overflow}};
  }
  return {contrast,inspect};
});
