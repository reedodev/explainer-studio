import assert from 'node:assert/strict';
import {validateBoard} from '../src/validation.js';
import {makeSubtitles,subtitleIssues} from '../src/subtitles.js';
import {ICON_NAMES,iconPaths} from '../src/render/icons.js';
const base=()=>({scenes:[{id:'bad-fixture',duration:20,narration:'조건을 확인합니다. 필요한 정보를 찾아봅니다.',drawOrder:['a'],elements:[{id:'a',type:'rectangle',x:100,y:200,w:200,h:200,start:0,end:19}]}]});let count=0;
function detects(name:string,edit:(b:any)=>void,rule:string){const b=base();edit(b);const found=validateBoard(b);assert(found.some(i=>i.rule===rule),name+' failed: '+JSON.stringify(found));console.log('PASS',name);count++;}
detects('overlap',b=>{b.scenes[0].elements.push({...b.scenes[0].elements[0],id:'b'});b.scenes[0].drawOrder.push('b');},'overlap');
detects('out-of-frame',b=>b.scenes[0].elements[0].x=-10,'out-of-frame');
detects('subtitle zone',b=>b.scenes[0].elements[0].y=900,'subtitle zone');
detects('watermark zone',b=>Object.assign(b.scenes[0].elements[0],{x:1650,y:10}),'watermark zone');
detects('small font',b=>b.scenes[0].elements[0].fontSize=15,'small font');
detects('too many elements',b=>{b.scenes[0].elements=Array.from({length:13},(_,i)=>({...b.scenes[0].elements[0],id:String(i)}));},'too many elements');
detects('static tail >=10s',b=>b.scenes[0].elements[0].end=8,'static >=10s');
detects('static gap >=10s',b=>Object.assign(b.scenes[0].elements[0],{start:11,end:19}),'static >=10s');
detects('drawing past scene end',b=>b.scenes[0].elements[0].end=25,'drawing past scene end');
detects('drawing finishing too early',b=>b.scenes[0].elements[0].end=4,'drawing finishing too early');
const bad:any={start:0,end:2,text:'을 확인합니다.',scene:'test',sentence:'조건을 확인합니다.',sourceStart:2,sourceEnd:10};assert(subtitleIssues([bad]).some(i=>i.rule==='subtitle orphan particle'));count++;console.log('PASS orphan particle');assert(subtitleIssues([bad]).some(i=>i.rule==='subtitle mid-word fragment'));count++;console.log('PASS mid-word provenance');
for(const text of ['가'.repeat(25),'첫 줄\n둘째 줄\n셋째 줄']){assert(subtitleIssues([{...bad,text,sentence:''}]).some(i=>i.rule==='subtitle limits'));count++;}console.log('PASS subtitle length and line limits');
assert(subtitleIssues([{...bad,text:'조건을 확인합니다. 다음을 봅니다.',sentence:''}]).some(i=>i.rule==='subtitle multiple sentences'));count++;console.log('PASS multiple sentence cue');
const caps=makeSubtitles(base());assert.equal(caps.length,2);assert.equal(caps[0].text,'조건을 확인합니다.');assert.equal(caps[1].text,'필요한 정보를 찾아봅니다.');assert.equal(subtitleIssues(caps).length,0);assert(Math.abs(caps.at(-1)!.end-20)<1e-6);count++;console.log('PASS sentence-preserving clean cue and real-scene timing');
const long=base();long.scenes[0].narration='이것은 아주 긴 문장을 여러 줄로 나누더라도 어절을 끊지 않고 안전하게 화면에 보여 주는 검증용 문장입니다.';const cc=makeSubtitles(long);assert.equal(subtitleIssues(cc).length,0);assert(cc.every(c=>c.text.split('\n').length<=2));count++;console.log('PASS long sentence eojeol wrapping');
const contained=base();contained.scenes[0].elements.push({id:'label',type:'text',parent:'a',x:120,y:220,w:150,h:80,text:'중앙',fontSize:40,start:1,end:18} as any);contained.scenes[0].drawOrder.push('label');assert(!validateBoard(contained).some(x=>x.rule==='overlap'));count++;console.log('PASS intentional containment');
for(const icon of ICON_NAMES)assert(iconPaths(icon).length>0);count++;console.log('PASS all semantic icon geometries');
const demonstrative=base();demonstrative.scenes[0].narration='이 반복이 핵심입니다.';assert.equal(subtitleIssues(makeSubtitles(demonstrative)).length,0);count++;console.log('PASS sentence-initial demonstrative is not an orphan particle');
const {titleLines,frame}=await import('../src/render/engine.js');
for(const title of ['AI 에이전트는 일반 챗봇과 무엇이 다른가','비밀번호 관리자는 어떻게 작동하는가','짧은 제목']){const lines=titleLines(title);assert(lines.length<=2);assert.equal(lines.join(' '),title);const words=title.split(' ');for(const l of lines)for(const w of l.split(' '))assert(words.includes(w),'cover title split inside a word: '+l);}count++;console.log('PASS cover title splits only at spaces, max 2 lines');
const hlBoard:any={scenes:[{id:'hl',duration:4,narration:'확인합니다.',drawOrder:['t','h'],elements:[{id:'t',type:'text',x:600,y:500,w:600,h:100,text:'강조할 문장',fontSize:56,start:0,end:1},{id:'h',type:'highlight',target:'t',style:'marker',fill:'yellow',start:1,end:2}]}]};const hc=frame(hlBoard,hlBoard.scenes[0],3,'').getContext('2d');const corner=hc.getImageData(40,40,1,1).data,under=hc.getImageData(610,560,1,1).data;assert.deepEqual([...corner.slice(0,3)],[255,255,255],'highlight leaked to the top-left corner');assert.notDeepEqual([...under.slice(0,3)],[255,255,255],'highlight did not cover its target');count++;console.log('PASS target highlight is drawn on its target, not at (0,0)');
const cBoard:any={scenes:[{id:'c',duration:2,narration:'원입니다.',drawOrder:['o'],elements:[{id:'o',type:'circle',x:400,y:300,w:400,h:200,fill:'green',start:0,end:1}]}]};const cc2=frame(cBoard,cBoard.scenes[0],1.5,'').getContext('2d');assert.deepEqual([...cc2.getImageData(410,310,1,1).data.slice(0,3)],[255,255,255],'circle fill leaked into its bounding-box corner');assert.notDeepEqual([...cc2.getImageData(600,400,1,1).data.slice(0,3)],[255,255,255],'circle centre not filled');count++;console.log('PASS circle fill is elliptical, not rectangular');
// ---- multi-style checks: every style renders every element type, transitions, covers and aliases
const {STYLES,resolveStyleId}=await import('../src/render/styles/index.js');
const {cover,textFitIssues}=await import('../src/render/engine.js');
const allTypes:any={title:'스타일 테스트 제목입니다 두 줄',topic:'t',scenes:[0,1].map(k=>({id:'s'+k,duration:4,narration:'문장 하나입니다. 문장 둘입니다.',drawOrder:['t','r','c','l','a','i','h','ch'],elements:[
 {id:'t',type:'text',x:120,y:150,w:900,h:100,text:'제목 텍스트',fontSize:64,role:'title',start:0,end:1},
 {id:'r',type:'rectangle',x:120,y:300,w:420,h:160,fill:'yellow',label:'라벨',labelSize:48,start:0.5,end:1.5},
 {id:'c',type:'circle',x:640,y:300,w:300,h:160,fill:'blue',label:'원',labelSize:44,start:1,end:2},
 {id:'l',type:'line',points:[[120,560],[900,560]],start:1.2,end:2},
 {id:'a',type:'arrow',from:[980,380],to:[1200,380],start:1.5,end:2.2},
 {id:'i',type:'icon',icon:'robot',x:1260,y:320,w:120,h:120,start:2,end:2.6},
 {id:'h',type:'highlight',target:'t',style:'marker',fill:'yellow',start:2.5,end:3},
 {id:'ch',type:'chart',x:1000,y:560,w:500,h:300,data:[{label:'A',value:3},{label:'B',value:5,color:'red'}],start:2.6,end:3.5}]}))};
