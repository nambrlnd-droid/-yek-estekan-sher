/* Isolated Canvas renderer adapter for Image Studio v2. Legacy renderer is untouched. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.YESImageStudioV2Renderer=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function requireApi(name,value){if(!value)throw new Error("Image Studio v2 dependency missing: "+name);return value;}
  function render(options){
    const opts=options||{};
    const registry=requireApi("registry",opts.registry);
    const layoutEngine=requireApi("poem layout",opts.layoutEngine);
    const quality=requireApi("quality checker",opts.quality);
    const canvas=opts.canvas;
    if(!canvas||typeof canvas.getContext!=="function")throw new TypeError("A Canvas element is required");
    const template=registry.getTemplate(opts.templateId);
    if(!template)throw new Error("Unknown template: "+opts.templateId);
    const selected=registry.getLayout(opts.templateId,opts.format);
    if(!selected)throw new Error("Unknown output format: "+opts.format);
    canvas.width=selected.canvas.width;canvas.height=selected.canvas.height;
    const ctx=canvas.getContext("2d");
    if(!ctx)throw new Error("Canvas 2D context is unavailable");
    const poemBox={x:selected.poem.x*canvas.width,y:selected.poem.y*canvas.height,width:selected.poem.w*canvas.width,height:selected.poem.h*canvas.height};
    const typography=template.typography||{};
    const minDimension=Math.min(canvas.width,canvas.height);
    const poem=layoutEngine.layout({
      context:ctx,text:opts.text==null?"":opts.text,width:poemBox.width,height:poemBox.height,
      preferredFontSize:minDimension*(typography.preferredScale||0.046),
      minimumFontSize:minDimension*(typography.minimumScale||0.022),
      lineHeight:typography.lineHeight||1.8,verseGap:typography.verseGap==null?0.55:typography.verseGap,
      fontFamily:typography.fontFamily||"Tahoma",fontFallback:typography.fontFallback||["Tahoma","sans-serif"],weight:typography.weight||"400"
    });
    ctx.save();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle=template.background&&template.background.color||template.palette.background;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.direction="rtl";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillStyle=template.palette.text;
    ctx.font=layoutEngine.fontSpec(typography.weight||"400",poem.fontSize,typography.fontFamily||"Tahoma",typography.fontFallback||["Tahoma","sans-serif"]);
    const totalHeight=poem.lines.length*poem.lineHeight;
    let y=poemBox.y+(poemBox.height-totalHeight)/2+poem.lineHeight/2;
    let previousParagraph=-1;
    poem.lines.forEach(line=>{
      if(previousParagraph!==-1&&line.paragraphIndex!==previousParagraph)y+=poem.fontSize*(typography.verseGap==null?0.55:typography.verseGap);
      ctx.fillText(line.text,poemBox.x+poemBox.width/2,y);
      y+=poem.lineHeight;previousParagraph=line.paragraphIndex;
    });
    const authorText=String(opts.author||"");
    if(authorText){
      const author=selected.author;
      ctx.fillStyle=template.palette.accent;
      ctx.font=layoutEngine.fontSpec("400",Math.max(14,poem.fontSize*0.62),typography.fontFamily||"Tahoma",typography.fontFallback||["Tahoma","sans-serif"]);
      ctx.textAlign=author.align||"center";
      ctx.fillText(authorText,author.x*canvas.width,author.y*canvas.height);
    }
    ctx.restore();
    const report=quality.inspect({canvas,layout:selected,template,poemLayout:poem});
    if(opts.strict&&(!report.ok||report.warnings.length))throw Object.assign(new Error("Image Studio v2 preflight failed"),{report});
    return {canvas,templateId:template.id,format:opts.format,poemLayout:poem,quality:report,rendered:true};
  }
  return {render};
});
