"use strict";

const get = (id) => document.getElementById(id);
const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 });
const voltage = get("rl-voltage");
const resistance = get("rl-resistance");
const inductance = get("rl-inductance");
const toggle = get("rl-switch");
const stateLabel = get("rl-state");
const curves = get("rl-curves");
const grid = get("rl-grid");
const cursor = get("rl-cursor");
const plot = { left: 65, right: 525, top: 26, bottom: 196 };

let parameters;
let segments;
let time;
let previousFrame;
let frame;

function currentAt(segment, at) {
  const target = segment.closed ? parameters.limit : 0;
  return target + (segment.current - target) * Math.exp(-(at - segment.time) / parameters.tau);
}

function draw() {
  const segment = segments.at(-1);
  const current = currentAt(segment, time);
  const emf = parameters.r * current - (segment.closed ? parameters.u : 0);
  get("rl-current").textContent = number.format(current) + " А";
  get("rl-emf").textContent = (emf > 0.0005 ? "+" : "") + number.format(Math.abs(emf) < 0.0005 ? 0 : emf) + " В";
  get("rl-time").textContent = number.format(time) + " с";
  get("flow-arrow").classList.toggle("flowing", current > 0.001);

  const width = parameters.tau * 8;
  const start = Math.max(0, time - width);
  const px = (t) => plot.left + (plot.right - plot.left) * (t - start) / width;
  const py = (i) => plot.bottom - (plot.bottom - plot.top) * i / parameters.limit;

  let lines = '<path class="chart-axis" d="M65 26V196H525"/><text x="15" y="19">I, А</text><text x="535" y="201">t, с</text>';
  for (let j = 0; j <= 4; j++) {
    const level = j / 4 * parameters.limit;
    const y = py(level);
    if (j > 0) lines += '<path class="chart-guide" d="M65 ' + y + 'H525"/>';
    lines += '<text x="57" y="' + (y + 5) + '" text-anchor="end">' + number.format(level) + '</text>';
  }
  for (let j = 0; j <= 4; j++) {
    const tick = start + width * j / 4;
    const x = px(tick);
    if (j > 0) lines += '<path class="chart-guide" d="M' + x + ' 26V196"/>';
    lines += '<text x="' + x + '" y="222" text-anchor="middle">' + number.format(tick) + '</text>';
  }
  grid.innerHTML = lines;
  curves.innerHTML = segments.map((part, index) => {
    const from = Math.max(part.time, start);
    const to = segments[index + 1]?.time ?? time;
    if (from >= to) return "";
    const points = Math.max(2, Math.ceil((to - from) / width * 160));
    let path = "";
    for (let j = 0; j <= points; j++) {
      const at = from + (to - from) * j / points;
      path += (j ? "L" : "M") + px(at).toFixed(2) + " " + py(currentAt(part, at)).toFixed(2);
    }
    return '<path class="chart-curve ' + (part.closed ? "is-powered" : "is-decaying") + '" d="' + path + '"/>';
  }).join("");
  cursor.setAttribute("cx", px(time));
  cursor.setAttribute("cy", py(current));
}

function showSwitch() {
  const closed = segments.at(-1).closed;
  toggle.textContent = closed ? "Разомкнуть ключ" : "Замкнуть ключ";
  get("switch-arm").setAttribute("d", closed ? "M200 89L144 58" : "M200 89L144 119");
  get("source-branch").classList.toggle("is-powered", closed);
  get("return-branch").classList.toggle("is-decaying", !closed);
  const load = get("load-branch");
  load.classList.toggle("is-powered", closed);
  load.classList.toggle("is-decaying", !closed);
  get("circuit-title").textContent = closed
    ? "Источник включён последовательно с резистором и катушкой"
    : "Источник отключён, катушка соединена с резистором";
}

function tick(now) {
  if (previousFrame === undefined) previousFrame = now;
  const seconds = Math.min((now - previousFrame) / 1000, 0.1);
  if (seconds < 1 / 40) {
    frame = requestAnimationFrame(tick);
    return;
  }
  previousFrame = now;
  const end = segments.at(-1).time + 8 * parameters.tau;
  time = Math.min(end, time + seconds * parameters.tau);
  while (segments.length > 1 && segments[1].time <= time - 8 * parameters.tau) segments.shift();
  draw();
  frame = time < end ? requestAnimationFrame(tick) : undefined;
}

function reset() {
  cancelAnimationFrame(frame);
  frame = undefined;
  previousFrame = undefined;
  const u = voltage.valueAsNumber;
  const r = resistance.valueAsNumber;
  const l = inductance.valueAsNumber;
  parameters = { u, r, tau: l / r, limit: u / r };
  time = 0;
  segments = [{ time, current: 0, closed: false }];
  get("rl-voltage-value").value = number.format(u) + " В";
  get("rl-resistance-value").value = number.format(r) + " Ом";
  get("rl-inductance-value").value = number.format(l) + " Гн";
  get("rl-tau").textContent = number.format(parameters.tau) + " с";
  stateLabel.textContent = "Ключ разомкнут. Тока нет.";
  showSwitch();
  draw();
}

toggle.addEventListener("click", () => {
  const prior = segments.at(-1);
  const current = currentAt(prior, time);
  const closed = !prior.closed;
  if (prior.time === time) segments.pop();
  segments.push({ time, current, closed });
  stateLabel.textContent = closed
    ? "Ключ замкнут. Источник подключён, ток растёт."
    : "Цепь источника разомкнута. Ток в контуре с резистором убывает.";
  showSwitch();
  draw();
  if (frame === undefined) {
    previousFrame = undefined;
    frame = requestAnimationFrame(tick);
  }
});

for (const control of [voltage, resistance, inductance]) {
  control.addEventListener("input", reset);
}
get("rl-reset").addEventListener("click", reset);
reset();
