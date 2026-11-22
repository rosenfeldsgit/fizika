'use strict';
const $ = id => document.getElementById(id);
const temperature = $('temperature');
const total = $('total');
const buttons = [...document.querySelectorAll('[data-case]')];
const MIN_VOLUME = .5;
const MAX_VOLUME = 2;
const volumeSlider = $('volume');
const MIN_TEMP = Number(temperature.min);
const MAX_TEMP = Number(temperature.max);
const EPSILON = 1e-8;
const MIN_DISPLAY_MASS = 0.05;
const formatter = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1});
const format = number => formatter.format(number);
const grams = number => number > EPSILON && number < MIN_DISPLAY_MASS ? '<0,1 г' : format(number) + ' г';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let state = {t:20,total:45,volume:1,vapor:0,paused:false};
let activeCase = 'balance';

function saturationDensity(celsius) {
  const kelvin = celsius + 273.15;
  const tau = 1 - kelvin / 647.096;
  const exponent = 647.096 / kelvin * (
    -7.85951783 * tau + 1.84408259 * tau ** 1.5 - 11.7866497 * tau ** 3
    + 22.6807411 * tau ** 3.5 - 15.9618719 * tau ** 4 + 1.80122502 * tau ** 7.5
  );
  const pressure = 22.064e6 * Math.exp(exponent);
  return 1000 * pressure / (461.51805 * kelvin);
}
function saturationMass(t, volume=state.volume) { return saturationDensity(t) * volume; }

function dewPoint(mass) {
  if (mass < saturationMass(MIN_TEMP) || mass > saturationMass(MAX_TEMP)) return null;
  let lower = MIN_TEMP, upper = MAX_TEMP;
  for (let i = 0; i < 42; i++) {
    const middle = (lower + upper) / 2;
    if (saturationMass(middle) < mass) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}

function flagCase(name) {
  activeCase = name;
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.case === activeCase)));
}
function setCase(name) {
  const cases = {
    balance:{t:20,total:45,volume:1,vapor:saturationMass(20,1)},
    last:{t:24,total:20,volume:1,vapor:saturationMass(8,1)},
    cool:{t:14,total:28,volume:1,vapor:28},
    edge:{t:20,total:saturationMass(20,1),volume:1,vapor:saturationMass(20,1)}
  };
  state = {...cases[name],paused:false};
  temperature.value = state.t;
  total.value = state.total;
  volumeSlider.value = state.volume;
  flagCase(name);
  render();
}

for (const button of buttons) button.addEventListener('click', () => setCase(button.dataset.case));
temperature.addEventListener('input', () => {
  state.t = Number(temperature.value);
  flagCase(null);
  render();
});
total.addEventListener('input', () => {
  state.total = Number(total.value);
  state.vapor = Math.min(state.total,state.vapor);
  flagCase(null);
  render();
});
volumeSlider.addEventListener('input', () => {
  state.volume = Number(volumeSlider.value);
  flagCase(null);
  render();
});
$('pause').addEventListener('click', () => {
  state.paused = !state.paused;
  render();
});
$('dewAction').addEventListener('click', () => {
  const dew = dewPoint(state.vapor);
  if (dew === null) return;
  state.t = dew;
  temperature.value = dew;
  flagCase(null);
  render();
});

