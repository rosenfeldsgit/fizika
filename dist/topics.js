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
    hasInductionNote: true,
    chapters: ["Поля", "Электрические цепи", "Индукция"],
    terms: "электричество ток заряд напряжение сопротивление закон ома магнитное поле самоиндукция катушка",
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

function svgElement(tag, attributes) {
  const element = document.createElementNS(svgNS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  return element;
}

const normalize = (value) => value.toLowerCase().replaceAll("ё", "е").trim();
function mountTopicCatalog(createTopic) {
  const rows = topics.map((topic, index) => {
    const { item, control } = createTopic(topic);
    control.className = "topic-row";

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
    control.append(number, title, description, motif, chevron);
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
}
