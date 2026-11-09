const { chromium } = require('playwright');
(async () => {
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1024,height:768},{width:1180,height:820},{width:1366,height:1024}]){
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
  // Main picture puzzle: all pieces must be visible and exactly match cell dimensions.
  await page.evaluate(()=>startGame({data:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="#e9b44a"/></svg>')}));
  await page.waitForTimeout(120);
  for(const n of [2,3,4,5]){
   await page.evaluate(n=>{gridSize=n;startGame(current)},n);
   await page.waitForTimeout(80);
   const layout=await page.evaluate(()=>{
    const board=document.querySelector('#game .board').getBoundingClientRect(),tray=document.querySelector('#game .tray').getBoundingClientRect();
    const cells=[...document.querySelectorAll('#game .cell')].map(e=>e.getBoundingClientRect());
    const pieces=[...document.querySelectorAll('#game .tray .piece')].map(e=>e.getBoundingClientRect());
    return {board:{x:board.x,y:board.y,w:board.width,h:board.height},tray:{x:tray.x,y:tray.y,w:tray.width,h:tray.height},cells:cells.map(r=>({w:r.width,h:r.height})),pieces:pieces.map(r=>({x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}))};
   });
   if(layout.pieces.length!==n*n)throw Error('Missing picture tiles '+JSON.stringify({viewport,n,layout}));
   const rows=await page.locator('#game .tray').evaluate(el=>getComputedStyle(el).gridTemplateRows.split(' ').length);
   const side=await page.locator('#game .game-area').evaluate(el=>el.classList.contains('puzzle-side'));
   const wantedRows=side?n:(n===5?3:2);
   if(rows!==wantedRows)throw Error('Incorrect side/bottom piece layout '+JSON.stringify({viewport,n,side,rows,wantedRows,layout}));
   if(side&&layout.board.w<Math.min(viewport.height*.50,430))throw Error('Tablet puzzle board still too small '+JSON.stringify({viewport,n,layout}));
   if(n===2&&layout.pieces.some(p=>p.w>114))throw Error('Four-piece tray occupies excessive board space '+JSON.stringify({viewport,layout}));
   if(layout.pieces.some((p,i)=>Math.abs(p.w-p.h)>1||p.w>layout.cells[i].w+1||p.w<10))throw Error('Waiting tiles have incorrect aspect ratio or size '+JSON.stringify({viewport,n,layout}));
   const targetBoardMin=viewport.width<=430?viewport.width*.90:(viewport.width>=1000?Math.min(viewport.height*.70,560):viewport.width*.83);
   if(layout.board.w<targetBoardMin)throw Error('Picture board does not use available display space '+JSON.stringify({viewport,n,targetBoardMin,layout}));
   const tileRect=await page.locator('#game .tray .piece').first().boundingBox();
   if(!tileRect)throw Error('No puzzle piece to drag');
   await page.mouse.move(tileRect.x+tileRect.width/2,tileRect.y+tileRect.height/2);
   await page.mouse.down();
   const activeSize=await page.locator('#dragPiece').boundingBox();
   await page.mouse.up();
   if(!activeSize)throw Error('Active puzzle piece not rendered');
   if(Math.abs(activeSize.width-layout.cells[0].w)>1||Math.abs(activeSize.height-layout.cells[0].h)>1)throw Error('Active piece does not expand to board cell size '+JSON.stringify({viewport,n,layout,activeSize}));
   if(layout.pieces.some(p=>p.x<0||p.right>viewport.width+1||p.y<0||p.bottom>viewport.height-2))throw Error('Picture tile outside screen '+JSON.stringify({viewport,n,layout}));
  }
  await page.goto(origin+'index.html',{waitUntil:'load'});
  await page.evaluate(()=>{
    if(typeof kanaSayUnit!=='function')throw Error('Missing kana voice handler');
    const original=say,spoken=[];
    try{
      say=text=>spoken.push(text);
      katakana=false;kanaSayUnit('きゃ');kanaSayUnit('しゃ');kanaSayUnit('しゅ');
      katakana=true;kanaSayUnit('きゃ');
    }finally{say=original;katakana=false;}
    if(JSON.stringify(spoken)!==JSON.stringify(['きゃ','しゃ','しゅ','キャ']))throw Error('Compound kana pronounced with extra words: '+JSON.stringify(spoken));
    // The "よむ" button must remain functional after removing the examples.
    kanaUnits=['しゃ'];
    const spoken2=[];
    const savedSay=say;
    try{say=v=>spoken2.push(v);document.getElementById('kanaPlay').click();}
    finally{say=savedSay;kanaUnits=[];}
    if(spoken2.length!==1||!spoken2[0].startsWith('しゃ'))throw Error('Kana read-aloud button is broken: '+JSON.stringify(spoken2));
  });
  await page.evaluate(()=>{
    const old=kanaRecording;
    try{
      kanaRecording=true;renderKana();
      const keys=[...document.querySelectorAll('#kanaGrid button')].filter(x=>!x.dataset.empty);
      const activeDisabled=keys.slice(0,3).map(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color,opacity:getComputedStyle(el).opacity}));
      const special=document.querySelector('#kanaGrid button.kana-special');
      if(special){const style=getComputedStyle(special);if(style.backgroundColor!==activeDisabled[0].background||style.opacity!==activeDisabled[0].opacity)throw Error('Disabled small kana differs from regular disabled keys: '+JSON.stringify({special:{background:style.backgroundColor,opacity:style.opacity},regular:activeDisabled[0],text:special.textContent}));}
    }finally{kanaRecording=old;renderKana();}
  });
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
   if(await image.count()<1)throw Error('Soft-serve shape '+i+' image missing');
   const hrefs=await image.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
   if(hrefs.some(x=>!x))throw Error('Missing scoop source '+i+' '+JSON.stringify(hrefs));
  }
  await page.evaluate(()=>{step=2;state.flavor=1;state.flavor2=3;state.mix=true;render()});
  if(await page.locator('#ice image').count()<2)throw Error('Mix images missing');
  await page.evaluate(()=>{state.cone=5;state.mix=false;render()});
  const cone=await page.locator('#coneBack image').getAttribute('href');
  if(!cone?.includes('cone-waffle-cup-raster-back'))throw Error('Wrong waffle cup '+cone);
  // Test the uploaded, case-sensitive PNG rather than the former SVG asset.
  const birchSource=await page.evaluate(()=>toppingArt('birch'));
  if(birchSource!=='topping-birch-high.PNG')throw Error('Birch topping still references old SVG: '+birchSource);
  await page.evaluate(async()=>{
    const img=new Image();img.src=toppingArt('birch');await img.decode();
    if(!img.naturalWidth||!img.naturalHeight)throw Error('Birch PNG cannot render');
  });
  // Touch one choice while another topping is selected; only one tap may be required.
  await page.evaluate(()=>{step=4;decors=[];activeToppingId=null;render();});
  const clickByTouch=await page.evaluate(()=>{
    const choices=document.getElementById('choices');
    const touch=(idx,id)=>{
      const el=choices.querySelector('[data-choice-index="'+idx+'"]');
      if(!el)throw Error('No choice '+idx);
      const rect=el.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
      el.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',pointerId:id,isPrimary:true,bubbles:true,clientX:x,clientY:y}));
      el.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',pointerId:id,isPrimary:true,bubbles:true,cancelable:true,clientX:x,clientY:y}));
    };
    touch(6,210);const first=decors.length;
    touch(0,211);const second=decors.length;
    return {first,second,src:decors[0]?.src,active:activeToppingId,last:decors[1]?.id};
  });
  if(clickByTouch.first!==1||clickByTouch.second!==2||clickByTouch.active!==clickByTouch.last)throw Error('Touch selection requires two taps: '+JSON.stringify(clickByTouch));
  if(!clickByTouch.src.endsWith('.PNG'))throw Error('Birch chosen as non-PNG: '+clickByTouch.src);
  // Front visual toppings must be below the cone's front rim in CSS stacking.
  const z=await page.evaluate(()=>['mainIceSvg','decorLayer','coneLipSvg','toppingPalette'].map(id=>{
    const el=document.getElementById(id);return {id,z:getComputedStyle(el).zIndex};
  }));
  if(!(Number(z[0].z)<Number(z[1].z)&&Number(z[1].z)<Number(z[2].z)))throw Error('Cone front layering is incorrect '+JSON.stringify(z));
  await page.evaluate(()=>{step=4;choose(3);step=0;render()});
  if(await page.locator('#toppingLayerControls').evaluate(e=>getComputedStyle(e).display)==='none')throw Error('Selected topping controls hidden outside topping page');
  if(await page.locator('.decors-layer .decor.active').count()!==1)throw Error('Selected topping outline missing');
  await page.evaluate(()=>{step=4;choose(6);step=0;render()});
  const backTarget=page.locator('#decorLayer .decor-hit').last();
  const before=await page.evaluate(()=>({rx:decors[decors.length-1].rx,ry:decors[decors.length-1].ry}));
  const target=await backTarget.boundingBox();
  if(!target)throw Error('Behind-ice topping lacks touch target');
  await page.mouse.move(target.x+target.width/2,target.y+target.height/2);
  await page.mouse.down();
  await page.mouse.move(target.x+target.width/2+15,target.y+target.height/2-12,{steps:4});
  await page.mouse.up();
  const after=await page.evaluate(()=>({rx:decors[decors.length-1].rx,ry:decors[decors.length-1].ry}));
  if(Math.abs(after.rx-before.rx)+Math.abs(after.ry-before.ry)<.01)throw Error('Behind-ice topping did not move');

  await page.evaluate(()=>{
    // After deleting the selected decoration, the bin must remain while others exist.
    decors=decors.filter(d=>d.id!==activeToppingId);activeToppingId=null;render();
    if(getComputedStyle(document.getElementById('trashZone')).display==='none')throw Error('Trash vanished after deleting one decoration');
    // Simulate a two-touch turn/pinch on the cone step, not the decoration step.
    const d=decors[0];activeToppingId=d.id;step=0;render();
    const target=document.getElementById('preview');
    const touch=(id,x,y)=>new Touch({identifier:id,target,clientX:x,clientY:y});
    const start=[touch(1,100,100),touch(2,150,100)];
    target.dispatchEvent(new TouchEvent('touchstart',{touches:start,targetTouches:start,changedTouches:start,bubbles:true,cancelable:true}));
    if(!toppingTwoFingerActive)throw Error('Pinch blocked outside decorations step');
    const next=[touch(1,95,110),touch(2,170,90)];
    target.dispatchEvent(new TouchEvent('touchmove',{touches:next,targetTouches:next,changedTouches:next,bubbles:true,cancelable:true}));
    if(d.scale<=1||Math.abs(d.rotation)<1)throw Error('Pinch did not scale and rotate the selected decoration');
    target.dispatchEvent(new TouchEvent('touchend',{touches:[],targetTouches:[],changedTouches:next,bubbles:true,cancelable:true}));
  });
  await page.goto(origin+'softcream-adjust.html',{waitUntil:'load'});
  if(await page.locator('#backCrop').count()!==1)throw Error('Back crop control missing');
  await page.locator('#sauceKind').selectOption('chocolate');
  await page.locator('#sauceStyle').selectOption('long-neutral');
  const longDrip=await page.locator('#toppingSauce image').evaluateAll(nodes=>nodes.some(n=>(n.getAttribute('href')||'').includes('sauce-drip-neutral-long.png')));
  if(!longDrip)throw Error('Long neutral PNG missing from sauce preview');
  if(await page.locator('#sauceShadePanel').evaluate(el=>getComputedStyle(el).display)!=='none')throw Error('Ice texture shading still enabled in long PNG mode');
  const neutralAsset=await page.evaluate(async()=>{const im=new Image();im.src='sauce-drip-neutral-long.png';await im.decode();return {w:im.naturalWidth,h:im.naturalHeight}});
  if(neutralAsset.w<250||neutralAsset.h<100)throw Error('Generated PNG did not load');
  await page.locator('#backCrop').fill('62');
  if(!await page.locator('#cropGuide path').count())throw Error('Crop guide not visible');
  await page.goto(origin+'kakigori.html',{waitUntil:'load'});
  await page.locator('#light').click();
  await page.evaluate(()=>{chosen='blue';daub(210,190);if(!channels.some((v,i)=>i%6===2&&v>0))throw Error('RGB blue channel not painted');});
  if(!await page.locator('body.magic').count())throw Error('Magic gem mode unavailable');
  await page.locator('#paint').click();
  if(await page.locator('body.magic').count())throw Error('Shaved ice mode unavailable');
  const art=page.locator('#art'),artRect=await art.boundingBox();
  if(!artRect)throw Error('Color play canvas missing');
  await page.evaluate(()=>{daub(210,150);render();if(!channels.some(v=>v>0))throw Error('Syrup brush did not paint')});
  await page.goto(origin+'katahame.html',{waitUntil:'load'});
  await page.locator('[data-lv="4"]').click();
  await page.locator('.setup .go').click();
  const dims=await page.locator('.tray .piece').evaluateAll(nodes=>nodes.map(n=>{let r=n.getBoundingClientRect();return {w:r.width,h:r.height,x:r.left,right:r.right,top:r.top}}));
  if(dims.length!==4||dims.some(x=>x.w>110||x.h>110||x.x<0||x.right>viewport.width+1))throw Error('Medium shapes oversized '+JSON.stringify({viewport,dims}));
  await page.goto(origin+'kana-speech-test.html',{waitUntil:'load'});
  if(await page.locator('[data-method]').count()!==4)throw Error('SSML comparison options missing');
  await page.getByRole('button',{name:'しゃ',exact:true}).click();
  await page.locator('[data-method="ssml"]').click();
  if(!((await page.locator('#status').textContent())||'').includes('SSML'))throw Error('SSML comparison not triggered');
  console.log('PASS',viewport.width,viewport.height,'difficulty / parent / ice / medium puzzle');
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
