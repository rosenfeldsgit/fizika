import { labs, number } from "./lab-models.js?v=grade11-1";
import { diagram } from "./lab-diagrams.js";
import { grade11 } from "./grade11-models.js";
import { diagram11 } from "./grade11-diagrams.js";

const main = document.querySelector("[data-lab]");
const senior = main.dataset.grade === "11";
const lab = (senior ? grade11 : labs).find(item => item.slug === main.dataset.lab);
const form = main.querySelector("#lab-settings");
const start = main.querySelector("#lab-start");
const record = main.querySelector("#lab-record");
const clear = main.querySelector("#lab-clear");
const status = main.querySelector("#lab-status");
const results = main.querySelector("#lab-results");
const summary = main.querySelector("#lab-summary");
const picture = main.querySelector("#lab-diagram");
const readouts = main.querySelector("#lab-readouts");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const rows = [];
const memory = new Map();
const settings = Object.fromEntries(lab.controls.map(control => [control.id, control.value]));
const controlGroups = new Map();
let pending;
let frame;

function makeElement(tag, label, className) {
  const element = document.createElement(tag);
  if (label) element.textContent = label;
  if (className) element.className = className;
  return element;
}

for (const control of lab.controls) {
  const id = "lab-setting-" + control.id;
  if (control.options) {
    const group = makeElement("fieldset", "", "lab-options");
    group.id = id;
    group.append(makeElement("legend", control.label));
    for (const [value, title] of control.options) {
      const input = makeElement("input");
      Object.assign(input, {type: "radio", name: control.id, value, checked: value === control.value});
      const label = makeElement("label");
      label.append(input, makeElement("span", title));
      input.addEventListener("change", () => {
        settings[control.id] = value;
        refreshSettings();
      });
      group.append(label);
    }
    controlGroups.set(control.id, group);
    form.append(group);
    continue;
  }
  const group = makeElement("div", "", "sim-slider");
  const label = makeElement("label", control.label);
  label.htmlFor = id;
  const input = makeElement("input");
  Object.assign(input, {id, type: "range", min: control.min, max: control.max, step: control.step, value: control.value});
  const output = makeElement("output");
  output.htmlFor = id;
  function showValue() {
    output.value = (number(input.valueAsNumber) + " " + control.unit).trim();
    input.setAttribute("aria-valuetext", output.value);
  }
  showValue();
  input.addEventListener("input", () => {
    settings[control.id] = input.valueAsNumber;
    showValue();
    refreshSettings();
  });
  group.append(label, output, input);
  controlGroups.set(control.id, group);
  form.append(group);
}

function draw(progress = 0) {
  picture.innerHTML = senior ? diagram11(lab.slug, settings, progress, rows, pending) : diagram(lab.slug, settings, progress);
}

function showResult(measurement) {
  const entries = (measurement?.cells ?? []).flatMap((value, index) => {
    if (value === "—") return [];
    const cell = makeElement("div");
    cell.append(makeElement("dt", lab.columns[index]), makeElement("dd", value));
    return [cell];
  });
  readouts.replaceChildren(...entries);
  readouts.hidden = entries.length === 0;
}

function updateJournal() {
  if (!rows.length) {
    const row = results.insertRow();
    const cell = row.insertCell();
    cell.colSpan = lab.columns.length + 1;
    cell.textContent = "Пока нет замеров.";
  }
  summary.textContent = lab.report?.(rows, settings) ?? (rows.length ? "Записано замеров: " + rows.length + "." : "");
  clear.disabled = !rows.length;
}

function refreshSettings() {
  if (frame) cancelAnimationFrame(frame);
  frame = undefined;
  pending = undefined;
  start.disabled = false;
  record.disabled = true;
  for (const control of lab.controls) {
    if (control.mode) controlGroups.get(control.id).hidden = control.mode !== settings.mode;
  }
  if (lab.slug === "resistor-connections") controlGroups.get("circuit").disabled = settings.switch === "closed";
  status.textContent = "Сними показания при текущих настройках.";
  showResult();
  draw();
  if (rows.length) updateJournal();
}

function complete() {
  frame = undefined;
  pending = lab.measure(settings, {rows, memory});
  draw(1);
  showResult(pending);
  status.textContent = pending.message;
  start.disabled = false;
  record.disabled = pending.ready === false;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  if (start.disabled) return;
  pending = undefined;
  record.disabled = true;
  if (motion.matches) {
    complete();
    return;
  }
  start.disabled = true;
  status.textContent = "Идёт измерение…";
  showResult();
  const begin = performance.now();
  function animate(now) {
    const progress = Math.min(1, (now - begin) / (lab.duration ?? 420));
    if (progress === 1) complete();
    else {
      draw(progress);
      frame = requestAnimationFrame(animate);
    }
  }
  frame = requestAnimationFrame(animate);
});

record.addEventListener("click", () => {
  if (!pending || pending.ready === false) return;
  if (!rows.length) results.replaceChildren();
  rows.push(pending);
  const row = results.insertRow();
  const heading = makeElement("th", String(rows.length));
  heading.scope = "row";
  row.append(heading);
  for (const value of pending.cells) row.insertCell().textContent = value;
  pending = undefined;
  record.disabled = true;
  status.textContent = "Замер № " + rows.length + " записан.";
  if (senior && lab.slug === "magnetic-field-on-current") draw(1);
  updateJournal();
});

clear.addEventListener("click", () => {
  rows.length = 0;
  memory.clear();
  results.replaceChildren();
  refreshSettings();
  updateJournal();
  status.textContent = "Журнал и промежуточные замеры очищены.";
});

refreshSettings();
updateJournal();
