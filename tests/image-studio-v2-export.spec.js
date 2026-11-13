const { test, expect } = require("@playwright/test");

test("v2 exports a PNG blob with exact dimensions and safe filename", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/export-manager.js" });
  const result = await page.evaluate(async () => {
    const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
    const exported=await window.YESImageStudioV2Export.exportPNG({
      renderResult:{canvas,format:"portrait",templateId:"sepideh",rendered:true,blocked:false,quality:{ok:true,warnings:[]}},
      filename:"شعر / آزمایشی"
    });
    return {mime:exported.mime,width:exported.width,height:exported.height,bytes:exported.bytes,
      filename:exported.filename,blobSize:exported.blob.size};
  });
  expect(result.mime).toBe("image/png");
  expect(result.width).toBe(1080);
  expect(result.height).toBe(1350);
  expect(result.bytes).toBeGreaterThan(0);
  expect(result.blobSize).toBe(result.bytes);
  expect(result.filename).toBe("شعر-آزمایشی.png");
});

test("v2 export refuses overflow, quality failures and warnings by default", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/export-manager.js" });
  const result=await page.evaluate(async()=>{
    const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1080;
    const base={canvas,format:"square",templateId:"sepideh",rendered:true,blocked:false};
    async function rejected(renderResult){
      try{await window.YESImageStudioV2Export.exportPNG({renderResult});return false;}catch(_){return true;}
    }
    return {
      overflow:await rejected({...base,rendered:false,blocked:true,quality:{ok:false,warnings:[]}}),
      quality:await rejected({...base,quality:{ok:false,warnings:[]}}),
      warnings:await rejected({...base,quality:{ok:true,warnings:[{code:"MISSING_TEXTURE"}]}})
    };
  });
  expect(result).toEqual({overflow:true,quality:true,warnings:true});
});

test("v2 export validates dimensions and enforces pixel safety limit", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/export-manager.js" });
  const result=await page.evaluate(async()=>{
    const tooLarge=document.createElement("canvas");tooLarge.width=5000;tooLarge.height=5000;
    const wrong=document.createElement("canvas");wrong.width=1200;wrong.height=1200;
    const quality={ok:true,warnings:[]};
    const base={rendered:true,blocked:false,quality,format:"square",templateId:"x"};
    async function rejected(canvas,expectedDimensions){
      try{await window.YESImageStudioV2Export.exportPNG({renderResult:{...base,canvas},expectedDimensions});return false;}catch(_){return true;}
    }
    return {large:await rejected(tooLarge),mismatch:await rejected(wrong,{width:1080,height:1080})};
  });
  expect(result).toEqual({large:true,mismatch:true});
});

test("all 60 v2 template-format combinations have valid target dimensions", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/template-registry.js" });
  const result=await page.evaluate(async()=>{
    const manifest=await (await fetch("assets/image-studio/manifest.v2.json")).json();
    const registry=window.YESImageStudioV2Registry.create(manifest);
    const expected={square:[1080,1080],portrait:[1080,1350],story:[1080,1920],landscape:[1920,1080]};
    const rows=[];
    registry.listTemplates().forEach(template=>registry.formats.forEach(format=>{
      const layout=registry.getLayout(template.id,format);
      rows.push({template:template.id,format,valid:layout.canvas.width===expected[format][0]&&layout.canvas.height===expected[format][1]});
    }));
    return {count:rows.length,invalid:rows.filter(row=>!row.valid)};
  });
  expect(result.count).toBe(60);
  expect(result.invalid).toEqual([]);
});
