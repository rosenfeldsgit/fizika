"use strict";

const inductionNote = document.getElementById("rl-circuit");
let inductionSection;
mountTopicCatalog((topic) => {
  const item = document.createElement("li");
  const details = document.createElement("details");
  const control = document.createElement("summary");
  details.append(control);
  if (topic.hasInductionNote) {
    details.append(inductionNote);
    inductionSection = details;
  } else {
    const status = document.createElement("p");
    status.className = "theory-empty";
    status.textContent = "Конспекты для этого раздела готовятся.";
    details.append(status);
  }
  item.append(details);
  return { item, control };
});

function openLinkedNote() {
  if (location.hash === "#rl-circuit") {
    inductionSection.open = true;
    inductionNote.scrollIntoView();
  }
}
window.addEventListener("hashchange", openLinkedNote);
openLinkedNote();
