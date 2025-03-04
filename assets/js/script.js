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
  fetch('changelog.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById("changelog-container").innerHTML = html;
    })
    .catch(err => console.error('Failed to load changelog:', err));
}

/* DOM Content Loaded Event */
document.addEventListener("DOMContentLoaded", function () {
  updateFooterYear();
  revealOnScroll();
});

/* Scroll Event Listener */
window.addEventListener("scroll", revealOnScroll);