function setBar(id,part) { $(id).style.width = Math.max(0,Math.min(100,part * 100)) + '%'; }
function updateText(id,text) {
  if ($(id).textContent !== text) $(id).textContent = text;
}
function render() {
  const limit = saturationMass(state.t);
  const liquid = state.total - state.vapor;
  const ratio = state.vapor / limit;
  const saturated = Math.abs(state.vapor - limit) < EPSILON;
  const hasLiquid = liquid > EPSILON;
  const supersaturated = !saturated && ratio > 1;
  let phase = 'Ненасыщенный пар';
  let explanation = hasLiquid
    ? 'Жидкая вода ещё есть. Масса пара растёт.'
    : 'Вся вода в паре. Для насыщения при этой температуре воды не хватает.';
  let exchange = hasLiquid
    ? 'Испарение быстрее конденсации. Жидкости становится меньше.'
    : 'Свободной поверхности жидкости для обмена сейчас нет.';
  if (state.vapor === 0) {
    phase = 'Водяного пара нет';
    explanation = hasLiquid ? 'Жидкость начнёт испаряться.' : 'Добавь воду ползунком, чтобы начать опыт.';
  } else if (saturated) {
    phase = 'Насыщенный пар';
    explanation = hasLiquid
      ? 'Воды хватило для насыщения, часть осталась на дне.'
      : 'Вся вода в паре, и её ровно столько, сколько нужно для насыщения.';
    if (hasLiquid) exchange = 'Скорости равны. Молекулы продолжают переходить между паром и жидкостью.';
  } else if (supersaturated) {
    phase = 'Пересыщенный пар';
    explanation = 'Пара больше, чем нужно для насыщения. Избыток конденсируется.';
    exchange = 'Конденсация преобладает. Масса жидкости растёт.';
  }
  const percent = ratio * 100;
  const rounded = Number(percent.toFixed(1));
  const humidity = !saturated && rounded === 100 ? (supersaturated ? '>100%' : '<100%') : format(percent) + '%';
  updateText('humidity',humidity);
  updateText('phase',phase);
  updateText('explain',explanation);
  updateText('exchange',exchange);
  updateText('temperatureValue',format(state.t) + ' °C');
  updateText('totalValue',grams(state.total));
  updateText('volumeValue',format(state.volume) + ' м³');
  updateText('volumeReadout',format(state.volume));
  updateText('vaporValue',grams(state.vapor));
  updateText('liquidValue',grams(liquid));
  updateText('limitValue',grams(limit));
  updateText('densityValue',format(state.vapor / state.volume) + ' г/м³');
  updateText('pause',state.paused ? 'Продолжить' : 'Пауза');
  setBar('humidityBar',ratio);
  const maxFlow = Math.max(1,ratio);
  setBar('evapBar',hasLiquid ? 1 / maxFlow : 0);
  setBar('condBar',hasLiquid || supersaturated ? ratio / maxFlow : 0);
  const dew = dewPoint(state.vapor);
  updateText('dew',dew === null ? '· вне диапазона' : '· ' + format(dew) + ' °C');
  updateText('dewText',dew === null
    ? (state.vapor === 0 ? 'Водяного пара пока нет.' : 'При текущей массе пара граница насыщения лежит за пределами шкалы.')
    : 'В этом закрытом сосуде при такой температуре текущая масса пара даёт 100% влажности. Если охладить дальше, часть пара сконденсируется.');
  $('dewAction').disabled = dew === null;
  $('chart').setAttribute('aria-label','График насыщения. Текущее состояние: ' + format(state.t) + ' °C, ' + format(state.vapor / state.volume) + ' г/м³.');
  drawChart();
  drawVessel();
}

