// scripts/main.js

// Check if 'browser' is undefined and assign 'chrome' if necessary
if (typeof browser === "undefined") {
  var browser = chrome;
}

function initializeImportFeature() {
  // Add event listener to the browser bookmarks import button
  const importBrowserBtn = document.getElementById('importBrowserBookmarks');
  if (importBrowserBtn) {
    importBrowserBtn.addEventListener('click', importBrowserBookmarks);
  }
  addImportOption();
}

// Helper: safely attach event listener if element exists.
function safeAddEventListener(id, eventName, handler) {
  const el = getElement(id);
  if (el) {
    el.addEventListener(eventName, handler);
  } else {
    console.warn(`safeAddEventListener: Element with id "${id}" not found.`);
  }
}

/**
 * Loads custom filter settings from localStorage
 */
async function loadCustomFilterSettings() {
  try {
    // Load the custom filters enabled flag
    const storedEnabled = localStorage.getItem(ENABLE_CUSTOM_FILTERS_KEY);
    customFiltersEnabled = storedEnabled === 'true';
    
    // Load custom filters array
    const storedFilters = localStorage.getItem('customFilters');
    if (storedFilters) {
      customFilters = JSON.parse(storedFilters);
    } else {
      customFilters = [];
    }
    
    console.log('Custom filter settings loaded:', { customFiltersEnabled, customFilters });
  } catch (error) {
    console.warn('Failed to load custom filter settings:', error);
    customFiltersEnabled = false;
    customFilters = [];
  }
}

/**
 * Initializes custom filters UI components and state
 */
function initializeCustomFiltersUI() {
  try {
    // Initialize any UI elements related to custom filters
    // This is a placeholder implementation
    console.log('Custom filters UI initialized');
    
    // If there are UI elements for custom filters, they would be initialized here
    // For now, this is a minimal implementation to prevent errors
  } catch (error) {
    console.warn('Failed to initialize custom filters UI:', error);
  }
}

// 1.0 EVENT LISTENER
document.addEventListener("DOMContentLoaded", initializeApp);
let currentFilter = null;
let isBulkSelectionMode = false;
let customFilters = []; // Global state for custom filters
let customFiltersEnabled = false; // Global state for feature flag
const ENABLE_CUSTOM_FILTERS_KEY = "enableCustomFilters"; // Storage key for the flag
let isAssignFilterMode = false; // Global state for assign mode
let assignFilterId = null; // ID of the filter being assigned

/// 1.1 INITIALIZE APPLICATION

/**
 * Initializes the application by rendering bookmarks, setting up event listeners,
 * initializing settings, and loading the to-do list.
 */
// initializeApp needs to be async because it calls renderPinnedFolders
async function initializeApp() {
  // Load custom filter settings early
  await loadCustomFilterSettings();

  await renderBookmarks(); // Use await here
  setupEventListeners();
  initializeSettings(); // This might call applySettings which needs filter state
  loadBookmarkOpeningSetting();
  initializeToDoList();
  initializeVisibilitySettings();
  // applySettings(); // applySettings might be better called after all initial loads
  await initializeDefaultFolder(); // Add call to new initialization function
  await renderPinnedFolders(); // Await the async call
  initializeImportFeature();
  ensureDragDropCompatibility();
  setupBackgroundSettings();
  initializeCustomFiltersUI(); // Initialize filter UI elements and state

  // Apply settings last, after all data/states are loaded
  applySettings();


  const showBookmarkFlags = localStorage.getItem("showIndicators") !== "false";
  getElement("showBookmarkFlags").checked = showBookmarkFlags;

  const currentFolderEl = getElement("currentFolderName");
  if (currentFolderEl) {
    currentFolderEl.addEventListener("dblclick", renameCurrentFolder);
  }
}

// New function to handle default folder and bookmarks creation
async function initializeDefaultFolder() {
  const folders = await getFolders();
  const defaultFolderName = "Default folder";

  // Check if the default folder already exists
  if (!folders[defaultFolderName]) {
    console.log("Creating Default folder and adding predefined bookmarks.");
    folders[defaultFolderName] = { bookmarks: [] };

    const defaultBookmarks = [
      { label: "Google", url: "https://www.google.com" },
      { label: "YouTube", url: "https://www.youtube.com" },
      { label: "Facebook - log in or sign up", url: "https://www.facebook.com" },
      { label: "Instagram", url: "https://www.instagram.com" },
      { label: "WhatsApp | Secure and Reliable Free Private Messaging and Calling", url: "https://www.whatsapp.com" },
      { label: "Wikipedia, the free encyclopedia", url: "https://www.wikipedia.org" },
      { label: "ChatGPT", url: "https://chat.openai.com/" },
      { label: "reddit", url: "https://www.reddit.com" },
      { label: "Yahoo | Mail, Weather, Search, Politics, News, Finance, Sports & Videos", url: "https://www.yahoo.com" }
    ];

    defaultBookmarks.forEach(bm => {
      folders[defaultFolderName].bookmarks.push({
        label: bm.label,
        url: bm.url,
        flags: 0, // Default flags
        favicon: null, // Favicon will be fetched later
        id: Date.now() + Math.random() // Simple unique ID
      });
    });

    await setFolders(folders); // Save the new folder and bookmarks
    await toggleFolderPin(defaultFolderName); // Pin the folder

    // Optionally, set the current folder to the new default folder if no current folder is set
    let currentFolder = await getCurrentFolder();
    if (!currentFolder) {
      await setCurrentFolder(defaultFolderName);
    }
     // Re-render bookmarks and pinned folders after creation
    await renderPinnedFolders();
    await renderBookmarks(); // Use await here
  }
}

/// 1.2 SETUP EVENT LISTENERS

/**
 * Sets up all event listeners for the application.
 */
function setupEventListeners() {
  // Filter buttons
  safeAddEventListener("showStarredBtn", "click", () => setFilter("starred", "showStarredBtn"));
  safeAddEventListener("showNotStarredBtn", "click", () => setFilter("notstarred", "showNotStarredBtn"));
  safeAddEventListener("showEyeBtn", "click", () => setFilter("eye", "showEyeBtn"));
  safeAddEventListener("showBookBtn", "click", () => setFilter("book", "showBookBtn"));
  
  // Reset filter
  safeAddEventListener("resetFiltersBtn", "click", () => {
    currentFilter = null;
    removeActiveFilterClass();
    applyFiltersAndSearch();
  });
  
  // Search functionality
  safeAddEventListener("search-input", "input", handleSearch);
  safeAddEventListener("search-clear", "click", () => {
    const searchEl = getElement("search-input");
    if (searchEl) { 
      searchEl.value = "";
      handleSearch();
    }
  });
  safeAddEventListener("search-input", "keyup", (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  });

  // Filters & Add Bookmark
  safeAddEventListener("filterAllFolders", "change", applyFiltersAndSearch);
  safeAddEventListener("addBookmarkButton", "click", addBookmark);
  safeAddEventListener("exportBookmarks", "click", exportBookmarks);
  
  // Import bookmarks
  safeAddEventListener("importBookmarksButton", "click", () => {
    const fileInput = getElement("file-input");
    if (fileInput) fileInput.click();
  });
  safeAddEventListener("file-input", "change", importBookmarks);
  
  // Clear all bookmarks
  safeAddEventListener("clearAllBookmarksSetting", "click", clearAllBookmarks);
  
  // Settings and ToDo List
  safeAddEventListener("SettingsBookmarksButton", "click", showSettingsModal);
  safeAddEventListener("saveSettingsButton", "click", saveSettings);
  safeAddEventListener("saveDisplaySettingsButton", "click", saveSettings);
  safeAddEventListener("addToDoButton", "click", addToDoItem);
  safeAddEventListener("clearToDoButton", "click", clearToDoList);
  safeAddEventListener("restoreToDoButton", "click", restoreToDoList);
  
  // Folder management
  safeAddEventListener("switchFolderButton", "click", showFolderSelector);
  safeAddEventListener("addFolderButton", "click", addFolder);
  safeAddEventListener("newFolderName", "keyup", (e) => {
    if (e.key === "Enter") addFolder();
  });
  safeAddEventListener("closeFolderModal", "click", closeFolderModal);
  
  // For the settings modal close button, attach our custom handler.
  safeAddEventListener("closeSettingsModal", "click", function (e) {
    if (settingsChanged()) {
      getElement("saveSettingsPopup").classList.add("active");
      getElement("modalOverlay").classList.add("active");
    } else {
      closeSettingsModalInternal();
    }
  });
  // Internal function to close settings modal.
  function closeSettingsModalInternal() {
    const settingsModal = getElement("settingsModal");
    const modalOverlay = getElement("modalOverlay");
    if (settingsModal) settingsModal.classList.remove("active");
    if (modalOverlay) modalOverlay.classList.remove("active");
  }

  // Confirmation buttons
  safeAddEventListener("confirmSaveButton", "click", function() {
    saveSettings();
    const savePopup = getElement("saveSettingsPopup");
    if (savePopup) savePopup.classList.remove("active");
  });
  safeAddEventListener("cancelSaveButton", "click", function() {
    closeSettingsModalInternal();
    const savePopup = getElement("saveSettingsPopup");
    if (savePopup) savePopup.classList.remove("active");
  });

  // Sidebar resizing and storage event
  initializeSidebarResizing();
  window.addEventListener("storage", handleStorageChange);

  safeAddEventListener("restoreDefaultButtonColor", "click", restoreDefaultButtonColor);
  initializeSettingsTabs();

  // Randomize fallback button
  safeAddEventListener("randomizeFallbackButton", "click", () => {
    clearAllFallbackColors();
    renderBookmarks();
    alert("Fallback icons randomized.");
  });

  setupEnterKeyListeners();
  setupBulkMoveListeners();

  // Custom Filter Listeners (will be added in initializeCustomFiltersUI)
  // safeAddEventListener("enableCustomFilters", "change", handleEnableCustomFiltersToggle);
  // safeAddEventListener("addFilterButton", "click", addCustomFilter);
  // safeAddEventListener("newFilterName", "keyup", (e) => {
  //   if (e.key === "Enter") addCustomFilter();
  // });

  // Assign Filter Mode Button Listener (added here for clarity)
  safeAddEventListener("assignFilterModeBtn", "click", handleAssignFilterClick);
}

/**
 * Sets up event listeners for bulk selection and move operations
 */
function setupBulkMoveListeners() {
  const bulkSelectToggleBtn = getElement("bulkSelectToggleBtn");
  if (bulkSelectToggleBtn) {
    bulkSelectToggleBtn.addEventListener("click", toggleBulkSelectionMode);
  }

  const bulkMoveBtn = getElement("bulkMoveBtn");
  if (bulkMoveBtn) {
    bulkMoveBtn.addEventListener("click", handleBulkMoveAction);
  }

  const openMoveModalBtn = getElement("openMoveModalBtn");
  if (openMoveModalBtn) {
    openMoveModalBtn.addEventListener("click", () => {
      const selectedBookmarks = getSelectedBookmarks();
      if (selectedBookmarks.length > 0) {
        openMoveBookmarkModal(selectedBookmarks);
        isBulkSelectionMode = false;
        updateMoveModalTriggerVisibility();
        renderBookmarks();
      } else {
        showToast("Please select at least one bookmark before opening the modal.");
      }
    });
  }

  const cancelSelectionBtn = getElement("cancelSelectionBtn");
  if (cancelSelectionBtn) {
    cancelSelectionBtn.addEventListener("click", () => {
     unselectAllBookmarks();
      isBulkSelectionMode = false;
      renderBookmarks();
      updateMoveModalTriggerVisibility();
    });
}

}

/**
 * Handles the bulk move button action based on current selection mode
 */
function handleBulkMoveAction() {
  const moveModalTriggerContainer = getElement("moveModalTriggerContainer");
  const moveModalBtn = getElement("openMoveModalBtn");
  const bulkMoveBtn = getElement("bulkMoveBtn");

  if (!isBulkSelectionMode) {
    // Enter bulk selection mode
    isBulkSelectionMode = true;
    bulkMoveBtn.textContent = "Confirm Move";
    renderBookmarks();
    
    // Show move controls
    if (moveModalTriggerContainer) moveModalTriggerContainer.style.display = "block";
    if (moveModalBtn) moveModalBtn.style.display = "inline-block";
  } else {
    // Process selected bookmarks
    const selectedBookmarks = getSelectedBookmarks();
    if (selectedBookmarks.length > 0) {
      openMoveBookmarkModal(selectedBookmarks);
      
      // Exit bulk selection mode
      isBulkSelectionMode = false;
      bulkMoveBtn.textContent = "Bulk Move";
      renderBookmarks();

      // Hide move controls
      if (moveModalTriggerContainer) moveModalTriggerContainer.style.display = "none";
      if (moveModalBtn) moveModalBtn.style.display = "none";
    } else {
      showToast("Please select at least one bookmark before confirming move.");
    }
  }
}


/**
 * Utility function to get an element by ID.
 * @param {string} id - The ID of the element.
 * @returns {HTMLElement} The DOM element.
 */
function getElement(id) {
  return document.getElementById(id);
}

/**
 * Handles storage changes for settings synchronization across tabs.
 * @param {StorageEvent} event - The storage event.
 */
function handleStorageChange(event) {
  if (
    ["darkModeEnabled", "selectedBackground", "customBackground"].includes(
      event.key
    )
  ) {
    applySettings();
  }
}

/// 1.3 FOLDER MANAGEMENT

// BITMASK
// Bit indices
const BIT_FAVORITE = 0;
const BIT_READ = 1;
const BIT_PINNED = 2;

// Helper functions
function setBit(mask, bitIndex) {
  return mask | (1 << bitIndex);
}
function clearBit(mask, bitIndex) {
  return mask & ~(1 << bitIndex);
}
function hasBitSet(mask, bitIndex) {
  return (mask & (1 << bitIndex)) !== 0;
}

// Define icons
const STAR_OUTLINE = "☆"; // Unfilled
const STAR_FILLED = "★"; // Filled
const EYE_ICON = "👁️"; // "To be read"
const BOOK_ICON = "📚"; // "Read"

// Needs to be async as it calls renderFolderList
async function showFolderSelector() {
  const folderModal = getElement("folderModal");
  const modalOverlay = getElement("modalOverlay");
  const folderSearchInput = getElement("folderSearchInput");

  // Await the async call
  await renderFolderList(); 

  if (folderModal) folderModal.classList.add("active");
  if (modalOverlay) modalOverlay.classList.add("active");
  if (folderSearchInput) folderSearchInput.value = "";
}

/**
 * Pins every folder by adding them all to pinnedFolders.
 */
function pinAllFolders() {
  const folders = getFolders();
  const allFolderNames = folders.map((f) => f.name); // all names
  setPinnedFolders(allFolderNames);
  renderPinnedFolders();
  renderFolderList();
}

/**
 * Unpins all folders by clearing pinnedFolders array.
 */
function unpinAllFolders() {
  setPinnedFolders([]);
  renderPinnedFolders();
  renderFolderList();
}