const variance=(cv:any)=>{const d=cv.getContext('2d').getImageData(0,0,1920,960).data;let min=765,max=0;for(let i=0;i<d.length;i+=4*97){const v=d[i]+d[i+1]+d[i+2];if(v<min)min=v;if(v>max)max=v;}return max-min;};
for(const id of Object.keys(STYLES)){
  const b={...allTypes,style:id};
  const end=frame(b,b.scenes[0],4,'');
  assert(variance(end)>60,id+': final frame looks empty');
  const mid=frame(b,b.scenes[0],1.3,'');
  assert(variance(mid)>20,id+': mid-animation frame empty');
  const tr=frame(b,b.scenes[1],0.15,'','자막 테스트',{prev:end});
  assert(tr.width===1920,id+': transition frame');
  for(const v of [false,true]){const cv=cover(b,v,id);assert(variance(cv)>60,id+': cover empty');}
  assert(Array.isArray(textFitIssues(b,id)));
}
count++;console.log('PASS all '+Object.keys(STYLES).length+' styles render text/rect/circle/line/arrow/icon/highlight/chart, transitions, subtitles and covers');
for(const [alias,id] of [['수묵','ink-wash'],['설계도','blueprint'],['터미널','ascii-crt'],['SWISS','swiss-motion'],['그림자극','shadow-puppet']])assert.equal(resolveStyleId(alias),id);
assert.throws(()=>resolveStyleId('no-such-style'));
count++;console.log('PASS style aliases resolve and unknown styles are rejected');
// storyboard.fx (off-white board, pencil hand, karaoke) is opt-in and main-style only
{
  const fs=await import('node:fs');const os=await import('node:os');const path=await import('node:path');
  const {createCanvas}=await import('@napi-rs/canvas');
  const {loadAssets,textFitIssues:fit2}=await import('../src/render/engine.js');
  const {textTip}=await import('../src/render/fx.js');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'wvfx-'));
  const hand=createCanvas(200,150),hc=hand.getContext('2d');hc.fillStyle='#00ff00';hc.fillRect(0,0,200,150);
  fs.writeFileSync(path.join(tmp,'hand.png'),hand.toBuffer('image/png'));
  const scene={id:'fx',duration:4,narration:'문장 하나입니다.',drawOrder:['t','ch'],elements:[
    {id:'t',type:'text',x:200,y:300,w:900,h:100,text:'손글씨 테스트',fontSize:64,start:0,end:2},
    {id:'ch',type:'image',src:'hand.png',x:1300,y:700,w:300,h:380,bleed:true,hand:false,start:2,end:3}]};
  const base:any={title:'t',topic:'t',style:'whiteboard',scenes:[scene]};
  const withFx:any={...base,fx:{board:'#f6f2e8',font:'WB Hand Bold',hand:{src:'hand.png',tip:[0,150],width:200},karaoke:{color:'#e03131'}}};
  await loadAssets(withFx,tmp);
  const px=(cv:any,x:number,y:number)=>Array.from(cv.getContext('2d').getImageData(x,y,1,1).data);
  const cap={start:0,end:2,now:0.1};
  // default board: pure white background, no hand, plain subtitle (no red box)
  const plain=frame(base,scene,1,tmp,'자막 테스트입니다',{caption:cap});
  assert.deepEqual(px(plain,40,200).slice(0,3),[255,255,255]);
  const isGreen=(p:number[])=>p[1]>200&&p[0]<60&&p[2]<60;
  const fxf=frame(withFx,scene,1,tmp,'자막 테스트입니다',{caption:cap});
  const bg=px(fxf,40,200);assert(bg[0]<252&&bg[0]>235,'off-white board '+bg);
  // the hand follows the text tip: green somewhere up-right of the half-written line
  const d=fxf.getContext('2d').getImageData(0,0,1920,960).data;let green=0;for(let i=0;i<d.length;i+=4*13)if(d[i+1]>200&&d[i]<60&&d[i+2]<60)green++;
  assert(green>50,'hand drawn');
  let greenPlain=0;const d0=plain.getContext('2d').getImageData(0,0,1920,960).data;for(let i=0;i<d0.length;i+=4*13)if(d0[i+1]>200&&d0[i]<60&&d0[i+2]<60)greenPlain++;
  assert.equal(greenPlain,0,'no hand without fx');
  // karaoke: red box in the subtitle band only with fx
  const red=(cv:any)=>{const q=cv.getContext('2d').getImageData(0,960,1920,120).data;let n=0;for(let i=0;i<q.length;i+=4)if(q[i]>200&&q[i+1]<80&&q[i+2]<80)n++;return n;};
  assert(red(fxf)>100,'karaoke box');assert.equal(red(plain),0,'no karaoke without fx');
  // other styles (variants) ignore fx
  const variant=frame(withFx,scene,1,tmp,'자막 테스트입니다',{style:'blueprint',caption:cap});
  assert.equal(red(variant),0,'variant ignores karaoke');
  // no hand once drawing is finished
  const done=frame(withFx,scene,3.9,tmp,'');const dd=done.getContext('2d').getImageData(0,0,1920,700).data;let g2=0;for(let i=0;i<dd.length;i+=4*13)if(isGreen([dd[i],dd[i+1],dd[i+2]]))g2++;
  assert.equal(g2,0,'hand leaves after drawing');
  // bleed elements may enter the subtitle band; others may not
  assert(!validateBoard({scenes:[scene]}).some((x:any)=>x.rule==='subtitle zone'));
  assert(validateBoard({scenes:[{...scene,elements:[scene.elements[0],{...scene.elements[1],bleed:false}]}]}).some((x:any)=>x.rule==='subtitle zone'));
  // pen tip advances left to right along a line
  const L={lines:[{text:'가나다라',x:100,y:200,width:400}],size:50,family:'x',lineH:60,box:{x:0,y:0,w:0,h:0}};
  assert(textTip(L as any,0.25)![0]<textTip(L as any,0.75)![0]);
  assert(Array.isArray(fit2(withFx)));
  // larger karaoke size: two lines (and the word box) stay inside the 120px band
  const big:any={...withFx,fx:{...withFx.fx,karaoke:{color:'#e03131',size:48}}};
  const two=frame(big,scene,1,tmp,'자막 줄이 두 개인 경우를\n확인하는 문장입니다',{caption:{start:0,end:2,now:1.9}});
  const band=two.getContext('2d').getImageData(0,940,1920,140).data;let redTop=1e9,inkBottom=0;
  for(let i=0;i<band.length;i+=4){const y=940+Math.floor(i/4/1920);if(band[i]>200&&band[i+1]<80&&band[i+2]<80)redTop=Math.min(redTop,y);if(band[i]<60&&band[i+1]<60&&band[i+2]<60)inkBottom=Math.max(inkBottom,y);}
  assert(redTop>=957&&redTop<1080,'word box inside band '+redTop);assert(inkBottom<=1077,'second line inside frame '+inkBottom);
  fs.rmSync(tmp,{recursive:true,force:true});
  count++;console.log('PASS storyboard fx: off-white board, pencil hand, karaoke are opt-in, main-style only; bleed exemption');
}
// image.frame = "panel" (colour evidence panel + rule + caption) is opt-in; plain images keep each style's treatment
{
  const fs=await import('node:fs');const os=await import('node:os');const path=await import('node:path');
  const {createCanvas}=await import('@napi-rs/canvas');
  const {loadAssets}=await import('../src/render/engine.js');
  const {Storyboard}=await import('../src/storyboard/schema.js');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'wvpanel-'));
  const ph=createCanvas(160,90),pc=ph.getContext('2d');pc.fillStyle='#2060ff';pc.fillRect(0,0,160,90);
  fs.writeFileSync(path.join(tmp,'ph.png'),ph.toBuffer('image/png'));
  const el=(frame?:string)=>({id:'i',type:'image',src:'ph.png',x:400,y:200,w:640,h:360,start:0,end:1,...(frame?{frame,caption:'실제 화면',dur:0.6}:{})});
  const mk=(frame?:string):any=>({title:'t',topic:'t',style:'swiss-motion',scenes:[{id:'p',duration:3,narration:'패널입니다.',drawOrder:['i'],elements:[el(frame)]}]});
  assert(Storyboard.safeParse(mk('panel')).success,'schema accepts panel/fit/caption/dur');
  const withPanel=mk('panel'),plain=mk();await loadAssets(withPanel,tmp);
  const px=(cv:any,x:number,y:number)=>Array.from(cv.getContext('2d').getImageData(x,y,1,1).data);
  const a=frame(withPanel,withPanel.scenes[0],2,tmp),b2=frame(plain,plain.scenes[0],2,tmp);
  const inA=px(a,700,380),inB=px(b2,700,380),rule=px(a,399,380),tag=px(a,410,575);
  assert(inA[2]>200&&inA[0]<80,'panel keeps colour '+inA);assert(Math.abs(inB[0]-inB[2])<12,'plain swiss image stays grey '+inB);
  assert(rule[0]<60,'thin black rule '+rule);assert(tag[0]<60,'caption tag under the panel '+tag);
  fs.rmSync(tmp,{recursive:true,force:true});
  count++;console.log('PASS image.frame panel: colour, rule and caption only when requested');
  // storyboard.subtitleSize: larger two-line band subtitles stay inside the 960..1080 band; default unchanged
  const sub=(extra:any)=>frame({...plain,...extra},plain.scenes[0],2,tmp,'자막 줄이 두 개인 경우를\n확인하는 문장입니다');
  const inkRows=(cv:any)=>{const d=cv.getContext('2d').getImageData(0,900,1920,180).data;let top=1e9,bot=0,right=0;for(let i=0;i<d.length;i+=4){if(d[i]<80&&d[i+1]<80&&d[i+2]<80){const p=i/4,y=900+Math.floor(p/1920),x=p%1920;if(y>=958){top=Math.min(top,y);bot=Math.max(bot,y);right=Math.max(right,x);}}}return {top,bot,right};};
  const s38=inkRows(sub({})),s48=inkRows(sub({subtitleSize:48}));
  assert(s48.top>=960&&s48.bot<=1079,'48px subtitle inside band '+JSON.stringify(s48));assert(s48.right>s38.right+60,'48px subtitle is larger '+JSON.stringify([s38,s48]));
  assert(Storyboard.safeParse({...mk(),subtitleSize:48}).success,'schema accepts subtitleSize');
  count++;console.log('PASS storyboard.subtitleSize: opt-in larger band subtitle stays in the band');
}
{const {time,DRAW_BY}=await import('../src/timing.js');const b:any={scenes:[{narration:'One. Two.',duration:10,drawOrder:['a','b','c','d'],elements:['a','b','c','d'].map(id=>({id}))}]};time(b);const last=Math.max(...b.scenes[0].elements.map((e:any)=>e.end));assert(last<=10*DRAW_BY+0.01,'draws past DRAW_BY: '+last);assert(b.scenes[0].elements.every((e:any,i:number,a:any[])=>e.end>e.start&&(i===0||e.start>=a[i-1].end-1e-9)),'windows not sequential');const c:any={scenes:[{narration:'One. Two.',duration:10,drawOrder:['a','b'],elements:[{id:'a'},{id:'b',cue:1}]}]};time(c);assert(Math.abs(c.scenes[0].elements[1].start-10*0.92*4/9)<0.01,'cue start not respected');count++;console.log('PASS default draw window finishes by DRAW_BY; cue start respected');}
{const {coverage}=await import('../src/validation.js');const s:any={id:'x',elements:[{id:'a',type:'rectangle',x:100,y:100,w:200,h:150}]};assert(coverage(s)<0.1);const full:any={id:'y',elements:[{id:'a',type:'rectangle',x:80,y:80,w:1780,h:860}]};assert(coverage(full)>0.95);const arrowNear:any={id:'z',narration:'x',duration:5,drawOrder:['r','ar'],elements:[{id:'r',type:'rectangle',x:100,y:100,w:300,h:200},{id:'ar',type:'arrow',from:[420,200],to:[800,200]}]};assert(!validateBoard({scenes:[arrowNear]} as any).some((i:any)=>i.rule==='overlap'),'arrow next to a box flagged as overlap');const arrowThrough:any={...arrowNear,elements:[arrowNear.elements[0],{id:'ar',type:'arrow',from:[50,200],to:[800,200]}]};assert(validateBoard({scenes:[arrowThrough]} as any).some((i:any)=>i.rule==='overlap'),'arrow through a box not flagged');count++;console.log('PASS coverage guard and arrow overlap uses the drawn line');}{const {frame}=await import('../src/render/engine.js');const {cameraAt,contentBox,project,CAMERA_SAFE}=await import('../src/render/camera.js');const {time}=await import('../src/timing.js');
 const mk=(extra:any={})=>({title:'t',topic:'t',style:'whiteboard',...extra,scenes:[{id:'cam',duration:10,narration:'Camera test.',drawOrder:['h','a','ar','ic','hl'],elements:[{id:'h',type:'text',role:'title',x:120,y:140,w:900,h:90,text:'Camera test',fontSize:60},{id:'a',type:'rectangle',x:140,y:300,w:500,h:300,fill:'blue',label:'box'},{id:'ar',type:'arrow',from:[680,450],to:[1100,450]},{id:'ic',type:'icon',icon:'lightbulb',x:1200,y:380,w:140,h:140},{id:'hl',type:'highlight',target:'a',style:'circle'}]}]});
 const buf=(b:any,t:number,sub='')=>frame(b,b.scenes[0],t,'',sub,{style:'whiteboard'}).toBuffer('image/png');
 const b1=mk();time(b1);
 assert(Buffer.compare(buf(b1,8.5),buf(b1,8.5))===0,'same frame twice differs');count++;console.log('PASS camera + idle frames are deterministic');
 const still=mk({camera:'still',fx:{idle:false}});time(still);const off=mk({fx:{camera:false,idle:false}});time(off);
 assert(Buffer.compare(buf(still,8.5),buf(off,8.5))===0,'camera:"still"+idle off must equal fx.camera=false+idle off');
 assert(Buffer.compare(buf(b1,0.0),buf(still,0.0))===0,'push must start at identity (t=0 equals still)');count++;console.log('PASS camera off = still output; push starts at identity');
 assert(Buffer.compare(buf(b1,8),buf(b1,9))!==0,'nothing moves in the hold phase');count++;console.log('PASS hold phase moves (camera + idle)');
 const band=(png:Buffer)=>png; const {createCanvas,loadImage}=await import('@napi-rs/canvas');
 const crop=async(png:Buffer)=>{const im=await loadImage(png);const cv=createCanvas(1920,120);cv.getContext('2d').drawImage(im,0,-960);return cv.getContext('2d').getImageData(0,0,1920,120).data;};
 const sa=await crop(buf(b1,9.5,'Subtitle stays put.')),sb=await crop(buf(still,9.5,'Subtitle stays put.'));assert(Buffer.compare(Buffer.from(sa),Buffer.from(sb))===0,'subtitle band changed with the camera');count++;console.log('PASS subtitles are unaffected by the camera');
 const fs2=await import('node:fs');for(const ex of ['fiber-optics','sky-blue','ai-agent-vs-chatbot-ko']){const p='examples/'+ex+'/storyboard.json';if(!fs2.existsSync(p))continue;const sb2=JSON.parse(fs2.readFileSync(p,'utf8'));for(const st of ['whiteboard','ink-wash','blueprint'])for(const s of sb2.scenes){const box=contentBox(s);if(!box)continue;const cam=cameraAt(sb2,s,st,s.duration||10);for(const [x,y] of [[box.x0,box.y0],[box.x1,box.y1]]){const [X,Y]=project(cam,x,y);assert(X>=CAMERA_SAFE.x0-0.5&&X<=CAMERA_SAFE.x1+0.5&&Y>=CAMERA_SAFE.y0-0.5&&Y<=CAMERA_SAFE.y1+0.5,`camera pushes ${ex}/${s.id} out of the safe area (${st}): ${X},${Y}`);}}}count++;console.log('PASS camera never pushes example content past the safe area or into the subtitle band');
 const o=mk();o.scenes[0].duration=12;time(o);const second=o.scenes[0].elements.find((e:any)=>e.id==='a');const title=o.scenes[0].elements.find((e:any)=>e.id==='h');assert(second.start<=12*0.08,'first visual starts too late: '+second.start);assert(title.end<=1.0+1e-9,'title types too slowly: '+title.end);count++;console.log('PASS scene opens with title and first visual in parallel');}{const {textLayoutFor}=await import('../src/render/engine.js');const {getStyle}=await import('../src/render/styles/index.js');const {createCanvas}=await import('@napi-rs/canvas');const c=createCanvas(10,10).getContext('2d');const st=getStyle('whiteboard');const big={id:'b',type:'rectangle',x:100,y:300,w:780,h:360,label:'Agent does the work'};const L1=textLayoutFor(st,c,big,[big],true)!;assert(L1.size>48,'label did not grow with a big box: '+L1.size);const small={...big,w:300,h:150,label:'a much longer label that has to shrink down to fit'};const L2=textLayoutFor(st,c,small,[small],true)!;assert(L2.size<=L1.size);const fixed={...big,labelSize:40};assert(textLayoutFor(st,c,fixed,[fixed],true)!.size===40*st.font('label').scale,'explicit labelSize ignored');const many:any={scenes:[{id:'m',duration:10,narration:'x.',drawOrder:[],elements:Array.from({length:14},(_,i)=>({id:'e'+i,type:'rectangle',x:100+i,y:300,w:10,h:10}))}]};many.scenes[0].drawOrder=many.scenes[0].elements.map((e:any)=>e.id);const tm=validateBoard(many).find((i:any)=>i.rule==='too many elements');assert(tm&&/14 elements, limit 12/.test(tm.detail),'too many elements has no count: '+JSON.stringify(tm));count++;console.log('PASS labels grow with their box; explicit labelSize kept; element-limit message shows the count');}
console.log(count+' tests passed; 0 failed.');


