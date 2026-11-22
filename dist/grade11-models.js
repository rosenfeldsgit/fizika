import { g, number, range, choices, result, invalid, mean, round, estimate, interval, intervalsOverlap } from "./lab-models.js?v=grade11-1";
import { modeledTime, pendulumResult } from "./pendulum.js?v=grade11-1";

const radians = degrees => degrees*Math.PI/180;
const degrees = angle => angle*180/Math.PI;
const named = (lab,id,value) => lab.controls.find(c=>c.id===id).options.find(([v])=>v===value)[1];
const matches = (rows,key) => rows.filter(row=>row.raw.key===key);
const count = (rows,key) => matches(rows,key).length;
const sign = value => value>0?"Положительное":value<0?"Отрицательное":"Нуль";
const colors = { red:650, violet:420 };
export const spectrumLines = { hydrogen:[410.2,434,486.1,656.3], helium:[447.1,501.6,587.6,667.8], neon:[585.2,640.2,650.7] };
export const formulas11 = {
  magnetic: (current,rest=2,k=.4) => rest-k*current,
  induction: (turns,flux,t) => -turns*flux/t,
  pendulum: pendulumResult,
  refraction: (a,b,delta=.002) => ({n:a/b,relative:delta/a+delta/b,delta:a/b*(delta/a+delta/b)}),
  lens: (d,f,h) => ({power:1/d+1/f,focus:1/(1/d+1/f),delta:h/(2*d**2)+h/f**2,magnification:-f/d}),
  position: (length, period, wavelength, order=1) => {
    const sine=Math.abs(order)*wavelength/period;
    return sine<1?length*sine/Math.sqrt(1-sine**2):Infinity;
  },
  wavelength: (period,length,x,order=1) => period*Math.abs(x)/Math.hypot(length,x)/Math.abs(order),
  capacity: (lambda,length,offset,inner,outer) => {
    const pitch=lambda*Math.hypot(length,offset)/offset, rings=(outer-inner)/pitch;
    const marks=Math.PI*(inner+outer)/pitch;
    return {pitch,rings,marks,bits:rings*marks};
  },
  prism: (i,a,index) => {
    const r1=Math.asin(Math.sin(radians(i))/index), r2=radians(a)-r1;
    const sine=index*Math.sin(r2);
    return Math.abs(sine)<=1?i+degrees(Math.asin(sine))-a:NaN;
  },
};

export function inductionEvent(s) {
  if(s.mode==="core") {
    const flux=(s.pole==="N"?1:-1)*(s.travel==="in"?1:s.travel==="out"?-1:0)*.001;
    return {flux,time:.1/s.speed,emf:formulas11.induction(200,flux,.1/s.speed)};
  }
  const current=s.key==="close"?s.current:s.key==="open"?-s.current:0;
  const flux=.2*current/200;
  return {flux,time:.2,emf:formulas11.induction(200,flux,.2)};
}

export function lensDistances(s) {
  const d=s.distance/100, f=(s.mode==="focus"?s.track-s.distance:s.screen)/100, F=.2;
  const ideal=d>F?F*d/(d-F):Infinity;
  return {d,f,F,ideal,sharp:Math.abs(f-ideal)<=.005};
}

export const glassAngle = (angle) => Math.asin(Math.sin(radians(angle))/1.5);
export const dispersion = (lambda) => 1.5+.03*(650-lambda)/230;

