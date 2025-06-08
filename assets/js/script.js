/**
 * HomeScreen Script 
 *
 * This script handles dynamic features for HomeScreen.
 * It follows functional programming principles and best practices.
 */

/* Update Footer Year */
function updateFooterYear() {
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

/* Scroll Reveal Functionality */
function revealOnScroll() {
  const reveals = document.querySelectorAll(".reveal");
  const windowHeight = window.innerHeight;
  const revealPoint = 150;
  reveals.forEach((element) => {
    const elementTop = element.getBoundingClientRect().top;
    if (elementTop < windowHeight - revealPoint) {
      element.classList.add("active");
    }
  });
}

/* Load Changelog via Fetch API */
function loadChangelog() {
  const container = document.getElementById("changelog-container");
  const btn = document.getElementById("changelog-button");

  // If never loaded, fetch and show
  if (!container.dataset.loaded) {
    fetch("changelog.html")
      .then(resp => {
        if (!resp.ok) throw new Error("Network response was not ok.");
        return resp.text();
      })
      .then(html => {
        container.innerHTML = html;
        container.style.display = "block";
        btn.textContent = "Hide Changelog";
        container.dataset.loaded = "true";
      })
      .catch(err => console.error("Error loading changelog:", err));
  } else {
    // Toggle already-loaded container
    if (container.style.display === "none") {
      container.style.display = "block";
      btn.textContent = "Hide Changelog";
    } else {
      container.style.display = "none";
      btn.textContent = "View Changelog";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateFooterYear();
  revealOnScroll();
  document
    .getElementById("changelog-button")
    .addEventListener("click", loadChangelog);
});


/* Scroll Event Listener */
window.addEventListener("scroll", revealOnScroll);
