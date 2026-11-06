'use strict';
/* Extra games use their own object stores so existing puzzle images are untouched. */
const EXDB='asobi-land-extra-v1';let exdb=null, colorItems=[],traceItems=[];
function exOpen(){return new Promise((res,rej)=>{const r=indexedDB.open(EXDB,1);r.onupgradeneeded=()=>{r.result.createObjectStore('color',{keyPath:'id'});r.result.createObjectStore('trace',{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function exOp(store,mode,fn){return new Promise((res,rej)=>{const req=fn(exdb.transaction(store,mode).objectStore(store));req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)})}
const exId=()=>String(Date.now())+'-'+Math.random();
const loadPicture=file=>new Promise((res,rej)=>{const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(url);res(im)};im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('画像を開けません'))};im.src=url});
function normalizedImage(im,threshold=false){const c=document.createElement('canvas');c.width=c.height=600;const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='white';x.fillRect(0,0,600,600);x.imageSmoothingEnabled=true;x.imageSmoothingQuality="high";const scale=Math.min(560/im.width,560/im.height);x.drawImage(im,(600-im.width*scale)/2,(600-im.height*scale)/2,im.width*scale,im.height*scale);if(threshold){const data=x.getImageData(0,0,600,600);for(let i=0;i<data.data.length;i+=4){const g=.299*data.data[i]+.587*data.data[i+1]+.114*data.data[i+2];const v=g<190?0:255;data.data[i]=data.data[i+1]=data.data[i+2]=v}x.putImageData(data,0,0)}return c.toDataURL('image/png')}
function makeTile(root,src,fn,remove){const b=document.createElement('button');b.className='tile';const im=new Image();im.src=src;im.alt='おてほん';b.append(im);b.onclick=fn;if(remove){const del=document.createElement('button');del.className='delete';del.textContent='×';del.onclick=async e=>{e.stopPropagation();if(confirm('この おてほんを けす？'))await remove()};b.append(del)}root.append(b)}
function simpleArt(type){const c=document.createElement('canvas');c.width=c.height=600;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,600,600);x.strokeStyle='#111';x.lineWidth=13;x.lineJoin='round';x.lineCap='round';x.beginPath();if(type==='flower'){// Five distinct petals, a round center, a curved stem and two leaves.
 for(let i=0;i<5;i++){const a=-Math.PI/2+i*2*Math.PI/5;const cx=300+79*Math.cos(a),cy=235+79*Math.sin(a);x.moveTo(cx+61,cy);x.arc(cx,cy,61,0,Math.PI*2)}
 x.moveTo(300,235);x.arc(300,235,53,0,Math.PI*2);
 x.moveTo(300,288);x.bezierCurveTo(315,355,282,425,305,530);
 x.moveTo(300,435);x.bezierCurveTo(255,370,207,385,214,435);x.bezierCurveTo(232,473,280,463,300,435);
 x.moveTo(298,465);x.bezierCurveTo(340,397,392,409,381,458);x.bezierCurveTo(365,485,328,485,298,465);
}else if(type==='sun'){x.arc(300,300,115,0,7);for(let i=0;i<12;i++){const a=i*Math.PI/6;x.moveTo(300+155*Math.cos(a),300+155*Math.sin(a));x.lineTo(300+205*Math.cos(a),300+205*Math.sin(a))}}else if(type==='house'){x.moveTo(130,275);x.lineTo(300,110);x.lineTo(470,275);x.moveTo(165,275);x.lineTo(165,480);x.lineTo(435,480);x.lineTo(435,275);x.moveTo(255,480);x.lineTo(255,350);x.lineTo(345,350);x.lineTo(345,480)}else if(type==='car'){x.rect(115,280,370,140);x.moveTo(190,280);x.lineTo(245,205);x.lineTo(380,205);x.lineTo(435,280);x.moveTo(215,420);x.arc(215,420,40,0,7);x.moveTo(420,420);x.arc(420,420,40,0,7)}else{x.arc(300,300,175,0,7)}x.stroke();return c.toDataURL('image/png')}
function kanaArt(ch){const c=document.createElement('canvas');c.width=c.height=600;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,600,600);x.font='440px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#111';x.fillText(ch,300,310);return c.toDataURL('image/png')}
const colorPreset=[['はくし',()=>{const c=document.createElement('canvas');c.width=c.height=600;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,600,600);return c.toDataURL('image/png')}],['くるま',()=>simpleArt('car')],['おはな',()=>simpleArt('flower')],['おひさま',()=>simpleArt('sun')],['おうち',()=>simpleArt('house')],['まる',()=>simpleArt('circle')],['あ',()=>kanaArt('あ')]];
async function refreshExtra(){if(!exdb){renderColors();return;}colorItems=await exOp('color','readonly',s=>s.getAll());traceItems=await exOp('trace','readonly',s=>s.getAll());renderColors();renderTraceManage()}
function renderColors(){const root=$('colorTiles');root.replaceChildren();colorPreset.forEach(([label,get])=>makeTile(root,get(),()=>beginPaint(get())));colorItems.forEach(it=>makeTile(root,it.data,()=>beginPaint(it.data)));const manage=$('colorManage');manage.replaceChildren();colorItems.forEach(it=>makeTile(manage,it.data,()=>{},async()=>{await exOp('color','readwrite',s=>s.delete(it.id));await refreshExtra()}))}
$('openColor').onclick=()=>{renderColors();show('colorGallery')};$('openKana').onclick=()=>{renderKana();show('kana')};$('openTrace').onclick=()=>show('traceMenu');
$('colorFile').onchange=async e=>{const files=Array.from(e.target.files);e.target.value='';if(!files.length)return;try{for(const file of files){const data=normalizedImage(await loadPicture(file),false);await exOp('color','readwrite',s=>s.put({id:exId(),data}))}await refreshExtra()}catch(err){alert('画像を登録できませんでした')}};
/* Coloring: separate outline and paint layers, fill with a small gap closing mask. */
const paint=$('paintCanvas'),pctx=paint.getContext('2d'),paintLayer=document.createElement('canvas'),px=paintLayer.getContext('2d',{willReadFrequently:true});paintLayer.width=paintLayer.height=600;
let outline=new Image(),outlineLayer=null,outlineData=null,paintTool='pen',paintColor='#e93432',brush=24,paintHistory=[],paintFuture=[],painting=false,lastPaint=null,paintPointer=null;
const coupy=[['しろ','#ffffff'],['きいろ','#ffe23c'],['だいだいいろ','#f28a29'],['あか','#e93432'],['ももいろ','#f6a1bb'],['うすだいだい','#f4c59d'],['ちゃいろ','#8e523a'],['こげちゃいろ','#573d34'],['きみどり','#9bc947'],['みどり','#269b50'],['ふかみどり','#156c45'],['みずいろ','#7dd4e7'],['あお','#2876cb'],['ぐんじょういろ','#334aa5'],['むらさき','#8a59ad'],['あかむらさき','#b75493'],['はいいろ','#a0a0a0'],['くろ','#202020'],['おうどいろ','#c6a050'],['やまぶきいろ','#f5ba2f'],['しゅいろ','#ed5837'],['うすむらさき','#c6a2d8'],['あいいろ','#334e80'],['ねずみいろ','#777b7c']];
const coupyEnglish=["White", "Yellow", "Orange", "Red", "Pink", "Peach", "Brown", "Dark Brown", "Yellow Green", "Green", "Dark Green", "Light Blue", "Blue", "Ultramarine", "Purple", "Red Violet", "Gray", "Black", "Ochre", "Golden Yellow", "Vermilion", "Lavender", "Indigo", "Slate Gray"];
let speakEnabled=true;let speechQueueToken=0;
function say(t){if(!speakEnabled||!('speechSynthesis'in window))return;try{const token=++speechQueueToken;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=.92;u.pitch=1;const voices=speechSynthesis.getVoices();const jp=voices.find(v=>v.lang==='ja-JP'&&v.localService)||voices.find(v=>v.lang.startsWith('ja'));if(jp)u.voice=jp; // A tiny deferred enqueue avoids iOS cancel/speak races.
 setTimeout(()=>{if(token===speechQueueToken&&speakEnabled)speechSynthesis.speak(u)},75)}catch(e){}}
