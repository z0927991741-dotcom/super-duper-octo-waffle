import {ROAD_NODES,ROAD_EDGES,MAP_BLOCKS} from './roads.js';
export function landmark(id){
 const common='<ellipse cx="90" cy="108" rx="84" ry="10" fill="#5a634026"/>';
 let drawing='';
 if(id==='book')drawing=`<path d="M8 99V55h164v44Z" fill="#bc5137"/><path d="M12 64h156v35H12Z" fill="#eee1bd"/><path d="M8 53Q35 61 55 48L90 26l35 22q20 13 47 5l-8 14H16Z" fill="#94503b"/><path d="M50 99V45h80v54Z" fill="#d5c0a0"/><path d="M39 43q26 3 51-17 25 20 51 17l-10 13H49Z" fill="#be764b" stroke="#724c39" stroke-width="2"/><path d="M40 41q50-15 100 0" fill="none" stroke="#8a8061" stroke-width="4"/><g stroke="#d29d61" stroke-width="2">${[55,66,77,88,99,110,121].map(x=>`<path d="M${x} 38l-3 14"/>`).join('')}</g><g fill="#355454" stroke="#c4bd98"><path d="M59 62h17v36H59Z"/><path d="M80 62h19v36H80Z"/><path d="M103 62h18v36h-18Z"/></g><path d="M54 58v41m72-41v41" stroke="#b84331" stroke-width="5"/><g fill="#615044" stroke="#b97652" stroke-width="4"><circle cx="29" cy="83" r="12"/><circle cx="151" cy="83" r="12"/></g><path d="M47 102h87m-92 5h97" stroke="#9d8060" stroke-width="4"/>`;
 else if(id==='gate')drawing=`<path d="M13 106V35h154v71Z" fill="#c4baa2" stroke="#9a8c73"/><path d="M13 34V22h16v11h14V20h18v12h14V18h21v13h13V17h18v13h16V16h19v17Z" fill="#856651"/><path d="M9 33h162v13H9Z" fill="#a05f45" stroke="#765c45" stroke-width="2"/><path d="M57 106V75a33 33 0 0 1 66 0v31" fill="#a16a4c"/><path d="M69 106V76a21 21 0 0 1 42 0v30" fill="#4f5849"/><path d="M74 106V80a17 17 0 0 1 34 0v26" fill="#93ae83"/><path d="M69 106V76a21 21 0 0 1 42 0" fill="none" stroke="#d1a47a" stroke-width="3"/><rect x="72" y="47" width="38" height="15" rx="2" fill="#bc9975"/><text x="91" y="58" text-anchor="middle" font-size="8" fill="#65533d">朝陽門</text>${Array.from({length:36},(_,i)=>{const side=i<18?0:1,n=i%18;return `<ellipse cx="${23+side*110+(n%3)*9}" cy="${52+Math.floor(n/3)*9}" rx="3" ry="2" fill="${i%2?'#817c68':'#aaa188'}"/>`;}).join('')}<path d="M52 48v57m77-57v57" stroke="#aa7756" stroke-width="3"/>`;
 else drawing=`<path d="M8 100V43h164v57Z" fill="#a8aa8b" stroke="#6f7968"/><path d="M3 42h174l-6-9H11Z" fill="#526d60"/><path d="M73 101V16h34v85Z" fill="#9c9e81"/><path d="M70 31V14h8v7h8V10h7v11h8V12h9v19" fill="#8a9078"/><g fill="#e9e1c2" stroke="#74816f">${[17,32,47,121,136,151].map(x=>`<path d="M${x} 49h8v18h-8Zm0 27h8v16h-8Z"/>`).join('')}<path d="M79 31h6v40h-6Zm15 0h6v40h-6Z"/></g><path d="M24 48h15v47H24Z" fill="#7aa38c"/><path d="M48 48h13v47H48Z" fill="#cead61"/><path d="M118 48h14v47h-14Z" fill="#bb7f66"/><path d="M143 48h13v47h-13Z" fill="#9d8aae"/><path d="M70 80h42v7H70Z" fill="#ddd1a4"/><path d="M78 89h24v14H78Z" fill="#784d37"/><path d="M90 89v14" stroke="#c9ab78"/><text x="90" y="78" text-anchor="middle" font-size="8" fill="#385b42">屏東美術館</text><path d="M68 105h47" stroke="#cabd97" stroke-width="4"/>`;
 return `<svg viewBox="0 0 180 120" class="landmark" role="img" aria-label="${id==='book'?'書院紅瓦圓門':id==='gate'?'朝陽門磚石拱門':'美術館長形立面'}插畫">${common}${drawing}</svg>`;
}
export function roadMap(){
 const xy=p=>`${p.lng/.0000025},${1000-p.lat/.000003}`;
 const points=p=>p.map(v=>v.join(',')).join(' ');
 const blend=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 const inside=(p,u,v)=>blend(blend(p[0],p[1],u),blend(p[3],p[2],u),v);
 const inset=(p,amount)=>{const center=p[0].map((_,i)=>p.reduce((sum,q)=>sum+q[i],0)/4);return p.map(q=>{const d=Math.hypot(q[0]-center[0],q[1]-center[1]);return blend(q,center,Math.min(.38,amount/d));});};
 const blocks=MAP_BLOCKS.map((p,index)=>{
  const q=inset(p,18),center=inside(q,.5,.5);
  const size=Math.min(64,...q.map((v,i)=>Math.hypot(v[0]-q[(i+1)%4][0],v[1]-q[(i+1)%4][1])))*.8;
  const roof=['#d99399','#96b4c4','#b2a1c7','#dfb16f'][index%4];
  return `<polygon points="${points(inset(p,9))}" fill="${index%3?'#dbe9cc':'#e5e8ce'}" stroke="#cadcb6" stroke-width="2" stroke-linejoin="round"/>
  <g class="chibi-house" transform="translate(${center[0]} ${center[1]}) scale(${size/64})">
  <ellipse cx="3" cy="23" rx="30" ry="12" fill="#7d947c26"/>
  <rect x="-23" y="-7" width="46" height="31" rx="7" fill="#fff0d3" stroke="#a48e79" stroke-width="2.5"/>
  <path d="M-29-5Q-31-10-24-14L-3-30Q0-33 4-30L27-12Q33-6 27-4Z" fill="${roof}" stroke="#9b8579" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M-20-11L0-25 20-11" fill="none" stroke="#ffffff55" stroke-width="3" stroke-linecap="round"/>
  <rect x="-17" y="0" width="11" height="11" rx="3" fill="#a7d4da" stroke="#b79a7b" stroke-width="2"/>
  <path d="M-11.5 0v11M-17 5.5h11" stroke="#fff9e9" stroke-width="1.5"/>
  <path d="M5 24V10q0-11 11-11t11 11" transform="translate(-3 4) scale(.65)" fill="#b58e78"/>
  <circle cx="13" cy="16" r="1.5" fill="#ffe2a2"/>
  <path d="M-26 25h51" stroke="#d0bba0" stroke-width="4" stroke-linecap="round"/>
  <g transform="translate(${index%2?-28:28} 9)"><path d="M0 6v14" stroke="#9a8263" stroke-width="3"/><circle cy="-2" r="11" fill="#a8c997" stroke="#91ae7e" stroke-width="2"/><circle cx="-4" cy="-6" r="5" fill="#c7dfad"/></g>
  </g>`;
 }).join('');
 const roadWidth=e=>e.kind==='path'?8:e.kind==='lane'?12:30;
 const strokes=(border)=>ROAD_EDGES.map(e=>`<path d="M${xy(ROAD_NODES[e.a])}L${xy(ROAD_NODES[e.b])}" stroke="${border?(e.kind==='path'?'#b6ca96':'#cfbba0'):(e.kind==='path'?'#fff1cf':e.kind==='lane'?'#fff6de':'#fff6df')}" stroke-width="${roadWidth(e)+(border?5:0)}"/>`).join('');
 const trees=[[310,630],[335,740],[388,803],[425,622],[550,658],[625,696],[675,810],[601,848],[294,698],[530,724],[655,860],[710,710],[1000,-65],[1050,-120],[1130,-100],[1200,-20],[1250,40],[1320,-60]];
 const labels=[['中山路',295,400,-75,25],['仁愛路',815,485,-75,25],['勝利東路',682,230,14,25],['公園路',366,838,15,25],['天津街',-102,530,-68,22],['林森路',260,1210,14,24],['自由路',1195,800,-79,24],['民生路',930,1064,14,22],['協和路',395,-115,9,22],['青島街',375,350,14,18],['長春街',530,400,-72,20],['濟南街',342,550,14,18],['屏東公園',559,690,0,28],['圖書館園區',1110,-65,0,24],['體育館',665,375,14,22],['文化街區',-38,146,14,20]];
 return `<svg class="road-art" viewBox="-400 -250 1800 1700" preserveAspectRatio="none" aria-label="Q版屏東街區：彩色小屋、圓樹、公園與可行走步道">
 <rect x="-400" y="-250" width="1800" height="1700" fill="#e8efd7"/>
 <path d="M-400 -170L380 -250 160 1130-400 1300Z" fill="#e5edcf"/><path d="M140 780L1340 1000 1400 1450-310 1450Z" fill="#e5edd2"/>
 <path d="M980 -240L1390 -140 1310 180 1120 155 927 40Z" fill="#c6e0b7"/>
 <path d="M1310 -250Q1190 -80 1230 125T1142 400Q1185 520 1088 690T1025 1010L888 1450" fill="none" stroke="#dcece4" stroke-width="34"/>
 <path d="M1310 -250Q1190 -80 1230 125T1142 400Q1185 520 1088 690T1025 1010L888 1450" fill="none" stroke="#9bcfd5" stroke-width="22"/>
 ${blocks}
 <path d="M270 532L766 656 707 899 187 762Z" fill="#c6dfa7" stroke="#9fbf87" stroke-width="3"/>
 <path d="M440 600q90-16 145 38t35 52l-87-12-95-32Z" fill="#bbd9b0"/>
 <path d="M451 716q31-24 38 6t-14 51q-34 4-24-57M570 748q34-10 24 24t-34 19q-16-18 10-43" fill="#9ecfd3" stroke="#88bfc5" stroke-width="3"/>
 <path d="M595 225L835 286 778 505 535 446Z" fill="#f7edcf" stroke="#cbb893" stroke-width="3"/>
 <path d="M605 264l190 48-16 62-190-48Z" fill="#b4c9d7" stroke="#8baab5" stroke-width="3"/>
 <path d="M555 453Q677 424 715 486t-73 54l-105-27Z" fill="#b6d9af" stroke="#d9e7ce" stroke-width="12"/>
 <g fill="none" stroke-linecap="round" stroke-linejoin="round">${strokes(true)}${strokes(false)}</g>
 <g>${trees.map(([x,y],i)=>`<g class="chibi-tree" transform="translate(${x} ${y})"><ellipse cx="4" cy="15" rx="18" ry="9" fill="#74976428"/><path d="M0 4v15" stroke="#a08b67" stroke-width="5" stroke-linecap="round"/><path d="M-18-3q-8-13 7-19 2-18 18-12 20-1 17 17 12 15-6 21-17 9-36-7" fill="${i%4===0?'#e6b6c5':'#a9ce94'}" stroke="${i%4===0?'#c99aaa':'#8db579'}" stroke-width="2.5"/><ellipse cx="-4" cy="-20" rx="9" ry="5" fill="#fff9d850"/><circle cx="-4" cy="-5" r="1.5" fill="#749463"/><circle cx="6" cy="-5" r="1.5" fill="#749463"/></g>`).join('')}</g>
 <g fill="#fff3bb" stroke="#e0bd76" stroke-width="1.5">${[[322,660],[600,760],[696,840],[1040,-10]].map(([x,y])=>`<path d="M${x} ${y-7}l2 5 6 2-6 2-2 6-2-6-6-2 6-2Z"/>`).join('')}</g>
 <g fill="none" stroke="#e9fffa" stroke-width="3" stroke-linecap="round"><path d="M456 736q7-5 14 0m98 30q8-5 16 0M1220 78q8 8 14 0M1090 650q8 8 14 0"/></g>
 <polyline id="route-line" fill="none" stroke="#b87a53" stroke-width="7" stroke-dasharray="10 12" stroke-linecap="round"/>
 <g font-family="sans-serif" text-anchor="middle">${labels.map(([name,x,y,angle,size])=>`<text x="${x}" y="${y}" transform="rotate(${angle} ${x} ${y})" fill="${name.includes('園')?'#5b8157':'#887762'}" font-size="${size}" font-weight="600" stroke="#faf9f0" stroke-width="5" paint-order="stroke">${name}</text>`).join('')}</g>
 </svg>`;
}