function filterFolders() {
  const searchQuery = getElement("folderSearchInput").value.toLowerCase();
  const folderItems = document.querySelectorAll(".folder-item");

  folderItems.forEach((item) => {
    const folderName = item
      .querySelector(".folder-name")
      .textContent.toLowerCase();
    if (folderName.includes(searchQuery)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
}

// renderFolderList needs to be async because it calls createFolderListItem
async function renderFolderList() {
  const folders = await getFolders(); // Use await
  const currentFolder = await getCurrentFolder(); // Use await
  const folderListEl = getElement("folderList");

  // --- FIX: Add null check --- 
  if (!folderListEl) {
      console.warn("renderFolderList: folderList element not found.");
      return; // Exit if the list element doesn't exist
  }
  // --- End FIX ---

  folderListEl.innerHTML = "";
  // Use Promise.all to handle multiple async calls from createFolderListItem
  const listItems = await Promise.all(folders.map((folder, index) => 
    createFolderListItem(folder, currentFolder, index)
  ));
  listItems.forEach(li => folderListEl.appendChild(li));
  initializeFolderDragAndDrop();
  filterFolders(); // Assuming filterFolders is sync
}

// createFolderListItem needs to be async because it calls isFolderPinned and attaches an async listener
async function createFolderListItem(folder, currentFolder, index) {
  const li = document.createElement("li");
  li.className = `folder-item ${folder.name === currentFolder ? "active" : ""}`;
  li.setAttribute("data-folder-name", folder.name);
  li.setAttribute("data-index", index);
  li.draggable = true;

  const nameSpan = document.createElement("span");
  nameSpan.textContent = folder.name;
  nameSpan.className = "folder-name";
  nameSpan.addEventListener("click", () => {
    setCurrentFolder(folder.name);
    renderBookmarks();
    updateCurrentFolderName();
    closeFolderModal();
  });
  li.appendChild(nameSpan);

  const controlsDiv = document.createElement("div");
  controlsDiv.className = "folder-item-controls";

  // Pin button
  const pinButton = document.createElement("button");
  pinButton.className = "btn btn-sm btn-pin";
  // Await the async call to isFolderPinned
  pinButton.textContent = (await isFolderPinned(folder.name)) ? "★" : "☆"; 
  pinButton.title = (await isFolderPinned(folder.name)) ? "Unpin Folder" : "Pin Folder";
  // Make the listener async to call toggleFolderPin
  pinButton.addEventListener("click", async (e) => {
    e.stopPropagation(); // Prevent triggering nameSpan click
    await toggleFolderPin(folder.name);
    // Update button state immediately
    pinButton.textContent = (await isFolderPinned(folder.name)) ? "★" : "☆";
    pinButton.title = (await isFolderPinned(folder.name)) ? "Unpin Folder" : "Pin Folder";
    // No need to re-render the whole list, just the pinned section
    await renderPinnedFolders(); 
  });
  controlsDiv.appendChild(pinButton);

  // Edit button
  const editButton = document.createElement("button");
  editButton.textContent = "✏️";
  editButton.className = "btn btn-sm";
  editButton.addEventListener("click", (e) => {
    e.stopPropagation();
    editFolderName(index);
  });
  controlsDiv.appendChild(editButton);

  // Delete button
  const deleteButton = document.createElement("button");
  deleteButton.textContent = "🗑️";
  deleteButton.className = "btn btn-sm btn-danger";
  // Make the listener async to call deleteFolder
  deleteButton.addEventListener("click", async (e) => {
    e.stopPropagation();
    await deleteFolder(folder.name);
    // Note: deleteFolder already calls renderFolderList and renderPinnedFolders
  });
  controlsDiv.appendChild(deleteButton);

  li.appendChild(controlsDiv);

  return li;
}

async function editFolderName(index) { // Make async
  const folders = await getFolders(); // Use await
  const folder = folders[index];

  // --- FIX: Add check for undefined folder --- 
  if (!folder) {
      console.error(`editFolderName: Folder at index ${index} not found.`);
      alert("Error: Could not find the folder to edit.");
      return;
  }
  // --- End FIX ---

  const oldFolderName = folder.name;
  const newFolderName = prompt("Enter new folder name:", folder.name);
  if (newFolderName && newFolderName !== folder.name) {
    if (folders.some((f) => f.name === newFolderName)) {
      alert("A folder with that name already exists.");
      return;
    }
    folder.name = newFolderName;
    setFolders(folders);
    if (getCurrentFolder() === oldFolderName) {
      setCurrentFolder(newFolderName);
      updateCurrentFolderName();
    }

    // Update pinned folders
    let pinnedFolders = getPinnedFolders();
    const pinnedIndex = pinnedFolders.indexOf(oldFolderName);
    if (pinnedIndex !== -1) {
      pinnedFolders[pinnedIndex] = newFolderName;
      setPinnedFolders(pinnedFolders);
    }

    renderFolderList();
    renderPinnedFolders();
  }
}

// Make toggleFolderPin async
async function toggleFolderPin(folderName) {
  // Await the async getPinnedFolders
  const pinnedFolders = await getPinnedFolders();
  if (pinnedFolders.includes(folderName)) {
    // Unpin the folder
    const index = pinnedFolders.indexOf(folderName);
    pinnedFolders.splice(index, 1);
  } else {
    // Pin the folder
    pinnedFolders.push(folderName);
  }
  // Await the async setPinnedFolders
  await setPinnedFolders(pinnedFolders);
  // Re-render after modification
  // renderPinnedFolders() will fetch the updated list itself
  renderPinnedFolders(); // Needs to be awaited if it becomes async
}

// Needs to be async because it calls getPinnedFolders
async function renderPinnedFolders() {
  // Await the async call
  const pinnedFolders = await getPinnedFolders(); 
  const pinnedFoldersContainer = getElement("pinnedFolders");
  pinnedFoldersContainer.innerHTML = "";

  pinnedFolders.forEach((folderName, index) => {
    const button = document.createElement("button");
    button.className = "btn";
    button.textContent = folderName;
    button.addEventListener("click", () => {
      setCurrentFolder(folderName);
      renderBookmarks();
      updateCurrentFolderName();
    });

    // Set draggable attribute and data-index
    button.draggable = true;
    button.setAttribute("data-index", index);

    pinnedFoldersContainer.appendChild(button);
  });

  // Initialize drag and drop for pinned folders
  initializePinnedFoldersDragAndDrop();
}

// Needs to be async because it calls getPinnedFolders
async function isFolderPinned(folderName) {
  // Await the async call
  const pinnedFolders = await getPinnedFolders();
  return pinnedFolders.includes(folderName);
}

// Make getPinnedFolders async and use browser.storage.local
async function getPinnedFolders() {
  try {
    // Use browser.storage.local.get
    const data = await browser.storage.local.get("pinnedFolders");
    // Return the array or an empty array if not found
    return data.pinnedFolders || [];
  } catch (error) {
    console.error("Error getting pinned folders:", error);
    return []; // Return empty array on error
  }
}

// Make setPinnedFolders async and use browser.storage.local
async function setPinnedFolders(folders) {
  try {
    // Use browser.storage.local.set
    await browser.storage.local.set({ pinnedFolders: folders });
  } catch (error) {
    console.error("Error setting pinned folders:", error);
  }
}

// pinned-folder-btn drag
let draggedPinnedFolderIndex = null;

function initializePinnedFoldersDragAndDrop() {
  const pinnedFolderButtons = document.querySelectorAll(".pinned-folders .btn");
  pinnedFolderButtons.forEach((button) => {
    button.addEventListener("dragstart", handlePinnedFolderDragStart);
    button.addEventListener("dragover", handlePinnedFolderDragOver);
    button.addEventListener("drop", handlePinnedFolderDrop);
    button.addEventListener("dragend", handlePinnedFolderDragEnd);
  });
}

function handlePinnedFolderDragStart(event) {
  draggedPinnedFolderIndex = parseInt(
    event.currentTarget.getAttribute("data-index")
  );
  event.currentTarget.classList.add("dragging");
}

function handlePinnedFolderDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("over");
}

// handlePinnedFolderDrop needs to be async as it calls async functions
async function handlePinnedFolderDrop(event) {
  event.preventDefault();
  const targetIndex = parseInt(event.currentTarget.getAttribute("data-index"));
  // Await the async calls
  await movePinnedFolder(draggedPinnedFolderIndex, targetIndex);
  await renderPinnedFolders(); 
}

function handlePinnedFolderDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  document.querySelectorAll(".pinned-folders .btn.over").forEach((button) => {
    button.classList.remove("over");
  });
}

// Needs to be async because it calls get/set PinnedFolders
async function movePinnedFolder(originIndex, targetIndex) {
  // Await the async calls
  const pinnedFolders = await getPinnedFolders();
  const movedFolder = pinnedFolders.splice(originIndex, 1)[0];
  pinnedFolders.splice(targetIndex, 0, movedFolder);
  await setPinnedFolders(pinnedFolders);
}

// settings modal folder drag
function initializeFolderDragAndDrop() {
  const folderItems = document.querySelectorAll(".folder-item");
  folderItems.forEach((item) => {
    item.addEventListener("dragstart", handleFolderDragStart);
    item.addEventListener("dragover", handleFolderDragOver);
    item.addEventListener("drop", handleFolderDrop);
    item.addEventListener("dragend", handleFolderDragEnd);
  });
}

let draggedFolderIndex = null;

function handleFolderDragStart(event) {
  draggedFolderIndex = parseInt(event.currentTarget.getAttribute("data-index"));
  event.currentTarget.classList.add("dragging");
}

function handleFolderDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("over");
}

// Needs to be async as it calls renderFolderList
async function handleFolderDrop(event) {
  event.preventDefault();
  const targetIndex = parseInt(event.currentTarget.getAttribute("data-index"));
  // Assuming moveFolder remains sync for now
  moveFolder(draggedFolderIndex, targetIndex);
  // Await the async call
  await renderFolderList(); 
}

function handleFolderDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  document.querySelectorAll(".folder-item.over").forEach((item) => {
    item.classList.remove("over");
  });
}

function moveFolder(originIndex, targetIndex) {
  const folders = getFolders();
  const movedFolder = folders.splice(originIndex, 1)[0];
  folders.splice(targetIndex, 0, movedFolder);
  setFolders(folders);
}

// Needs to be async as it calls renderFolderList
async function addFolder() {
  const newFolderNameInput = getElement("newFolderName");
  const newFolderName = newFolderNameInput.value.trim();
  if (newFolderName) {
    // Assuming getFolders/setFolders remain sync
    const folders = getFolders();
    if (folders.some((f) => f.name === newFolderName)) {
      alert("A folder with that name already exists.");
      return;
    }
    folders.push({ name: newFolderName, bookmarks: [], children: [] });
    setFolders(folders);
    newFolderNameInput.value = "";
    // Await the async call
    await renderFolderList(); 
  }
}

// Needs to be async because it calls get/set PinnedFolders and potentially async render functions
async function deleteFolder(folderName) {
  if (confirm(`Are you sure you want to delete the folder "${folderName}"?`)) {
    let folders = getFolders(); // Assuming getFolders/setFolders remain sync for now
    folders = folders.filter((f) => f.name !== folderName);
    setFolders(folders);

    const currentFolder = getCurrentFolder(); // Assuming getCurrentFolder/setCurrentFolder remain sync
    if (currentFolder === folderName) {
      setCurrentFolder("Default");
      updateCurrentFolderName(); // Assuming this is sync
    }

    // Remove from pinned folders using await
    let pinnedFolders = await getPinnedFolders();
    pinnedFolders = pinnedFolders.filter((name) => name !== folderName);
    await setPinnedFolders(pinnedFolders);

    // Assuming renderBookmarks is sync, otherwise await
    renderBookmarks(); 
    // Assuming renderFolderList is sync, otherwise await
    renderFolderList(); 
    // Call the async renderPinnedFolders with await
    await renderPinnedFolders(); 
  }
}

function renameCurrentFolder() {
  const currentFolder = getCurrentFolder();
  const folders = getFolders();
  const folderIndex = folders.findIndex((f) => f.name === currentFolder);
  if (folderIndex !== -1) {
    editFolderName(folderIndex);
  }
}

/**
 * Updates the display of the current folder name.
 */
function updateCurrentFolderName() {
  getElement(
    "currentFolderName"
  ).textContent = `Current Folder: ${getCurrentFolder()}`;
}

/// 1.4 MODAL HANDLING

/**
 * Shows a modal dialog.
 * @param {string} modalId - The ID of the modal to show.
 */
function showModal(modalId) {
  const modal = getElement(modalId);
  modal.classList.add("active");
  getElement("modalOverlay").classList.add("active");
}

/**
 * Closes the folder modal.
 */
function closeFolderModal() {
  const folderModal = getElement("folderModal");
  const modalOverlay = getElement("modalOverlay");
  // --- FIX: Add null checks --- 
  if (folderModal) {
    folderModal.classList.remove("active");
  } else {
    // Log warning if needed, but avoid erroring out
    // console.warn("closeFolderModal: folderModal element not found.");
  }
  if (modalOverlay) {
    modalOverlay.classList.remove("active");
  } else {
    // console.warn("closeFolderModal: modalOverlay element not found.");
  }
  // --- End FIX ---
}

/**
 * Closes the settings modal.
 */
function closeSettingsModal() {
  const settingsModal = getElement("settingsModal");
  const modalOverlay = getElement("modalOverlay");
  // --- FIX: Add null checks --- 
  if (settingsModal) {
    settingsModal.classList.remove("active");
  } else {
    // console.warn("closeSettingsModal: settingsModal element not found.");
  }
  if (modalOverlay) {
    modalOverlay.classList.remove("active");
  } else {
    // console.warn("closeSettingsModal: modalOverlay element not found.");
  }
   // Also close the save confirmation popup if it exists
   const savePopup = getElement("saveSettingsPopup");
   if (savePopup) {
       savePopup.classList.remove("active");
   }
  // --- End FIX ---
}

/**
 * Shows the settings modal.
 */
function showSettingsModal() {
  updateSettingsInputs();
  const settingsModal = getElement("settingsModal");
  const modalOverlay = getElement("modalOverlay");

  // --- FIX: Add null checks --- 
  if (settingsModal) {
    settingsModal.classList.add("active");
  } else {
    console.warn("showSettingsModal: settingsModal element not found.");
  }
  if (modalOverlay) {
    modalOverlay.classList.add("active");
  } else {
    console.warn("showSettingsModal: modalOverlay element not found.");
  }
  // --- End FIX ---
}

// --- FIX: Guard overlay listener attachment --- 
const modalOverlayElement = getElement("modalOverlay");
if (modalOverlayElement) {
  // Close modal when clicking outside of it
  modalOverlayElement.addEventListener("click", function () {
    // Attempt to close both modals safely
    closeSettingsModal();
    closeFolderModal();
    // Close the save confirmation popup as well
    const savePopup = getElement("saveSettingsPopup");
    if (savePopup) {
      savePopup.classList.remove("active");
    }
  });
} else {
    // console.warn("Modal overlay element not found, cannot attach global close listener.");
}
// --- End FIX ---

// Initialize settings modal tab functionality
function initializeSettingsTabs() {
  const tabLinks = document.querySelectorAll('.settings-tabs .tab-link');
  const tabContents = document.querySelectorAll('.tab-content');
  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Remove 'active' from all tab links and tab contents
      tabLinks.forEach(l => l.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      // Activate the clicked tab link
      link.classList.add('active');
      // Activate the corresponding tab content
      const targetTabId = link.getAttribute('data-tab');
      const targetTab = document.getElementById(targetTabId);
      if (targetTab) {
        targetTab.classList.add('active');
      }
    });
  });
}

/// 1.5 TO-DO LIST

/**
 * Initializes the to-do list by rendering the current items.
 */
function initializeToDoList() {
  renderToDoList();
}

/**
 * Sidebar resize handle
 */

function initializeSidebarResizing() {
  const sidebar = getElement("sidebar");
  const mainContent = getElement("main-content");
  const resizeHandle = getElement("sidebar-resize-handle");

  let isResizing = false;

  resizeHandle.addEventListener("mousedown", function (e) {
    isResizing = true;
    document.body.classList.add("resizing");
  });

  document.addEventListener("mousemove", function (e) {
    if (!isResizing) return;

    const newWidth = e.clientX;
    const maxWidth = window.innerWidth * 0.9;
    const minWidth = 100;
    if (newWidth > minWidth && newWidth < maxWidth) {
      sidebar.style.width = newWidth + "px";
      mainContent.style.width = `calc(100% - ${newWidth}px)`;
    }
  });

  document.addEventListener("mouseup", function (e) {
    if (isResizing) {
      isResizing = false;
      document.body.classList.remove("resizing");

      // Save the width to localStorage
      localStorage.setItem("sidebarWidth", sidebar.style.width);
    }
  });
}

/**
 * Adds a new item to the to-do list.
 */
function addToDoItem() {
  const toDoInput = getElement("toDoInput");
  const toDoList = JSON.parse(localStorage.getItem("toDoList") || "[]");
  if (toDoInput.value.trim() !== "") {
    toDoList.push({ text: toDoInput.value, checked: false });
    localStorage.setItem("toDoList", JSON.stringify(toDoList));
    renderToDoList();
    toDoInput.value = "";
  }
}

/**
 * Renders the to-do list by creating DOM elements for each item.
 */
function renderToDoList() {
  const toDoList = JSON.parse(localStorage.getItem("toDoList") || "[]");
  const container = getElement("toDoListContainer");
  container.innerHTML = "";

  toDoList.forEach((item, index) => {
    const listItem = document.createElement("div");
    listItem.className = "todo-item";
    listItem.setAttribute("draggable", "true");
    listItem.setAttribute("data-index", index);

    // Drag events
    setupToDoDragAndDrop(listItem, index);

    // Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.checked;
    checkbox.addEventListener("change", () => toggleToDoItem(index));

    // Text Span
    const span = createToDoTextSpan(item);

    // Delete Button
    const deleteButton = document.createElement("button");
    deleteButton.innerHTML = "x";
    deleteButton.className = "btn btn-danger";
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteToDoItem(index);
    });

    listItem.appendChild(checkbox);
    listItem.appendChild(span);
    listItem.appendChild(deleteButton);
    container.appendChild(listItem);
  });
}

/**
 * Sets up drag-and-drop functionality for to-do items.
 * @param {HTMLElement} listItem - The to-do list item element.
 * @param {number} index - The index of the item.
 */
function setupToDoDragAndDrop(listItem, index) {
  listItem.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", index);
    listItem.classList.add("dragging");
  });

  listItem.addEventListener("dragover", (e) => {
    e.preventDefault();
    listItem.classList.add("over");
  });

  listItem.addEventListener("dragleave", () => {
    listItem.classList.remove("over");
  });

  listItem.addEventListener("drop", (e) => {
    e.preventDefault();
    const originIndex = e.dataTransfer.getData("text/plain");
    const targetIndex = index;
    moveToDoItem(originIndex, targetIndex);
    listItem.classList.remove("over");
  });

  listItem.addEventListener("dragend", () => {
    listItem.classList.remove("dragging");
  });
}

