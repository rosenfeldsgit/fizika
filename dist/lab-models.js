export const g = 9.81;
const fmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 4 });
export const number = (value, places = 4) => Number.isFinite(value) ? fmt.format(Number(value.toFixed(places))) : "—";
const round = (value, step) => Number((Math.round(value / step) * step).toFixed(8));
const values = (items) => items.map((item) => typeof item === "number" ? number(item) : item);
const result = (items, raw = {}, message = "Показания сняты. Запиши замер в журнал.") => ({ cells: values(items), raw, message });
const invalid = (message, items = []) => ({ cells: values(items), message, ready: false });
const range = (id, label, value, min, max, step, unit, mode) => ({ id, label, value, min, max, step, unit, mode });
const choices = (id, label, options, mode) => ({ id, label, value: options[0][0], options, mode });
const mean = (items) => items.reduce((sum, item) => sum + item, 0) / items.length;
const average = (rows, key) => mean(rows.map(row => row.raw[key]).filter(Number.isFinite));
const deg = (value) => value * Math.PI / 180;
const relative = (value, uncertainty) => uncertainty / Math.abs(value);
export const meters = { length: .0015, temperature: 1.5, voltage: .025, current: .01 };

function estimate(value, delta) {
  if (!Number.isFinite(value) || !Number.isFinite(delta)) return "—";
  if (!delta) return number(value);
  const place = 10 ** Math.floor(Math.log10(delta));
  const uncertainty = Math.round(delta / place) * place;
  const digits = Math.max(0, -Math.floor(Math.log10(uncertainty)));
  return new Intl.NumberFormat("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value) +
    " ± " + number(uncertainty, digits);
}

const percentages = (ratio) => number(ratio * 100, 2) + " %";
const interval = (center, delta) => [center - delta, center + delta];
const intervalsOverlap = (a, b) => a[0] <= b[1] && b[0] <= a[1];
const compatible = (yes) => yes ? "Интервалы пересекаются. Результаты согласуются в пределах погрешности." : "Интервалы не пересекаются.";
const intervalText = ([a, b]) => "[" + number(a, 2) + "; " + number(b, 2) + "]";

export { range, choices, result, invalid, mean, round, estimate, interval, intervalsOverlap };

export const physics = {
  flight: (h, speed) => {
    const time = Math.sqrt(2 * h / g);
    return { time, distance: speed * time };
  },
  orbit: (mass, radius, height) => ({
    period: 2 * Math.PI * Math.sqrt(height / g),
    force: mass * g * radius / height,
    acceleration: g * radius / height,
  }),
  spring: (weight, k) => weight / k,
  friction: (length, height) => {
    const d = Math.sqrt(length ** 2 - height ** 2);
    return { d, coefficient: height / d };
  },
  energy: (weight, length, k) => {
    const stretch = (weight + Math.sqrt(weight ** 2 + 2 * k * weight * length)) / k;
    return { stretch, height: length + stretch, force: k * stretch };
  },
  forces: (f2, f3, angle) => Math.hypot(f2 + f3 * Math.cos(deg(angle)), f3 * Math.sin(deg(angle))),
  moment: (left, right, extraLeft = 0, extraRight = 0) => g * (left + extraLeft - right - extraRight),
  gas: (hotLength, hotTemperature, coldTemperature, waterDifference = 0) => {
    const p = 101325 - 1000 * g * waterDifference;
    return { p, coldLength: hotLength * ((coldTemperature + 273.15) / (hotTemperature + 273.15)) * 101325 / p };
  },
  series: (a, b) => a + b,
  parallel: (a, b) => a * b / (a + b),
  source: (emf, resistance, load) => {
    const current = emf / (resistance + load);
    return { current, voltage: current * load };
  },
};

export const labs = [
  {
    slug: "horizontal-launch", group: "Механика", pages: "412–413", title: "Горизонтальный бросок",
    controls: [range("height", "Высота вылета", 1.2, .3, 2, .05, "м"), range("speed", "Начальная скорость", 2, .5, 4.5, .1, "м/с")],
    columns: ["h, м", "tᵢ, с", "tср, с", "tтеор, с", "Lᵢ, м", "v₀ᵢ, м/с"],
    duration: 900,
    measure(s, {rows}) {
      const flight = physics.flight(s.height, s.speed);
      const sameHeight = rows.filter(row => row.raw.height === s.height);
      const offset = [0, -.006, .006][sameHeight.length % 3];
      const t = round(flight.time + offset, .01);
      const tMean = mean([...sameHeight.map(row => row.raw.t), t]);
      const distance = round(flight.distance, .001);
      return result([s.height, t, tMean, flight.time, distance, distance / tMean], {height: s.height, speed: s.speed, t});
    },
    report(rows, s) {
      const series = rows.filter(row => row.raw.height === s.height);
      if (!series.length) return "Сними три отсчёта времени и две дальности при разных скоростях, сохраняя высоту.";
      return "Для текущей высоты: " + series.length + " отсч., " + new Set(series.map(row => row.raw.speed)).size + " скор. Среднее время " + number(average(series, "t")) + " с. Расчётное время " + number(physics.flight(s.height, s.speed).time) + " с.";
    },
  },
  {
    slug: "circular-motion", group: "Механика", pages: "413–414", title: "Движение по окружности",
    controls: [choices("mode","Вид установки",[["orbit","Вращение"],["force","Динамометр"]]), range("thread","Длина нити",.45,.3,.8,.01,"м"), range("radius","Радиус траектории",.2,.08,.28,.01,"м"), range("mass","Масса шарика",100,50,200,5,"г"), range("turns","Число оборотов",10,5,15,1,"")],
    columns: ["R, м", "N", "Δt, с", "T, с", "h, м", "m, кг", "F₁, Н", "a₁, м/с²", "a₂, м/с²", "a₃, м/с²"],
    duration: 1200,
    measure(s, { memory }) {
      const hExact = Math.sqrt(s.thread ** 2 - s.radius ** 2);
      const m = s.mass / 1000;
      const h = round(hExact, .001);
      const ideal = physics.orbit(m, s.radius, hExact);
      const key = ["orbit",s.thread,s.radius,s.mass,s.turns].join("/");
      if (s.mode === "orbit") {
        const elapsed = round(ideal.period * s.turns, .01);
        memory.set(key, elapsed);
        return invalid("Секундомер: " + number(elapsed) + " с. Переключись на динамометр, чтобы получить полный замер.", [s.radius,s.turns,elapsed,elapsed/s.turns,h,m]);
      }
      if (!memory.has(key)) return invalid("Сначала измерь время оборотов для этих настроек в режиме «Вращение».");
      const elapsed = memory.get(key);
      const t = elapsed / s.turns, f = round(ideal.force,.01);
      return result([s.radius,s.turns,elapsed,t,h,m,f,4*Math.PI**2*s.radius/t**2,g*s.radius/h,f/m]);
    },
  },
  {
    slug: "spring-stiffness", group: "Механика", pages: "414–415", title: "Жёсткость пружины",
    controls: [choices("spring","Пружина на схеме",[["thin","Тонкая проволока"],["thick","Толстая проволока"]]), choices("load","Груз",[[1,"1 Н"],[2,"2 Н"],[3,"3 Н"]])],
    columns: ["P, Н","x, мм","h₀, мм","hᵢ, мм","Δhᵢ, мм","k₁, Н/м","k₂, Н/м"],
    measure(s) {
      const x = round(physics.spring(s.load,100),.001);
      const extension = round(physics.spring(s.load,200),.001);
      return result([s.load,x*1000,250,250-extension*1000,extension*1000,s.load/x,s.load/extension], {k1:s.load/x,k2:s.load/extension});
    },
    report: rows => rows.length ? "Средние жёсткости: k₁ = " + number(average(rows,"k1")) + " Н/м, k₂ = " + number(average(rows,"k2")) + " Н/м." : "Сними показания для трёх грузов. Линейка показывает удлинение с делением 1 мм.",
  },
  {
    slug: "sliding-friction", group: "Механика", pages: "415–416", title: "Коэффициент трения скольжения",
    controls: [choices("mode","Критерий",[["static","Начало скольжения"],["kinetic","Равномерное скольжение"]]),choices("pair","Контактная пара",[["wood","Дерево по доске"],["paper","Дерево по бумаге"]]),choices("face","Грань",[["wide","Широкая"],["narrow","Узкая"]]),range("height","Высота края доски",140,0,480,1,"мм")],
    columns: ["Режим", "Поверхность", "Грань", "ℓ, м", "h, м", "d, м", "μ", "Среднее μ"],
    duration: 900,
    coefficient(s) { return s.pair === "wood" ? (s.mode === "static" ? .45 : .31) : (s.mode === "static" ? .58 : .40); },
    measure(s,{rows}) {
      const length=.5,h=s.height/1000, expected=this.coefficient(s);
      const threshold=Math.ceil(length*expected/Math.hypot(1,expected)*1000);
      const {d,coefficient}=physics.friction(length,h);
      const key=[s.mode,s.pair,s.face].join("/");
      const data=[s.mode==="static"?"Покой":"Скольжение",s.pair==="wood"?"Доска":"Бумага",s.face==="wide"?"Широкая":"Узкая",length,h,d];
      if(s.mode==="static" && Math.abs(s.height-threshold)>1) return invalid(s.height<threshold?"Брусок ещё не сдвинулся. Чуть подними край доски.":"Порог уже пройден. Уменьши высоту до начала движения.",data);
      if(s.mode==="kinetic" && Math.abs(coefficient-expected)>.009) return invalid(coefficient<expected?"Брусок замедляется после толчка. Подними доску.":"Брусок разгоняется после толчка. Опусти доску.",data);
      const matched=rows.filter(row=>row.raw.key===key).map(row=>row.raw.mu);
      return result([...data,coefficient,mean([...matched,coefficient])],{key,mu:coefficient});
    },
    report(rows) {
      const groups=new Map();
      for(const row of rows){const label=row.cells.slice(0,3).join(" · ");const group=groups.get(label)??[];group.push(row.raw.mu);groups.set(label,group);}
      return [...groups].map(([label,items])=>label+": "+number(mean(items),3)+" ("+items.length+" зам.)").join(" | ")||"Сравни средние отдельно для каждой контактной пары, грани и критерия.";
    },
  },
  {
    slug: "mechanical-energy",group:"Механика",pages:"416–417",title:"Сохранение механической энергии",
    controls:[choices("mode","Режим установки",[["drop","Свободное падение"],["slow","Медленное измерение"]]),range("weight","Вес груза",1,.5,2,.1,"Н"),range("thread","Длина нити",.15,.08,.25,.01,"м"),range("stiffness","Жёсткость пружины",50,30,100,5,"Н/м")],
    columns:["Fг, Н","ℓ, м","Δℓ, м","Fупр, Н","h, м","Eг, Дж","Eпруж, Дж"],
    duration:1050,
    measure(s,{memory}) {
      const ideal=physics.energy(s.weight,s.thread,s.stiffness);
      const stretch=round(ideal.stretch,.001),force=round(ideal.force,.01);
      const key=["energy",s.weight,s.thread,s.stiffness].join("/");
      if(s.mode==="drop"){memory.set(key,stretch);return invalid("Нижняя точка отмечена. Переключись на медленное измерение.",[s.weight,s.thread,stretch]);}
      if(!memory.has(key))return invalid("Сначала отметь нижнюю точку в режиме свободного падения для этих настроек.");
      const measured=memory.get(key),height=s.thread+measured;
      return result([s.weight,s.thread,measured,force,height,s.weight*height,force*measured/2]);
    },
  },
  {
    slug:"rigid-body-equilibrium",group:"Механика",pages:"417–419",title:"Равновесие тела под действием сил",
    controls:[choices("mode","Установка",[["ring","Кольцо и три силы"],["beam","Планка и моменты"]]),
      choices("angle","Угол между F₂ и F₃",[[90,"90°"],[120,"120°"]],"ring"),
      range("f2","Сила F₂",3,1,5,.1,"Н","ring"),range("f3","Сила F₃",4,1,5,.1,"Н","ring"),
      range("f1","Сила F₁",5,1,10,.1,"Н","ring"),range("direction","Направление F₁ от вправо",233,0,360,1,"°","ring"),
      range("m1","Левый груз m₁",100,25,200,5,"г","beam"),range("m2","Правый груз m₂",50,25,150,5,"г","beam"),
      range("arm2","Плечо правого груза ℓ₂",8,1,12,1,"см","beam"),range("m3","Дополнительный левый груз m₃",0,0,150,5,"г","beam"),
      range("m4","Дополнительный правый груз m₄",0,0,150,5,"г","beam"),range("arm4","Плечо правого груза ℓ₄",8,1,12,1,"см","beam")],
    columns:["Установка","F₁, F₂, F₃, Н","Направления, °","R₂₃, Н","ΣFₓ, Н","ΣFᵧ, Н","m₁, m₂, m₃, m₄, г","ℓ₁, ℓ₂, ℓ₃, ℓ₄, см","ΣM, Н·м","Реакция, Н"],
    measure(s) {
      if(s.mode==="ring"){
        const x=s.f1*Math.cos(deg(s.direction))+s.f2+s.f3*Math.cos(deg(s.angle));
        const y=s.f1*Math.sin(deg(s.direction))+s.f3*Math.sin(deg(s.angle));
        return result(["Кольцо",values([s.f1,s.f2,s.f3]).join(" / "),s.direction+" / 0 / "+s.angle,physics.forces(s.f2,s.f3,s.angle),x,y,"—","—","—","—"],{},Math.hypot(x,y)<=.1?"Сумма сил близка к нулю. Запиши замер.":"Кольцо не в равновесии. Можно записать замер и затем подобрать F₁.");
      }
      const moment=physics.moment(s.m1*.04/1000,s.m2*s.arm2/100000,s.m3*.04/1000,s.m4*s.arm4/100000);
      return result(["Планка","—","—","—","—","—",[s.m1,s.m2,s.m3,s.m4].join(" / "),[4,s.arm2,4,s.arm4].join(" / "),moment,g*(s.m1+s.m2+s.m3+s.m4+50)/1000],{},Math.abs(moment)<.001?"Моменты уравновешены. Запиши замер.":"Есть ненулевой момент. Измени плечо правого груза или запиши этот замер.");
    },
  },
  {
    slug:"gay-lussac-law",group:"Молекулярная физика",pages:"419–420",title:"Закон Гей-Люссака",
    controls:[choices("mode","Этап",[["hot","Горячая ванна"],["cold","Холодная ванна"]]),range("length","Начальная длина воздуха",600,400,700,5,"мм"),range("hot","Температура горячей ванны",60,45,75,1,"°C"),range("cold","Температура холодной ванны",20,12,29,1,"°C","cold"),range("water","Разность уровней воды H",20,-40,40,1,"мм","cold")],
    columns:["ℓ₁, мм","ℓ₂, мм","t₁, °C","t₂, °C","T₁, К","T₂, К","A ± ΔA","εA","B ± ΔB","εB","Интервалы"],
    measure(s,{memory}) {
      const t1=s.hot+273.15,t2=s.cold+273.15;
      const key=["gas",s.length,s.hot].join("/");
      if(s.mode==="hot"){memory.set(key,s.length);return invalid("Трубка прогрета. Длина горячего воздуха "+s.length+" мм. Перенеси трубку в холодную ванну.",[s.length,"—",s.hot,"—",t1]);}
      if(!memory.has(key))return invalid("Сначала сними показания в горячей ванне при этих настройках.");
      if(s.water!==0)return invalid("Уровни не совпадают. Давление отличается от атмосферного на "+number(-1000*g*s.water/1000,1)+" Па. Установи H = 0 мм.");
      const l1=memory.get(key), l2=round(physics.gas(l1,s.hot,s.cold).coldLength,1);
      const a=l1/l2, b=t1/t2, ea=meters.length*1000*(1/l1+1/l2), eb=meters.temperature*(1/t1+1/t2);
      const verdict=intervalsOverlap(interval(a,a*ea),interval(b,b*eb));
      return result([l1,l2,s.hot,s.cold,t1,t2,estimate(a,a*ea),percentages(ea),estimate(b,b*eb),percentages(eb),verdict?"Совпадают":"Не совпадают"],{},compatible(verdict));
    },
    report:()=> "Линейка: 1 мм (Δинстр 1 мм + Δотсч 0,5 мм). Термометр: 1 °C (Δинстр 1 °C + Δотсч 0,5 °C). A = ℓ₁/ℓ₂, B = T₁/T₂.",
  },
  {
    slug:"resistor-connections",group:"Электродинамика",pages:"420–422",title:"Соединения проводников",
    controls:[choices("circuit","Участок CD",[["first","R₁"],["second","R₂"],["series","Последовательно"],["parallel","Параллельно"]]),choices("switch","Ключ",[["open","Разомкнут"],["closed","Замкнут"]]),range("rheostat","Сопротивление реостата",3,1,9,.5,"Ом")],
    columns:["Соединение","Реостат, Ом","U, В","I, А","R ± ΔR, Ом","εR"],
    resistance(circuit) { return ({first:6,second:3,series:physics.series(6,3),parallel:physics.parallel(6,3)})[circuit]; },
    measure(s) {
      if(s.switch==="open")return invalid("Ключ разомкнут. Выбери схему и замкни цепь.");
      const r=this.resistance(s.circuit);
      const iExact=3/(r+s.rheostat), u=round(iExact*r,.01), i=round(iExact,.01);
      if(u<=meters.voltage||i<=meters.current)return invalid("Показания неразличимы на шкале. Уменьши сопротивление реостата.");
      const measured=u/i, e=relative(u,meters.voltage)+relative(i,meters.current);
      const title=this.controls[0].options.find(opt=>opt[0]===s.circuit)[1];
      return result([title,s.rheostat,u,i,estimate(measured,measured*e),percentages(e)],{mode:s.circuit,measured,delta:measured*e});
    },
    report(rows) {
      const readings=Object.fromEntries(rows.map(row=>[row.raw.mode,row.raw]));
      if(!readings.first||!readings.second)return "Сними показания отдельно для R₁ и R₂, затем для обоих соединений.";
      const a=interval(readings.first.measured,readings.first.delta),b=interval(readings.second.measured,readings.second.delta);
      if(a[0]<=0||b[0]<=0)return "Нижняя граница сопротивления неположительна. Для прогноза нужна более точная серия.";
      return ["series","parallel"].map(mode=>{
        const title=mode==="series"?"Последовательно":"Параллельно";
        const bounds=[physics[mode](a[0],b[0]),physics[mode](a[1],b[1])];
        const actual=readings[mode];
        return title+": прогноз "+intervalText(bounds)+" Ом"+(actual?". Измерено "+intervalText(interval(actual.measured,actual.delta))+" Ом. "+compatible(intervalsOverlap(bounds,interval(actual.measured,actual.delta))):". Сними показания.");
      }).join(" ");
    },
  },
  {
    slug:"source-emf",group:"Электродинамика",pages:"422–423",title:"ЭДС и внутреннее сопротивление источника",
    controls:[choices("switch","Ключ",[["open","Разомкнут"],["closed","Замкнут"]]),range("load","Сопротивление реостата",2.5,1,12,.5,"Ом")],
    columns:["Режим","Нагрузка, Ом","U₀ ± ΔU₀, В","U, В","I, А","r ± Δr, Ом","εr"],
    measure(s,{rows}) {
      if(s.switch==="open")return result(["Холостой ход","—",estimate(1.5,meters.voltage),"—","—","—","—"],{emf:1.5},"Запиши напряжение холостого хода, затем замкни ключ.");
      const baseline=rows.findLast(row=>row.raw.emf);
      if(!baseline)return invalid("Сначала разомкни ключ и запиши напряжение холостого хода U₀.");
      const emf=baseline.raw.emf, ideal=physics.source(1.5,.5,s.load);
      const u=round(ideal.voltage,.01),i=round(ideal.current,.01),drop=emf-u;
      const partial=["Под нагрузкой",s.load,estimate(emf,meters.voltage),u,i];
      if(drop<0)return invalid("Отсчёты не согласуются: U больше U₀. Повтори измерение.",partial);
      if(i<=meters.current||drop<=2*meters.voltage)return invalid("Падение напряжения сопоставимо с погрешностью. Уменьши сопротивление нагрузки.",partial);
      const r=drop/i,e=(2*meters.voltage)/drop+meters.current/i;
      return result([...partial,estimate(r,r*e),percentages(e)],{resistance:r});
    },
    report(rows) {
      const r=average(rows,"resistance"), emf=rows.findLast(row=>row.raw.emf)?.raw.emf;
      if(!emf)return "Вольтметр: ΔU = 0,025 В. Амперметр: ΔI = 0,010 А. Начни с записи U₀.";
      return "ℰ = "+estimate(emf,meters.voltage)+" В, εℰ = "+percentages(meters.voltage/emf)+". "+
        (Number.isFinite(r)?"Среднее r = "+number(r,3)+" Ом. Общая погрешность U₀ сохраняется при усреднении.":"Сними показания для трёх нагрузок.");
    },
  },
];
