"use strict";

const get = (id) => document.getElementById(id);
const decimals = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const periodDigits = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const length = get("pendulum-length");
const count = get("pendulum-count");
const start = get("pendulum-start");
const record = get("pendulum-record");
const clear = get("pendulum-clear");
const status = get("pendulum-status");
const rows = get("pendulum-results");
const emptyRow = get("pendulum-empty");
const gravity = 9.81;
const initialAngle = 8;
const playbackRate = 4;
let frame;
let result;
const measurements = [];

function draw(angle) {
  const radius = 80 + 128 * (length.valueAsNumber - .25);
  const halfArc = initialAngle * Math.PI / 180;
  const dx = radius * Math.sin(halfArc);
  const bottom = 50 + radius * Math.cos(halfArc);
  get("pendulum-arc").setAttribute("d", "M" + (280 - dx) + " " + bottom + " A" + radius + " " + radius + " 0 0 0 " + (280 + dx) + " " + bottom);
  get("pendulum-string").setAttribute("y2", 50 + radius);
  get("pendulum-bob").setAttribute("cy", 50 + radius);
  get("pendulum-arm").setAttribute("transform", "rotate(" + angle + " 280 50)");
}

function updateInputs() {
  result = undefined;
  record.disabled = true;
  get("pendulum-length-value").value = decimals.format(length.valueAsNumber) + " м";
  get("pendulum-count-value").value = String(count.valueAsNumber);
  get("pendulum-time").textContent = "0 с";
  get("pendulum-cycles").textContent = "0";
  get("pendulum-period").textContent = "—";
  get("pendulum-gravity").textContent = "—";
  status.textContent = "Начальное отклонение 8°. Секундомер модели ускорен в 4 раза.";
  draw(initialAngle);
}

function unlock() {
  cancelAnimationFrame(frame);
  frame = undefined;
  length.disabled = count.disabled = false;
  start.textContent = "Запустить измерение";
}

function measure() {
  if (frame !== undefined) {
    unlock();
    updateInputs();
    status.textContent = "Измерение остановлено. Его можно запустить заново.";
    return;
  }

  updateInputs();
  length.disabled = count.disabled = true;
  start.textContent = "Остановить измерение";
  status.textContent = "Измерение идёт. Секундомер остановится после заданного числа колебаний.";
  const l = length.valueAsNumber;
  const n = count.valueAsNumber;
  const period = 2 * Math.PI * Math.sqrt(l / gravity);
  const finish = n * period;
  const quietMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let startedAt;

  function step(now) {
    startedAt ??= now;
    const time = Math.min(finish, (now - startedAt) / 1000 * playbackRate);
    const cycles = time === finish ? n : Math.floor(time / period);
    get("pendulum-time").textContent = decimals.format(time) + " с";
    get("pendulum-cycles").textContent = cycles + " из " + n;
    if (!quietMotion.matches) draw(initialAngle * Math.cos(time / period * 2 * Math.PI));
    if (time < finish) {
      frame = requestAnimationFrame(step);
      return;
    }
    unlock();
    const measured = Math.round(time * 100) / 100;
    const measuredPeriod = measured / n;
    const estimate = 4 * Math.PI ** 2 * l / measuredPeriod ** 2;
    result = { l, n, measured, measuredPeriod, estimate };
    get("pendulum-period").textContent = periodDigits.format(measuredPeriod) + " с";
    get("pendulum-gravity").textContent = decimals.format(estimate) + " м/с²";
    record.disabled = false;
    status.textContent = "Измерение завершено. Запиши результат и попробуй другую длину.";
  }

  frame = requestAnimationFrame(step);
}

start.addEventListener("click", measure);
for (const control of [length, count]) control.addEventListener("input", updateInputs);

record.addEventListener("click", () => {
  if (!result) return;
  const { l, n, measured, measuredPeriod, estimate } = result;
  measurements.push(estimate);
  emptyRow.remove();
  const row = rows.insertRow();
  for (const value of [measurements.length, decimals.format(l), n, decimals.format(measured), periodDigits.format(measuredPeriod), decimals.format(estimate)]) {
    row.insertCell().textContent = value;
  }
  get("pendulum-average").textContent = decimals.format(measurements.reduce((sum, value) => sum + value, 0) / measurements.length);
  record.disabled = true;
  clear.disabled = false;
  status.textContent = "Замер записан. Измени длину и повтори опыт.";
});

clear.addEventListener("click", () => {
  measurements.length = 0;
  rows.replaceChildren(emptyRow);
  get("pendulum-average").textContent = "—";
  clear.disabled = true;
});

updateInputs();
