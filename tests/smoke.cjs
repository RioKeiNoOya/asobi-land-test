const { chromium } = require('playwright');
(async () => {
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1024,height:768}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  page.on('pageerror',err=>{throw Error('JavaScript error: '+err.message)});
  const origin='http://localhost:8000/';
  await page.goto(origin+'index.html',{waitUntil:'load'});
  await page.waitForTimeout(500);
  await page.evaluate(()=>{document.querySelectorAll('main > .screen').forEach(e=>e.classList.add('hidden'));document.querySelector('#difficulty').classList.remove('hidden')});
  let d=await page.locator('#difficulty .difficulty-options').boundingBox();
  if(!d||Math.abs(d.x+d.width/2-viewport.width/2)>12)throw Error('Difficulty not centered '+JSON.stringify({viewport,d,debug:await page.locator('#difficulty').evaluate(e=>({class:e.className,style:getComputedStyle(e).display,wrap:getComputedStyle(e.querySelector('.difficulty-options')).display}))}));
  await page.evaluate(()=>{document.querySelector('#difficulty').classList.add('hidden');document.querySelector('#parent').classList.remove('hidden')});
  let label=await page.locator('#parent .add-btn').boundingBox();
  if(!label||label.height>90)throw Error('Oversized parent button '+JSON.stringify({viewport,label}));
  await page.evaluate(()=>{document.querySelector('#parent').classList.add('hidden');document.querySelector('#colorParent').classList.remove('hidden')});
  label=await page.locator('#colorParent .add-btn').boundingBox();
  if(!label||label.height>90)throw Error('Oversized coloring button '+JSON.stringify({viewport,label}));
  await page.goto(origin+'softcream.html',{waitUntil:'load'});
  await page.evaluate(async()=>{
   const files=['soft-round.png','soft-classic.png','soft-fine.png','cone-waffle-cup-raster.png'];
   await Promise.all(files.map(src=>new Promise((resolve,reject)=>{
    const im=new Image();
    im.onload=()=>im.naturalWidth>0?resolve():reject(Error('Zero-size artwork: '+src));
    im.onerror=()=>reject(Error('Cannot decode artwork: '+src));
    im.src=src+'?smoke=4';
   })));
  });
  for(let i=0;i<3;i++){
   await page.evaluate(i=>{state.shape=i;render()},i);
   const image=page.locator('#ice image');
   if(await image.count()!==1)throw Error('Soft-serve shape '+i+' image missing');
   const href=await image.getAttribute('href');
   if(!href?.includes(['round','classic','fine'][i]))throw Error('Wrong soft serve shape '+i+' '+href);
  }
  await page.evaluate(()=>{step=2;state.flavor=1;state.flavor2=3;state.mix=true;render()});
  if(await page.locator('#ice image').count()!==2)throw Error('Mix images missing');
  await page.evaluate(()=>{state.cone=5;state.mix=false;render()});
  const cone=await page.locator('#cone image').getAttribute('href');
  if(cone!=='cone-waffle-cup-raster.png')throw Error('Wrong waffle cup '+cone);
  await page.goto(origin+'katahame.html',{waitUntil:'load'});
  await page.locator('[data-lv="4"]').click();
  await page.locator('.setup .go').click();
  const dims=await page.locator('.tray .piece').evaluateAll(nodes=>nodes.map(n=>{let r=n.getBoundingClientRect();return {w:r.width,h:r.height,x:r.left,right:r.right,top:r.top}}));
  if(dims.length!==4||dims.some(x=>x.w>110||x.h>110||x.x<0||x.right>viewport.width+1))throw Error('Medium shapes oversized '+JSON.stringify({viewport,dims}));
  console.log('PASS',viewport.width,viewport.height,'difficulty / parent / ice / medium puzzle');
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