const vessel = $('vessel');
const chart = $('chart');
const vesselContext = vessel.getContext('2d');
const chartContext = chart.getContext('2d');
const palette = { blue: '#83a7ff', orange: '#ff9b48', outline: '#a6b8ca', muted: '#b5b5b5', grid: '#36393f', vapor: '#101722', vesselGrid: '#263445', water: '#243e69', piston: '#3a4a61', graphArea: '#1c2b47' };
function surface(canvas,context) {
  const {clientWidth:w,clientHeight:h} = canvas;
  const dpr = Math.min(devicePixelRatio || 1,2);
  const width = Math.round(w * dpr);
  const height = Math.round(h * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(dpr,0,0,dpr,0,0);
  context.clearRect(0,0,w,h);
  return {w,h};
}
function drawChart() {
  const c = chartContext;
  const {w,h} = surface(chart,c);
  if (w < 75 || h < 70) return;
  const left = 38, right = w - 31, top = 14, bottom = h - 25;
  const x = t => left + (right-left)*t/MAX_TEMP;
  const ceiling = Math.max(90, Math.ceil((state.vapor / state.volume + 5) / 20) * 20);
  const y = density => bottom - (bottom-top)*density/ceiling;
  c.font = '13px "Latin Modern Math", Georgia, serif';
  c.textAlign = 'right';
  c.textBaseline = 'middle';
  for (let density = 0; density <= ceiling; density += ceiling > 120 ? 40 : 20) {
    c.strokeStyle = palette.grid;
    c.beginPath(); c.moveTo(left,y(density)); c.lineTo(right,y(density)); c.stroke();
    c.fillStyle = palette.muted; c.fillText(density,left-7,y(density));
  }
  c.textAlign = 'center';
  for (const t of [0,10,20,30,40,50]) {
    c.fillText(t,x(t),bottom+13);
  }
  c.fillText('°C',right+20,bottom+13);
  c.beginPath();
  c.moveTo(x(MIN_TEMP),y(saturationDensity(MIN_TEMP)));
  for (let i=1;i<=100;i++) {
    const t = MIN_TEMP + (MAX_TEMP-MIN_TEMP)*i/100;
    c.lineTo(x(t),y(saturationDensity(t)));
  }
  c.strokeStyle = palette.orange; c.lineWidth = 2; c.stroke();
  c.lineTo(right,bottom); c.lineTo(left,bottom); c.closePath();
  c.fillStyle = palette.graphArea; c.globalAlpha = .66; c.fill(); c.globalAlpha = 1;
  const px = x(state.t), py = y(state.vapor/state.volume);
  c.beginPath(); c.moveTo(px,bottom); c.lineTo(px,py); c.lineTo(left,py);
  c.setLineDash([4,4]); c.strokeStyle = palette.blue; c.lineWidth = 1; c.stroke(); c.setLineDash([]);
  c.beginPath(); c.arc(px,py,6,0,Math.PI*2);
  c.fillStyle = palette.blue; c.fill(); c.strokeStyle = 'white'; c.lineWidth = 2; c.stroke();
}
const particles = Array.from({length:115},(_,i) => ({
  x:((i*0.618033989 + .14)%1),
  y:((i*0.414213562 + .31)%1),
  vx:Math.sin(i*2.73)*(.035 + (i%5)*.009),
  vy:Math.cos(i*1.91)*(.043 + (i%4)*.012)
}));
let motionTime = 0;
const bounce = value => 1 - Math.abs(((value % 2 + 2) % 2)-1);
function drawVessel() {
  const c = vesselContext;
  const {w,h} = surface(vessel,c);
  if (w < 70 || h < 70) return;
  const left = Math.max(20,w*.105), right = w-left, top = 29, bottom = h-24;
  const width = right-left;
  const liquid = state.total-state.vapor;
  const depth = liquid > EPSILON ? 5+Math.sqrt(liquid/90)*44 : 0;
  const pistonTop = top + (1 - (state.volume-MIN_VOLUME)/(MAX_VOLUME-MIN_VOLUME)) * (bottom-top-70);
  const waterline = Math.max(pistonTop+18,bottom-depth);
  c.fillStyle = palette.vapor; c.fillRect(left,top,width,bottom-top);
  c.strokeStyle = palette.vesselGrid; c.lineWidth = 1;
  for (let x=left+24;x<right;x+=24) {
    c.beginPath(); c.moveTo(x,top); c.lineTo(x,bottom); c.stroke();
  }
  for (let y=top+23;y<bottom;y+=23) {
    c.beginPath(); c.moveTo(left,y); c.lineTo(right,y); c.stroke();
  }
  c.fillStyle = palette.piston;
  c.fillRect(left,pistonTop,width,8);
  c.strokeStyle = palette.outline; c.lineWidth = 2;
  c.strokeRect(left,pistonTop,width,8);
  c.fillStyle = palette.outline;
  c.fillRect((left+right)/2-4,top-15,8,15);
  if (depth) {
    c.fillStyle = palette.water; c.fillRect(left,waterline,width,bottom-waterline);
    c.strokeStyle = palette.blue; c.beginPath(); c.moveTo(left,waterline); c.lineTo(right,waterline); c.stroke();
  }
  const count = state.vapor > 0 ? Math.max(1,Math.round(state.vapor*1.25)) : 0;
  c.fillStyle = palette.blue;
  for (let i=0;i<count;i++) {
    const p = particles[i];
    const x = left + 8 + bounce(p.x+p.vx*motionTime)*(width-16);
    const y = pistonTop+16 + bounce(p.y+p.vy*motionTime)*Math.max(1,waterline-pistonTop-24);
    c.beginPath(); c.arc(x,y,1.9+i%3*.31,0,Math.PI*2); c.fill();
  }
  if (depth) {
    for (const [direction,color,fraction] of [[-1,palette.blue,.39],[1,palette.orange,.61]]) {
      const x = left+width*fraction;
      const y = waterline-9;
      const offset = reducedMotion.matches ? 0 : Math.sin(motionTime*3+fraction)*3;
      const start = y-15-direction*13+offset;
      const end = y-15+direction*13+offset;
      c.beginPath(); c.moveTo(x,start); c.lineTo(x,end);
      c.moveTo(x-5,end-direction*6); c.lineTo(x,end); c.lineTo(x+5,end-direction*6);
      c.strokeStyle = color; c.lineWidth = 2; c.stroke();
    }
  }
  c.strokeStyle = palette.outline; c.lineWidth = 2;
  c.strokeRect(left,top,width,bottom-top);
  c.lineWidth = 5;
  c.beginPath(); c.moveTo(left-6,top); c.lineTo(right+6,top); c.stroke();
}

let previous = performance.now();
let sinceRender = 0;
function frame(now) {
  const dt = Math.max(0,Math.min((now-previous)/1000,.08));
  previous = now;
  if (!state.paused) {
    if (!reducedMotion.matches) motionTime += dt * (.75+state.t/60);
    const limit = saturationMass(state.t);
    const target = Math.min(state.total,limit);
    if (state.vapor !== target) {
      const next = limit+(state.vapor-limit)*Math.exp(-1.65*dt);
      state.vapor = Math.min(state.total,Math.abs(next-limit)<.012 ? limit : next);
      sinceRender += dt;
      if (sinceRender >= .075 || state.vapor === target) {
        sinceRender = 0;
        render();
      }
    }
  }
  if (!state.paused && !reducedMotion.matches) drawVessel();
  requestAnimationFrame(frame);
}
if (vesselContext && chartContext) {
  setCase('balance');
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => { drawVessel(); drawChart(); }).observe(document.querySelector('.lab'));
  } else {
    window.addEventListener('resize', () => { drawVessel(); drawChart(); });
  }
  for (const control of [...buttons,temperature,total,volumeSlider,$('pause')]) control.disabled = false;
  document.querySelector('.humidity-lab').classList.add('simulation-ready');
  document.fonts?.load('13px "Latin Modern Math"').then(drawChart).catch(() => {});
  requestAnimationFrame(frame);
}
