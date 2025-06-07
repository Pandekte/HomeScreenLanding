/**
 * HomeScreen Script 
 *
 * This script handles dynamic features for HomeScreen.
 * It follows functional programming principles and best practices.
 */

const THEME_STORAGE_KEY = 'homescreen-theme-preference'; // Use a specific key

/* --- Theme Management --- */

const applyTheme = (theme) => {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-theme', isDark);
  updateThemeToggleButton(isDark);
};

const updateThemeToggleButton = (isDark) => {
  const toggleButton = document.getElementById('theme-toggle');
  if (toggleButton) {
    const icon = toggleButton.querySelector('i');
    if (icon) {
      icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
    toggleButton.setAttribute('aria-pressed', isDark);
  }
};

const getPreferredTheme = () => {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme) {
    return storedTheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const setupThemeToggle = () => {
  const toggleButton = document.getElementById('theme-toggle');
  if (!toggleButton) return;

  toggleButton.addEventListener('click', () => {
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        applyTheme(event.matches ? 'dark' : 'light');
    }
  });
};

/* --- Other Functions --- */

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

/* Changelog Toggle Functionality (Adjusted to work with CSS classes) */
function setupChangelogToggle() {
    const btn = document.getElementById("changelog-button");
    const container = document.getElementById("changelog-container");

    if (!btn || !container) {
        console.warn("Changelog button or container not found. Skipping setup.");
        return;
    }

    // Initial state check based on CSS class
    const isInitiallyHidden = container.classList.contains("changelog-hidden");
    btn.innerHTML = isInitiallyHidden
        ? '<i class="fas fa-history"></i> View Changelog'
        : '<i class="fas fa-times"></i> Hide Changelog';

    btn.addEventListener("click", () => {
        const isHidden = container.classList.toggle("changelog-hidden");
        container.classList.toggle("changelog-visible", !isHidden);

        // Update button text/icon based on new state
        btn.innerHTML = isHidden
            ? '<i class="fas fa-history"></i> View Changelog'
            : '<i class="fas fa-times"></i> Hide Changelog';
    });
}

/* --- Initialization --- */
document.addEventListener("DOMContentLoaded", () => {
  // Apply initial theme first
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  updateFooterYear();
  revealOnScroll(); // Initial check

  // Setup changelog toggle
  setupChangelogToggle();

  // Setup theme toggle
  setupThemeToggle();

  document
    .getElementById("changelog-button")
    .addEventListener("click", loadChangelog);
});

/* Scroll Event Listener (Debounced) */
let scrollTimeout;
window.addEventListener("scroll", () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(revealOnScroll, 50);
});