let englishNameMode=false;
function sayEnglish(t){if(!speakEnabled||!('speechSynthesis' in window))return;try{const token=++speechQueueToken;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='en-US';u.rate=.85;const voices=speechSynthesis.getVoices();const en=voices.find(v=>v.lang.startsWith('en')&&v.localService)||voices.find(v=>v.lang.startsWith('en'));if(en)u.voice=en;setTimeout(()=>{if(token===speechQueueToken&&speakEnabled)speechSynthesis.speak(u)},75)}catch(e){}}
function paintNameRefresh(){const i=coupy.findIndex(c=>c[1]===paintColor);const ja=i<0?'いろを えらぼう':coupy[i][0],en=i<0?'Choose a color':coupyEnglish[i];$('paintColorName').textContent=englishNameMode?en:ja;$('paintColorEnglish').textContent=englishNameMode?ja:en;$('paintColorName').lang=englishNameMode?'en':'ja';$('paintColorEnglish').lang=englishNameMode?'ja':'en';$('paintLangJa').classList.toggle('selected',!englishNameMode);$('paintLangEn').classList.toggle('selected',englishNameMode);}
$('paintNameSwitch').onclick=()=>{englishNameMode=!englishNameMode;paintNameRefresh();const i=coupy.findIndex(c=>c[1]===paintColor);if(i>=0){if(englishNameMode)sayEnglish(coupyEnglish[i]);else say(coupy[i][0]);}};
function palette(){const root=$('palette');root.replaceChildren();coupy.forEach(([name,hex],i)=>{const b=document.createElement('button');b.className='swatch'+(hex===paintColor?' chosen':'');b.style.background=hex;b.title=name;b.setAttribute('aria-label',name);const select=()=>{paintColor=hex;palette();if(englishNameMode)sayEnglish(coupyEnglish[i]);else say(name)};b.onpointerdown=e=>{if(e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();select()}};b.onclick=e=>{if(e.detail!==0&&window.PointerEvent&&e.pointerType)return;select()};root.append(b)});const selected=coupy.findIndex(c=>c[1]===paintColor);paintNameRefresh()}palette();
function paintRender(){pctx.fillStyle='white';pctx.fillRect(0,0,600,600);pctx.drawImage(paintLayer,0,0);if(outlineLayer)pctx.drawImage(outlineLayer,0,0,600,600)}
function snapshot(){paintHistory.push(px.getImageData(0,0,600,600));if(paintHistory.length>16)paintHistory.shift();paintFuture=[]}
function beginPaint(src){outlineLayer=null;outline=new Image();outline.onload=()=>{const c=document.createElement('canvas');c.width=c.height=600;const x=c.getContext('2d');x.drawImage(outline,0,0,600,600);const mask=x.getImageData(0,0,600,600);outlineData=new Uint8ClampedArray(mask.data);for(let k=0;k<mask.data.length;k+=4){const v=(mask.data[k]+mask.data[k+1]+mask.data[k+2])/3;mask.data[k]=mask.data[k+1]=mask.data[k+2]=0;mask.data[k+3]=Math.max(0,Math.min(255,(245-v)*2.8))}x.putImageData(mask,0,0);outlineLayer=c;px.clearRect(0,0,600,600);paintHistory=[];paintFuture=[];paintRender();show('coloring')};outline.src=src}
function pointOnCanvas(e,c){const r=c.getBoundingClientRect();return{x:Math.max(0,Math.min(599,(e.clientX-r.left)*600/r.width)),y:Math.max(0,Math.min(599,(e.clientY-r.top)*600/r.height))}}
function hexRgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
// Incremental canvas strokes avoid re-rendering the entire history for every Pencil sample.
// Pencil pressure affects opacity only; stroke width stays fixed. Rendered ink is not rebuilt on release.
function drawPaintSegment(a,b,pressure=0.5,pen=false){
 px.save();px.globalCompositeOperation=paintTool==='eraser'?'destination-out':'source-over';
 px.strokeStyle=paintTool==='eraser'?'#000':paintColor;px.fillStyle=px.strokeStyle;
 px.globalAlpha=paintTool==='eraser'?1:(pen?Math.min(.97,.42+.55*Math.max(0,Math.min(1,pressure))):.9);px.lineWidth=brush;px.lineCap='round';px.lineJoin='round';
 px.beginPath();px.moveTo(a.x,a.y);px.lineTo(b.x,b.y);px.stroke();
 px.restore();
}
function bucket(x,y){if(!outlineData)return;const w=600,h=600,start=Math.floor(y)*w+Math.floor(x);const blocked=new Uint8Array(w*h);for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const i=yy*w+xx,k=i*4;const v=(outlineData[k]+outlineData[k+1]+outlineData[k+2])/3;if(v<128)blocked[i]=1}
// Expand dark strokes to seal minor gaps before flood filling.
const solid=blocked.slice();for(let yy=2;yy<h-2;yy++)for(let xx=2;xx<w-2;xx++){const i=yy*w+xx;if(!blocked[i])continue;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)solid[i+dy*w+dx]=1}
if(solid[start])return;const seen=new Uint8Array(w*h),stack=new Int32Array(w*h);let top=0;stack[top++]=start;seen[start]=1;const ids=[];while(top){const i=stack[--top];ids.push(i);const x=i%w,y=(i/w)|0;for(const n of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(n>=0&&!seen[n]&&!solid[n]){seen[n]=1;stack[top++]=n}}
// Extend the filled region by 3 pixels under the black outline, without crossing the sealed boundary.
const filled=new Uint8Array(w*h);for(const i of ids)filled[i]=1;
const expanded=ids.slice();for(const i of ids){const xx=i%w,yy=(i/w)|0;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){if(dx*dx+dy*dy>9)continue;const nx=xx+dx,ny=yy+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const j=ny*w+nx;if(!filled[j]){filled[j]=1;expanded.push(j)}}}
const d=px.getImageData(0,0,w,h),rgb=hexRgb(paintColor);for(const i of expanded){const k=i*4;d.data[k]=rgb[0];d.data[k+1]=rgb[1];d.data[k+2]=rgb[2];d.data[k+3]=255}px.putImageData(d,0,0);paintRender()}
paint.addEventListener('pointerdown',e=>{if(painting)return;e.preventDefault();paint.setPointerCapture(e.pointerId);painting=true;paintPointer=e.pointerId;const p=pointOnCanvas(e,paint);snapshot();if(paintTool==='pen'||paintTool==='eraser'){drawPaintSegment(p,{x:p.x+.12,y:p.y+.12},e.pressure,e.pointerType==='pen');paintRender()}if(paintTool==='bucket'){bucket(p.x,p.y);painting=false;paintPointer=null;return}lastPaint=p;drawPaintSegment(p,p,e.pressure,e.pointerType==='pen');paintRender()});
paint.addEventListener('pointermove',e=>{if(!painting||e.pointerId!==paintPointer||!lastPaint)return;e.preventDefault();const events=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[e];for(const ev of events){const p=pointOnCanvas(ev,paint);if(Math.hypot(p.x-lastPaint.x,p.y-lastPaint.y)<.2)continue;drawPaintSegment(lastPaint,p,ev.pressure,ev.pointerType==='pen');lastPaint=p}paintRender()});
['pointerup','pointercancel','lostpointercapture'].forEach(t=>paint.addEventListener(t,e=>{if(e.pointerId===paintPointer){painting=false;lastPaint=null;paintPointer=null;paintRender()}}));
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{paintTool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('chosen',x===b))});
document.querySelectorAll('[data-brush]').forEach(b=>b.onclick=()=>{brush=Number(b.dataset.brush);document.querySelectorAll('[data-brush]').forEach(x=>x.classList.toggle('chosen',x===b))});
$('paintUndo').onclick=()=>{if(!paintHistory.length)return;paintFuture.push(px.getImageData(0,0,600,600));px.putImageData(paintHistory.pop(),0,0);paintRender()};
$('paintRedo').onclick=()=>{if(!paintFuture.length)return;paintHistory.push(px.getImageData(0,0,600,600));px.putImageData(paintFuture.pop(),0,0);paintRender()};
$('paintClear').onclick=()=>{if(confirm('ぬった いろを ぜんぶ けす？')){snapshot();px.clearRect(0,0,600,600);paintRender()}};
// iPad web apps cannot write directly to Photos. Open the native share sheet,
// where the user can select “画像を保存”. Do not claim a download is in Photos.
$('paintSave').onclick=async()=>{
 paintRender();const blob=await new Promise(r=>paint.toBlob(r,'image/png'));
 if(!blob){alert('画像を作成できませんでした');return}
 const file=new File([blob],'あそびランド-ぬりえ.png',{type:'image/png'});
 try{
  if(navigator.share&&navigator.canShare?.({files:[file]})){
   await navigator.share({files:[file]});return;
  }
 }catch(e){if(e.name==='AbortError')return;}
 // Fallback: open the image in a new tab so Safari's image save can be used.
 const url=URL.createObjectURL(blob);const tab=window.open(url,'_blank');
 if(!tab){const a=document.createElement('a');a.href=url;a.download=file.name;a.click();}
 alert('写真に保存するには、画像の共有メニューで「画像を保存」を選んでね。');
 setTimeout(()=>URL.revokeObjectURL(url),60000);
};
/* Kana board: units preserve compound sounds as single deletable keys. */
const basicRows=['あかさたなはまやらわ','いきしちにひみっりを','うくすつぬふむゆる゛','えけせてねへめーれ゜','おこそとのほもよろん'];
const voicedRows=['がざだばぱ','ぎじぢびぴ','ぐずづぶぷ','げぜでべぺ','ごぞどぼぽ'];
const combos=['きゃ','きゅ','きょ','しゃ','しゅ','しょ','ちゃ','ちゅ','ちょ','にゃ','にゅ','にょ','ひゃ','ひゅ','ひょ','みゃ','みゅ','みょ','りゃ','りゅ','りょ','ぎゃ','ぎゅ','ぎょ','じゃ','じゅ','じょ','びゃ','びゅ','びょ','ぴゃ','ぴゅ','ぴょ','ぢゃ','ぢゅ','ぢょ'];
let kanaTab='basic',katakana=false,kanaUnits=[],kanaRecording=false,recognition=null;
const toKata=s=>s.replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96));const toHira=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
function kanaValue(s){return katakana?toKata(s):toHira(s)}
function kanaString(){return kanaUnits.map(kanaValue).join('')}
const kanaVoicedMap={'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご','さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ','た':'だ','ち':'ぢ','つ':'づ','て':'で','と':'ど','は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ'};
const kanaSemiMap={'は':'ぱ','ひ':'ぴ','ふ':'ぷ','へ':'ぺ','ほ':'ぽ'};
const kanaUnvoiceMap=Object.fromEntries(Object.entries(kanaVoicedMap).map(([k,v])=>[v,k]));
const kanaUnsemiMap=Object.fromEntries(Object.entries(kanaSemiMap).map(([k,v])=>[v,k]));
function kanaMark(mark){if(kanaRecording||!kanaUnits.length)return;const last=kanaUnits[kanaUnits.length-1],chars=Array.from(last),tail=chars.pop();if(!tail)return;let result;if(mark==='゛'){result=kanaVoicedMap[tail]||kanaUnvoiceMap[tail]||kanaVoicedMap[kanaUnsemiMap[tail]];}else{result=kanaSemiMap[tail]||kanaUnsemiMap[tail]||kanaSemiMap[kanaUnvoiceMap[tail]];}if(!result)return;chars.push(result);kanaUnits[kanaUnits.length-1]=chars.join('');kanaRefresh();say(kanaValue(result))}
function kanaRefresh(){const s=kanaString();$('kanaText').textContent=s;$('kanaSmall').textContent=kanaValue('っ');$('kanaScript').textContent=katakana?'カタカナ':'ひらがな';$('kanaSound').textContent=speakEnabled?'🔊':'🔇';$('kanaStatus').textContent=(Array.from(s).length>=20?'20もじまでだよ':'')+(kanaRecording?' 🎤 ききとりちゅう':'');document.querySelectorAll('#kanaGrid button:not(.kana-mark),#kanaSmall,#kanaLong').forEach(b=>b.disabled=kanaRecording||Array.from(s).length>=20);document.querySelectorAll('.kana-mark').forEach(b=>b.disabled=kanaRecording||!kanaUnits.length)}
function kanaAdd(s){if(kanaRecording)return;const remaining=20-Array.from(kanaString()).length;if(remaining<=0)return;const part=Array.from(s).slice(0,remaining).join('');if(!part)return;kanaUnits.push(toHira(part));kanaRefresh();say(kanaValue(part))}
function renderKana(){const root=$('kanaGrid');root.replaceChildren();const values=kanaTab==='basic'?basicRows.join('').split(''):kanaTab==='voiced'?voicedRows.map(r=>r.padEnd(10,'　')).join('').split(''):combos;values.forEach(ch=>{const b=document.createElement('button');if(ch==='　'){b.disabled=true;b.textContent='';}else{b.textContent=kanaValue(ch);if(ch==='っ'||ch==='ー'||ch==='゛'||ch==='゜')b.classList.add('kana-special');if(ch==='゛'||ch==='゜'){b.classList.add('kana-mark');b.onclick=()=>kanaMark(ch)}else b.onclick=()=>kanaAdd(ch)}root.append(b)});document.querySelectorAll('[data-kana-tab]').forEach(b=>b.classList.toggle('chosen',b.dataset.kanaTab===kanaTab));kanaRefresh()}
document.querySelectorAll('[data-kana-tab]').forEach(b=>b.onclick=()=>{kanaTab=b.dataset.kanaTab;renderKana()});