/**
 * Creates a text span for a to-do item.
 * @param {Object} item - The to-do item.
 * @returns {HTMLSpanElement} The text span element.
 */
function createToDoTextSpan(item) {
  const span = document.createElement("span");
  let isExpanded = false;
  const maxLength = 75;

  if (item.text.length > maxLength) {
    span.textContent = item.text.substring(0, maxLength) + "...";
    span.classList.add("truncated");
  } else {
    span.textContent = item.text;
  }

  if (item.checked) {
    span.style.textDecoration = "line-through";
  }

  span.addEventListener("click", () => {
    if (isExpanded) {
      span.textContent = item.text.substring(0, maxLength) + "...";
      isExpanded = false;
    } else {
      span.textContent = item.text;
      isExpanded = true;
    }
    if (item.checked) {
      span.style.textDecoration = "line-through";
    }
  });

  return span;
}

/**
 * Moves a to-do item within the list.
 * @param {number} originIndex - The original index of the item.
 * @param {number} targetIndex - The new index of the item.
 */
function moveToDoItem(originIndex, targetIndex) {
  const toDoList = JSON.parse(localStorage.getItem("toDoList") || "[]");
  const movedItem = toDoList.splice(originIndex, 1)[0];
  toDoList.splice(targetIndex, 0, movedItem);
  localStorage.setItem("toDoList", JSON.stringify(toDoList));
  renderToDoList();
}

/**
 * Toggles the completion state of a to-do item.
 * @param {number} index - The index of the item to toggle.
 */
function toggleToDoItem(index) {
  const toDoList = JSON.parse(localStorage.getItem("toDoList") || "[]");
  toDoList[index].checked = !toDoList[index].checked;
  localStorage.setItem("toDoList", JSON.stringify(toDoList));
  renderToDoList();
}

/**
 * Deletes a to-do item.
 * @param {number} index - The index of the item to delete.
 */
function deleteToDoItem(index) {
  const toDoList = JSON.parse(localStorage.getItem("toDoList") || "[]");
  toDoList.splice(index, 1);
  localStorage.setItem("toDoList", JSON.stringify(toDoList));
  renderToDoList();
}

/**
 * Clears all items from the to-do list after user confirmation.
 */
function clearToDoList() {
  if (confirm("Are you sure you want to clear the to-do list?")) {
    const toDoList = JSON.parse(localStorage.getItem("toDoList") || "[]");
    localStorage.setItem("lastClearedToDoList", JSON.stringify(toDoList));
    localStorage.removeItem("toDoList");
    renderToDoList();
  }
}

/**
 * Restores the last cleared to-do list.
 */
function restoreToDoList() {
  const lastClearedToDoList = JSON.parse(
    localStorage.getItem("lastClearedToDoList") || "[]"
  );
  if (lastClearedToDoList.length > 0) {
    localStorage.setItem("toDoList", JSON.stringify(lastClearedToDoList));
    renderToDoList();
  } else {
    alert("No recently cleared to-do list found.");
  }
}

/// 1.6 FAVICONS

/**
 * Ensures the URL uses HTTPS scheme for secure requests.
 * @param {string} url - The URL to secure.
 * @returns {string} The URL with HTTPS scheme.
 */

const ensureHttps = (url) => url.replace(/^http:\/\/|^\/\//i, "https://");

/**
 * Retrieves the favicon for a URL.
 * @param {string} url - The URL from which to fetch the favicon.
 * @returns {Promise<string>} A promise that resolves to the favicon's data URL.
 */
// Add an in‐memory cache for favicons for faster retrieval.
const faviconMemoryCache = {};

const getFavicon = async (url) => {
  // Check in‑memory cache first
  if (faviconMemoryCache[url]) {
    return faviconMemoryCache[url];
  }
  // Use a unique key for localStorage caching
  const cacheKey = `faviconCache:${url}`;
  let cachedFavicon = localStorage.getItem(cacheKey);
  if (cachedFavicon) {
    faviconMemoryCache[url] = cachedFavicon;
    return cachedFavicon;
  }

  const secureUrl = ensureHttps(url);
  const defaultFaviconURL = `${secureUrl}/favicon.ico`;
  // Attempt to fetch a favicon link from the HTML
  const faviconLink = await fetchFaviconLink(url);
  const fetchUrl = faviconLink ? faviconLink : defaultFaviconURL;
  const fetchedFavicon = await fetchAndCacheFavicon(fetchUrl);

  // Cache the result both in memory and in localStorage
  faviconMemoryCache[url] = fetchedFavicon;
  localStorage.setItem(cacheKey, fetchedFavicon);
  return fetchedFavicon;
};

/**
 * Generates a complex fallback favicon using 4 rectangular areas (2×2 grid)
 * based on the provided array of 4 colors.
 * @param {Array} colors - Array of 4 hex color strings.
 * @returns {string} The data URL of the generated image.
 */
function generateComplex4RectanglesDataUrl(colors) {
  const canvasSize = 80; // overall canvas size (80x80)
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d");
  
  const halfWidth = canvasSize / 2;
  const halfHeight = canvasSize / 2;
  
  // Top-left rectangle
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, halfWidth, halfHeight);
  // Top-right rectangle
  ctx.fillStyle = colors[1];
  ctx.fillRect(halfWidth, 0, halfWidth, halfHeight);
  // Bottom-left rectangle
  ctx.fillStyle = colors[2];
  ctx.fillRect(0, halfHeight, halfWidth, halfHeight);
  // Bottom-right rectangle
  ctx.fillStyle = colors[3];
  ctx.fillRect(halfWidth, halfHeight, halfWidth, halfHeight);
  
  return canvas.toDataURL();
}

/**
 * Fetches the favicon and caches it.
 * @param {string} faviconURL - The favicon URL.
 * @returns {Promise<string>} The favicon data URL.
 */
const fetchAndCacheFavicon = async (faviconURL) => {
  try {
    const response = await fetch(faviconURL, { credentials: "omit" });
    if (response.ok && response.headers.get("Content-Type").includes("image")) {
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      localStorage.setItem(faviconURL, dataUrl);
      return dataUrl;
    } else {
      throw new Error("Favicon not found or not an image");
    }
  } catch (error) {
    console.error("Failed to fetch favicon: ", error);
    return getFallbackFaviconColor(faviconURL);
  }
};

/**
 * Converts a Blob to a data URL.
 * @param {Blob} blob - The Blob to convert.
 * @returns {Promise<string>} The data URL.
 */
const blobToDataUrl = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Retrieves a stored color for a URL or generates a new one.
 * @param {string} url - The URL.
 * @returns {string} The color data URL.
 */
const getFallbackFaviconColor = (url) => {
  const storedColor = retrieveStoredColor(url);
  return storedColor
    ? generateColorDataUrl(storedColor)
    : generateAndStoreRandomColor(url);
};

/**
 * Generates and stores a random color for a URL.
 * @param {string} url - The URL.
 * @returns {string} The color data URL.
 */
const generateAndStoreRandomColor = (url) => {
  const color = generateRandomColor();
  storeColor(url, color);
  return generateColorDataUrl(color);
};

/**
 * Generates a data URL for a given color.
 * @param {string} color - The color.
 * @returns {string} The data URL.
 */
const generateColorDataUrl = (color) => {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const context = canvas.getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
};

/**
 * Retrieves a stored color from localStorage for a given URL.
 * @param {string} url - The URL.
 * @returns {string|null} The stored color or null.
 */
const retrieveStoredColor = (url) => {
  const colors = JSON.parse(localStorage.getItem("tabColors")) || {};
  return colors[url] || null;
};

/**
 * Stores a color in localStorage for a given URL.
 * @param {string} url - The URL.
 * @param {string} color - The color to store.
 */
const storeColor = (url, color) => {
  const colors = JSON.parse(localStorage.getItem("tabColors")) || {};
  colors[url] = color;
  localStorage.setItem("tabColors", JSON.stringify(colors));
};

/**
 * Generates a random color in hex format.
 * @returns {string} The generated color.
 */
const generateRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

/**
 * Fetches the favicon link from the HTML of the given URL.
 * @param {string} url - The URL.
 * @returns {Promise<string|null>} The favicon URL or null.
 */
const fetchFaviconLink = async (url) => {
  try {
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error("Failed to fetch HTML");

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Gather all link elements whose rel attribute contains "icon"
    let linkElements = Array.from(doc.querySelectorAll("link[rel*='icon']"));
    if (linkElements.length > 0) {
      // Filter out links without an href and sort them:
      // Prefer .ico files first, then use the sizes attribute to choose the smallest icon.
      linkElements = linkElements.filter(link => link.href);
      linkElements.sort((a, b) => {
        const aExt = a.href.split('.').pop().toLowerCase();
        const bExt = b.href.split('.').pop().toLowerCase();
        if (aExt === "ico" && bExt !== "ico") return -1;
        if (bExt === "ico" && aExt !== "ico") return 1;
        const aSize = a.getAttribute("sizes") ? parseInt(a.getAttribute("sizes").split("x")[0]) : Infinity;
        const bSize = b.getAttribute("sizes") ? parseInt(b.getAttribute("sizes").split("x")[0]) : Infinity;
        return aSize - bSize;
      });
      return new URL(linkElements[0].href, url).href;
    }
    
    // If no icon links found, fall back to the smallest image in the HTML
    let imgElements = Array.from(doc.querySelectorAll("img"));
    if (imgElements.length > 0) {
      imgElements = imgElements.filter(img => img.src);
      imgElements.sort((a, b) => {
        const aWidth = a.getAttribute("width") ? parseInt(a.getAttribute("width")) : Infinity;
        const bWidth = b.getAttribute("width") ? parseInt(b.getAttribute("width")) : Infinity;
        return aWidth - bWidth;
      });
      return new URL(imgElements[0].src, url).href;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch favicon link: ", error);
    return null;
  }
};

/// 1.7 BOOKMARKS MANAGEMENT

/**
 * Toggles visibility of bookmark indicators (favorite and read status)
 * @param {boolean} show - Whether to show or hide indicators
 */
function toggleBookmarkIndicatorsVisibility(show) {
  const favoriteEls = document.querySelectorAll(".favorite-indicator");
  const readEls = document.querySelectorAll(".read-indicator");
  favoriteEls.forEach((el) => (el.style.display = show ? "inline" : "none"));
  readEls.forEach((el) => (el.style.display = show ? "inline" : "none"));
}

/**
 * Renders bookmarks from the current folder
 */
async function renderBookmarks() { // Make async
  const bookmarks = await getCurrentBookmarks(); // Use await here
  const container = getElement("bookmarks-container");
  container.innerHTML = "";

  // Check if bookmarks is actually an array before iterating
  if (Array.isArray(bookmarks)) {
    bookmarks.forEach((bookmark, index) => {
      const div = createBookmarkElement(bookmark, index);
      container.appendChild(div);
    });
  } else {
     console.error("renderBookmarks: Received non-array bookmarks data:", bookmarks);
     // Optionally display an error message to the user in the UI
  }


  updateBookmarkIndices();

  // Update the current folder name display
  getElement("currentFolderName").textContent = `Current Folder: ${getCurrentFolder()}`;

  // Apply visibility settings for bookmark indicators
  const showInd = JSON.parse(localStorage.getItem("showIndicators") || "true");
  toggleBookmarkIndicatorsVisibility(showInd);

  // Apply the Hide URL setting on every render
  const hideTextMuted = localStorage.getItem("hideTextMuted") === "true";
  updateTextMutedVisibility(hideTextMuted);

  // Enforce the Hide Move Button setting
  applyMoveButtonVisibility();
}




/**
 * Creates a bookmark element
 * @param {Object} bookmark - The bookmark data
 * @param {number} index - The index of the bookmark
 * @returns {HTMLElement} The bookmark element
 */
function createBookmarkElement(bookmark, index) {
  const div = document.createElement("div");
  div.className = "bookmark-card";
  div.style.position = "relative";
  // Ensure URL and label are strings before setting attributes
  const safeUrl = typeof bookmark.url === 'string' ? bookmark.url : '';
  const safeLabel = typeof bookmark.label === 'string' ? bookmark.label : '';
  div.setAttribute("data-url", safeUrl);
  div.setAttribute("data-index", index);
  div.setAttribute("data-label", safeLabel); // Add label attribute for easier selection
  // Pass the full bookmark data including folderName and filterMask if available
  div.setAttribute("data-bookmark", JSON.stringify(bookmark));

  if (isBulkSelectionMode) {
    setupBulkModeElement(div);
  } else if (isAssignFilterMode) {
    // === Assign Filter Mode UI ===
    div.classList.add("assign-mode");

    // Add checkbox overlay
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "assign-mode-checkbox";
    checkbox.checked = hasBitSet(Number(bookmark.filterMask) || 0, assignFilterId);
    // Prevent checkbox click from propagating and opening link if something goes wrong
    checkbox.addEventListener('click', (event) => {
         event.stopPropagation();
         event.preventDefault(); // Prevent default checkbox behavior, we handle toggle manually
         toggleBookmarkFilterAssignment(bookmark);
    });

    div.appendChild(checkbox);
    // Optionally add visual cue based on checked state
    if (checkbox.checked) {
         div.classList.add('filter-assigned');
    }

    // Add a wrapper click listener to toggle via the card itself
     div.addEventListener("click", (event) => {
         // Prevent if the click was exactly on an action button inside (shouldn't be visible anyway)
         if (event.target.closest('.bookmark-actions')) return;
         event.stopPropagation();
         toggleBookmarkFilterAssignment(bookmark);
     });
     // No drag & drop in assign mode
     div.setAttribute("draggable", "false");

  } else {
    div.addEventListener("click", () => openBookmark(bookmark.url));
    // Only enable drag & drop if no search query is active
    if (!getElement("search-input").value.trim()) {
      setupBookmarkDragAndDrop(div, index);
    } else {
      div.setAttribute("draggable", "false");
    }
  }

  // Append favicon image
  const img = new Image();
  img.src = bookmark.favicon || `https://${getDomain(bookmark.url)}/favicon.ico`;
  img.onerror = () => handleFaviconFallback(bookmark.url, img);
  img.className = "bookmark-icon";
  div.appendChild(img);

  // Append bookmark label
  const title = document.createElement("h5");
  title.textContent = insertHyphensIntoLongWords(bookmark.label);
  div.appendChild(title);

  // Append URL text
  const urlText = document.createElement("p");
  urlText.className = "card-text";
  urlText.textContent = truncateUrl(bookmark.url);
  div.appendChild(urlText);

  // Append action buttons and indicators if not in bulk mode
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "bookmark-actions";
  if (!isBulkSelectionMode && !isAssignFilterMode) {
    appendBookmarkIndicators(div, bookmark);
    appendBookmarkActions(actionsDiv, bookmark);
  } else {
    // Hide actions in bulk/assign mode
    actionsDiv.style.display = 'none';
  }
  div.appendChild(actionsDiv);

  return div;
}


// Add a "Cancel Selection" button to the moveModalTriggerContainer
function updateMoveModalTriggerVisibility() {
  const triggerContainer = getElement("moveModalTriggerContainer");
  if (!triggerContainer) return;
  
  triggerContainer.style.display = isBulkSelectionMode ? "block" : "none";
}


/**
 * Sets up a bookmark element for bulk selection mode
 * @param {HTMLElement} element - The bookmark element
 */
function setupBulkModeElement(element) {
  element.classList.add("bulk-mode");
  const selectCheckbox = document.createElement("input");
  selectCheckbox.type = "checkbox";
  selectCheckbox.className = "bulk-select-checkbox";
  element.prepend(selectCheckbox);
  
  element.addEventListener("click", (event) => {
    event.stopPropagation();
    element.classList.toggle("selected");
    selectCheckbox.checked = element.classList.contains("selected");
  });
}

/**
 * Appends favorite and read indicators to a bookmark element
 * @param {HTMLElement} element - The bookmark element
 * @param {Object} bookmark - The bookmark data
 */
function appendBookmarkIndicators(element, bookmark) {
  // Favorite Indicator
  const favoriteIndicator = document.createElement("span");
  favoriteIndicator.className = "bookmark-indicator favorite-indicator";
  favoriteIndicator.textContent = hasBitSet(bookmark.flags, BIT_FAVORITE)
    ? STAR_FILLED
    : STAR_OUTLINE;
  favoriteIndicator.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavoriteFlag(bookmark, favoriteIndicator);
  });
  element.appendChild(favoriteIndicator);

  // Read Indicator
  const readIndicator = document.createElement("span");
  readIndicator.className = "bookmark-indicator read-indicator";
  readIndicator.textContent = hasBitSet(bookmark.flags, BIT_READ)
    ? BOOK_ICON
    : EYE_ICON;
  readIndicator.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleReadFlag(bookmark, readIndicator);
  });
  element.appendChild(readIndicator);
}

