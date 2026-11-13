/* Persian-aware poem layout engine. Preserves source text and reports overflow; never truncates. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.YESImageStudioV2Layout=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function fontSpec(weight,size,family,fallback){
    const stack=[family].concat(fallback||["Tahoma","sans-serif"]).map(name=>/[ ,]/.test(name)?'"'+name+'"':name).join(", ");
    return String(weight||"400")+" "+size+"px "+stack;
  }
  function measure(ctx,text){return ctx.measureText(text).width;}
  function splitLongToken(token,maxWidth,ctx){
    const chars=Array.from(token),parts=[];let current="";
    for(const char of chars){
      const candidate=current+char;
      if(current&&measure(ctx,candidate)>maxWidth){parts.push(current);current=char;}else current=candidate;
    }
    if(current)parts.push(current);
    return parts;
  }
  function wrapParagraph(paragraph,maxWidth,ctx){
    if(paragraph==="")return [""];
    const tokens=paragraph.split(/(\s+)/).filter(Boolean);
    const lines=[];let line="";
    tokens.forEach(token=>{
      if(/^\s+$/.test(token)){
        line+=token;
        return;
      }
      const candidate=line+token;
      if(!line||measure(ctx,candidate.trimEnd())<=maxWidth){line=candidate;return;}
      lines.push(line);
      if(measure(ctx,token)<=maxWidth){line=token.trimStart();return;}
      const pieces=splitLongToken(token,maxWidth,ctx);
      lines.push(...pieces.slice(0,-1));line=pieces[pieces.length-1]||"";
    });
    if(line||!lines.length)lines.push(line);
    return lines;
  }
  function layout(options){
    const opts=options||{},ctx=opts.context;
    if(!ctx||typeof ctx.measureText!=="function")throw new TypeError("A Canvas 2D measurement context is required");
    const source=String(opts.text==null?"":opts.text);
    const width=Number(opts.width),height=Number(opts.height);
    if(!(width>0&&height>0))throw new RangeError("Layout width and height must be positive");
    const preferred=Math.max(1,Number(opts.preferredFontSize)||Math.min(width,height)*0.046);
    const minimum=Math.max(1,Number(opts.minimumFontSize)||Math.min(width,height)*0.022);
    const minSize=Math.min(preferred,minimum),lineHeightFactor=Number(opts.lineHeight)||1.8;
    const verseGapFactor=Math.max(0,Number(opts.verseGap==null?0.55:opts.verseGap));
    const weight=opts.weight||"400",family=opts.fontFamily||"Tahoma",fallback=opts.fontFallback||["Tahoma","sans-serif"];
    const paragraphs=source.split("\n");
    const attempt=size=>{
      ctx.font=fontSpec(weight,size,family,fallback);
      const lines=[];
      paragraphs.forEach((paragraph,index)=>{
        const wrapped=wrapParagraph(paragraph,width,ctx);
        wrapped.forEach((line,lineIndex)=>lines.push({text:line,paragraphIndex:index,lineIndex}));
      });
      const lineHeight=size*lineHeightFactor;
      const paragraphCount=paragraphs.length;
      const contentHeight=lines.length*lineHeight+Math.max(0,paragraphCount-1)*size*verseGapFactor;
      return {fontSize:size,lines,lineHeight,contentHeight,fits:contentHeight<=height};
    };
    let result=attempt(preferred);
    if(!result.fits&&preferred>minSize){
      let low=minSize,high=preferred,best=attempt(minSize);
      if(best.fits){
        for(let i=0;i<18;i++){const mid=(low+high)/2,candidate=attempt(mid);if(candidate.fits){low=mid;best=candidate;}else high=mid;}
        result=best;
      }else result=best;
    }
    const overflow=result.contentHeight>height;
    return {
      sourceText:source,
      lines:result.lines,
      fontSize:result.fontSize,
      lineHeight:result.lineHeight,
      contentHeight:result.contentHeight,
      availableHeight:height,
      overflow,
      warning:overflow?{code:"POEM_OVERFLOW",message:"متن کامل در محدودهٔ انتخاب‌شده جا نمی‌شود؛ متن حذف یا بریده نشده است.",requiredHeight:result.contentHeight,availableHeight:height,minimumFontSize:result.fontSize}:null,
      integrity:{sourcePreserved:true,sourceLength:source.length,explicitLineBreaks:Math.max(0,(source.match(/\n/g)||[]).length),renderedText:result.lines.map(line=>line.text).join("\n")}
    };
  }
  return {layout,fontSpec,wrapParagraph};
});
