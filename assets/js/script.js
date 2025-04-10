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
  // Get the container where the changelog is shown
  const container = document.getElementById("changelog-container");

  // If the container is empty, fetch the changelog HTML from changelog.html
  if (container.innerHTML.trim() === "") {
    fetch("changelog.html")
      .then(response => {
        if (!response.ok) {
          throw new Error("Network response was not ok.");
        }
        return response.text();
      })
      .then(data => {
        container.innerHTML = data;
        // Ensure the container is visible after loading
        container.style.display = "block";
        // Optionally, change the button text (if desired)
        document.querySelector("button[onclick='loadChangelog()']").textContent = "Hide Changelog";
      })
      .catch(error => {
        console.error("Error loading changelog:", error);
      });
  } else {
    // If content is already loaded, toggle its display
    if (container.style.display === "none" || container.style.display === "") {
      container.style.display = "block";
      document.querySelector("button[onclick='loadChangelog()']").textContent = "Hide Changelog";
    } else {
      container.style.display = "none";
      document.querySelector("button[onclick='loadChangelog()']").textContent = "View Changelog";
    }
  }
}

/* DOM Content Loaded Event */
document.addEventListener("DOMContentLoaded", function () {
  updateFooterYear();
  revealOnScroll();
});

/* Scroll Event Listener */
window.addEventListener("scroll", revealOnScroll);