/**
 * Appends action buttons to a bookmark's actions container
 * @param {HTMLElement} container - The actions container
 * @param {Object} bookmark - The bookmark data
 */
function appendBookmarkActions(container, bookmark) {
  // Edit Button
  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn btn";
  editBtn.textContent = "🖊️";
  editBtn.setAttribute("aria-label", "Edit Bookmark");
  editBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    editBookmark(bookmark);
  });
  container.appendChild(editBtn);

  // Move Button
  const moveBtn = document.createElement("button");
  moveBtn.className = "move-btn btn";
  moveBtn.textContent = "🔀";
  moveBtn.setAttribute("aria-label", "Select Bookmark for Move");
  moveBtn.addEventListener("click", (event) => {
    event.stopPropagation();
  
    // Activate move selection mode if not already active
    if (!isBulkSelectionMode) {
      isBulkSelectionMode = true;
      // Check if we are in search mode by examining the search input value
      const searchQuery = getElement("search-input").value.trim();
      if (searchQuery) {
        // Re-render search results in bulk selection mode
        handleSearch();
      } else {
        // Otherwise, render the current folder's bookmarks in bulk selection mode
        renderBookmarks();
      }
      updateMoveModalTriggerVisibility(); // Show the move modal trigger
  
      // After re-rendering, select the clicked bookmark
      setTimeout(() => {
        const bookmarkCards = document.querySelectorAll(".bookmark-card");
        const clickedBookmarkUrl = bookmark.url;
        const clickedBookmarkLabel = bookmark.label;
        
        bookmarkCards.forEach(card => {
          const cardData = JSON.parse(card.getAttribute("data-bookmark"));
          if (cardData.url === clickedBookmarkUrl && cardData.label === clickedBookmarkLabel) {
            card.classList.add("selected");
            const checkbox = card.querySelector(".bulk-select-checkbox");
            if (checkbox) checkbox.checked = true;
          }
        });
      }, 0);
    } else {
      // In bulk mode, toggle the selection state of the clicked bookmark
      const bookmarkCard = event.target.closest(".bookmark-card");
      bookmarkCard.classList.toggle("selected");
      const checkbox = bookmarkCard.querySelector(".bulk-select-checkbox");
      if (checkbox) checkbox.checked = !checkbox.checked;
      
      // If no bookmarks remain selected, exit bulk mode and re-render based on search mode
      const selectedBookmarks = getSelectedBookmarks();
      if (selectedBookmarks.length === 0) {
        isBulkSelectionMode = false;
        const searchQuery = getElement("search-input").value.trim();
        if (searchQuery) {
          handleSearch();
        } else {
          renderBookmarks();
        }
        updateMoveModalTriggerVisibility();
      }
    }
  });
  container.appendChild(moveBtn);

  // Delete Button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn btn btn-danger";
  deleteBtn.textContent = "🗑️";
  deleteBtn.setAttribute("aria-label", "Delete Bookmark");
  deleteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (confirm("Warning: This will permanently delete the bookmark. Are you sure?")) {
      deleteBookmark(bookmark);
    }
  });
  container.appendChild(deleteBtn);
}

/**
 * Toggles selection of a single bookmark for move operation
 * @param {Event} event - The click event
 */
function toggleSingleBookmarkForMove(event) {
  // Activate move selection mode if not already active
  if (!isBulkSelectionMode) {
    isBulkSelectionMode = true;
    renderBookmarks();
  }
  
  // Toggle selection for this bookmark
  const bookmarkCard = event.target.closest(".bookmark-card");
  const isSelected = bookmarkCard.classList.contains("selected");
  bookmarkCard.classList.toggle("selected");
  
  const checkbox = bookmarkCard.querySelector(".bulk-select-checkbox");
  if (checkbox) checkbox.checked = !isSelected;
}


/**
 * Opens the move bookmarks modal
 * @param {Object|Array} bookmarkOrBookmarks - Bookmark(s) to move
 */
function openMoveBookmarkModal(bookmarkOrBookmarks) {
  const bookmarks = Array.isArray(bookmarkOrBookmarks)
    ? bookmarkOrBookmarks
    : [bookmarkOrBookmarks];

  const modal = createModal("Move Bookmarks", false);
  const content = document.createElement("div");
  content.className = "move-options";

  // Display stats about the move operation
  const stats = document.createElement("div");
  stats.className = "move-stats";
  stats.innerHTML = `<p>Move ${bookmarks.length} bookmark${bookmarks.length > 1 ? "s" : ""} to:</p>`;
  content.appendChild(stats);

  // Create folder selection dropdown
  const allFolders = getFolders();
  const folderOptions = allFolders.map((folder) => folder.name);
  const folderSelection = document.createElement("div");
  folderSelection.className = "form-group";
  folderSelection.innerHTML = `
    <label for="move-folder">Select target folder:</label>
    <select id="move-folder">
      ${folderOptions.map((name) => `<option value="${name}">${name}</option>`).join("")}
      <option value="new">Create new folder</option>
    </select>
  `;
  content.appendChild(folderSelection);

  // New folder input (hidden by default)
  const newFolderInput = document.createElement("div");
  newFolderInput.className = "form-group hidden";
  newFolderInput.innerHTML = `
    <label for="new-move-folder-name">New folder name:</label>
    <input type="text" id="new-move-folder-name" placeholder="Enter folder name">
  `;
  content.appendChild(newFolderInput);

  // Add action buttons
  const buttonGroup = document.createElement("div");
  buttonGroup.className = "form-group";
  
  // Move button
  const moveButton = document.createElement("button");
  moveButton.className = "btn";
  moveButton.textContent = "Move";
  moveButton.addEventListener("click", () => {
    const selectElem = folderSelection.querySelector("#move-folder");
    let targetFolder = selectElem.value;
    
    if (targetFolder === "new") {
      const newFolderName = newFolderInput.querySelector("#new-move-folder-name").value.trim();
      if (!newFolderName) {
        showToast("Please enter a folder name.");
        return;
      }
      targetFolder = newFolderName;
    }
    
    moveBookmarks(bookmarks, targetFolder);
    modal.parentNode.removeChild(modal);
  });
  buttonGroup.appendChild(moveButton);

  // Cancel button
  const cancelButton = document.createElement("button");
  cancelButton.className = "btn btn-danger";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", () => {
    modal.parentNode.removeChild(modal);
  });
  buttonGroup.appendChild(cancelButton);

  content.appendChild(buttonGroup);
  modal.appendChild(content);
  document.body.appendChild(modal);

  // Toggle new folder input visibility
  const selectElem = folderSelection.querySelector("#move-folder");
  selectElem.addEventListener("change", (e) => {
    newFolderInput.classList.toggle("hidden", e.target.value !== "new");
  });
}


/**
 * Unselects all bookmarks in bulk selection mode
 */
function unselectAllBookmarks() {
  document.querySelectorAll(".bookmark-card.selected").forEach((card) => {
    card.classList.remove("selected");
    const checkbox = card.querySelector(".bulk-select-checkbox");
    if (checkbox) {
      checkbox.checked = false;
    }
  });
}

/**
 * Moves bookmarks to target folder
 * @param {Array} bookmarksArray - Array of bookmarks to move
 * @param {string} targetFolder - Target folder name
 */
function moveBookmarks(bookmarksArray, targetFolder) {
  let folders = getFolders();
  let targetFolderObj = folders.find((f) => f.name === targetFolder);
  
  if (!targetFolderObj) {
    targetFolderObj = { name: targetFolder, bookmarks: [] };
    folders.push(targetFolderObj);
  }
  
  let movedCount = 0;
  bookmarksArray.forEach((bookmark) => {
    // Determine source folder
    const sourceFolderName = bookmark.folderName || getCurrentFolder();
    const sourceFolder = folders.find((f) => f.name === sourceFolderName);
    
    if (sourceFolder) {
      const index = sourceFolder.bookmarks.findIndex(
        (b) => b.url === bookmark.url && b.label === bookmark.label
      );
      
      if (index !== -1) {
        // Avoid duplicates in target folder
        if (!targetFolderObj.bookmarks.some(
          (b) => b.url === bookmark.url && b.label === bookmark.label
        )) {
          const movedBookmark = sourceFolder.bookmarks.splice(index, 1)[0];
          targetFolderObj.bookmarks.push(movedBookmark);
          movedCount++;
        }
      }
    }
  });
  
  setFolders(folders);
  renderBookmarks();
  showToast(`Moved ${movedCount} bookmark${movedCount !== 1 ? "s" : ""} to "${targetFolder}"`);
}

/**
 * Toggles bulk selection mode
 */
function toggleBulkSelectionMode() {
  isBulkSelectionMode = !isBulkSelectionMode;
  const bulkMoveBtn = getElement("bulkMoveBtn");
  
  if (bulkMoveBtn) {
    bulkMoveBtn.textContent = isBulkSelectionMode ? "Confirm Move" : "Bulk Move";
  }
  
  // Update draggable attribute on all bookmark elements
  document.querySelectorAll(".bookmark-card").forEach((card) => {
    card.setAttribute("draggable", !isBulkSelectionMode);
  });
  
  renderBookmarks();
  updateMoveModalTriggerVisibility();
}


/**
 * Gets selected bookmarks from bulk mode
 * @returns {Array} Array of selected bookmarks
 */
function getSelectedBookmarks() {
  const selected = [];
  const checkboxes = document.querySelectorAll(".bulk-select-checkbox");
  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      const bookmarkCard = checkbox.parentElement;
      const bookmarkData = bookmarkCard.getAttribute("data-bookmark");
      if (bookmarkData) {
        selected.push(JSON.parse(bookmarkData));
      }
    }
  });
  return selected;
}

/**
 * Updates visibility of move modal trigger container
 */
function updateMoveModalTriggerVisibility() {
  const triggerContainer = document.getElementById("moveModalTriggerContainer");
  if (!triggerContainer) return;
  triggerContainer.style.display = isBulkSelectionMode ? "block" : "none";
}


// Helper functions for UI bookmark toggles
function updateFavoriteButtonText(button, flags) {
  button.textContent = hasBitSet(flags, BIT_FAVORITE) ? "★" : "☆";
}

function updateReadButtonText(button, flags) {
  button.textContent = hasBitSet(flags, BIT_READ) ? "👁️" : "👁️‍🗨️";
}

function toggleFavoriteFlag(bookmark, indicatorEl) {
  const folders = getFolders();
  const folderName = bookmark.folderName || getCurrentFolder();
  const folder = folders.find((f) => f.name === folderName);
  if (!folder) return;

  const index = folder.bookmarks.findIndex(
    (b) => b.url === bookmark.url && b.label === bookmark.label
  );
  if (index === -1) return;

  if (hasBitSet(folder.bookmarks[index].flags, BIT_FAVORITE)) {
    folder.bookmarks[index].flags = clearBit(
      folder.bookmarks[index].flags,
      BIT_FAVORITE
    );
    indicatorEl.textContent = STAR_OUTLINE;
  } else {
    folder.bookmarks[index].flags = setBit(
      folder.bookmarks[index].flags,
      BIT_FAVORITE
    );
    indicatorEl.textContent = STAR_FILLED;
  }

  setFolders(folders);
}

function toggleReadFlag(bookmark, indicatorEl) {
  const folders = getFolders();
  const folderName = bookmark.folderName || getCurrentFolder();
  const folder = folders.find((f) => f.name === folderName);
  if (!folder) return;

  const index = folder.bookmarks.findIndex(
    (b) => b.url === bookmark.url && b.label === bookmark.label
  );
  if (index === -1) return;

  // Toggle the BIT_READ
  if (hasBitSet(folder.bookmarks[index].flags, BIT_READ)) {
    folder.bookmarks[index].flags = clearBit(
      folder.bookmarks[index].flags,
      BIT_READ
    );
    indicatorEl.textContent = EYE_ICON;
  } else {
    folder.bookmarks[index].flags = setBit(
      folder.bookmarks[index].flags,
      BIT_READ
    );
    indicatorEl.textContent = BOOK_ICON;
  }

  setFolders(folders);
}

/**
 * Sets up drag-and-drop functionality for bookmarks.
 * @param {HTMLElement} div - The bookmark element.
 * @param {number} index - The index of the bookmark.
 */
function setupBookmarkDragAndDrop(div, index) {
  if (isBulkSelectionMode) {
    div.setAttribute("draggable", "false");
    return;
  }

  div.setAttribute("data-index", index);
  div.setAttribute("draggable", "true");

  div.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", div.getAttribute("data-index"));
    div.classList.add("dragging");
  });
  
  div.addEventListener("dragover", (e) => {
    e.preventDefault();
    const mouseY = e.clientY;
    const rect = div.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    
    // Clear previous position indicators
    div.classList.remove("drop-above", "drop-below");
    
    // Add indicator based on mouse position relative to the target element
    if (mouseY < midpoint) {
      div.classList.add("drop-above");
    } else {
      div.classList.add("drop-below");
    }
  });
  
  div.addEventListener("dragleave", () => {
    // Remove position indicators when leaving the target element
    div.classList.remove("drop-above", "drop-below");
  });
  
  div.addEventListener("drop", (e) => {
    e.preventDefault();
    if (isBulkSelectionMode) return;

    const draggedIndex = parseInt(e.dataTransfer.getData("text/plain"));
    const targetIndex = parseInt(div.getAttribute("data-index"));

    if (isNaN(draggedIndex) || isNaN(targetIndex) || draggedIndex === targetIndex) {
      div.classList.remove("drop-above", "drop-below");
      return;
    }

    const rect = div.getBoundingClientRect();
    const mouseY = e.clientY;
    const midpoint = rect.top + rect.height / 2;

    let newIndex = (mouseY < midpoint) ? targetIndex : targetIndex + 1;
    if (draggedIndex < targetIndex) newIndex--;

    moveBookmark(draggedIndex, newIndex);
    updateBookmarkIndices();
    renderBookmarks();

    div.classList.remove("drop-above", "drop-below");
  });
  
  div.addEventListener("dragend", () => {
    div.classList.remove("dragging");
    // Remove any leftover position indicators on all bookmarks
    document.querySelectorAll(".drop-above, .drop-below").forEach(el => {
      el.classList.remove("drop-above", "drop-below");
    });
  });
}


// Helper function to update the data-index attributes for all bookmark cards
function updateBookmarkIndices() {
  const container = document.getElementById("bookmarks-container");
  const bookmarks = container.querySelectorAll(".bookmark-card");
  bookmarks.forEach((bookmark, newIndex) => {
    bookmark.setAttribute("data-index", newIndex);
  });
}

/**
 * Handles the drop event for bookmark drag-and-drop.
 * @param {Event} e - The drop event.
 * @param {HTMLElement} div - The target element.
 */
function handleBookmarkDrop(e, div) {
  e.preventDefault();
  if (isBulkSelectionMode) return;
  
  const draggedIndex = parseInt(e.dataTransfer.getData("text/plain"));
  const container = div.parentNode;
  const bookmarkElements = Array.from(container.querySelectorAll(".bookmark-card"));
  const newIndex = bookmarkElements.indexOf(div);
  
  if (draggedIndex !== newIndex) {
    moveBookmark(draggedIndex, newIndex);
    renderBookmarks();
  }
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".bookmark-card:not(.dragging)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateBookmarkOrder() {
  const container = getElement("bookmarks-container");
  const bookmarkElements = Array.from(container.querySelectorAll(".bookmark-card"));
  const folders = getFolders();
  const currentFolder = getCurrentFolder();
  const folderData = folders.find(f => f.name === currentFolder);
  
  if (folderData) {
    folderData.bookmarks = bookmarkElements.map(el => {
      const index = parseInt(el.getAttribute("data-index"));
      return folderData.bookmarks[index];
    });
    
    setFolders(folders);
    renderBookmarks();
  }
}


function ensureDragDropCompatibility() {
  // This prevents the default browser behavior of opening links when dragging
  document.addEventListener("dragover", function(e) {
    e.preventDefault();
  }, false);
  
  document.addEventListener("drop", function(e) {
    // Prevent default drop action outside of our drop zones
    if (!e.target.closest(".bookmark-card")) {
      e.preventDefault();
    }
  }, false);
}


/**
 * Opens a bookmark URL based on the user's setting.
 * @param {string} url - The URL to open.
 */
function openBookmark(url) {
  const openInNewTab = JSON.parse(
    localStorage.getItem("openInNewTab") || "true"
  );
  const finalUrl = ensureHttpScheme(url);
  if (openInNewTab) {
    const newWindow = window.open(finalUrl, "_blank", "noopener,noreferrer");
    if (newWindow) newWindow.opener = null;
  } else {
    window.location.href = finalUrl;
  }
}

/**
 * Adds a new bookmark to the current folder.
 */