$('kanaScript').onclick=()=>{katakana=!katakana;renderKana()};$('kanaSmall').onclick=()=>kanaAdd('っ');$('kanaLong').onclick=()=>kanaAdd('ー');$('kanaDelete').onclick=()=>{kanaUnits.pop();kanaRefresh()};$('kanaClear').onclick=()=>{kanaUnits=[];kanaRefresh()};$('kanaPlay').onclick=()=>say(kanaString());$('kanaSound').onclick=()=>{speakEnabled=!speakEnabled;if(!speakEnabled)speechSynthesis?.cancel();kanaRefresh()};
$('kanaMic').onclick=()=>{if(kanaRecording){recognition?.stop();kanaRecording=false;kanaRefresh();return}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert('このiPadのブラウザは音声入力に対応していません');return}recognition=new SR();recognition.lang='ja-JP';recognition.interimResults=false;recognition.continuous=true;recognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal){const txt=e.results[i][0].transcript;const remaining=20-Array.from(kanaString()).length;const part=Array.from(txt).slice(0,remaining).join('');if(part)kanaUnits.push(toHira(part));kanaRefresh();if(remaining<=Array.from(txt).length)recognition.stop()}}};recognition.onerror=e=>{$('kanaStatus').textContent='マイクが つかえません: '+e.error};recognition.onend=()=>{kanaRecording=false;kanaRefresh()};try{recognition.start();kanaRecording=true;kanaRefresh()}catch(e){alert('マイクを開始できません')}};
/* Trace levels. Draw only on Apple Pencil pointer events. */
const traceCanvas=$('traceCanvas'),tx=traceCanvas.getContext('2d');const traceInk=document.createElement('canvas');traceInk.width=traceInk.height=600;const ix=traceInk.getContext('2d',{willReadFrequently:true});const traceTarget=document.createElement('canvas');traceTarget.width=traceTarget.height=600;const mx=traceTarget.getContext('2d',{willReadFrequently:true});let traceLevel=1,traceIndex=0,traceOptions=[],traceActive=false,tracePrev=null,tracePath=null,traceProgress=0;
const traceDefs={1:[['まっすぐ','M 95 300 L 505 300'],['たて','M 300 90 L 300 510'],['ジグザグ','M 90 150 L 210 430 L 330 150 L 450 430']],2:[['なみ','M 70 320 Q 160 110 250 320 T 430 320 T 530 320'],['カーブ','M 110 480 Q 50 90 490 125'],['ぐるぐる','M 300 300 C 120 110 80 460 300 470 C 540 480 550 140 310 125']],3:[['まる','M 300 110 A 190 190 0 1 1 299 110'],['さんかく','M 300 100 L 510 470 L 90 470 Z'],['しかく','M 125 125 L 475 125 L 475 475 L 125 475 Z'],['ほし','M 300 90 L 360 250 L 530 250 L 390 355 L 450 525 L 300 420 L 150 525 L 210 355 L 70 250 L 240 250 Z'],['ハート','M 300 480 C 130 330 60 240 155 150 C 220 90 280 140 300 190 C 340 90 440 100 480 180 C 540 290 400 410 300 480 Z']]};
function renderTraceManage(){const root=$('traceManage');root.replaceChildren();traceItems.forEach(it=>makeTile(root,it.data,()=>{},async()=>{await exOp('trace','readwrite',s=>s.delete(it.id));await refreshExtra()}))}
$('traceFile').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{const data=normalizedImage(await loadPicture(file),true);await exOp('trace','readwrite',s=>s.put({id:exId(),data}));await refreshExtra()}catch(err){alert('登録できませんでした')}};
document.querySelectorAll('[data-trace-level]').forEach(b=>b.onclick=()=>{traceLevel=Number(b.dataset.traceLevel);traceIndex=0;if(traceLevel<=3){traceOptions=traceDefs[traceLevel].map(([label,path])=>({label,path}));traceStart()}else{traceOptions=traceLevel===4?[...'あいうえおかきくけこさしすせそ'].map(ch=>({label:ch,image:kanaArt(ch)})).concat(['はな','たいよう','おうち','くるま'].map((n,i)=>({label:n,image:simpleArt(['flower','sun','house','car'][i])}))):traceItems.map((it,i)=>({label:'おてほん '+(i+1),image:it.data}));const root=$('traceTiles');root.replaceChildren();traceOptions.forEach((it,i)=>makeTile(root,it.image,()=>{traceIndex=i;traceStart()}));$('traceGalleryTitle').textContent=traceLevel===4?'もじと え':'じゆうなぞり';$('traceGalleryHelp').textContent=traceLevel===5?'🔒 を3びょう おして おてほんを とうろくできるよ':'';show('traceGallery')}});
function traceStart(){document.getElementById('traceCar').style.display='none';traceActive=false;traceProgress=0;tracePrev=null;ix.clearRect(0,0,600,600);const o=traceOptions[traceIndex];$('traceLabel').textContent=o.label;traceDrawBase();show('tracing')}
function traceDrawBase(){const o=traceOptions[traceIndex];ix.clearRect(0,0,600,600);mx.clearRect(0,0,600,600);tx.fillStyle='white';tx.fillRect(0,0,600,600);if(o.path){const path=new Path2D(o.path);tracePath=path;tx.lineWidth=44;tx.lineCap='round';tx.lineJoin='round';tx.strokeStyle='#c4cbd0';tx.stroke(path);tx.setLineDash([3,25]);tx.lineWidth=8;tx.strokeStyle='#fff9d5';tx.stroke(path);tx.setLineDash([]);mx.lineWidth=13;mx.lineCap='round';mx.lineJoin='round';mx.strokeStyle='#000';mx.stroke(path)}else{tracePath=null;const im=new Image();im.onload=()=>{if(o===traceOptions[traceIndex]){tx.globalAlpha=.23;tx.drawImage(im,0,0,600,600);tx.globalAlpha=1;mx.drawImage(im,0,0,600,600);const d=mx.getImageData(0,0,600,600);for(let k=0;k<d.data.length;k+=4){const gray=(d.data[k]+d.data[k+1]+d.data[k+2])/3;d.data[k]=d.data[k+1]=d.data[k+2]=0;d.data[k+3]=gray<175?255:0}mx.putImageData(d,0,0)}};im.src=o.image}$('traceStatus').textContent='Apple Pencilで なぞってね'}
traceCanvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='pen'){$('traceStatus').textContent='Apple Pencilを つかってね';return}e.preventDefault();traceCanvas.setPointerCapture(e.pointerId);traceActive=true;tracePrev=pointOnCanvas(e,traceCanvas);traceCarAt(tracePrev)});
traceCanvas.addEventListener('pointermove',e=>{if(!traceActive||e.pointerType!=='pen')return;e.preventDefault();const p=pointOnCanvas(e,traceCanvas);if(tracePath){const d=mx.getImageData(Math.max(0,Math.min(599,Math.round(p.x))),Math.max(0,Math.min(599,Math.round(p.y))),1,1).data;let near=d[3]>50; if(!near){for(let a=-18;a<=18&&!near;a+=6)for(let c=-18;c<=18;c+=6){let xx=Math.round(p.x)+a,yy=Math.round(p.y)+c;if(xx>=0&&xx<600&&yy>=0&&yy<600&&mx.getImageData(xx,yy,1,1).data[3]>50){near=true;break}}}if(!near){$('traceStatus').textContent='みちに もどってね';tracePrev=p;return}}tx.beginPath();tx.moveTo(tracePrev.x,tracePrev.y);tx.lineTo(p.x,p.y);tx.lineWidth=7;tx.lineCap='round';tx.strokeStyle='#f45b48';tx.stroke();ix.beginPath();ix.moveTo(tracePrev.x,tracePrev.y);ix.lineTo(p.x,p.y);ix.lineWidth=17;ix.lineCap='round';ix.strokeStyle='#000';ix.stroke();traceProgress+=Math.hypot(p.x-tracePrev.x,p.y-tracePrev.y);tracePrev=p;traceCarAt(p);if(traceProgress>440)$('traceStatus').textContent='✨ たくさん かけたね！'});
['pointerup','pointercancel'].forEach(ev=>traceCanvas.addEventListener(ev,()=>{traceActive=false;tracePrev=null}));
function traceCarAt(p){let car=document.getElementById('traceCar');if(!car)return;const r=traceCanvas.getBoundingClientRect();car.style.left=(traceCanvas.offsetLeft+p.x/600*r.width-20)+'px';car.style.top=(traceCanvas.offsetTop+p.y/600*r.height-20)+'px';car.style.display='block'}
function traceJudge(){
 // Compare sampled reference ink with the child's strokes, with generous 20px tolerance.
 const reference=mx.getImageData(0,0,600,600).data, drawn=ix.getImageData(0,0,600,600).data;
 let targets=0,matched=0;const stride=5;
 for(let y=10;y<590;y+=stride)for(let x=10;x<590;x+=stride){const k=(y*600+x)*4;if(reference[k+3]<100)continue;targets++;let found=false;
 for(let dy=-20;dy<=20&&!found;dy+=5)for(let dx=-20;dx<=20;dx+=5){if(dx*dx+dy*dy>400)continue;const xx=x+dx,yy=y+dy;if(xx>=0&&xx<600&&yy>=0&&yy<600&&drawn[(yy*600+xx)*4+3]>30){found=true;break}}
 if(found)matched++}
 const ratio=targets?matched/targets:0;const good=ratio>=.48;
 $('traceStatus').textContent=good?'🌟 できたね！':'💛 あとちょっと！';
 traceChime(good);
 if(good){traceCelebrate();traceClap()}
}
function traceClap(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const a=new A(),len=Math.floor(a.sampleRate*.095),buf=a.createBuffer(1,len,a.sampleRate),data=buf.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/len,1.6);[0,.12,.27,.40,.57,.71].forEach((d,i)=>{const src=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain();src.buffer=buf;filter.type='highpass';filter.frequency.value=750;gain.gain.value=.13+(i%3)*.025;src.connect(filter);filter.connect(gain);gain.connect(a.destination);src.start(a.currentTime+d)});setTimeout(()=>a.close(),1600)}catch(e){}}
function traceCelebrate(){const area=$('tracing');const layer=document.createElement('div');layer.className='trace-confetti-layer';const shapes=['🎊','✨','🎉','🟡','🩷','💛','🟢','🔵'];for(let i=0;i<46;i++){const bit=document.createElement('span');bit.className='trace-confetti';bit.textContent=shapes[i%shapes.length];bit.style.left=(i*37%100)+'%';bit.style.animationDelay=(i%11*.08)+'s';bit.style.animationDuration=(2+(i%5)*.2)+'s';layer.append(bit)}area.append(layer);setTimeout(()=>layer.remove(),4000)}
function traceChime(good){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const a=new A();const notes=good?[523.25,659.25,783.99]:[392,440];notes.forEach((hz,i)=>{const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+i*.13;o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.11,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+.24)});setTimeout(()=>a.close(),850)}catch(e){}}
$('traceDone').onclick=traceJudge;
$('traceReset').onclick=()=>{ix.clearRect(0,0,600,600);traceProgress=0;traceDrawBase()};$('traceNext').onclick=()=>{traceIndex=(traceIndex+1)%traceOptions.length;traceStart()};
/* Navigation safety: unsaved paint is discarded only after confirmation. */
const oldBack=goBack;goBack=function(){if(screen==='coloring'&&!confirm('ぬりえを おわる？ ぬったいろは きえるよ'))return;if(screen==='kana'){kanaUnits=[];recognition?.stop();kanaRecording=false;try{speechSynthesis.cancel()}catch(e){}}if(screen==='tracing'&&traceLevel<=3){show('traceMenu');return}oldBack()};
$('back').onclick=()=>goBack();
window.addEventListener('pagehide',()=>{kanaUnits=[];recognition?.stop()});
renderColors();exOpen().then(d=>{exdb=d;refreshExtra()}).catch(()=>{renderColors();console.warn('画像登録は利用できませんが、ぬりえは遊べます')});

