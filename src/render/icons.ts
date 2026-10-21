type P=number[];type Paths=P[][];
const arc=(cx:number,cy:number,r:number,a=0,b=Math.PI*2,n=32)=>Array.from({length:n+1},(_,i)=>[cx+r*Math.cos(a+(b-a)*i/n),cy+r*Math.sin(a+(b-a)*i/n)]);
const box=(x:number,y:number,w:number,h:number)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
export const ICON_NAMES=['chat','robot','gear','tool','wrench','search','database','loop','refresh','check','warning','document','globe','lightbulb','lock','clock','folder','scale','door','bell','slides','headphones','wave','plus','speaker','microphone'];
export function iconPaths(name:string):Paths {switch(name){
case 'chat':return [[[12,15],[88,15],[88,68],[46,68],[24,88],[24,68],[12,68],[12,15]],[[28,32],[72,32]],[[28,48],[60,48]]];
case 'robot':return [box(15,28,70,57),[[50,28],[50,13]],arc(50,9,4),arc(33,49,5),arc(67,49,5),[[32,69],[68,69]],[[8,42],[8,65]],[[92,42],[92,65]]];
case 'gear':{const p=Array.from({length:49},(_,i)=>{const a=i*Math.PI/24,r=i%4<2?43:32;return[50+r*Math.cos(a),50+r*Math.sin(a)];});return[p,arc(50,50,15)];}
case 'tool':case 'wrench':return [[[60,13],[55,33],[67,45],[86,41],[89,20],[73,30],[65,21],[70,7]],[[59,42],[19,79],[20,89],[30,91],[70,52]],arc(27,83,3)];
case 'search':return [arc(41,40,28),[[62,62],[91,91]]];
case 'database':return [Array.from({length:33},(_,i)=>[50+36*Math.cos(i*Math.PI/16),22+12*Math.sin(i*Math.PI/16)]),[[14,22],[14,78]],[[86,22],[86,78]],Array.from({length:17},(_,i)=>[50+36*Math.cos(i*Math.PI/16),78+12*Math.sin(i*Math.PI/16)]),Array.from({length:17},(_,i)=>[50+36*Math.cos(i*Math.PI/16),50+12*Math.sin(i*Math.PI/16)])];
case 'loop':case 'refresh':return [arc(50,50,33,.3,Math.PI+0.1),[[17,47],[13,66],[33,58]],arc(50,50,33,Math.PI+.3,Math.PI*2+.1),[[83,53],[87,34],[67,42]]];
case 'check':return [[[16,51],[39,75],[85,20]]];
case 'warning':return [[[50,8],[95,87],[5,87],[50,8]],[[50,32],[50,59]],arc(50,73,2)];
case 'document':return [[[20,8],[64,8],[83,28],[83,92],[20,92],[20,8]],[[64,8],[64,28],[83,28]],[[32,44],[70,44]],[[32,59],[70,59]],[[32,74],[57,74]]];
case 'globe':return [arc(50,50,42),[[8,50],[92,50]],Array.from({length:33},(_,i)=>[50+20*Math.cos(i*Math.PI/16),50+42*Math.sin(i*Math.PI/16)]),[[16,27],[84,27]],[[16,73],[84,73]]];
case 'lightbulb':return [arc(50,35,26,Math.PI*.8,Math.PI*2.2),[[29,51],[36,69],[64,69],[71,51]],[[37,78],[63,78]],[[42,87],[58,87]],[[50,1],[50,5]],[[11,12],[17,19]],[[83,19],[90,12]]];
case 'lock':return [box(19,43,62,47),arc(50,43,22,Math.PI,Math.PI*2),arc(50,61,5),[[50,66],[50,77]]];
case 'clock':return [arc(50,50,41),[[50,22],[50,50],[72,61]],[[50,10],[50,16]],[[84,50],[90,50]],[[50,84],[50,90]],[[10,50],[16,50]]];
case 'folder':return [[[8,30],[8,86],[92,86],[92,38],[47,38],[40,24],[8,24],[8,30]],[[8,48],[92,48]]];
case 'scale':return [[[50,16],[50,88]],[[30,88],[70,88]],[[12,30],[88,30]],arc(50,13,4),[[12,30],[4,58]],[[12,30],[20,58]],arc(12,58,9,0,Math.PI,16),[[88,30],[80,58]],[[88,30],[96,58]],arc(88,58,9,0,Math.PI,16)];
case 'door':return [box(26,8,48,84),arc(64,52,3),[[12,92],[88,92]]];
case 'bell':return [arc(50,64,32,Math.PI,Math.PI*2),[[12,64],[88,64]],[[8,74],[92,74]],[[50,32],[50,22]],[[42,20],[58,20]]];
case 'slides':return [box(10,12,80,58),[[50,70],[50,88]],[[34,88],[66,88]],[[26,58],[26,46]],[[40,58],[40,36]],[[54,58],[54,28]],[[68,58],[68,42]]];
case 'headphones':return [arc(50,52,38,Math.PI,Math.PI*2),box(8,52,20,32),box(72,52,20,32)];
case 'wave':return [Array.from({length:49},(_,i)=>[6+i*88/48,50+30*Math.sin(i*Math.PI*4/48)])];
case 'plus':return [arc(50,50,42),[[50,24],[50,76]],[[24,50],[76,50]]];
case 'speaker':return [[[10,38],[30,38],[52,18],[52,82],[30,62],[10,62],[10,38]],arc(52,50,22,-0.9,0.9,12),arc(52,50,38,-0.9,0.9,16)];
case 'microphone':return [[[38,28],[38,52],...arc(50,52,12,Math.PI,0,12),[62,52],[62,28],...arc(50,28,12,0,-Math.PI,12)],arc(50,52,26,0,Math.PI,24),[[50,78],[50,92]],[[36,92],[64,92]]];
default:throw new Error('Unknown semantic icon: '+name);
}}
export function drawIcon(c:any,name:string,x:number,y:number,w:number,h:number,p:number,draw:(pts:number[][],p:number)=>void){const paths=iconPaths(name);const lengths=paths.map(q=>q.slice(1).reduce((n,a,i)=>n+Math.hypot(a[0]-q[i][0],a[1]-q[i][1]),0));const total=lengths.reduce((a,b)=>a+b,0);let spent=0;paths.forEach((q,i)=>{const progress=Math.max(0,Math.min(1,(p*total-spent)/lengths[i]));draw(q.map(a=>[x+a[0]/100*w,y+a[1]/100*h]),progress);spent+=lengths[i];});}
