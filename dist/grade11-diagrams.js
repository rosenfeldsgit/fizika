import { number } from "./lab-models.js";
import { dispersion, formulas11, glassAngle, inductionEvent, lensDistances, spectrumLines } from "./grade11-models.js";
import { modeledTime } from "./pendulum.js?v=grade11-1";

const blue="#83a7ff", orange="#ff9b48", white="#d9dce4", gray="#727c92", deck="#191c20";
const pt=n=>Number(n.toFixed(2));
const line=(x,y,a,b,color=white,dash="")=>`<line x1="${pt(x)}" y1="${pt(y)}" x2="${pt(a)}" y2="${pt(b)}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-dasharray="${dash}"/>`;
const path=(d,stroke=white,fill="none")=>`<path d="${d}" stroke="${stroke}" fill="${fill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
const box=(x,y,w,h,fill,stroke="none")=>`<rect x="${pt(x)}" y="${pt(y)}" width="${pt(w)}" height="${pt(h)}" rx="3" fill="${fill}" stroke="${stroke}"/>`;
const dot=(x,y,r,fill,stroke="none")=>`<circle cx="${pt(x)}" cy="${pt(y)}" r="${r}" fill="${fill}" stroke="${stroke}"/>`;
const label=(x,y,value,fill=white,size=17)=>`<text x="${pt(x)}" y="${pt(y)}" fill="${fill}" font-size="${size}" text-anchor="middle">${value}</text>`;
const arrow=(x,y,a,b,color=orange)=>{
  const angle=Math.atan2(b-y,a-x);
  return line(x,y,a,b,color)+[-.55,.55].map(d=>line(a,b,a-9*Math.cos(angle+d),b-9*Math.sin(angle+d),color)).join("");
};
const coil=(x,y,turns=6)=>Array.from({length:turns},(_,i)=>`<ellipse cx="${x+i*9}" cy="${y}" rx="7" ry="25" fill="none" stroke="${blue}" stroke-width="2"/>`).join("");
const floor=path("M0 228 L520 211 V260H0Z","none",deck);
const spectrum=["#9574ff","#545eff","#32aaff","#39dcec","#64e48b","#f5d45f","#ff974e","#ff5860"];
const spectralColor=lambda=>spectrum[Math.max(0,Math.min(7,Math.floor((lambda-400)/37)))];

const drawings = {
  "magnetic-field-on-current"(s,t,rows) {
    const active=s.switch==="closed", shift=active?(s.direction===1?1:-1)*t:0;
    if(s.mode==="loops"){
      const displacement=shift*(s.pole==="N"?-31:31);
      return line(125,31,257,31)+line(191,32,191+displacement,117,gray)+
        coil(166+displacement,144)+box(342,126,98,35,"#533023",orange)+label(362,149,s.pole)+label(422,149,s.pole==="N"?"S":"N")+
        (active?label(189+displacement,195,s.direction===1?"↺  N":"↻  S",blue):label(189,195,"I = 0"));
    }
    const graph=box(255,42,238,170,"#14171d","#3a4356")+line(274,125,475,125,gray)+line(374,63,374,189,gray)+
      label(455,104,"I, А")+label(420,66,"Fмаг, Н")+label(365,143,"0",white,12)+label(282,145,"−1",white,12)+label(466,145,"1",white,12)+
      label(349,79,"+0,4",white,12)+label(349,180,"−0,4",white,12)+
      rows.filter(r=>r.raw.mode==="force").map(r=>dot(374+r.raw.current*92,125-r.raw.force*127,4,orange)).join("");
    return graph+line(62,35,180,35)+line(120,35,120,63)+box(100,63,40,76,"#252d3e",gray)+
      line(106,98-9*shift,133,98-9*shift,orange)+line(120,139,120,150)+box(93,149,54,25,"#553422",orange)+label(120,168,"N")+
      coil(94,202,7)+(active?label(204,207,s.direction===1?"↺  N":"↻  S",blue):label(198,207,"I = 0"));
  },
  "electromagnetic-induction"(s,t) {
    const event=s.mode==="calibrate"?{emf:s.direction}:inductionEvent(s);
    const signal=event.emf===0?0:s.mode==="calibrate"?t*event.emf:Math.sin(Math.PI*t)*event.emf;
    const angle=Math.max(-65,Math.min(65,signal*19))*Math.PI/180;
    const gauge=path("M352 124 A58 58 0 0 1 468 124",gray)+label(352,147,"−")+label(410,64,"0")+label(468,147,"+")+
      line(410,125,410+48*Math.sin(angle),125-48*Math.cos(angle),orange)+dot(410,125,5,orange)+
      label(410,175,Math.abs(signal)<.01?"Стрелка: 0":signal>0?"Стрелка: +":"Стрелка: −",blue);
    if(s.mode==="coils")return gauge+box(75,99,225,16,"#505968")+coil(103,107)+coil(220,107)+label(127,58,"Первичная")+label(244,58,"Вторичная")+
      path("M104 132v68h62v-68 M226 132v68h59v-68",gray)+label(139,226,s.key==="open"?"Размыкание":"Замыкание / ток");
    const shift=s.mode==="core"?(s.travel==="in"?t:s.travel==="out"?1-t:.5):.85;
    return gauge+box(57+90*shift,98,126,18,"#536078")+coil(202,107,8)+
      (s.mode==="core"?box(34+90*shift,86,41,42,"#553422",orange)+label(54+90*shift,113,s.pole)+label(228,191,"Сердечник"):
        label(219,182,"Полюс: "+(s.direction>0?"N":"S"),blue)+label(219,207,s.direction>0?"Ток ↺":"Ток ↻"));
  },
  pendulum(s,t,rows,measurement) {
    const len=75+s.length*57, phase=Math.cos(t*2*Math.PI*5), x=260+phase*s.shift*3, y=52+Math.sqrt(len**2-(x-260)**2);
    const time=measurement?.raw?.time??modeledTime(s.length,50)*t;
    return line(177,51,342,51)+line(260,52,260,211,gray,"4 5")+path("M207 198 Q260 221 313 198",gray)+line(260,52,x,y,blue)+dot(260,52,5,white)+dot(x,y,11,orange)+
      label(90,82,"ℓ = "+number(s.length)+" м",blue)+label(419,82,Math.round(time)+" с")+label(419,111,Math.floor(50*t)+" / 50");
  },
  "glass-refraction"(s,t) {
    const a=s.angle*Math.PI/180,b=glassAngle(s.angle), B=[250,105], F=[250+Math.tan(b)*49,154], scale=0.5;
    const u=[Math.sin(a),Math.cos(a)], v=[Math.sin(b),Math.cos(b)];
    const radius=s.radius*scale;
    const A=[B[0]-u[0]*radius,B[1]-u[1]*radius], C=[B[0]+v[0]*radius,B[1]+v[1]*radius];
    const mark1=[B[0]-u[0]*32,B[1]-u[1]*32],mark2=[B[0]-u[0]*88,B[1]-u[1]*88];
    const mark3=[F[0]+u[0]*28,F[1]+u[1]*28],mark4=[F[0]+u[0]*72,F[1]+u[1]*72];
    const markings=s.mode==="measure"||t>.45?[mark1,mark2,mark3,mark4].map(([x,y])=>dot(x,y,4,white)).join(""):"";
    return box(31,105,458,49,"#1a283c",gray)+label(81,134,"Стекло")+line(250,23,250,237,gray,"4 5")+
      line(...mark2,...B,orange)+line(...B,...F,blue)+line(...F,...mark4,orange)+dot(...B,4,white)+dot(...F,4,white)+
      label(239,99,"B")+label(F[0]+15,F[1]+6,"F")+markings+
      (s.mode==="measure"?dot(...B,radius,"none",gray)+line(...A,250,A[1],orange,"3 3")+line(...C,250,C[1],blue,"3 3")+
        line(...F,F[0]+v[0]*28,F[1]+v[1]*28,blue,"3 4")+label(A[0]-9,A[1]-7,"A")+label(C[0]+10,C[1]+13,"C")+
        label(261,A[1]-6,"E")+label(240,C[1]+12,"D"):"");
  },
  "converging-lens"(s) {
    const {d,f,ideal,sharp,F}=lensDistances(s), x0=50, x=x0+d*255, X=x0+(d+Math.max(0,f))*255;
    const center=128, top=84, focus=x+F*255;
    const ray1=Y=>top+(center-top)*(Y-x)/(focus-x);
    const ray2=Y=>center+(center-top)*(Y-x)/(x-x0);
    const end=Math.min(477,Math.max(x+32,X)), image=center+(center-top)*ideal/d;
    return `<defs><clipPath id="lens-bench-limit"><rect width="520" height="233"/></clipPath></defs><g clip-path="url(#lens-bench-limit)">`+
      line(28,128,489,128,gray,"4 5")+line(x0,128,x0,top,white)+label(x0-15,top+5,"Р")+
      path(`M${x} 48Q${x+25} 128 ${x} 208Q${x-25} 128 ${x} 48Z`,blue,"#202d49")+
      path(`M${x0} ${top}H${x}L${end} ${pt(ray1(end))} M${x0} ${top}L${end} ${pt(ray2(end))}`,orange)+
      (X>x?line(X,54,X,222,white)+label(X,46,"Экран"):"")+dot(focus,center,3,blue)+
      (sharp&&image<220?`<text x="${X+9}" y="${pt(image)}" fill="${blue}" font-size="24" transform="rotate(180 ${X+9} ${pt((image+center)/2)})">Р</text>`:"")+"</g>"+
      label(258,245,sharp?"Резкое перевёрнутое изображение":!Number.isFinite(ideal)?"Конечного изображения нет":"Изображение на экране размыто",blue);
  },
  "light-wavelength"(s) {
    const center=260, scale=1.83, base=166;
    let lines=box(34,67,452,105,"#101318","#3d4655")+line(44,base,476,base,gray)+line(center,74,center,157,white)+label(center,56,"0",white);
    for(let n=-120;n<=120;n+=10){
      const x=center+n*scale;
      lines+=line(x,base,x,base+(n%40===0?13:6),gray);
      if(n%40===0)lines+=label(x,203,n,white,13);
    }
    for(const m of [-2,-1,1,2]){
      if(Math.abs(m)===1)lines+=label(center+m*99,55,m>0?"+1":"−1");
      for(const lambda of [420,470,520,570,610,650]){
        const mm=formulas11.position(s.length,.001/s.density,lambda*1e-9,m);
        if(mm>120)continue;
        const x=center+Math.sign(m)*mm*scale, selected=Math.abs(m)===1 && lambda===(s.color==="red"?650:420);
        lines+=line(x,selected?78:Math.abs(m)===1?90:110,x,147,spectralColor(lambda))+(selected?dot(x,151,4,white):"");
      }
    }
    return lines+label(260,229,"x, мм · первый и второй порядки");
  },
  "cd-capacity"(s) {
    const ratio=s.lambda/1600, y=96*ratio/Math.sqrt(1-ratio**2);
    return line(207,53,207,211,gray)+line(380,72,380,185,blue)+dot(207,132,5,white)+dot(207,132-y,5,orange)+dot(207,132+y,5,orange)+
      line(44,132,380,132,orange)+line(380,132,207,132-y,orange)+line(380,132,207,132+y,orange)+
      line(177,132-y,177,132+y,blue)+label(160,136,"2ℓ",blue)+
      label(207,42,"Экран")+label(382,64,"CD")+label(66,115,"λ",orange)+line(207,222,379,222,gray)+label(293,244,"L");
  },
  "continuous-line-spectra"(s) {
    const halfWidth=97*Math.tan(s.angle*Math.PI/360), entrance=205-halfWidth*48/97, exit=205+halfWidth*59/97;
    let shape=path(`M205 31 L${205+halfWidth} 128 H${205-halfWidth}Z`,blue,"#18283e");
    const lines=spectrumLines[s.source];
    const screenY=lambda=>66+(formulas11.prism(45,s.angle,dispersion(lambda))-20)*2.3;
    if(s.rays==="show"){
      shape+=line(34,79,entrance,79,white)+line(entrance,79,exit,90,white)+
        [420,650].map(lambda=>line(exit,90,446,screenY(lambda),spectralColor(lambda))).join("");
    }
    shape+=line(447,45,447,142,gray)+label(446,35,"Экран")+label(198,148,s.angle+"°",blue);
    const x=lambda=>44+(lambda-400)*1.44;
    shape+=box(43,174,435,38,"#111419","#384152");
    if(lines) {
      for(const lambda of lines)shape+=line(x(lambda),177,x(lambda),207,spectralColor(lambda))+dot(447,screenY(lambda),3,spectralColor(lambda));
    } else {
      const stops=colors=>colors.map((color,i)=>`<stop offset="${i/(colors.length-1)}" stop-color="${color}"/>`).join("");
      shape+=`<defs><linearGradient id="wavelength-colors">${stops(spectrum)}</linearGradient><linearGradient id="screen-colors" x2="0" y2="1">${stops([...spectrum].reverse())}</linearGradient></defs>`;
      shape+=box(45,178,431,29,"url(#wavelength-colors)")+
        box(444,screenY(700),6,screenY(400)-screenY(700),"url(#screen-colors)");
    }
    for(const lambda of [400,500,600,700])shape+=line(x(lambda),210,x(lambda),217,gray)+label(x(lambda),232,lambda,white,13);
    return shape+label(260,251,"λ, нм",white,15);
  },
};

export function diagram11(slug, settings, progress=0, rows=[], measurement) {
  return floor+drawings[slug](settings,progress,rows,measurement);
}