async function addBookmark() { // Is async now
  const label = getElement("label-input").value;
  const url = getElement("url-input").value;
  if (!label || !url) {
    alert("Both label and URL must be provided.");
    return;
  }

  const folders = await getFolders(); // Use await
  const currentFolder = await getCurrentFolder(); // Use await

  let folderData = folders.find((f) => f.name === currentFolder);
  if (!folderData) {
    folderData = { name: currentFolder, bookmarks: [], children: [] }; // Added children array consistency
    folders.push(folderData);
  }

  // Initialize the 'flags' and filterMask property
  folderData.bookmarks.push({ label, url, flags: 0, filterMask: 0 }); // Add filterMask

  await setFolders(folders); // Use await
  await renderBookmarks(); // Use await
  getElement("label-input").value = "";
  getElement("url-input").value = "";
}

/**
 * Deletes a bookmark.
 * It uses the bookmark object to locate the correct bookmark.
 * @param {Object} bookmarkObj - The bookmark object to delete.
 */
async function deleteBookmark(bookmarkObj) { // Make async
  const folders = await getFolders(); // Use await
  const folderName = bookmarkObj.folderName || await getCurrentFolder(); // Use await
  const folderData = folders.find((f) => f.name === folderName);
  if (folderData) {
    const bookmarkIndex = folderData.bookmarks.findIndex(
      (b) => b.url === bookmarkObj.url && b.label === bookmarkObj.label
    );
    if (bookmarkIndex === -1) return;
    folderData.bookmarks.splice(bookmarkIndex, 1);
    await setFolders(folders); // Use await
    if (getElement("search-input").value.trim()) {
      await handleSearch(); // Use await (handleSearch is now async)
    } else {
      await renderBookmarks(); // Use await
    }
  }
}

/**
 * Edits an existing bookmark in the current folder.
 * @param {object} bookmarkObj - The index of the bookmark to edit.
 */
async function editBookmark(bookmarkObj) { // Make async
  const folders = await getFolders(); // Use await
  const folderName = bookmarkObj.folderName || await getCurrentFolder(); // Use await
  const folderData = folders.find((f) => f.name === folderName);
  if (folderData) {
    const bookmarkIndex = folderData.bookmarks.findIndex(
      (b) => b.url === bookmarkObj.url && b.label === bookmarkObj.label
    );
    if (bookmarkIndex === -1) return;
    const bookmark = folderData.bookmarks[bookmarkIndex];

    const newLabel = prompt("Edit Bookmark Label:", bookmark.label);
    if (newLabel !== null && newLabel !== "") {
      bookmark.label = newLabel;
    }

    const newUrl = prompt("Edit Bookmark URL:", bookmark.url);
    if (newUrl !== null && newUrl !== "") {
      bookmark.url = newUrl;
    }

    const newIcon = prompt("Edit Bookmark Icon URL:", bookmark.favicon || "");
    if (newIcon !== null && newIcon !== "") {
      bookmark.favicon = newIcon;
    }

    // Ensure filterMask exists
    if (bookmark.filterMask === undefined) {
        bookmark.filterMask = 0;
    }
    // Ensure flags exist
    if (bookmark.flags === undefined) {
      bookmark.flags = 0;
    }


    await setFolders(folders); // Use await
    if (getElement("search-input").value.trim()) {
      await handleSearch(); // Use await (handleSearch is now async)
    } else {
      await renderBookmarks(); // Use await
    }
  }
}

/**
 * Moves a bookmark within the current folder.
 * @param {number} originIndex - The original index of the bookmark.
 * @param {number} targetIndex - The new index of the bookmark.
 */
async function moveBookmark(originIndex, targetIndex) { // Make async
  const folders = await getFolders(); // Use await
  const currentFolder = await getCurrentFolder(); // Use await
  const folderData = folders.find((f) => f.name === currentFolder);
  if (folderData) {
    const bookmarks = folderData.bookmarks;
    // Ensure bookmarks is an array before splicing
     if (!Array.isArray(bookmarks)) {
        console.error("moveBookmark: folderData.bookmarks is not an array", folderData);
        return;
     }
    // Ensure indices are valid
     if (originIndex < 0 || originIndex >= bookmarks.length || targetIndex < 0 || targetIndex > bookmarks.length) {
         console.error("moveBookmark: Invalid indices", { originIndex, targetIndex, length: bookmarks.length });
         return;
     }
    const [movedBookmark] = bookmarks.splice(originIndex, 1);
    bookmarks.splice(targetIndex, 0, movedBookmark);
    await setFolders(folders); // Use await
  }
}

function updateBookmarkIndices() {
  const container = document.getElementById("bookmarks-container");
  const bookmarkElements = container.querySelectorAll(".bookmark-card");
  bookmarkElements.forEach((bookmark, index) => {
    bookmark.setAttribute("data-index", index);
  });
}

/**
 * Retrieves the bookmarks from the current folder.
 * @returns {Array} The array of bookmarks in the current folder.
 */
async function getCurrentBookmarks() {
  // Await async calls
  const folders = await getFolders();
  const currentFolder = await getCurrentFolder();

  let folderData = folders.find((f) => f.name === currentFolder);

  if (!folderData) {
    // Folder might not exist yet if it's the default or newly set
    // Check if it's the default folder and hasn't been explicitly created
     if (currentFolder === DEFAULT_FOLDER_NAME && !folders.some(f => f.name === DEFAULT_FOLDER_NAME)) {
        // Create the default folder if it's missing
         folderData = { name: DEFAULT_FOLDER_NAME, bookmarks: [], children: [] };
         folders.push(folderData);
         await setFolders(folders); // Save the newly created default folder
     } else {
         // If it's not the default and not found, something is likely wrong upstream
         // Or maybe it was just deleted. Return empty for now.
         console.warn(`getCurrentBookmarks: Folder "${currentFolder}" not found.`);
         return [];
     }
  }

  // Ensure folderData.bookmarks is always an array and bookmarks have default props
   const bookmarks = (folderData.bookmarks || []).map(b => ({
       ...(typeof b === 'object' && b !== null ? b : {}), // Ensure b is an object
       label: (typeof b?.label === 'string') ? b.label : 'No Label',
       url: (typeof b?.url === 'string') ? b.url : '',
       flags: b?.flags === undefined ? 0 : Number(b.flags) || 0, // Ensure number
       filterMask: b?.filterMask === undefined ? 0 : Number(b.filterMask) || 0 // Ensure number
   }));

  // Filter out any invalid bookmark entries resulted from mapping
  return bookmarks.filter(b => typeof b.url === 'string' && b.url);
}

/**
 * Retrieves the list of folders from localStorage.
 * @returns {Array} The list of folders.
 */
function getFolders() {
  return JSON.parse(localStorage.getItem("folders") || "[]");
}

/**
 * Saves the list of folders to localStorage.
 * @param {Array} folders - The list of folders.
 */
function setFolders(folders) {
  localStorage.setItem("folders", JSON.stringify(folders));
}

/**
 * Retrieves the current folder name from localStorage.
 * @returns {string} The current folder name.
 */
function getCurrentFolder() {
  return localStorage.getItem("currentFolder") || "Default";
}

/**
 * Sets the current folder name in localStorage.
 * @param {string} folderName - The folder name.
 */
function setCurrentFolder(folderName) {
  localStorage.setItem("currentFolder", folderName);
}

/// 1.8 BACKGROUND SETTINGS

/**
 * Sets up background settings and event listeners.
 */
function setupBackgroundSettings() {
  const backgroundSelect = getElement("backgroundSelect");
  backgroundSelect.addEventListener("change", function () {
    updateBackground(this.value);
  });

  getElement("backgroundUpload").addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        localStorage.setItem("customBackground", e.target.result);
        updateBackground("custom");
      };
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Updates the background based on the selected option.
 * @param {string} choice - The selected background choice.
 */
function updateBackground(choice) {
  const body = document.body;
  const customBackgroundContainer = getElement("customBackground");

  if (choice === "custom") {
    customBackgroundContainer.style.display = "block";
    const customBackground = localStorage.getItem("customBackground");
    if (customBackground) {
      body.style.backgroundImage = `url("${customBackground}")`;
      body.style.backgroundSize = "cover";
    }
  } else {
    customBackgroundContainer.style.display = "none";
    body.style.backgroundImage = "";
    body.style.backgroundSize = "";
    switch (choice) {
      case "dark":
        body.style.backgroundColor = "#000000";
        break;
      case "light":
        body.style.backgroundColor = "#ffffff";
        break;
      default:
        body.style.backgroundColor = "#f0f0f0";
        break;
    }
  }

  localStorage.setItem("selectedBackground", choice);
}

/// 1.9 SETTINGS MANAGEMENT

/**
 * Checks if any setting input value has been changed compared to what is stored.
 * @returns {boolean} True if any setting was modified; false otherwise.
 */
function settingsChanged() {
  let changed = false;
  const buttonColor = getElement("buttonColorPicker").value;
  if (buttonColor !== (localStorage.getItem("buttonColor") || "#db772a")) changed = true;

  if(getElement("textSizeSelect").value !== (localStorage.getItem("textSize") || "xs")) changed = true;

  if(getElement("bookmarkTextSizeSelect").value !== (localStorage.getItem("bookmarkTextSize") || "small")) changed = true;

  if(getElement("openInNewTabToggle").checked !== JSON.parse(localStorage.getItem("openInNewTab") || "true")) changed = true;

  if(getElement("hideTextMuted").checked !== (localStorage.getItem("hideTextMuted") === "true")) changed = true;

  if(getElement("hideToDoList").checked !== (localStorage.getItem("hideToDoList") === "true")) changed = true;

  if(getElement("backgroundSelect").value !== (localStorage.getItem("selectedBackground") || "default")) changed = true;

  if(getElement("complexFallbackToggle").checked !== JSON.parse(localStorage.getItem("complexFallback") || "true")) changed = true;

  if(getElement("bookmarksPerRowSelect").value !== (localStorage.getItem("bookmarksPerRow") || "auto")) changed = true;

  if(getElement("marginSelect").value !== (localStorage.getItem("contentMargin") || "32")) changed = true;

  if(getElement("bookmarkSizeSelect").value !== (localStorage.getItem("bookmarkSize") || "medium")) changed = true;

  if(getElement("showBookmarkFlags").checked !== JSON.parse(localStorage.getItem("showIndicators") || "true")) changed = true;

  if(getElement("showUrlTooltip").checked !== JSON.parse(localStorage.getItem("showUrlTooltip") || "true")) changed = true;

  if(getElement("hideMoveButton").checked !== JSON.parse(localStorage.getItem("hideMoveButton") || "false")) changed = true;

  return changed;
}


/**
 * Loads the bookmark opening setting and applies it to the UI.
 */
function loadBookmarkOpeningSetting() {
  const openInNewTab = JSON.parse(
    localStorage.getItem("openInNewTab") || "true"
  );
  getElement("openInNewTabToggle").checked = openInNewTab;
}

/**
 * Toggles the bookmark opening setting between new tab and same tab.
 */
function toggleBookmarkOpening() {
  const isChecked = getElement("openInNewTabToggle").checked;
  localStorage.setItem("openInNewTab", isChecked);
}

/**
 * Enforces the move button visibility.
 */
function applyMoveButtonVisibility() {
  const hideMoveButton = JSON.parse(localStorage.getItem("hideMoveButton") || "false");
  document.querySelectorAll(".move-btn").forEach((btn) => {
    btn.style.display = hideMoveButton ? "none" : "inline-block";
  });
}

/**
 * Initializes settings by applying them to the UI.
 */
function initializeSettings() {
  // Apply settings
  applySettings();
}

/**
 * Updates the settings inputs in the modal based on local storage.
 */
function updateSettingsInputs() {
  const buttonColorPicker = getElement("buttonColorPicker");
  if (buttonColorPicker) {
    buttonColorPicker.value = localStorage.getItem("buttonColor") || "#db772a";
  }
  const textSizeSelect = getElement("textSizeSelect");
  if (textSizeSelect) {
    textSizeSelect.value = localStorage.getItem("textSize") || "xs";
  }
  const bookmarkTextSizeSelect = getElement("bookmarkTextSizeSelect");
  if (bookmarkTextSizeSelect) {
    bookmarkTextSizeSelect.value = localStorage.getItem("bookmarkTextSize") || "small";
  }
  const openInNewTabToggle = getElement("openInNewTabToggle");
  if (openInNewTabToggle) {
    openInNewTabToggle.checked = JSON.parse(localStorage.getItem("openInNewTab") || "true");
  }
  const hideTextMuted = getElement("hideTextMuted");
  if (hideTextMuted) {
    hideTextMuted.checked = localStorage.getItem("hideTextMuted") === "true";
  }
  const hideToDoList = getElement("hideToDoList");
  if (hideToDoList) {
    hideToDoList.checked = localStorage.getItem("hideToDoList") === "true";
  }
  const hideMoveButtonCheckbox = getElement("hideMoveButton");
  if (hideMoveButtonCheckbox) {
    hideMoveButtonCheckbox.checked = JSON.parse(localStorage.getItem("hideMoveButton") || "false");
  }
  // Background selection
  const backgroundSelect = getElement("backgroundSelect");
  if (backgroundSelect) {
    const selectedBackground = localStorage.getItem("selectedBackground") || "default";
    backgroundSelect.value = selectedBackground;
    updateBackground(selectedBackground);
    backgroundSelect.addEventListener("change", function () {
      updateBackground(this.value);
    });
  }
  const complexFallbackToggle = getElement("complexFallbackToggle");
  if (complexFallbackToggle) {
    complexFallbackToggle.checked = JSON.parse(localStorage.getItem("complexFallback") || "true");
  }
  const bookmarksPerRowSelect = getElement("bookmarksPerRowSelect");
  if (bookmarksPerRowSelect) {
    bookmarksPerRowSelect.value = localStorage.getItem("bookmarksPerRow") || "auto";
  }
  const marginSelect = getElement("marginSelect");
  if (marginSelect) {
    marginSelect.value = localStorage.getItem("contentMargin") || "32";
  }
  const bookmarkSizeSelect = getElement("bookmarkSizeSelect");
  if (bookmarkSizeSelect) {
    bookmarkSizeSelect.value = localStorage.getItem("bookmarkSize") || "medium";
  }
  const showBookmarkFlags = getElement("showBookmarkFlags");
  if (showBookmarkFlags) {
    showBookmarkFlags.checked = JSON.parse(localStorage.getItem("showIndicators") || "true");
  }
  
  const showUrlTooltip = getElement("showUrlTooltip");
  if (showUrlTooltip) {
    showUrlTooltip.checked = JSON.parse(localStorage.getItem("showUrlTooltip") || "true");
  }
}

/**
 * Saves the current settings to local storage and hides the settings modal.
 */
function saveSettings() {
  // Save each setting from the inputs to localStorage
  const buttonColor = getElement("buttonColorPicker").value;
  localStorage.setItem("buttonColor", buttonColor);

  const textSize = getElement("textSizeSelect").value;
  localStorage.setItem("textSize", textSize);

  const bookmarkTextSizeSelect = getElement("bookmarkTextSizeSelect");
  if (bookmarkTextSizeSelect) {
    localStorage.setItem("bookmarkTextSize", bookmarkTextSizeSelect.value);
  }

  const openInNewTab = getElement("openInNewTabToggle").checked;
  localStorage.setItem("openInNewTab", openInNewTab);

  const hideTextMuted = getElement("hideTextMuted").checked;
  localStorage.setItem("hideTextMuted", hideTextMuted);
  updateTextMutedVisibility(hideTextMuted);

  const hideToDoList = getElement("hideToDoList").checked;
  localStorage.setItem("hideToDoList", hideToDoList);
  updateToDoListVisibility(hideToDoList);

  const selectedBackground = getElement("backgroundSelect").value;
  localStorage.setItem("selectedBackground", selectedBackground);
  updateBackground(selectedBackground);

  const complexFallback = getElement("complexFallbackToggle").checked;
  localStorage.setItem("complexFallback", complexFallback);

  const bookmarksPerRow = getElement("bookmarksPerRowSelect").value;
  localStorage.setItem("bookmarksPerRow", bookmarksPerRow);
  applyBookmarksPerRowSetting(bookmarksPerRow);

  const contentMargin = getElement("marginSelect").value;
  localStorage.setItem("contentMargin", contentMargin);
  applyContentMargin(contentMargin);

  const bookmarkSize = getElement("bookmarkSizeSelect").value;
  localStorage.setItem("bookmarkSize", bookmarkSize);
  applyBookmarkSize(bookmarkSize);

  const showIndicators = getElement("showBookmarkFlags").checked;
  localStorage.setItem("showIndicators", showIndicators);
  toggleBookmarkIndicatorsVisibility(showIndicators);

  const showUrlTooltip = getElement("showUrlTooltip").checked;
  localStorage.setItem("showUrlTooltip", showUrlTooltip);

  const hideMoveButtonCheckbox = getElement("hideMoveButton");
  if (hideMoveButtonCheckbox) {
    localStorage.setItem("hideMoveButton", hideMoveButtonCheckbox.checked);
  }

  // Re-render bookmarks so that new settings (including move button visibility) take effect, then reapply settings
  renderBookmarks();
  applySettings();

  closeSettingsModal();
}


