"use strict";

const topics = [
  {
    title: "Механика",
    chapters: ["Кинематика", "Динамика", "Законы сохранения"],
    terms: "ускорение скорость движение импульс энергия сила ньютон кинетика",
    symbol: "M2 25h65 M9 23Q31 -8 60 23",
  },
  {
    title: "Молекулярная физика",
    chapters: ["МКТ", "Термодинамика", "Изопроцессы"],
    terms: "молекула идеальный газ температура давление объём внутренняя энергия",
    symbol: "M2 14h65 M5 24q8 -22 16 0t16 0t16 0t16 0",
  },
  {
    title: "Электродинамика",
    chapters: ["Поля", "Электрические цепи", "Индукция"],
    terms: "электричество ток заряд напряжение сопротивление закон ома магнитное поле",
    symbol: "M7 25c14 -21 42 -21 56 0 M34 28V5 M24 15h20",
  },
  {
    title: "Колебания, волны и оптика",
    chapters: ["Колебания", "Интерференция", "Линзы"],
    terms: "линза линзы тонкая фокус свет преломление дифракция",
    symbol: "M2 16h65 M34 2q17 13 0 28q-17 -15 0 -28 M9 6l50 20",
    hasDemo: true,
  },
  {
    title: "Квантовая физика",
    chapters: ["Фотоэффект", "Атом", "Ядро"],
    terms: "фотон квант атомная ядерная радиоактивность",
    symbol: "M6 25h55 M14 15h45 M22 5h34 M42 6v17",
  },
];

const byId = (id) => document.getElementById(id);
const svgNS = "http://www.w3.org/2000/svg";
const centimeters = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const formatDistance = (value) => centimeters.format(value) + " см";

