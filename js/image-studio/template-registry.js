/* Image Studio v2 template registry. Additive module; does not alter the legacy studio. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.YESImageStudioV2Registry=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const FORMATS=["square","portrait","story","landscape"];
  const REQUIRED_METHODS=["open","render","applyTemplate"];
  const HEX=/^#[0-9a-fA-F]{6}$/;
  function assert(condition,message){if(!condition)throw new Error("Image Studio v2 manifest: "+message);}
  function validate(manifest){
    assert(manifest&&manifest.schemaVersion==="2.0.0","unsupported schema version");
    assert(Array.isArray(manifest.families)&&manifest.families.length===5,"expected five families");
    assert(Array.isArray(manifest.templates)&&manifest.templates.length===15,"expected fifteen templates");
    const familyIds=new Set(manifest.families.map(x=>x.id));
    assert(familyIds.size===5,"family IDs must be unique");
    const ids=new Set();
    manifest.templates.forEach(template=>{
      assert(template&&typeof template.id==="string"&&!ids.has(template.id),"template IDs must be unique and non-empty");
      ids.add(template.id);
      assert(familyIds.has(template.family),"unknown family for "+template.id);
      assert(template.palette&&["background","text","accent","muted"].every(key=>typeof template.palette[key]==="string"&&HEX.test(template.palette[key])),"invalid palette for "+template.id);
      assert(template.formats&&FORMATS.every(format=>template.formats[format]),"missing format for "+template.id);
      FORMATS.forEach(format=>{
        const layout=template.formats[format];
        assert(layout.canvas&&layout.poem&&layout.safeArea&&layout.author,"incomplete "+format+" layout for "+template.id);
        const {width,height}=layout.canvas;
        assert(Number.isFinite(width)&&width>0&&Number.isFinite(height)&&height>0,"invalid canvas dimensions");
        ["x","y","w","h"].forEach(key=>assert(Number.isFinite(layout.poem[key])&&layout.poem[key]>=0&&layout.poem[key]<=1,"invalid poem geometry "+template.id+"/"+format+"/"+key));
        assert(layout.poem.x+layout.poem.w<=1&&layout.poem.y+layout.poem.h<=1,"poem region exceeds canvas");
        const safe=layout.safeArea;
        ["left","right","top","bottom"].forEach(key=>assert(Number.isFinite(safe[key])&&safe[key]>=0&&safe[key]<1,"invalid safe area "+template.id+"/"+format+"/"+key));
        assert(safe.left+safe.right<1&&safe.top+safe.bottom<1,"safe area collapses content region");
        ["x","y"].forEach(key=>assert(Number.isFinite(layout.author[key])&&layout.author[key]>=0&&layout.author[key]<=1,"invalid author anchor "+template.id+"/"+format+"/"+key));
      });
    });
    assert(manifest.assetPolicy&&manifest.assetPolicy.remoteAssetsAllowed===false,"remote assets must remain disabled");
    assert(manifest.legacyCompatibility&&manifest.legacyCompatibility.publicApi==="window.YESImageStudio","legacy API contract missing");
    REQUIRED_METHODS.forEach(method=>assert(manifest.legacyCompatibility.preserveMethods.includes(method),"legacy method not preserved: "+method));
    return true;
  }
  function create(manifest){
    validate(manifest);
    const byId=new Map(manifest.templates.map(item=>[item.id,item]));
    const families=new Map(manifest.families.map(item=>[item.id,{...item,templates:[]}]));
    manifest.templates.forEach(item=>families.get(item.family).templates.push(item));
    return Object.freeze({
      manifest,
      formats:FORMATS.slice(),
      getTemplate(id){return byId.get(id)||null;},
      getFamily(id){return families.get(id)||null;},
      listFamilies(){return Array.from(families.values());},
      listTemplates(familyId){return familyId?((families.get(familyId)||{templates:[]}).templates.slice()):manifest.templates.slice();},
      getLayout(templateId,format){const item=byId.get(templateId);if(!item)return null;if(!FORMATS.includes(format))throw new Error("Unknown output format: "+format);return item.formats[format];},
      getLegacyTemplateIds(){return manifest.legacyCompatibility.legacyTemplateIds.slice();}
    });
  }
  async function load(url,fetcher){
    const request=fetcher||(typeof fetch==="function"?fetch:null);
    if(!request)throw new Error("Fetch is unavailable; pass a fetch implementation");
    const response=await request(url);
    if(!response||!response.ok)throw new Error("Unable to load Image Studio v2 manifest"+(response?" ("+response.status+")":""));
    return create(await response.json());
  }
  return {FORMATS,validate,create,load};
});
