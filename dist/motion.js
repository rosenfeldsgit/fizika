"use strict";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

if ("IntersectionObserver" in window && !reducedMotion.matches) {
  const entrance = new IntersectionObserver((entries) => {
    for (const { isIntersecting, target } of entries) {
      if (!isIntersecting) continue;
      entrance.unobserve(target);
      if (reducedMotion.matches || target.contains(document.activeElement)) continue;
      target.animate(
        [{ opacity: 0.65, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
        { duration: 300, easing: "ease-out" },
      );
    }
  }, { threshold: 0.13 });
  document.querySelectorAll(".catalog > .shell > .topic-list, .bench, .simulator, .section-page .lesson").forEach((element) => entrance.observe(element));
}
