import { g, physics } from "./lab-models.js";

const blue = "#83a7ff", orange = "#ff9b48", white = "#d9dce4", gray = "#666d80";
const p = value => Math.round(value * 100) / 100;
const line = (x,y,X,Y,color=white,dash="") => `<line x1="${p(x)}" y1="${p(y)}" x2="${p(X)}" y2="${p(Y)}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-dasharray="${dash}"/>`;
const path = (d,color=white,fill="none",width=2) => `<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const rect = (x,y,w,h,fill,stroke="none",rx=2) => `<rect x="${p(x)}" y="${p(y)}" width="${p(w)}" height="${p(h)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const dot = (x,y,r,fill,stroke="none") => `<circle cx="${p(x)}" cy="${p(y)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const label = (x,y,value,fill=white) => `<text x="${x}" y="${y}" fill="${fill}" text-anchor="middle">${value}</text>`;
const arrow = (x,y,X,Y,color=orange) => {
  const angle = Math.atan2(Y-y,X-x);
  return line(x,y,X,Y,color) + [-.52,.52].map(offset => line(X,Y,X-9*Math.cos(angle+offset),Y-9*Math.sin(angle+offset),color)).join("");
};
const ruler = (x, top, height) => rect(x,top,19,height,"#292e39",gray) +
  Array.from({length:15},(_,i)=>line(x,top+(i+1)*height/16,x+(i%5===0?13:7),top+(i+1)*height/16,white)).join("");
const coil = (x,y,height,width=12,stroke=2) => path(`M${x} ${y}` + Array.from({length:18},(_,i)=>`L${x+(i===17?0:i%2?-width:width)} ${p(y+(i+1)*height/18)}`).join(""),blue,"none",stroke);
const floor = path("M0 220 L520 201 V260 H0 Z","none","#191c20");
const meter = (x,y,value,color) => dot(x,y,15,"#101214",color) + label(x,y+6,value,color);

const diagrams = {
  "horizontal-launch"(s,t) {
    const {distance,time}=physics.flight(s.height,s.speed);
    const x0=104, y0=211-s.height*83, xEnd=x0+distance*126;
    const trajectory=Array.from({length:31},(_,i)=>{const f=i/30;return `${i?"L":"M"}${p(x0+distance*126*f)} ${p(y0+(211-y0)*f*f)}`;}).join(" ");
    return rect(76,y0+9,20,205-y0,"#242a35",gray) + path(`M30 ${y0+6} H104`,white,"none",4) +
      arrow(x0,211,x0,Math.max(28,y0-20),gray)+arrow(x0,211,491,211,gray)+label(499,215,"x")+label(x0-10,Math.max(25,y0-22),"y")+label(x0-12,224,"0")+label(117,(y0+211)/2,"h")+
      rect(100,222,380,12,"#514030",orange) + path(trajectory,blue)+label((x0+xEnd)/2,y0+22,"y(x)",blue)+
      dot(x0+(xEnd-x0)*t,y0+(211-y0)*t*t-3,8,orange)+line(xEnd,209,xEnd,234,orange,"3 4")+label(xEnd,252,"L",orange)+
      label(423,30,"t = "+(time*t).toFixed(2).replace(".",",")+" с");
  },
  "circular-motion"(s,t) {
    const h=Math.sqrt(s.thread**2-s.radius**2), y=82+h*138, r=s.radius*234;
    const a=t*Math.PI*2*s.turns, x=156+(s.mode==="force"?r:Math.cos(a)*r);
    const weight = arrow(x,y+9,x,y+39,blue)+label(x+(x>=156?20:-20),y+41,"mg",blue);
    return label(155,33,"Вид сбоку")+label(374,33,"Вид сверху")+line(258,33,258,219,gray,"4 6")+
      line(108,59,200,59,white)+line(156,59,156,y,gray,"4 5")+line(156,y,x,y,gray,"4 5")+
      line(156,59,x,y,blue)+label(145,(y+59)/2,"h")+label((156+x)/2,y+24,"R")+dot(x,y,9,orange)+
      weight+(s.mode==="force"?arrow(x+10,y,245,y)+label(x+16,y-11,"F₁",orange):"")+
      dot(374,132,r,"none",blue)+dot(374,132,3,white)+line(374,132,374+r*Math.cos(a),132+r*Math.sin(a),gray,"4 4")+
      dot(374+r*Math.cos(a),132+r*Math.sin(a),7,orange);
  },
  "spring-stiffness"(s,t) {
    const extension=physics.spring(s.load,s.spring==="thin"?100:200);
    const y=121+extension*1900*t;
    return line(153,41,356,41,white)+ruler(301,63,151)+coil(246,42,y-42,14,s.spring==="thin"?2:4)+
      line(189,121,301,121,gray,"4 4")+label(172,127,"h₀")+line(261,y,301,y,orange,"4 4")+
      rect(227,y,38,27,"#63391d",orange,4)+label(246,y+20,"P") + label(362,y+5,"hᵢ",orange);
  },
  "sliding-friction"(s,t) {
    const h=s.height/1000, angle=Math.asin(h/.5), k=s.pair==="wood"?(s.mode==="static"?.45:.31):(s.mode==="static"?.58:.4);
    const mu=physics.friction(.5,h).coefficient, initial=s.mode==="static"?0:.27;
    const acceleration=(mu-k)*Math.cos(angle)*2;
    const time=acceleration<0?Math.min(t,-initial/(2*acceleration)):t;
    const move=s.mode==="static"&&mu<k?0:Math.max(0,Math.min(1,initial*time+acceleration*time*time));
    const x=359-Math.cos(angle)*177, y=216-Math.sin(angle)*177;
    const alpha=angle*180/Math.PI;
    const xB=x+(359-x)*(.19+.68*move), yB=y+(216-y)*(.19+.68*move);
    return path(`M${x} ${y}L359 216H${x}Z`,gray,"#1c2029")+
      line(x,y,359,216,s.pair==="paper"?blue:white)+line(x-13,y,x-13,216,blue,"4 4")+
      label(x-29,(y+216)/2,"h",blue)+label((359+x)/2,238,"d")+
      `<g transform="translate(${xB} ${yB}) rotate(${alpha})">${rect(s.face==="wide"?-22:-14,-26,s.face==="wide"?44:28,25,"#603614",orange,4)}</g>`+
      (move>.04?arrow(xB+14,yB-34,xB+49,yB-34,orange):"");
  },
  "mechanical-energy"(s,t) {
    const energy=physics.energy(s.weight,s.thread,s.stiffness);
    const fallTime=Math.sqrt(2*s.thread/g), omega=Math.sqrt(s.stiffness*g/s.weight), equilibrium=s.weight/s.stiffness;
    const entrySpeed=g*fallTime, endPhase=Math.PI-Math.atan(entrySpeed/(equilibrium*omega));
    const elapsed=t*(fallTime+endPhase/omega), phase=omega*(elapsed-fallTime);
    const displacement=s.mode==="slow"?energy.height*t:elapsed<fallTime?g*elapsed**2/2:
      s.thread+equilibrium*(1-Math.cos(phase))+entrySpeed/omega*Math.sin(phase);
    const travel=energy.height*310, slack=s.thread*310, start=62, y=start+displacement*310;
    const stretch=Math.max(0,y-start-slack), end=start+travel;
    return line(166,32,345,32,white)+ruler(331,50,165)+coil(248,35,27+stretch)+
      (y>start?line(248,62+stretch,248,y,white):"")+rect(231,y,34,23,"#603614",orange,4)+
      line(275,end,330,end,orange,"4 4")+label(390,end+6,"нижняя точка",orange)+
      line(196,62,196,end,gray,"4 5")+label(180,(62+end)/2,"h");
  },
  "rigid-body-equilibrium"(s,t) {
    if(s.mode==="ring"){
      const draw=(f,a,i)=>{const rad=a*Math.PI/180;const x=260+f*13*Math.cos(rad),y=137-f*13*Math.sin(rad);return arrow(260,137,x,y,i===1?orange:blue)+label(x+17*Math.cos(rad),y-17*Math.sin(rad)+5,"F"+["","₁","₂","₃"][i],i===1?orange:blue);};
      return line(63,137,472,137,gray,"3 6")+line(260,27,260,240,gray,"3 6")+draw(s.f1,s.direction,1)+draw(s.f2,0,2)+draw(s.f3,s.angle,3)+dot(260,137,8,"#181a1e",white);
    }
    const moment=physics.moment(s.m1*.04/1000,s.m2*s.arm2/100000,s.m3*.04/1000,s.m4*s.arm4/100000);
    const tilt=-Math.max(-18,Math.min(18,moment*360))*t;
    const weights=[[s.m1,-44,0],[s.m2,11*s.arm2,0],[s.m3,-44,28],[s.m4,11*s.arm4,28]];
    return path("M260 119 L228 209H292Z",gray,"#323842")+arrow(260,119,260,59,blue)+label(280,60,"N",blue)+
      `<g transform="rotate(${tilt} 260 119)">${rect(110,112,300,14,"#313849",white)}${Array.from({length:25},(_,i)=>dot(128+i*11,119,2,"#a9b4ce")).join("")}${weights.filter(([mass])=>mass>0).map(([mass,dx,dy])=>line(260+dx,126,260+dx,151+dy)+rect(250+dx,151+dy,20,21,"#533213",orange)).join("")}</g>`;
  },
  "gay-lussac-law"(s) {
    const yIn=s.mode==="hot"?201:165-s.water*.55;
    const glass=(x,selected,water)=>path(`M${x} 96V220H${x+140}V96`,selected?white:gray)+rect(x+1,water,138,219-water,selected?"#173a69":"#202737")+line(x,water,x+140,water,selected?blue:gray);
    const x=s.mode==="hot"?131:391, yEnd=s.mode==="hot"?199:yIn+24+s.water*.1;
    const length=s.mode==="hot"?s.length:physics.gas(s.length,s.hot,s.cold,s.water/1000).coldLength;
    const yTop=(s.mode==="hot"?yEnd:yIn)-length*.14;
    return label(130,32,"Горячая вода",orange)+label(390,32,"Холодная вода",blue)+glass(60,s.mode==="hot",128)+glass(320,s.mode==="cold",165)+
      rect(x-13,yTop,26,yEnd-yTop,"#171d26")+path(s.mode==="hot"?`M${x-13} ${yTop}V${yEnd}H${x+13}V${yTop}`:`M${x-13} ${yEnd}V${yTop}H${x+13}V${yEnd}`,white)+
      (s.mode==="cold"?rect(x-12,yIn,24,Math.max(0,yEnd-yIn),"#235db0")+line(x-12,yIn,x+12,yIn,blue)+line(x+14,165,468,165,blue,"4 4")+label(464,yIn-9,"H",blue):"")+
      label(x,(yTop+yIn)/2,s.mode==="hot"?"ℓ₁":"ℓ₂")+ruler(x-59,58,148)+label(130,245,s.hot+" °C")+label(390,245,s.cold+" °C");
  },
  "resistor-connections"(s) { return circuit(s,false); },
  "source-emf"(s) { return circuit(s,true); },
  pendulum() {
    return line(196,47,326,47)+line(260,47,260,216,gray,"4 5")+path("M182 198 Q260 247 337 198",gray)+line(260,47,320,214,blue)+dot(260,47,5,white)+dot(320,214,13,orange);
  },
};

function circuit(s,source) {
  const c=s.switch==="closed"?orange:gray;
  const resistor=(x,y,tag)=>rect(x-24,y-9,48,18,"#202633",c)+label(x,y-15,tag);
  const t=s.circuit, x1=286, x2=411;
  const measured=source?line(x1,177,x2,177,c):t==="parallel"?
    path("M286 177V159H411V197H286V177",c)+resistor(349,159,"R₁")+resistor(349,197,"R₂"):
    line(x1,177,x2,177,c)+(t==="series"?resistor(318,177,"R₁")+resistor(379,177,"R₂"):resistor(349,177,t==="second"?"R₂":"R₁"));
  const branch=source?path("M92 80V47H411V80",blue)+meter(250,47,"V",blue):path("M286 177V232H411V177",blue)+meter(349,232,"V",blue);
  return path("M92 89V80H166 M205 80H411V177 M286 177H92V117",c)+
    line(166,80,205,s.switch==="closed"?80:63,c)+dot(166,80,4,white)+dot(205,80,4,white)+
    line(76,90,108,90,white)+line(84,116,100,116,white)+label(63,109,source?"ℰ":"3 В")+
    resistor(260,80,"R")+arrow(232,113,282,67,blue)+meter(351,80,"A",c)+measured+branch+
    (!source?dot(x1,177,4,white)+dot(x2,177,4,white)+label(x1-13,161,"C")+label(x2+13,162,"D"):"");
}

export function diagram(slug, settings, progress=0) {
  return floor+diagrams[slug](settings,progress);
}