/**
 * Applies the bookmarks per row setting to the bookmarks container.
 * @param {string} value - The number of columns selected by the user.
 */
function applyBookmarksPerRowSetting(value) {
  const bookmarksContainer = getElement("bookmarks-container");
  if (value === "auto") {
    bookmarksContainer.style.gridTemplateColumns = "";
  } else {
    bookmarksContainer.style.gridTemplateColumns = `repeat(${value}, 1fr)`;
  }
}

/**
 * Updates the visibility of elements with the "card-text" class based on the given flag.
 * @param {boolean} hide - Whether to hide elements with the "card-text" class.
 */
function updateTextMutedVisibility(hide) {
  const elements = document.querySelectorAll(".card-text");
  elements.forEach((el) => (el.style.display = hide ? "none" : ""));
}

/**
 * Updates the visibility of the to-do list sidebar based on the given flag.
 * @param {boolean} hide - Whether to hide the to-do list sidebar.
 */
function updateToDoListVisibility(hide) {
  const todoSidebar = document.querySelector(".sidebar");
  const contentMargin = localStorage.getItem("contentMargin") || "0";
  if (hide) {
    todoSidebar.classList.add("hidden");
    // Apply margin when to-do list is hidden
    getElement("main-content").style.marginLeft = `${contentMargin}px`;
  } else {
    todoSidebar.classList.remove("hidden");
    // Remove left margin when to-do list is visible
    getElement("main-content").style.marginLeft = "";
  }
}

/**
 * Initializes visibility settings based on local storage values.
 */
function initializeVisibilitySettings() {
  const hideTextMuted = localStorage.getItem("hideTextMuted") === "true";
  const hideToDoList = localStorage.getItem("hideToDoList") === "true";

  getElement("hideTextMuted").checked = hideTextMuted;
  getElement("hideToDoList").checked = hideToDoList;
  updateTextMutedVisibility(hideTextMuted);
  updateToDoListVisibility(hideToDoList);

  // Apply content margin
  const contentMargin = localStorage.getItem("contentMargin") || "32";
  applyContentMargin(contentMargin);
}

/// 1.10 UTILITY FUNCTIONS

/**
 * Ensures the URL starts with a proper scheme (http:// or https://).
 * If not present, defaults to "https://".
 * @param {string} url - The URL to check and modify if necessary.
 * @returns {string} The URL prefixed with a scheme if it was missing.
 */
function ensureHttpScheme(url) {
  // Check that url is defined and is a string.
  if (!url || typeof url !== 'string') {
    console.error("ensureHttpScheme: invalid URL provided", url);
    return "";
  }
  return url.match(/^[a-zA-Z]+:\/\//) ? url : `https://${url}`;
}

/**
 * Extracts the domain name from a URL, removing any 'www.' prefix.
 * @param {string} url - The full URL from which to extract the domain.
 * @returns {string} The domain name, or an empty string if the URL is invalid.
 */
function getDomain(url) {
  // Guard: Check that url is defined and is a string.
  if (!url || typeof url !== 'string') {
    console.error("getDomain: invalid URL provided", url);
    return "";
  }
  const prefixedUrl = ensureHttpScheme(url);
  try {
    const newUrl = new URL(prefixedUrl);
    return newUrl.hostname.replace(/^www\./, "");
  } catch (error) {
    console.error("Error parsing URL:", error);
    return "";
  }
}

/**
 * Handles the fallback behavior if a favicon fails to load.
 * Uses either a simple single-color fallback or, if enabled,
 * a complex 2×2 fallback that uses 4 stored colors.
 * @param {string} url - The URL of the bookmark.
 * @param {HTMLImageElement} img - The image element.
 */
function handleFaviconFallback(url, img) {
  img.onerror = null;
  const useComplexFallback = JSON.parse(localStorage.getItem("complexFallback") || "true");
  
  if (useComplexFallback) {
    // Attempt to retrieve stored 4 colors for this URL.
    let colors = retrieveStoredFallbackColors(url);
    if (!colors) {
      // Generate 4 new random colors.
      colors = [
        generateRandomColor(),
        generateRandomColor(),
        generateRandomColor(),
        generateRandomColor()
      ];
      storeFallbackColors(url, colors);
    }
    img.src = generateComplex4RectanglesDataUrl(colors);
    img.setAttribute("aria-label", "Complex Fallback Icon");
  } else {
    // Use simple fallback (single color)
    let color = retrieveStoredColor(url);
    if (!color) {
      color = generateRandomColor();
      storeColor(url, color);
    }
    img.src = generateColorDataUrl(color);
    img.setAttribute("aria-label", "Simple Fallback Icon");
  }
}


/**
 * Retrieves stored fallback colors (an array of 4 hex colors) for a given URL.
 * @param {string} url - The bookmark URL.
 * @returns {Array|null} An array of 4 colors or null if not set.
 */
function retrieveStoredFallbackColors(url) {
  const fallbackObj = JSON.parse(localStorage.getItem("bookmarkFallbackColors") || "{}");
  return fallbackObj[url] || null;
}

/**
 * Stores an array of 4 fallback colors for a given URL.
 * @param {string} url - The bookmark URL.
 * @param {Array} colors - Array of 4 hex color strings.
 */
function storeFallbackColors(url, colors) {
  const fallbackObj = JSON.parse(localStorage.getItem("bookmarkFallbackColors") || "{}");
  fallbackObj[url] = colors;
  localStorage.setItem("bookmarkFallbackColors", JSON.stringify(fallbackObj));
}

/**
 * Clears all stored fallback colors.
 */
function clearAllFallbackColors() {
  localStorage.removeItem("bookmarkFallbackColors");
}


/**
 * Truncates a URL for display purposes.
 * @param {string} url - The URL to truncate.
 * @returns {string} The truncated URL.
 */
function truncateUrl(url) {
  let cleanUrl = url.replace(/^https?:\/\//, "");
  cleanUrl = cleanUrl.replace(/^www\./, "");
  if (cleanUrl.length > 13) {
    return cleanUrl.slice(0, 13) + "...";
  }
  return cleanUrl;
}

/**
 * Sets up event listeners for Enter key functionality on input fields.
 */
function setupEnterKeyListeners() {
  const toDoInput = getElement("toDoInput");
  toDoInput.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
      addToDoItem();
    }
  });

  const labelInput = getElement("label-input");
  const urlInput = getElement("url-input");

  function handleEnterKey(event) {
    if (event.key === "Enter") {
      addBookmark();
    }
  }

  labelInput.addEventListener("keyup", handleEnterKey);
  urlInput.addEventListener("keyup", handleEnterKey);
}

/**
 * Toggles the window view by opening a new popup window.
 */
// function toggleWindow() {
//   const createData = {
//     url: browser.runtime.getURL("popup.html"),
//     type: "popup",
//     width: 800,
//     height: 600,
//   };

//   browser.windows.create(createData).catch((error) => {
//     console.error(`Error: ${error}`);
//   });
// }

/**
 * Applies settings like dark mode and background on page load.
 */
function applySettings() {
  // Apply dark mode setting
  const darkModeEnabled = JSON.parse(localStorage.getItem("darkModeEnabled") || "false");
  if (darkModeEnabled) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }

  // Apply theme
  const selectedTheme = localStorage.getItem("selectedTheme") || "theme-default";
  applyTheme(selectedTheme);

  // Apply background setting
  const selectedBackground = localStorage.getItem("selectedBackground") || "default";
  updateBackground(selectedBackground);

  // Apply button color
  const buttonColor = localStorage.getItem("buttonColor") || "#db772a";
  document.documentElement.style.setProperty("--button-color", buttonColor);

  // Compute hover colors and set them
  const buttonHoverColor = adjustColor(buttonColor, -10); // darken by 10%
  const buttonShineColor = adjustColor(buttonColor, 10); // lighten by 10%
  document.documentElement.style.setProperty("--button-hover-color", buttonHoverColor);
  document.documentElement.style.setProperty("--button-shine-color", buttonShineColor);

  // For btn-danger (usually a redder color), we can use a standard color
  const buttonDangerColor = adjustColor(buttonColor, -20); // Darken by 20%
  const buttonDangerHoverColor = adjustColor(buttonDangerColor, -10); // Darken by 10%
  
  document.documentElement.style.setProperty(
    "--button-danger-color",
    buttonDangerColor
  );
  document.documentElement.style.setProperty(
    "--button-danger-hover-color",
    buttonDangerHoverColor
  );

  // For btn-secondary and btn-info, adjust as needed
  const buttonSecondaryColor = adjustColor(buttonColor, -20); // Darken by 20%
  const buttonSecondaryHoverColor = adjustColor(buttonSecondaryColor, -10);
  
  document.documentElement.style.setProperty(
    "--button-secondary-color",
    buttonSecondaryColor
  );
  document.documentElement.style.setProperty(
    "--button-secondary-hover-color",
    buttonSecondaryHoverColor
  );

  // Apply text size
  const textSize = localStorage.getItem("textSize") || "xs";
  let fontSizeBase;
  switch (textSize) {
    case "xs":
      fontSizeBase = "12px";
      break;
    case "sm":
      fontSizeBase = "14px";
      break;
    case "md":
      fontSizeBase = "16px";
      break;
    case "lg":
      fontSizeBase = "18px";
      break;
    case "xl":
      fontSizeBase = "20px";
      break;
    default:
      fontSizeBase = "16px";
  }
  document.documentElement.style.setProperty("--font-size-base", fontSizeBase);

  // Apply Bookmark Text Size setting
  const bookmarkTextSize = localStorage.getItem("bookmarkTextSize") || "small";
  const bookmarkTextSizeMap = {
    "extra-small": "0.5rem",
    "small": "0.75rem",
    "medium": "1rem",
    "large": "1.5rem"
  };
  document.documentElement.style.setProperty("--bookmark-text-size", bookmarkTextSizeMap[bookmarkTextSize]);

  // Apply open in new tab setting
  const openInNewTab = JSON.parse(localStorage.getItem("openInNewTab") || "true");
  getElement("openInNewTabToggle").checked = openInNewTab;

  // Apply hide URL setting
  const hideTextMuted = localStorage.getItem("hideTextMuted") === "true";
  updateTextMutedVisibility(hideTextMuted);

  // Apply hide To-Do List setting
  const hideToDoList = localStorage.getItem("hideToDoList") === "true";
  updateToDoListVisibility(hideToDoList);

  // Apply bookmarks per row setting
  const bookmarksPerRow = localStorage.getItem("bookmarksPerRow") || "auto";
  applyBookmarksPerRowSetting(bookmarksPerRow);

  // Apply content margin setting
  const contentMargin = localStorage.getItem("contentMargin") || "32";
  applyContentMargin(contentMargin);

  // Apply bookmark size setting
  const bookmarkSize = localStorage.getItem("bookmarkSize") || "medium";
  applyBookmarkSize(bookmarkSize);

  // Apply show bookmark flags setting
  const showIndicators = JSON.parse(localStorage.getItem("showIndicators") || "true");
  toggleBookmarkIndicatorsVisibility(showIndicators);

  // Hide or show the entire filters section based on the setting:
  const filtersSection = document.querySelector(".bookmark-filters");
  if (filtersSection) {
    filtersSection.style.display = showIndicators ? "flex" : "none";
  }

  // Apply URL tooltip setting
  const showUrlTooltip = JSON.parse(localStorage.getItem("showUrlTooltip") || "true");
  if (!showUrlTooltip) {
    document.body.classList.add("disable-tooltip");
  } else {
    document.body.classList.remove("disable-tooltip");
  }

  // Apply hover animation setting
  const enableHoverAnimation = JSON.parse(localStorage.getItem("enableHoverAnimation") || "true");
  if (!enableHoverAnimation) {
    document.body.classList.add("disable-hover-animation");
  } else {
    document.body.classList.remove("disable-hover-animation");
  }

  // Enforce Hide Move Button setting (this ensures that after re-rendering, the move buttons stay hidden if needed)
  applyMoveButtonVisibility();

  // Apply sidebar width
  const sidebarWidth = localStorage.getItem("sidebarWidth");
  if (sidebarWidth) {
    const sidebar = getElement("sidebar");
    const mainContent = getElement("main-content");
    sidebar.style.width = sidebarWidth;
    mainContent.style.width = `calc(100% - ${sidebarWidth})`;
}
}
/**
 * Applies the selected theme by updating the body class.
 * @param {string} themeClass - The class name of the selected theme.
 */
function applyTheme(themeClass) {
  document.body.classList.remove(
    "theme-default",
    "theme-light",
    "theme-legacy"
  );
  document.body.classList.add(themeClass);
}

/**
 * Restores the default button color.
 */
function restoreDefaultButtonColor() {
  // Reset to default color
  const defaultColor = "#db772a"; // Default value
  getElement("buttonColorPicker").value = defaultColor;
  localStorage.setItem("buttonColor", defaultColor);
  applySettings();
}

/**
 * Lightens or darkens a hex color by a given percentage.
 * @param {string} color - The hex color code (e.g., "#ff0000").
 * @param {number} percent - The percentage to lighten or darken the color (positive to lighten, negative to darken).
 * @returns {string} The adjusted hex color code.
 */