function svgElement(tag, attributes) {
  const element = document.createElementNS(svgNS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  return element;
}

const material = byId("material");
const materialContent = byId("material-content");
const materialClose = material.querySelector(".close");

function showMaterial(kicker, title, content) {
  byId("material-kicker").textContent = kicker;
  byId("material-title").textContent = title;
  materialContent.replaceChildren(content);
  if (!material.open) material.showModal();
  material.scrollTop = 0;
  materialClose.focus({ preventScroll: true });
}

function openTopic(topic) {
  const content = document.createDocumentFragment();
  const intro = document.createElement("p");
  intro.textContent = topic.hasDemo
    ? "Открой пример конспекта со схемой и формулой."
    : "Конспекты, опыты и лабораторные работы для этого раздела готовятся.";
  content.append(intro);
  if (topic.hasDemo) {
    const noteButton = document.createElement("button");
    noteButton.className = "pill primary";
    noteButton.type = "button";
    noteButton.textContent = "Конспект «Тонкая линза»";
    noteButton.addEventListener("click", () => {
      showMaterial("Конспект · Оптика", "Тонкая линза", byId("lens-note").content.cloneNode(true));
    });
    content.append(noteButton);
  }
  const chapters = document.createElement("ul");
  for (const chapter of topic.chapters) {
    const item = document.createElement("li");
    item.textContent = chapter;
    chapters.append(item);
  }
  content.append(chapters);
  showMaterial("Раздел атласа", topic.title, content);
}

materialClose.addEventListener("click", () => material.close());
material.addEventListener("click", (event) => {
  if (event.target === material || event.target.closest("[data-close-dialog]")) material.close();
});

const slogan = byId("slogan-word");
const sloganWords = ["понять", "увидеть", "почувствовать"];
const sloganColors = ["#6493ff", "#ff8a26", "#a96bff"];
const quietMotion = matchMedia("(prefers-reduced-motion: reduce)");
let sloganIndex = 0;
let sloganTimer;

function scheduleSlogan() {
  clearInterval(sloganTimer);
  if (quietMotion.matches || document.hidden) return;
  sloganTimer = setInterval(() => {
    sloganIndex = (sloganIndex + 1) % sloganWords.length;
    slogan.textContent = sloganWords[sloganIndex];
    slogan.parentElement.style.setProperty("--word-accent", sloganColors[sloganIndex]);
    slogan.animate([{ opacity: 0, transform: "translateY(.16em)" }, { opacity: 1, transform: "none" }], {
      duration: 280, easing: "ease-out",
    });
  }, 3400);
}

quietMotion.addEventListener("change", scheduleSlogan);
document.addEventListener("visibilitychange", scheduleSlogan);
scheduleSlogan();

const normalize = (value) => value.toLowerCase().replaceAll("ё", "е").trim();
const rows = topics.map((topic, index) => {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "topic-row";
  button.setAttribute("aria-haspopup", "dialog");

  const number = document.createElement("span");
  number.className = "topic-number";
  number.textContent = String(index + 1).padStart(2, "0");
  number.setAttribute("aria-hidden", "true");

  const title = document.createElement("span");
  title.className = "topic-name";
  title.textContent = topic.title;
  const description = document.createElement("span");
  description.className = "topic-description";
  description.textContent = topic.chapters.join(" · ");

  const motif = svgElement("svg", { class: "motif", viewBox: "0 0 70 32", "aria-hidden": "true" });
  motif.append(svgElement("path", { d: topic.symbol, fill: "none", stroke: "currentColor", "stroke-width": 1.35, "stroke-linecap": "round" }));
  const chevron = document.createElement("span");
  chevron.className = "chevron";
  chevron.setAttribute("aria-hidden", "true");
  button.append(number, title, description, motif, chevron);
  button.addEventListener("click", () => openTopic(topic));
  item.append(button);
  byId("topic-list").append(item);
  return { item, text: normalize([topic.title, ...topic.chapters, topic.terms].join(" ")) };
});

byId("topic-search").addEventListener("input", (event) => {
  const words = normalize(event.target.value).split(/\s+/);
  let visible = 0;
  for (const { item, text } of rows) {
    item.hidden = !words.every((word) => text.includes(word));
    if (!item.hidden) visible++;
  }
  byId("no-results").hidden = visible > 0;
  byId("topic-list").hidden = visible === 0;
});

const distanceInput = byId("distance");
const focusInput = byId("focus");
const diagram = byId("ray-diagram");

function renderLens() {
  const distance = distanceInput.valueAsNumber;
  const focus = focusInput.valueAsNumber;
  const atFocus = distance === focus;
  const image = atFocus ? Infinity : (focus * distance) / (distance - focus);
  const virtual = image < 0;

  const center = 400;
  const axis = 112;
  const unit = 264 / Math.max(distance, 2 * focus, Math.min(Math.abs(image), 70));
  const x = (value) => center + value * unit;
  const height = 5;
  const tip = axis - height * unit;
  const objectX = x(-distance);
  const imageX = x(image);
  const imageTip = axis + height * unit * image / distance;
  const right = 800;
  const centralRay = (pixel) => axis + height * (pixel - center) / distance;
  const parallelRay = (pixel) => tip + height * (pixel - center) / focus;

  const rayPaths = [
    svgElement("path", { d: "M " + objectX + " " + tip + " H " + center + " L " + right + " " + parallelRay(right) }),
    svgElement("path", { d: "M " + objectX + " " + tip + " L " + right + " " + centralRay(right) }),
  ];
  if (virtual) {
    rayPaths.push(svgElement("path", {
      d: "M " + center + " " + tip + " L " + imageX + " " + imageTip +
        " M " + center + " " + axis + " L " + imageX + " " + imageTip,
      "stroke-dasharray": "5 5",
      opacity: .62,
    }));
  }
  byId("rays").replaceChildren(...rayPaths);

  function arrow(px, py, isVirtual = false) {
    const head = py < axis ? 6 : -6;
    const path = svgElement("path", {
      d: "M " + px + " " + axis + " V " + py +
        " m -5 " + head + " l 5 " + (-head) + " l 5 " + head,
    });
    if (isVirtual) path.setAttribute("stroke-dasharray", "4 3");
    return path;
  }

  const arrows = [arrow(objectX, tip)];
  if (!atFocus) arrows.push(arrow(imageX, imageTip, virtual));
  byId("objects").replaceChildren(...arrows);
  const focalPoints = [-focus, focus].flatMap((value) => {
    const point = x(value);
    const label = svgElement("text", { x: point, y: axis + 24, "text-anchor": "middle" });
    label.textContent = "F";
    return [svgElement("circle", { cx: point, cy: axis, r: 3 }), label];
  });
  byId("focal-points").replaceChildren(...focalPoints);

  const distanceText = atFocus ? "На бесконечности" : formatDistance(Math.abs(image));
  const description = atFocus
    ? "После линзы лучи параллельны"
    : virtual ? "Мнимое, прямое" : "Действительное, перевёрнутое";
  byId("distance-value").value = formatDistance(distance);
  byId("focus-value").value = formatDistance(focus);
  byId("image-distance").value = distanceText;
  byId("image-type").textContent = description;
  diagram.setAttribute("aria-label", "Ход лучей через собирающую линзу. " + description + ".");

  for (const input of [distanceInput, focusInput]) {
    const progress = 100 * (input.valueAsNumber - Number(input.min)) / (Number(input.max) - Number(input.min));
    input.style.setProperty("--position", progress + "%");
    input.setAttribute("aria-valuetext", formatDistance(input.valueAsNumber));
  }
}

distanceInput.addEventListener("input", renderLens);
focusInput.addEventListener("input", renderLens);
renderLens();

const canvas = byId("wave-canvas");
const context = canvas.getContext("2d");
const waveColors = ["#2110ef", "#003dff", "#006bff", "#00bfff", "#6900ff", "#ab00ff", "#f400bb", "#ff0040", "#ff3100", "#ff721c"];

if (context) {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const points = [];
  for (let ring = 0; ring < 47; ring++) {
    const v = ring / 46 * 2 * Math.PI;
    for (let step = 0; step < 160; step++) {
      const u = step / 160 * 2 * Math.PI;
      const lit = .44 + .34 * Math.sin(u + 1.15) + .20 * Math.cos(v - u * .75) + .11 * Math.sin(3 * u + v * 2);
      points.push({ u, v, tone: Math.max(0, Math.min(9, Math.floor(lit * 10))) });
    }
  }

  function drawWave(phase = 0) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const pixelRatio = Math.min(devicePixelRatio, 2);
    const pixelsWide = Math.round(width * pixelRatio);
    const pixelsTall = Math.round(height * pixelRatio);
    if (canvas.width !== pixelsWide || canvas.height !== pixelsTall) {
      canvas.width = pixelsWide;
      canvas.height = pixelsTall;
    }
    const scale = Math.min(width / 671, height / 510);
    context.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, pixelsWide / 2, pixelsTall / 2);
    context.clearRect(-width / (2 * scale), -height / (2 * scale), width / scale, height / scale);
    const groups = waveColors.map(() => new Path2D());
    for (const { u, v, tone } of points) {
      const radius = 235 + 75 * Math.cos(v) + 29 * Math.sin(3 * u + v + phase);
      const x0 = radius * Math.cos(u);
      const y0 = .66 * radius * Math.sin(u) + 72 * Math.sin(v) + 48 * Math.sin(2 * u + v * .55 + phase);
      const x = .93 * x0 + .37 * y0;
      const y = -.37 * x0 + .93 * y0;
      groups[tone].moveTo(x, y);
      groups[tone].lineTo(x + .27, y);
    }
    context.lineCap = "round";
    for (const [index, path] of groups.entries()) {
      context.strokeStyle = waveColors[index];
      context.lineWidth = 1.15 + index * .13;
      context.stroke(path);
    }
  }

  let animation = 0;
  let visible = false;
  let lastDraw = 0;
  function tick(now) {
    if (now - lastDraw > 48) {
      drawWave(Math.sin(now / 2600) * .36);
      lastDraw = now;
    }
    animation = requestAnimationFrame(tick);
  }

  function updateMotion() {
    cancelAnimationFrame(animation);
    if (visible && !reducedMotion.matches && !document.hidden) {
      animation = requestAnimationFrame(tick);
    } else if (reducedMotion.matches) {
      drawWave();
    }
  }

  new ResizeObserver(() => drawWave()).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateMotion();
  }).observe(canvas);
  reducedMotion.addEventListener("change", updateMotion);
  document.addEventListener("visibilitychange", updateMotion);
  drawWave();
}
