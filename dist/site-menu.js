"use strict";

const menuButton = document.querySelector(".site-menu-toggle");
const menuHeader = menuButton.closest(".top");
const menuViewport = matchMedia("(max-width: 700px)");

function closeSiteMenu(returnFocus = false) {
  menuButton.setAttribute("aria-expanded", "false");
  if (returnFocus) menuButton.focus();
}

menuButton.addEventListener("click", () => {
  menuButton.setAttribute("aria-expanded", String(menuButton.getAttribute("aria-expanded") !== "true"));
});
document.addEventListener("click", (event) => {
  if (!menuHeader.contains(event.target)) closeSiteMenu();
});
menuHeader.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    event.preventDefault();
    closeSiteMenu(true);
  }
});
menuViewport.addEventListener("change", () => closeSiteMenu());
menuHeader.dataset.menuReady = "";