function adjustColor(color, percent) {
  // Ensure color is in the correct format
  color = color.startsWith("#") ? color.slice(1) : color;
  if (color.length === 3) {
    color = color
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const num = parseInt(color, 16);

  const amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let G = ((num >> 8) & 0x00ff) + amt;
  let B = (num & 0x0000ff) + amt;

  R = Math.max(0, Math.min(255, R));
  G = Math.max(0, Math.min(255, G));
  B = Math.max(0, Math.min(255, B));

  return (
    "#" +
    (
      R.toString(16).padStart(2, "0") +
      G.toString(16).padStart(2, "0") +
      B.toString(16).padStart(2, "0")
    ).toUpperCase()
  );
}

/**
 * Inserts hyphens into long words to improve text wrapping.
 * @param {string} text - The text to process.
 * @returns {string} The processed text with hyphens, or an empty string if input is invalid.
 */
function insertHyphensIntoLongWords(text) {
  if (!text || typeof text !== 'string') {
    console.error("insertHyphensIntoLongWords: invalid text provided", text);
    return "";
  }
  return text.replace(/\b(\w{12,})\b/g, function (match) {
    return match.replace(/(.{12})/g, "$1-");
  });
}

/**
 * Updates the favicon of a bookmark in storage if it is missing.
 * @param {string} url - The URL of the bookmark.
 * @param {string} icon - The fetched favicon data URL.
 */
function updateBookmarkFavicon(url, icon) {
  const folders = getFolders();
  let updated = false;
  folders.forEach(folder => {
    folder.bookmarks.forEach(bookmark => {
      if (bookmark.url === url && !bookmark.favicon) {
        bookmark.favicon = icon;
        updated = true;
      }
    });
  });
  if (updated) {
    setFolders(folders);
    renderBookmarks();
  }
}

/**
 * Adds a bookmark directly with specified parameters.
 * Used by the browser bookmarks import feature.
 * @param {string} label - The bookmark label.
 * @param {string} url - The bookmark URL.
 * @param {number} flags - The bookmark flags (default 0).
 * @param {string|null} favicon - The favicon URL (optional).
 */
function addBookmarkDirect(label, url, flags = 0, favicon = null) {
  const folders = getFolders();
  const currentFolder = getCurrentFolder();
  
  let folder = folders.find(f => f.name === currentFolder);
  if (!folder) {
    folder = { name: currentFolder, bookmarks: [] };
    folders.push(folder);
  }
  
  folder.bookmarks.push({
    label: label,
    url: url,
    flags: flags,
    favicon: favicon
  });
  
  setFolders(folders);
  
  // Try to fetch favicon if not provided
  if (!favicon) {
    getFavicon(url).then(icon => {
      if (icon) {
        updateBookmarkFavicon(url, icon);
      }
    }).catch(error => {
      console.error('Error fetching favicon:', error);
    });
  }
}

/**
 * Converts bookmarks to CSV format.
 * @param {Array} bookmarks - The array of folders with bookmarks.
 * @returns {string} The CSV string.
 */
function convertBookmarksToCSV(bookmarks) {
  const rows = ["Folder,Label,URL"];
  bookmarks.forEach((folder) => {
    folder.bookmarks.forEach((bookmark) => {
      const row = `"${folder.name}","${bookmark.label}","${bookmark.url}"`;
      rows.push(row);
    });
  });
  return rows.join("\n");
}

/**
 * Converts bookmarks to HTML format.
 * @param {Array} bookmarks - The array of folders with bookmarks.
 * @returns {string} The HTML string.
 */
function convertBookmarksToHTML(bookmarks) {
  let html = "<!DOCTYPE NETSCAPE-Bookmark-file-1>\n";
  html +=
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n';
  html += "<TITLE>Bookmarks</TITLE>\n";
  html += "<H1>Bookmarks</H1>\n";
  html += "<DL><p>\n";

  bookmarks.forEach((folder) => {
    html += `<DT><H3>${folder.name}</H3>\n`;
    html += "<DL><p>\n";
    folder.bookmarks.forEach((bookmark) => {
      html += `<DT><A HREF="${bookmark.url}">${bookmark.label}</A>\n`;
    });
    html += "</DL><p>\n";
  });

  html += "</DL><p>\n";
  return html;
}

/**
 * Downloads a file with the given content and filename.
 * @param {string} dataStr - The content of the file.
 * @param {string} fileName - The name of the file.
 * @param {string} mimeType - The MIME type of the file.
 */
function downloadFile(dataStr, fileName, mimeType) {
  const blob = new Blob([dataStr], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function exportBookmarks() {
  const formatSelect = getElement("export-format");
  const format = formatSelect.value;
  const bookmarks = getFolders();

  let dataStr;
  let fileName;
  
  // Generate timestamp for filename
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const timestamp = `home-screen-export-${year}-${month}-${day}-${hour}-${minute}`;

  switch (format) {
    case "json":
      dataStr = JSON.stringify(bookmarks, null, 2);
      fileName = `${timestamp}.json`;
      downloadFile(dataStr, fileName, "application/json");
      break;
    case "csv":
      dataStr = convertBookmarksToCSV(bookmarks);
      fileName = `${timestamp}.csv`;
      downloadFile(dataStr, fileName, "text/csv");
      break;
    case "html":
      dataStr = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
      <!-- This is an automatically generated file.
           It will be read and overwritten.
           DO NOT EDIT! -->
      <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
      <TITLE>Bookmarks</TITLE>
      <H1>Bookmarks</H1>
      ${convertBookmarksToHTML(bookmarks)}`;
        fileName = `${timestamp}.html`;
        downloadFile(dataStr, fileName, "text/html");
        break;
    default:
      alert("Unsupported export format.");
      return;
  }
  // Notify the user that the export has been initiated
  alert(`Export successful! Your file "${fileName}" has been generated.`);
}

/**
 * Imports bookmarks from a file.
 * Supports both the old format (array of bookmarks) and the new format (array of folders).
 */
function importBookmarks(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result);
      if (Array.isArray(importedData)) {
        if (
          importedData.length > 0 &&
          importedData[0].label &&
          importedData[0].url
        ) {
          // Old format detected: Array of bookmarks
          const adjustedBookmarks = [
            {
              name: "Imported",
              bookmarks: importedData,
            },
          ];
          mergeAndImportBookmarks(adjustedBookmarks);
        } else if (
          importedData.length > 0 &&
          importedData[0].name &&
          importedData[0].bookmarks
        ) {
          // New format detected: Array of folders
          mergeAndImportBookmarks(importedData);
        } else {
          alert("Invalid bookmarks file structure.");
        }
      } else {
        alert("Invalid bookmarks file.");
      }
    } catch (error) {
      console.error("Error importing bookmarks:", error);
      alert("Failed to import bookmarks.");
    }
  };
  reader.readAsText(file);
  // Reset the file input
  event.target.value = "";
}

/**
 * Merges the imported bookmarks with existing ones and saves them.
 * @param {Array} importedData - The imported bookmarks data.
 */
function mergeAndImportBookmarks(importedData) {
  const existingFolders = getFolders();
  const mergedFolders = mergeFolders(existingFolders, importedData);

  // Ensure 'flags' is defined:
  mergedFolders.forEach((folder) => {
    folder.bookmarks.forEach((bm) => {
      if (bm.flags === undefined) {
        bm.flags = 0;
      }
    });
  });

  setFolders(mergedFolders);
  renderBookmarks();
  alert("Bookmarks imported successfully!");
}

/**
 * Allows importing bookmarks from HTML export files generated by browsers like Chrome and Firefox
 */
// Function to parse Netscape Bookmark HTML file
function parseBookmarksHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const bookmarks = [];
  
  // Process all A tags (bookmarks)
  const links = doc.querySelectorAll('a');
  links.forEach(link => {
    const url = link.getAttribute('href');
    // Skip mailto links
    if (url && !url.startsWith('mailto:')) {
      const label = link.textContent.trim();
      const addDate = link.getAttribute('add_date');
      const icon = link.getAttribute('icon');
      
      bookmarks.push({
        url: url,
        label: label || truncateUrl(url),
        flags: 0, // Default flags
        favicon: icon || null
      });
    }
  });
  
  return bookmarks;
}

// Function to handle browser bookmarks import
function importBrowserBookmarks() {
  const fileInput = document.getElementById('browser-bookmarks-input');
  
  // Set up the change event handler if not already done
  if (!fileInput.hasAttribute('data-handler-attached')) {
    fileInput.addEventListener('change', async (event) => {
      try {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const html = e.target.result;
            const bookmarks = parseBookmarksHTML(html);
            
            if (bookmarks.length === 0) {
              showToast('No valid bookmarks found in the file.');
              return;
            }
            
            // Show import options modal
            showImportOptionsModal(bookmarks);
          } catch (error) {
            console.error('Error parsing bookmarks:', error);
            showToast('Failed to parse bookmarks file.');
          }
        };
        
        reader.readAsText(file);
      } catch (error) {
        console.error('Error reading file:', error);
        showToast('Failed to read the file.');
      }
    });
    fileInput.setAttribute('data-handler-attached', 'true');
  }
  
  fileInput.click();
}

// Function to show import options modal
function showImportOptionsModal(bookmarks) {
  const modal = createModal('Import Bookmarks', false);
  const content = document.createElement('div');
  content.className = 'import-options';
  
  // Get current folder and other folders (filter out duplicate of current folder)
  const currentFolder = getCurrentFolder();
  const allFolders = getFolders();
  const otherFolders = allFolders.filter(folder => folder.name !== currentFolder);
  
  // Create folder selection dropdown without duplicating current folder
  const folderSelection = document.createElement('div');
  folderSelection.className = 'form-group';
  folderSelection.innerHTML = `
    <label for="import-folder">Import to folder:</label>
    <select id="import-folder">
      <option value="${currentFolder}">${currentFolder}</option>
      <option value="new">Create new folder</option>
      ${otherFolders.map(folder => `<option value="${folder.name}">${folder.name}</option>`).join('')}
    </select>
  `;
  
  // Create new folder input (initially hidden)
  const newFolderInput = document.createElement('div');
  newFolderInput.className = 'form-group hidden';
  newFolderInput.innerHTML = `
    <label for="new-folder-name">New folder name:</label>
    <input type="text" id="new-folder-name" placeholder="Enter folder name">
  `;
  
  // Show statistics
  const stats = document.createElement('div');
  stats.className = 'import-stats';
  stats.innerHTML = `<p>Found ${bookmarks.length} bookmarks to import.</p>`;
  
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'form-group';
  
  const importButton = document.createElement('button');
  importButton.className = 'btn';
  importButton.textContent = 'Import';
  importButton.addEventListener('click', () => {
    const importFolderSelect = folderSelection.querySelector('#import-folder');
    let targetFolder = importFolderSelect.value;
    
    if (targetFolder === 'new') {
      const newFolderInputField = newFolderInput.querySelector('#new-folder-name');
      const newFolderName = newFolderInputField.value.trim();
      if (!newFolderName) {
        showToast('Please enter a folder name.');
        return;
      }
      addFolder(newFolderName);
      targetFolder = newFolderName;
    }
    
    // Merge bookmarks into target folder with duplicate checking
    let importedCount = 0;
    let duplicateCount = 0;
    let folders = getFolders();
    let targetFolderObj = folders.find(f => f.name === targetFolder);
    if (!targetFolderObj) {
      targetFolderObj = { name: targetFolder, bookmarks: [] };
      folders.push(targetFolderObj);
    }
    bookmarks.forEach(bookmark => {
      if (targetFolderObj.bookmarks.some(b => b.url === bookmark.url && b.label === bookmark.label)) {
        duplicateCount++;
      } else {
        targetFolderObj.bookmarks.push(bookmark);
        importedCount++;
      }
    });
    setFolders(folders);
    renderBookmarks();
    // Close only this import modal without affecting global overlay
    modal.parentNode.removeChild(modal);
    const duplicateMessage = duplicateCount > 0 ? `, ${duplicateCount} duplicates ignored` : `, no duplicates found`;
    showToast(`Imported ${importedCount + duplicateCount} bookmarks to "${targetFolder}"${duplicateMessage}`);
  });
  
  const cancelButton = document.createElement('button');
  cancelButton.className = 'btn btn-danger';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', () => {
    // Close only this import modal
    modal.parentNode.removeChild(modal);
  });
  
  buttonGroup.appendChild(importButton);
  buttonGroup.appendChild(cancelButton);
  
  content.appendChild(stats);
  content.appendChild(folderSelection);
  content.appendChild(newFolderInput);
  content.appendChild(buttonGroup);
  modal.appendChild(content);
  
  // Append modal to document without activating the global overlay
  document.body.appendChild(modal);
  
  // Add event listener for folder selection change to toggle new folder input
  const importFolderSelect = folderSelection.querySelector('#import-folder');
  importFolderSelect.addEventListener('change', (e) => {
    if (e.target.value === 'new') {
      newFolderInput.classList.remove('hidden');
    } else {
      newFolderInput.classList.add('hidden');
    }
  });
}

// Merges two arrays of folders, combining bookmarks in folders with the same name.
function mergeFolders(existingFolders, importedFolders) {
  const folderMap = {};

  // --- FIX: Ensure existingFolders is an array --- 
  if (Array.isArray(existingFolders)) {
      // Add existing folders to the map
      existingFolders.forEach((folder) => {
          // Ensure folder has a name and bookmarks array
          if (folder && typeof folder.name === 'string' && Array.isArray(folder.bookmarks)) {
              folderMap[folder.name] = folder.bookmarks;
          }
      });
  } else {
      console.warn("mergeFolders: existingFolders was not an array", existingFolders);
  }
  // --- End FIX ---

  // Merge imported folders
  if (Array.isArray(importedFolders)) { // Also check importedFolders
    importedFolders.forEach((folder) => {
       // Ensure imported folder has a name and bookmarks array
      if (folder && typeof folder.name === 'string' && Array.isArray(folder.bookmarks)) {
          const folderName = folder.name;
          const importedBookmarks = folder.bookmarks;

          if (folderMap[folderName]) {
            // Avoid duplicates when merging bookmarks
            const existingBookmarks = folderMap[folderName];
            importedBookmarks.forEach((bookmark) => {
              if (
                !existingBookmarks.some(
                  (b) => b.label === bookmark.label && b.url === bookmark.url
                )
              ) {
                existingBookmarks.push(bookmark);
              }
            });
          } else {
            folderMap[folderName] = [...importedBookmarks]; // Copy imported bookmarks
          }
      }
    });
  } else {
      console.warn("mergeFolders: importedFolders was not an array", importedFolders);
  }

  // Convert the map back to an array
  return Object.keys(folderMap).map((folderName) => ({
    name: folderName,
    bookmarks: folderMap[folderName],
    children: [] // Ensure new folders also get a children array
  }));
}

/**
 * Clears all bookmarks after user confirmation.
 */
function clearAllBookmarks() {
  const isConfirmed = confirm(
    "This action will permanently delete all bookmarks and folders. Are you sure?"
  );
  if (isConfirmed) {
    clearFolders();
    renderBookmarks();
    showNotification("All bookmarks and folders have been cleared.");
  }
}

/**
 * Clears all folders from localStorage
 */
function clearFolders() {
  localStorage.removeItem("folders");
}

/**
 * Shows a notification to the user
 * @param {string} message - The message to display
 */
function showNotification(message) {
  // Use existing notification system or fallback to alert
  if (typeof showToast === 'function') {
    showToast(message);
  } else {
    // Simple notification display
    const notification = getElement('popup-notification');
    if (notification) {
      notification.textContent = message;
      notification.style.display = 'block';
      notification.style.opacity = '1';
      
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          notification.style.display = 'none';
        }, 300);
      }, 3000);
    } else {
      alert(message);
    }
  }
}

/**
 * Applies the content margin setting to the main content area.
 * @param {string} marginValue - The margin value in pixels.
 */
function applyContentMargin(marginValue) {
  const mainContent = getElement("main-content");
  const hideToDoList = localStorage.getItem("hideToDoList") === "true";
  marginValue = marginValue || "32";
  if (hideToDoList) {
    mainContent.style.marginLeft = `${marginValue}px`;
  } else {
    mainContent.style.marginLeft = "";
  }
  mainContent.style.marginRight = `${marginValue}px`;
}

/**
 * Applies the bookmark size setting to the bookmarks container.
 * @param {string} size - The selected size ('minimal', 'small', 'medium', 'large').
 */
function applyBookmarkSize(size) {
  const bookmarksContainer = getElement("bookmarks-container");
  bookmarksContainer.classList.remove(
    "bookmark-size-minimal",
    "bookmark-size-small",
    "bookmark-size-medium",
    "bookmark-size-large"
  );
  bookmarksContainer.classList.add(`bookmark-size-${size}`);
}

// File checker with notification
document
  .getElementById("backgroundUpload")
  .addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const maxSize = 3.67 * 1024 * 1024; // 3.8 MB in bytes
    const allowedFormats = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
    ];

    if (file.size > maxSize || !allowedFormats.includes(file.type)) {
      alert(
        "Image is too big or format is wrong. Please try again with a BMP, PNG, JPEG, or GIF file under 3.8MB."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      tempCustomBackground = e.target.result;
      tempSelectedBackground = "custom";
      previewBackground("custom");
    };
    reader.readAsDataURL(file);
  });

  function applyFiltersAndSearch() {
    const searchQuery = getElement("search-input").value.toLowerCase().trim();
    // Use the checkbox state for determining scope:
    const allFoldersChecked = getElement("filterAllFolders").checked;
    let folders = getFolders();
  
    // Gather bookmarks either from all folders or just the current folder
    let allBookmarks = [];
    if (allFoldersChecked) {
      // All folders scope
      folders.forEach((folder) => {
        // Tag each bookmark with its folder name for later use
        allBookmarks.push(
          ...folder.bookmarks.map((b) => ({
            ...b,
            folderName: folder.name,
          }))
        );
      });
    } else {
      // Only the current folder scope
      const currentFolder = getCurrentFolder();
      const folder = folders.find((f) => f.name === currentFolder);
      if (folder) {
        allBookmarks = folder.bookmarks.map((b) => ({
          ...b,
          folderName: folder.name,
        }));
      }
    }
  
    // Apply any bit-filter if set (e.g., starred, read)
    let filtered = [...allBookmarks];
    if (currentFilter === "starred") {
      filtered = filtered.filter((b) => hasBitSet(b.flags, BIT_FAVORITE));
    } else if (currentFilter === "notstarred") {
      filtered = filtered.filter((b) => !hasBitSet(b.flags, BIT_FAVORITE));
    } else if (currentFilter === "eye") {
      filtered = filtered.filter((b) => !hasBitSet(b.flags, BIT_READ));
    } else if (currentFilter === "book") {
      filtered = filtered.filter((b) => hasBitSet(b.flags, BIT_READ));
    }
  
    // Then apply text search
    if (searchQuery) {
      filtered = filtered.filter((bookmark) => {
        // Safety check in case bookmark data is missing
        if (!bookmark || !bookmark.label || !bookmark.url) return false;
        const labelMatch = bookmark.label.toLowerCase().includes(searchQuery);
        const urlMatch = bookmark.url.toLowerCase().includes(searchQuery);
        return labelMatch || urlMatch;
      });
    }
  
    // Render the results in the main container
    const container = getElement("bookmarks-container");
    container.innerHTML = "";
  
    // Update the heading to reflect the results scope and count
    if (currentFilter || searchQuery) {
      getElement("currentFolderName").textContent = `Results (${filtered.length})`;
    } else {
      getElement("currentFolderName").textContent = `Current Folder: ${getCurrentFolder()}`;
    }
  
    filtered.forEach((bookmarkObj, index) => {
      const bookmarkDiv = createBookmarkElement(bookmarkObj, index);
      container.appendChild(bookmarkDiv);
    });
  
    // Disable dragging if in search mode
    if (searchQuery) {
      const bookmarkCards = container.querySelectorAll(".bookmark-card");
      bookmarkCards.forEach(card => {
        card.setAttribute("draggable", "false");
      });
    }
  
    // Maintain indicator visibility
    const showInd = JSON.parse(localStorage.getItem("showIndicators") || "true");
    toggleBookmarkIndicatorsVisibility(showInd);
  }
  

// -- Helper to set the current filter, highlight the clicked button, then re-apply all logic
function setFilter(filterType, buttonOrId) {
  currentFilter = filterType;
  removeActiveFilterClass(); // remove highlight from all filter buttons
  getElement(buttonOrId).classList.add("filter-active");
  applyFiltersAndSearch();
}

// -- Remove the "filter-active" class from all four filter buttons
function removeActiveFilterClass() {
  const filterButtons = [
    "showStarredBtn",
    "showNotStarredBtn",
    "showEyeBtn",
    "showBookBtn",
  ];
  filterButtons.forEach((btnId) => {
    getElement(btnId).classList.remove("filter-active");
  });
}

// 1.11 SEARCH

/**
 * Searches all folders' bookmarks by label or URL
 * and displays the matches in the main container.
 */
function handleSearch() {
  const searchInput = getElement("search-input");
  const query = searchInput.value.toLowerCase().trim();
  const allFoldersCheckbox = getElement("filterAllFolders");

  // If a query is present, force the "All Folders" checkbox to be checked.
  if (query) {
    allFoldersCheckbox.checked = true;
  }
  // Proceed with filtering and searching based on the current checkbox state.
  applyFiltersAndSearch();
}


function toggleSearchClearButton() {
  const searchValue = getElement("search-input").value.trim();
  getElement("search-clear").style.display = searchValue ? "block" : "none";
}

/* --- Additional Helper Functions --- */

// Minimal implementation for creating a modal
function createModal(title, useOverlay = true) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  // Store whether this modal should activate the overlay
  modal.dataset.useOverlay = useOverlay;
  
  const header = document.createElement('div');
  header.className = 'modal-header';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  const closeButton = document.createElement('button');
  closeButton.className = 'modal-close-button btn';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => {
    if (modal.dataset.useOverlay === "true") {
      closeModal();
    } else {
      // For modals without overlay, remove only this modal element
      modal.parentNode.removeChild(modal);
    }
  });
  header.appendChild(h2);
  header.appendChild(closeButton);
  modal.appendChild(header);
  return modal;
}

function closeModal() {
  const modal = document.querySelector('.modal');
  if (modal) {
    modal.parentNode.removeChild(modal);
  }
  const overlay = getElement("modalOverlay");
  if (overlay) {
    overlay.classList.remove("active");
  }
}


// Minimal implementation for showing toast notifications
function showToast(message) {
  alert(message);
}

// Stub for additional import options if needed
function addImportOption() {
  // This can be expanded to add more import options in the future.
}

// Minimal implementation for previewing background changes
function previewBackground(choice) {
  updateBackground(choice);
}

// ===========================================
// 10. GOOGLE BACKUP & SYNC FUNCTIONALITY
// ===========================================

/**
 * Google Backup Module - Manages Google Drive integration for bookmark backup and sync
 * Follows functional programming principles with pure functions and immutable data
 */
const GoogleBackupManager = (() => {
  
  // Constants and Configuration
  const GOOGLE_CLIENT_ID = '598668005147-9bu64rbob7ga4262cv43ene1q2b0qn30.apps.googleusercontent.com';
  const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email'
  ].join(' ');
  
  const BACKUP_FOLDER_NAME = 'HomeScreen-Bookmarks-Backup';
  const BACKUP_FILE_PREFIX = 'bookmarks-backup';
  const AUTO_BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  // State Management - Immutable approach
  let authState = {
    isSignedIn: false,
    userEmail: null,
    accessToken: null,
    lastBackupTime: null,
    autoBackupEnabled: false
  };

  // Pure Functions for State Management
  const createAuthState = (updates) => ({
    ...authState,
    ...updates,
    lastUpdated: Date.now()
  });

  const updateAuthState = (updates) => {
    authState = createAuthState(updates);
    persistAuthState();
    return authState;
  };

  const getAuthState = () => ({ ...authState });

  // Storage Utilities - Following DRY principle
  const persistAuthState = () => {
    try {
      localStorage.setItem('googleBackupAuthState', JSON.stringify(authState));
    } catch (error) {
      console.warn('Failed to persist auth state:', error);
    }
  };

  const loadPersistedAuthState = () => {
    try {
      const stored = localStorage.getItem('googleBackupAuthState');
      if (stored) {
        const parsed = JSON.parse(stored);
        authState = { ...authState, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load persisted auth state:', error);
    }
  };

  // Authentication Methods - Encapsulated conditions
  const isUserAuthenticated = () => authState.isSignedIn && !!authState.accessToken;
  
  const isTokenExpired = () => {
    // Simple token expiration check - in real implementation, check actual token expiry
    return !authState.accessToken || (Date.now() - authState.lastUpdated > 3600000);
  };

  const shouldPerformAutoBackup = () => {
    if (!authState.autoBackupEnabled || !isUserAuthenticated()) return false;
    if (!authState.lastBackupTime) return true;
    return (Date.now() - authState.lastBackupTime) >= AUTO_BACKUP_INTERVAL;
  };

  // UI Update Functions - Pure rendering
  const renderAuthenticationStatus = () => {
    const notSignedInEl = getElement('notSignedIn');
    const signedInEl = getElement('signedIn');
    const backupActionsEl = getElement('backupActions');
    const userEmailEl = getElement('userEmail');

    if (isUserAuthenticated()) {
      notSignedInEl.style.display = 'none';
      signedInEl.style.display = 'block';
      backupActionsEl.style.display = 'block';
      userEmailEl.textContent = authState.userEmail || 'Unknown User';
    } else {
      notSignedInEl.style.display = 'block';
      signedInEl.style.display = 'none';
      backupActionsEl.style.display = 'none';
    }
  };

  const displayStatusMessage = (message, type = 'info') => {
    const statusEl = getElement('googleBackupStatus');
    statusEl.textContent = message;
    statusEl.className = `backup-status ${type}`;
    
    // Auto-clear success/error messages after 5 seconds
    if (type !== 'loading') {
      setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'backup-status';
      }, 5000);
    }
  };

  const clearStatusMessage = () => {
    const statusEl = getElement('googleBackupStatus');
    statusEl.textContent = '';
    statusEl.className = 'backup-status';
  };

  // Google API Integration - Following functional patterns
  const initializeGoogleAPI = async () => {
    try {
      // No need to load external Google API scripts
      // Chrome Identity API is built-in
      return true;
    } catch (error) {
      console.error('Failed to initialize Google services:', error);
      displayStatusMessage('Failed to initialize Google services.', 'error');
      return false;
    }
  };

  const authenticateUser = async () => {
    try {
      displayStatusMessage('Connecting to Google...', 'loading');
      
      const token = await chrome.identity.getAuthToken({
        interactive: true,
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/userinfo.email'
        ]
      });
  
      // Get user info using the token
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const userInfo = await userResponse.json();
      
      updateAuthState({
        isSignedIn: true,
        userEmail: userInfo.email,
        accessToken: token
      });
  
      renderAuthenticationStatus();
      displayStatusMessage('Successfully connected to Google!', 'success');
      
      await loadBackupHistory();
      
    } catch (error) {
      console.error('Authentication failed:', error);
      displayStatusMessage('Failed to connect to Google. Please try again.', 'error');
    }
  };
  
  const signOutUser = async () => {
    try {
      await chrome.identity.removeCachedAuthToken({
        token: authState.accessToken
      });
      
      updateAuthState({
        isSignedIn: false,
        userEmail: null,
        accessToken: null
      });
  
      renderAuthenticationStatus();
      clearBackupHistory();
      displayStatusMessage('Successfully signed out.', 'success');
      
    } catch (error) {
      console.error('Sign out failed:', error);
      displayStatusMessage('Failed to sign out. Please try again.', 'error');
    }
  };
  

  // Backup Creation - Pure data transformation
  const createBackupData = () => {
    const folders = getFolders();
    const currentFolder = getCurrentFolder();
    const settings = {
      buttonColor: localStorage.getItem('buttonColor'),
      textSize: localStorage.getItem('textSize'),
      backgroundChoice: localStorage.getItem('backgroundChoice'),
      bookmarkSize: localStorage.getItem('bookmarkSize'),
      bookmarksPerRow: localStorage.getItem('bookmarksPerRow'),
      showIndicators: localStorage.getItem('showIndicators'),
      openInNewTab: localStorage.getItem('openInNewTab'),
      hideTextMuted: localStorage.getItem('hideTextMuted'),
      hideToDoList: localStorage.getItem('hideToDoList')
    };

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      folders,
      currentFolder,
      settings,
      metadata: {
        totalBookmarks: folders.reduce((sum, folder) => sum + folder.bookmarks.length, 0),
        totalFolders: folders.length,
        createdBy: 'HomeScreen Dashboard Extension'
      }
    };
  };

  const validateBackupData = (data) => {
    const requiredFields = ['version', 'timestamp', 'folders'];
    return requiredFields.every(field => data.hasOwnProperty(field));
  };

  // Google Drive Operations - Following error handling best practices
  const findOrCreateBackupFolder = async () => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
        {
          headers: {
            'Authorization': `Bearer ${authState.accessToken}`
          }
        }
      );
  
      const result = await response.json();
  
      if (result.files && result.files.length > 0) {
        return result.files[0].id;
      }
  
      // Create new backup folder
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: BACKUP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });
  
      const createResult = await createResponse.json();
      return createResult.id;
    } catch (error) {
      console.error('Failed to find or create backup folder:', error);
      throw new Error('Failed to access Google Drive folder');
    }
  };

  const uploadBackupToGoogleDrive = async (backupData) => {
    try {
      const folderId = await findOrCreateBackupFolder();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${BACKUP_FILE_PREFIX}-${timestamp}.json`;

      const fileMetadata = {
        name: fileName,
        parents: [folderId],
        description: `HomeScreen bookmarks backup created on ${new Date().toLocaleString()}`
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(fileMetadata)], {type: 'application/json'}));
      form.append('file', new Blob([JSON.stringify(backupData, null, 2)], {type: 'application/json'}));

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      updateAuthState({
        lastBackupTime: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Failed to upload backup to Google Drive:', error);
      throw new Error('Failed to upload backup to Google Drive');
    }
  };

  const createBackup = async () => {
    if (!isUserAuthenticated()) {
      displayStatusMessage('Please sign in to Google first.', 'error');
      return;
    }

    try {
      displayStatusMessage('Creating backup...', 'loading');
      
      const backupData = createBackupData();
      const result = await uploadBackupToGoogleDrive(backupData);
      
      displayStatusMessage(`Backup created successfully! File: ${result.name}`, 'success');
      await loadBackupHistory();
      
    } catch (error) {
      console.error('Backup creation failed:', error);
      displayStatusMessage('Failed to create backup. Please try again.', 'error');
    }
  };

  // Backup Restoration - Following functional patterns
  const downloadBackupFromGoogleDrive = async (fileId) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${authState.accessToken}`
          }
        }
      );
  
      const text = await response.text();
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to download backup from Google Drive:', error);
      throw new Error('Failed to download backup from Google Drive');
    }
  };
  

  const restoreFromBackupData = (backupData) => {
    if (!validateBackupData(backupData)) {
      throw new Error('Invalid backup data format');
    }

    try {
      // Restore folders and bookmarks
      setFolders(backupData.folders);
      
      // Restore current folder if it exists
      if (backupData.currentFolder && backupData.folders.some(f => f.name === backupData.currentFolder)) {
        setCurrentFolder(backupData.currentFolder);
      }

      // Restore settings if available
      if (backupData.settings) {
        Object.entries(backupData.settings).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            localStorage.setItem(key, value);
          }
        });
      }

      // Re-render the interface
      renderBookmarks();
      applySettings();
      updateCurrentFolderName();
      
      return true;
    } catch (error) {
      console.error('Failed to restore backup data:', error);
      throw new Error('Failed to restore backup data');
    }
  };

  const restoreFromBackup = async (fileId) => {
    if (!isUserAuthenticated()) {
      displayStatusMessage('Please sign in to Google first.', 'error');
      return;
    }

    const userConfirmed = confirm(
      'This will replace all your current bookmarks and settings with the backup. Are you sure you want to continue?'
    );

    if (!userConfirmed) {
      return;
    }

    try {
      displayStatusMessage('Restoring from backup...', 'loading');
      
      const backupData = await downloadBackupFromGoogleDrive(fileId);
      restoreFromBackupData(backupData);
      
      displayStatusMessage('Backup restored successfully!', 'success');
      
    } catch (error) {
      console.error('Backup restoration failed:', error);
      displayStatusMessage('Failed to restore backup. Please try again.', 'error');
    }
  };

  // Backup History Management
  const loadBackupHistory = async () => {
    if (!isUserAuthenticated()) {
      return;
    }
  
    try {
      const folderId = await findOrCreateBackupFolder();
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name contains '${BACKUP_FILE_PREFIX}' and trashed=false&orderBy=createdTime desc&fields=files(id,name,createdTime,size)&pageSize=10`,
        {
          headers: {
            'Authorization': `Bearer ${authState.accessToken}`
          }
        }
      );
  
      const result = await response.json();
      renderBackupHistory(result.files);
    } catch (error) {
      console.error('Failed to load backup history:', error);
      renderBackupHistory([]);
    }
  };

  const renderBackupHistory = (backups) => {
    const historyEl = getElement('backupHistory');
    
    if (!backups || backups.length === 0) {
      historyEl.innerHTML = '<p class="setting-description">No backups found.</p>';
      return;
    }

    const historyHTML = backups.map(backup => {
      const date = new Date(backup.createdTime).toLocaleString();
      const size = backup.size ? `${Math.round(backup.size / 1024)} KB` : 'Unknown size';
      
      return `
        <div class="backup-item">
          <div>
            <div class="backup-date">${date}</div>
            <div class="backup-size">${size}</div>
          </div>
          <button class="backup-restore-btn" onclick="GoogleBackupManager.restoreFromBackup('${backup.id}')">
            Restore
          </button>
        </div>
      `;
    }).join('');

    historyEl.innerHTML = historyHTML;
  };

  const clearBackupHistory = () => {
    const historyEl = getElement('backupHistory');
    historyEl.innerHTML = '<p class="setting-description">Sign in to view backup history.</p>';
  };

  // Auto-backup functionality
  const enableAutoBackup = () => {
    updateAuthState({ autoBackupEnabled: true });
    scheduleNextAutoBackup();
  };

  const disableAutoBackup = () => {
    updateAuthState({ autoBackupEnabled: false });
    clearAutoBackupSchedule();
  };

  let autoBackupTimeoutId = null;

  const scheduleNextAutoBackup = () => {
    clearAutoBackupSchedule();
    
    if (!authState.autoBackupEnabled || !isUserAuthenticated()) {
      return;
    }

    const nextBackupTime = authState.lastBackupTime 
      ? authState.lastBackupTime + AUTO_BACKUP_INTERVAL 
      : Date.now() + AUTO_BACKUP_INTERVAL;
    
    const timeUntilNextBackup = Math.max(0, nextBackupTime - Date.now());
    
    autoBackupTimeoutId = setTimeout(async () => {
      if (shouldPerformAutoBackup()) {
        await createBackup();
      }
      scheduleNextAutoBackup(); // Schedule the next backup
    }, timeUntilNextBackup);
  };

  const clearAutoBackupSchedule = () => {
    if (autoBackupTimeoutId) {
      clearTimeout(autoBackupTimeoutId);
      autoBackupTimeoutId = null;
    }
  };

  // Event Handlers - Following encapsulation principles
  const setupEventHandlers = () => {
    // Google Backup Button
    safeAddEventListener('GoogleBackupButton', 'click', () => {
      showModal('googleBackupModal');
    });

    // Modal Close Button
    safeAddEventListener('closeGoogleBackupModal', 'click', () => {
      closeModal();
    });

    // Authentication Buttons
    safeAddEventListener('googleSignInButton', 'click', authenticateUser);
    safeAddEventListener('googleSignOutButton', 'click', signOutUser);

    // Backup Action Buttons
    safeAddEventListener('createBackupButton', 'click', createBackup);
    safeAddEventListener('restoreBackupButton', 'click', () => {
      displayStatusMessage('Please select a backup from the history below to restore.', 'info');
    });

    // Auto-backup Toggle
    safeAddEventListener('autoBackupToggle', 'change', (event) => {
      if (event.target.checked) {
        enableAutoBackup();
        displayStatusMessage('Auto-backup enabled. Daily backups will be created automatically.', 'success');
      } else {
        disableAutoBackup();
        displayStatusMessage('Auto-backup disabled.', 'success');
      }
    });
  };

  // Public API - Following module pattern
  const publicAPI = {
    // Core functionality
    init: async () => {
      loadPersistedAuthState();
      setupEventHandlers();
      
      // Initialize without loading external scripts
      await initializeGoogleAPI();
      renderAuthenticationStatus();
      
      // Update auto-backup toggle state
      const autoBackupToggle = getElement('autoBackupToggle');
      if (autoBackupToggle) {
        autoBackupToggle.checked = authState.autoBackupEnabled;
      }
      
      // Schedule auto-backup if enabled
      if (authState.autoBackupEnabled && isUserAuthenticated()) {
        scheduleNextAutoBackup();
      }
    },

    // Exposed methods for external use
    createBackup,
    restoreFromBackup,
    getAuthState,
    isUserAuthenticated
  };

  // Return public API
  return publicAPI;
})();

// Initialize Google Backup functionality when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  GoogleBackupManager.init().catch(error => {
    console.error('Failed to initialize Google Backup Manager:', error);
  });
});