/* Shared short button tap sound, independent of speech playback. */
let uiAudio=null;
function uiTap(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;uiAudio=uiAudio||new A();if(uiAudio.state==='suspended')uiAudio.resume();const t=uiAudio.currentTime,o=uiAudio.createOscillator(),g=uiAudio.createGain();o.type='sine';o.frequency.setValueAtTime(730,t);o.frequency.exponentialRampToValueAtTime(940,t+.065);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.055,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+.105);o.connect(g);g.connect(uiAudio.destination);o.start(t);o.stop(t+.11)}catch(e){}}
document.addEventListener('pointerdown',e=>{const b=e.target.closest('button,.add-btn');if(b&&!b.disabled)uiTap()},{passive:true});

// v9: update application assets without deleting the child's saved drawings/puzzles.
(function(){
 const btn=document.getElementById('appUpdate'),status=document.getElementById('updateStatus');
 if(!btn)return;
 btn.addEventListener('click',async()=>{
  btn.disabled=true;status.textContent='こうしんを かくにんちゅう…';
  try{
   if('serviceWorker' in navigator){
    const reg=await navigator.serviceWorker.getRegistration();
    if(reg){await reg.update();if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});}
   }
   // Only remove the application's own offline caches; do not touch IndexedDB or local storage.
   if('caches' in window){
    const names=await caches.keys();
    await Promise.all(names.filter(n=>n.startsWith('asobi-land-')).map(n=>caches.delete(n)));
   }
   status.textContent='よみこみなおします';
   const u=new URL(location.href);u.searchParams.set('refresh',String(Date.now()));
   location.replace(u.href);
  }catch(e){status.textContent='こうしんできませんでした。ネットをかくにんしてね';btn.disabled=false;}
 });
})();

// v13: save requires a deliberate 1-second hold, preventing accidental share dialogs.
(()=>{const b=$('paintSave'),perform=b.onclick;let timer=null,armed=false; b.onclick=null; b.textContent='📷 1びょう おして ほぞん';b.addEventListener('pointerdown',e=>{e.preventDefault();armed=true;b.style.filter='brightness(.8)';timer=setTimeout(()=>{if(armed){armed=false;b.style.filter='';perform()}},1000)});const cancel=()=>{armed=false;clearTimeout(timer);b.style.filter=''};['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,cancel));})();