export const grade11 = [
  {
    slug:"magnetic-field-on-current", group:"Электродинамика", title:"Действие магнитного поля на ток", pages:"413–414",
    controls:[choices("mode","Установка",[["force","Динамометр"],["loops","Подвешенные витки"]]),
      choices("switch","Ключ",[["open","Разомкнут"],["closed","Замкнут"]]),
      choices("direction","Ток со стороны наблюдателя",[[1,"Против часовой"],[-1,"По часовой"]]),
      range("resistance","Сопротивление реостата",12,2,12,1,"Ом","force"),
      choices("pole","Полюс подносимого магнита",[["N","Северный"],["S","Южный"]],"loops")],
    columns:["Установка","Ток / направление","Полюс витков","Полюс магнита","F₀, Н","Fдин, Н","Fмаг вверх, Н","Взаимодействие"],
    measure(s,{rows}) {
      const on=s.switch==="closed", pole=on?(s.direction===1?"N":"S"):"—";
      if(s.mode==="loops") {
        const verdict=!on?"Нет":pole===s.pole?"Отталкивание":"Притяжение";
        return result(["Витки",on?named(this,"direction",s.direction):"0",pole,s.pole,"—","—","—",verdict],{mode:s.mode,key:[pole,s.pole].join("/")},verdict+". Запиши наблюдение.");
      }
      const current=on?round(s.direction*3/(s.resistance+1),.01):0;
      const unloaded=rows.find(row=>row.raw.mode==="force" && row.raw.current===0)?.raw.rest;
      if(on && unloaded===undefined)return invalid("Сначала разомкни ключ, сними и запиши исходное показание F₀.");
      const rest=unloaded??2;
      const reading=round(formulas11.magnetic(current,rest),.01), force=round(rest-reading,.01);
      return result(["Динамометр",current,pole,"N",rest,reading,force,!on?"Нет":force>0?"Отталкивание":"Притяжение"],{mode:s.mode,current,rest,force});
    },
    report(rows) {
      const unique=direction=>new Set(rows.filter(row=>row.raw.mode==="force" && Math.sign(row.raw.current)===direction).map(row=>row.raw.current)).size;
      const loops=new Set(rows.filter(row=>row.raw.mode==="loops"&&!row.raw.key.startsWith("—")).map(row=>row.raw.key)).size;
      return "График по записанным точкам. Токи: "+unique(1)+" из 6 положительных, "+unique(-1)+" из 6 отрицательных. Витки: "+loops+" из 4 сочетаний.";
    },
  },
  {
    slug:"electromagnetic-induction",group:"Электродинамика",title:"Электромагнитная индукция",pages:"414–415",
    controls:[choices("mode","Установка",[["calibrate","Калибровка"],["core","Движение сердечника"],["coils","Две катушки"]]),
      choices("direction","Калибровочный ток",[[1,"Против часовой"],[-1,"По часовой"]],"calibrate"),
      choices("pole","Полюс магнита",[["N","Северный"],["S","Южный"]],"core"),
      choices("travel","Действие",[["in","Вдвинуть"],["out","Выдвинуть"],["stop","Остановить"]],"core"),
      range("speed","Относительная скорость",1,.5,2,.1,"×","core"),
      choices("key","Первичная цепь",[["close","Замкнуть"],["open","Разомкнуть"],["steady","Ключ замкнут, ток постоянный"]],"coils"),
      range("current","Установившийся первичный ток",1,.2,2,.1,"А","coils")],
    columns:["Установка","Действие","Полюс / ток","ΔΦ, мВб","Δt, с","ℰ, В","Отклонение","Поле катушки"],
    duration:1250,
    measure(s,{memory}) {
      if(s.mode==="calibrate"){
        memory.set("calibrated",true);
        const pole=s.direction>0?"N":"S";
        return result(["Калибровка","Подать ток",named(this,"direction",s.direction),"—","—","—",sign(s.direction),pole],{},"Подключение зафиксировано. Открытая сторона катушки: "+pole+".");
      }
      if(!memory.has("calibrated"))return invalid("Сначала подай известный ток в режиме «Калибровка».");
      const p=inductionEvent(s);
      const action=s.mode==="core"?named(this,"travel",s.travel):named(this,"key",s.key);
      const field=p.emf>0?"К наблюдателю":p.emf<0?"От наблюдателя":"Нет";
      return result([named(this,"mode",s.mode),action,s.mode==="core"?s.pole:number(s.current)+" А",p.flux*1000,p.time,p.emf,sign(p.emf),field],{},p.emf?"Импульс закончился. Стрелка вернулась к нулю.":"Поток постоянный, индукционного тока нет.");
    },
  },
  {
    slug:"pendulum",group:"Колебания",title:"Ускорение свободного падения",pages:"415–416",
    controls:[range("length","Длина нити до центра шарика",1,.5,1.5,.01,"м"),range("shift","Начальное отклонение",6,5,8,1,"см")],
    columns:["ℓ, м","N","tᵢ, с","|tᵢ − t̄|, с","t̄, с","Δt̄, с","T, с","g, м/с²","Δg, м/с²"],
    duration:2300,
    measure(s,{rows}) {
      const series=matches(rows,s.length).map(row=>row.raw.time);
      const ideal=modeledTime(s.length,50);
      const time=Math.round(ideal+[-1,0,1,0][series.length%4]);
      const p=formulas11.pendulum(s.length,50,[...series,time]);
      return result([s.length,50,time,series.length?Math.abs(time-p.time):"—",p.time,series.length?p.scatter:"—",p.period,p.gravity,series.length?p.delta:"—"],{key:s.length,time},"Часы показали "+time+" с за 50 колебаний.");
    },
    report(rows,s) {
      const readings=matches(rows,s.length).map(row=>row.raw.time);
      if(readings.length<2)return "Для текущей длины нужны хотя бы два независимых замера. Шкала часов: 1 с. Лента: деление 1 мм, Δℓ = 5,5 мм.";
      const p=formulas11.pendulum(s.length,50,readings);
      const [low,high]=interval(p.gravity,p.delta);
      return "Серия ℓ = "+number(s.length)+" м: t̄ = "+number(p.time,3)+" с, Δt̄ = "+number(p.scatter,3)+" с, T = "+number(p.period,4)+" с. g = "+estimate(p.gravity,p.delta)+" м/с². Модельное 9,81 м/с² "+(low<=g&&g<=high?"попадает в интервал.":"вне интервала по методике учебника.")+" Отклонения отдельных отсчётов от итогового среднего: "+readings.map(t=>number(Math.abs(t-p.time),3)).join(" / ")+" с. Вклад деления часов отдельно: до "+number(p.clock,3)+" м/с²."+(!p.scatter?" Одно деление ограничивает точность даже при нулевом разбросе.":"");
    },
  },
  {
    slug:"glass-refraction",group:"Оптика",title:"Показатель преломления стекла",pages:"416–417",
    controls:[choices("mode","Этап",[["trace","Отметить внешний ход лучей"],["measure","Измерить отрезки"]]),
      range("angle","Угол падения от нормали",37,5,72,1,"°"),
      range("radius","Радиус окружности",100,40,140,5,"мм","measure")],
    columns:["α, °","β, °","AE, мм","DC, мм","ΔAE, мм","ΔDC, мм","n","ε, %","Δn"],
    measure(s,{memory}) {
      if(s.mode==="trace"){memory.set("trace",s.angle);return invalid("Четыре внешние отметки нанесены. Переключись на измерение отрезков.");}
      if(memory.get("trace")!==s.angle)return invalid("Сначала нанеси отметки при этом угле падения.");
      const beta=glassAngle(s.angle), ae=round(s.radius*Math.sin(radians(s.angle)),1), dc=round(s.radius*Math.sin(beta),1);
      if(dc<=4 || ae<=4)return invalid("Отрезки слишком малы для надёжного отсчёта. Увеличь радиус или угол и повтори построение.");
      const r=formulas11.refraction(ae/1000,dc/1000);
      return result([s.angle,number(degrees(beta),2),ae,dc,2,2,r.n,number(r.relative*100,2),r.delta],{angle:s.angle,n:r.n,delta:r.delta});
    },
    report(rows) {
      const last=rows.at(-1)?.raw, previous=rows.findLast(row=>row.raw.angle!==last?.angle)?.raw;
      if(!last||!previous)return "Запиши два построения при разных углах. Погрешность каждого отрезка: 2 мм.";
      const overlap=intervalsOverlap(interval(last.n,last.delta),interval(previous.n,previous.delta));
      return "При "+previous.angle+"°: "+estimate(previous.n,previous.delta)+". При "+last.angle+"°: "+estimate(last.n,last.delta)+". Интервалы "+(overlap?"пересекаются.":"не пересекаются.");
    },
  },
  {
    slug:"converging-lens",group:"Оптика",title:"Оптическая сила собирающей линзы",pages:"417–418",
    controls:[choices("mode","Этап",[["focus","Передвигать линзу"],["screen","Передвигать экран"]]),
      range("distance","Предмет — линза",60,15,105,1,"см"),
      range("track","Предмет — экран",90,70,130,1,"см","focus"),
      range("screen","Линза — экран",30,12,100,.5,"см","screen"),
      range("thickness","Толщина линзы",8,4,12,1,"мм")],
    columns:["d, м","fᵢ, м","f̄, м","h, мм","D, дптр","ΔD, дптр","F, м"],
    measure(s,{rows,memory}) {
      const x=lensDistances(s);
      if(x.d<=x.F)return invalid("Предмет в фокусе или ближе. На экране нет конечного действительного изображения.");
      if(s.mode==="focus"&&s.track<4*x.F*100)return invalid("Между предметом и экраном меньше 4F. Раздвинь их.");
      if(s.mode==="focus"&&x.ideal>=x.d)return invalid("Для первого отсчёта передвинь линзу ближе к экрану, чтобы получить уменьшенное изображение.");
      if(s.mode==="screen"&&!memory.has(s.distance))return invalid("Сначала наведи резкость смещением линзы и сохрани это расстояние до предмета.");
      if(!x.sharp)return invalid("На экране размытое изображение. Наведи резкость.");
      if(s.mode==="focus")memory.set(s.distance,true);
      const key=[s.distance,s.thickness].join("/"), average=mean([...matches(rows,key).map(row=>row.raw.f),x.f]);
      const r=formulas11.lens(x.d,average,s.thickness/1000);
      return result([x.d,x.f,average,s.thickness,r.power,r.delta,r.focus],{key,f:x.f,...r},"Изображение резкое и перевёрнутое. Запиши отсчёт.");
    },
    report(rows) {const last=rows.at(-1)?.raw;return last?"Для последней серии D = "+estimate(last.power,last.delta)+" дптр, F = "+number(last.focus,3)+" м.":"Получи уменьшенное изображение, затем повтори отсчёт с тем же расстоянием до предмета."},
  },
  {
    slug:"light-wavelength",group:"Оптика",title:"Длина световой волны",pages:"419",
    controls:[choices("color","Полоса первого порядка",[["red","Красная"],["violet","Фиолетовая"]]),
      range("length","Решётка — экран",500,250,750,10,"мм"),
      choices("density","Решётка, штрихов/мм",[[100,"100"],[150,"150"],[200,"200"]])],
    columns:["Цвет","Порядок","L, мм","d, мкм","x₋, мм","x₊, мм","2x, мм","λ₋, нм","λ₊, нм","Средняя λ, нм"],
    measure(s) {
      const l=s.length/1000, pitch=.001/s.density, known=colors[s.color], x=formulas11.position(l,pitch,known*1e-9);
      if(!Number.isFinite(x)||x>.12)return invalid("Первый максимум вне шкалы. Уменьши расстояние до экрана.");
      const minus=round(-x*1000,1),plus=round(x*1000,1);
      const a=formulas11.wavelength(pitch,l,minus/1000)*1e9,b=formulas11.wavelength(pitch,l,plus/1000)*1e9;
      return result([named(this,"color",s.color),"±1",s.length,pitch*1e6,minus,plus,plus-minus,a,b,(a+b)/2],{color:s.color,wavelength:(a+b)/2},"Отметки сняты с делением 1 мм. Эталон модели для этой полосы: "+known+" нм.");
    },
  },
  {
    slug:"cd-capacity",group:"Оптика",title:"Оценка ёмкости компакт-диска",pages:"419–421",
    controls:[range("lambda","Длина волны источника",600,450,670,10,"нм"),range("length","Экран — диск",100,50,180,5,"мм"),
      range("inner","Внутренний радиус дорожки",25,20,46,1,"мм"),range("outer","Внешний радиус дорожки",58,40,60,1,"мм")],
    columns:["λ, нм","L, мм","2ℓ, мм","R₁, мм","R₂, мм","r, мм","d, мкм","N₁","N₂","Условные биты"],
    measure(s) {
      if(s.outer<=s.inner)return invalid("Внешний радиус должен быть больше внутреннего.");
      const ideal=formulas11.position(s.length/1000,1.6e-6,s.lambda*1e-9);
      const full=round(ideal*2000,1);
      if(!Number.isFinite(full)||full<=0)return invalid("Пятна первого порядка неразличимы. Измени расстояние до экрана.");
      const p=formulas11.capacity(s.lambda*1e-9,s.length/1000,full/2000,s.inner/1000,s.outer/1000);
      return result([s.lambda,s.length,full,s.inner,s.outer,s.outer-s.inner,p.pitch*1e6,Math.round(p.rings),Math.round(p.marks),Math.round(p.bits)],p);
    },
    report(rows) {const last=rows.at(-1)?.raw;return last?"Для последнего опыта: "+number(last.bits/1e9,3)+" млрд условных бит, или "+number(last.bits/8e6,1)+" млн условных байт.":"Шаг витков реального CD по ECMA-130: 1,6 ± 0,1 мкм."},
  },
  {
    slug:"continuous-line-spectra",group:"Оптика",title:"Сплошной и линейчатый спектры",pages:"421",
    controls:[choices("source","Источник",[["white","Белая щель"],["hydrogen","Водород"],["helium","Гелий"],["neon","Неон"]]),
      choices("angle","Угол между гранями",[[45,"45°"],[60,"60°"]]),
      choices("rays","Ход лучей",[["show","Показать"],["hide","Скрыть"]])],
    columns:["Источник","Угол граней, °","Вид спектра","Цвета / выбранные линии, нм","Отклонение красного, °","Отклонение фиолетового, °"],
    measure(s) {
      const red=formulas11.prism(45,s.angle,dispersion(650)), violet=formulas11.prism(45,s.angle,dispersion(420));
      const lines=spectrumLines[s.source];
      return result([named(this,"source",s.source),s.angle,lines?"Линейчатый":"Сплошной",lines?lines.map(x=>number(x,1)).join(" / "):"От красного до фиолетового",red,violet],{angle:s.angle,source:s.source,width:violet-red},"Шкала длин волн размечена в нм. Яркость полос условная.");
    },
    report(rows) {const last=rows.at(-1)?.raw;return last?"Угловая ширина между модельными лучами 650 и 420 нм: "+number(last.width,2)+"° при гранях "+last.angle+"°.":"Сравни белую щель при двух углах и выбери газоразрядные трубки."},
  },
];
