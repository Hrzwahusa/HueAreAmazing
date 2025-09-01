let jsondata = {};
let svgElementIds = []; // Speichert die tatsächlichen IDs der SVG-Elemente
let colorPickerMapping = {}; // Mapping zwischen Picker-IDs und SVG-Element-IDs
let availableSVGFiles = []; // Liste der verfügbaren SVG-Dateien
let currentSVGFile = ''; // Aktuell geladene SVG-Datei für separates Speichern



function calculateMeasurements() {
  console.log('calculateMeasurements() wurde aufgerufen');
  const stripWidth = parseFloat(document.getElementById('stripWidth').value) || 0;
  const columns = parseInt(document.getElementById('columns').value) || 1;
  const rows = parseInt(document.getElementById('rows').value) || 1;
  const frameWidth = parseFloat(document.getElementById('frameWidth').value) || 0;
  
  const blockSize = stripWidth * 10;
  const finalWidthNoFrame = blockSize * columns;
  const finalHeightNoFrame = blockSize * rows;
  const finalWidthWithFrame = finalWidthNoFrame + (frameWidth * 2);
  const finalHeightWithFrame = finalHeightNoFrame + (frameWidth * 2);
  
  const inchToCm = 2.54;
  
  document.getElementById('blockSize').textContent = blockSize.toFixed(1) + ' inch';
  document.getElementById('finalWidthNoFrame').textContent = finalWidthNoFrame.toFixed(1) + ' inch (' + (finalWidthNoFrame * inchToCm).toFixed(1) + ' cm)';
  document.getElementById('finalHeightNoFrame').textContent = finalHeightNoFrame.toFixed(1) + ' inch (' + (finalHeightNoFrame * inchToCm).toFixed(1) + ' cm)';
  document.getElementById('finalWidthWithFrame').textContent = finalWidthWithFrame.toFixed(1) + ' inch (' + (finalWidthWithFrame * inchToCm).toFixed(1) + ' cm)';
  document.getElementById('finalHeightWithFrame').textContent = finalHeightWithFrame.toFixed(1) + ' inch (' + (finalHeightWithFrame * inchToCm).toFixed(1) + ' cm)';
}
setTimeout(() => {
  document.getElementById('stripWidth').addEventListener('input', calculateMeasurements);
  document.getElementById('columns').addEventListener('input', calculateMeasurements);
  document.getElementById('rows').addEventListener('input', calculateMeasurements);
  document.getElementById('frameWidth').addEventListener('input', calculateMeasurements);
  calculateMeasurements();
  console.log('Calculator initialisiert');
}, 200);

// Verfügbare SVG-Dateien aus JSON laden
async function loadAvailableSVGFiles() {
  try {
    const response = await fetch('svg_files.json');
    if (!response.ok) {
      throw new Error('svg_files.json nicht gefunden');
    }
    
    const fileList = await response.json();
    availableSVGFiles = fileList.files || [];
    
    console.log('SVG-Dateien aus svg_files.json geladen:', availableSVGFiles);
    
    if (availableSVGFiles.length === 0) {
      console.warn('Keine Dateien in svg_files.json definiert');
    }
    
    populateSVGDropdown();
    
  } catch (error) {
    console.error('Fehler beim Laden der svg_files.json:', error);
    
    // Fallback: Versuche deine spezifischen Dateien direkt
    const testFiles = ['svg_10x10.txt', 'svg_10x8.txt'];
    availableSVGFiles = [];
    
    for (const filename of testFiles) {
      try {
        const response = await fetch(filename, { method: 'HEAD' });
        if (response.ok) {
          availableSVGFiles.push(filename);
        }
      } catch (error) {
        // Datei existiert nicht
      }
    }
    
    console.log('Fallback - Gefundene SVG-Dateien:', availableSVGFiles);
    populateSVGDropdown();
  }
}

// Dropdown mit verfügbaren SVG-Dateien füllen
function populateSVGDropdown() {
  const selector = document.getElementById('svgSelector');
  
  if (availableSVGFiles.length === 0) {
    selector.innerHTML = `
      <option value="">Keine SVG-Dateien gefunden</option>
      <option value="" disabled>Prüfe svg-files.json</option>
    `;
    return;
  }
  
  selector.innerHTML = '<option value="">Größe auswählen...</option>';
  
  availableSVGFiles.forEach(filename => {
    const option = document.createElement('option');
    option.value = filename;
    
    // Schöneren Anzeigenamen erstellen
    let displayName = filename
      .replace('svg_', '')
      .replace('.txt', '');
    
    // Spezielle Behandlung für deine Dateien
    if (filename === 'svg_10x10.txt') {
      displayName = '10x10 Blöcke';
    } else if (filename === 'svg_10x8.txt') {
      displayName = '10x8 Blöcke';
    } else {
      // Allgemeine Behandlung für andere Dateien
      displayName = displayName
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      displayName = displayName + ' Blöcke';
    }
    
    option.textContent = displayName;
    selector.appendChild(option);
  });
  
  // Erste verfügbare Datei automatisch laden
  if (availableSVGFiles.length > 0) {
    const firstFile = availableSVGFiles[0];
    selector.value = firstFile;
    currentSVGFile = firstFile; // Setze die aktuelle Datei
    loadSelectedSVG();
  }
}

// Ausgewählte SVG-Datei laden
function loadSelectedSVG() {
  const selector = document.getElementById('svgSelector');
  const selectedFile = selector.value;
  
  if (!selectedFile) return;
  
  console.log('Lade SVG-Datei:', selectedFile);
  currentSVGFile = selectedFile; // Aktuell geladene Datei merken
  loadSVGContent(selectedFile);
}

// SVG-Inhalt laden und Farbpicker erstellen (erweitert um Dateiname-Parameter)
function loadSVGContent(filename = 'svg_10x10.txt') {
  currentSVGFile = filename; // Aktuell geladene Datei merken
  
  fetch(filename)
    .then(response => response.text())
    .then(svgContent => {
      const svgContainer = document.getElementById('svgbox');
      if (svgContainer) {
        svgContainer.innerHTML = svgContent;
        
        // SVG-Elemente mit IDs finden
        findSVGElementsAndCreatePickers();
        
        setTimeout(() => färbeSVG(), 100);
      }
    })
    .catch(error => {
      console.error('Fehler beim Laden der SVG-Datei:', error);
      const svgContainer = document.getElementById('svgbox');
      if (svgContainer) {
        svgContainer.innerHTML = `
          <text x="50%" y="50%" text-anchor="middle" fill="#dc3545" font-size="16">
            Fehler beim Laden von ${filename}
          </text>
        `;
      }
    });
}

// SVG-Elemente analysieren und Farbpicker erstellen
function findSVGElementsAndCreatePickers() {
  const svgContainer = document.getElementById('svgbox');
  const elementsWithIds = svgContainer.querySelectorAll('[id]');
  
  svgElementIds = [];
  colorPickerMapping = {};
  
  // Alle Elemente mit IDs sammeln
  elementsWithIds.forEach(element => {
    if (element.id) {
      svgElementIds.push(element.id);
    }
  });
  
  console.log('Gefundene SVG-Elemente:', svgElementIds);
  
  // Farbpicker erstellen
  createColorPickers(svgElementIds);
}

// Dynamische Erstellung der Farbpicker
function createColorPickers(elementIds) {
  const container = document.getElementById('colorPickersContainer');
  
  if (elementIds.length === 0) {
    container.innerHTML = '<p>Keine SVG-Elemente mit IDs gefunden.</p>';
    return;
  }
  
  let tableHTML = '<table>';
  
  elementIds.forEach((elementId, index) => {
    let label, pickerId;
    
    if (index === 0) {
      // Erstes Element ist der Rahmen
      label = 'Rahmenfarbe';
      pickerId = 'colorPickerrahmen';
    } else {
      // Alle weiteren sind Farbe 1, 2, 3...
      label = `Farbe ${index}`;
      pickerId = `colorPicker${index}`;
    }
    
    // Mapping speichern
    colorPickerMapping[pickerId] = elementId;
    
    tableHTML += `
      <tr>
        <th><label for="${pickerId}">${label}:</label></th>
        <th>
          <div class="color-control">
            <input type="color" id="${pickerId}" name="${pickerId}" value="#ffffff">
            <button class="gallery-button" onclick="openGallery('${pickerId}')">Stoffkatalog</button>
            <span id="swatchInfo-${pickerId}" class="swatch-info"></span>
          </div>
        </th>
      </tr>
    `;
  });
  
  tableHTML += '</table>';
  container.innerHTML = tableHTML;
  
  console.log('Farbpicker-Mapping:', colorPickerMapping);
  
  // Event Listener für die neuen Picker hinzufügen
  initializeEventListeners();
  
  // Gespeicherte Farben wiederherstellen
  restoreColorsAfterCreation();
}

// JSON-Daten aus swatches.json laden
async function loadSwatchesData() {
  try {
    const response = await fetch('./swatches.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    jsondata = await response.json();
    return jsondata;
  } catch (error) {
    console.error('Fehler beim Laden der swatches.json:', error);
    // Fallback für Demo-Zwecke
    jsondata = {
      demo: {
        brand: "Demo Brand (Fallback)",
        label: "Keine swatches.json gefunden",
        swatches: [
          { hex: "#ff0000", label: "Rot" },
          { hex: "#00ff00", label: "Grün" },
          { hex: "#0000ff", label: "Blau" }
        ]
      }
    };
    return jsondata;
  }
}

let currentPickerId = null;
let currentBrand = null;
let lastSelectedBrand = null;

// LocalStorage für Farben und Swatches
let savedColors = {};
let selectedSwatches = {};

function saveColorToStorage(pickerId, color) {
  try {
    // Separate Speicherung für jede SVG-Datei
    const storageKey = `svgColors_${currentSVGFile}`;
    let storedColors = JSON.parse(localStorage.getItem(storageKey) || '{}');
    storedColors[pickerId] = color;
    localStorage.setItem(storageKey, JSON.stringify(storedColors));
    savedColors[pickerId] = color;
    console.log(`Farbe für ${currentSVGFile} gespeichert:`, pickerId, color);
    return true;
  } catch (error) {
    console.error('Fehler beim Speichern der Farbe:', error);
    return false;
  }
}

function saveSwatchInfo(pickerId, swatchLabel) {
  try {
    // Separate Speicherung für jede SVG-Datei
    const storageKey = `svgSwatches_${currentSVGFile}`;
    let storedSwatches = JSON.parse(localStorage.getItem(storageKey) || '{}');
    storedSwatches[pickerId] = swatchLabel;
    localStorage.setItem(storageKey, JSON.stringify(storedSwatches));
    selectedSwatches[pickerId] = swatchLabel;
    updateSwatchDisplay(pickerId);
    console.log(`Swatch-Info für ${currentSVGFile} gespeichert:`, pickerId, swatchLabel);
  } catch (error) {
    console.error('Fehler beim Speichern der Swatch-Info:', error);
  }
}

function loadColorsFromStorage() {
  try {
    // Lade Farben spezifisch für die aktuelle SVG-Datei
    const storageKey = `svgColors_${currentSVGFile}`;
    const storedColors = localStorage.getItem(storageKey);
    if (storedColors) {
      const parsed = JSON.parse(storedColors);
      savedColors = parsed;
      console.log(`Farben für ${currentSVGFile} geladen:`, parsed);
      return parsed;
    }
    console.log(`Keine gespeicherten Farben für ${currentSVGFile} gefunden`);
    savedColors = {};
    return {};
  } catch (error) {
    console.error('Fehler beim Laden der Farben:', error);
    savedColors = {};
    return {};
  }
}

function loadSwatchesFromStorage() {
  try {
    // Lade Swatches spezifisch für die aktuelle SVG-Datei
    const storageKey = `svgSwatches_${currentSVGFile}`;
    const storedSwatches = localStorage.getItem(storageKey);
    if (storedSwatches) {
      const parsed = JSON.parse(storedSwatches);
      selectedSwatches = parsed;
      console.log(`Swatches für ${currentSVGFile} geladen:`, parsed);
      return parsed;
    }
    console.log(`Keine gespeicherten Swatches für ${currentSVGFile} gefunden`);
    selectedSwatches = {};
    return {};
  } catch (error) {
    console.error('Fehler beim Laden der Swatches:', error);
    selectedSwatches = {};
    return {};
  }
}

// Reset-Funktion - jetzt dynamisch
function resetAllColors() {
  // Alle aktuellen Farbpicker finden und zurücksetzen
  const colorPickers = document.querySelectorAll('input[type="color"]');
  
  colorPickers.forEach(picker => {
    picker.value = '#ffffff';
    saveColorToStorage(picker.id, '#ffffff');
    clearSwatchInfo(picker.id);
  });
  
  färbeSVG();
}

function updateSwatchDisplay(pickerId) {
  const swatchInfoElement = document.getElementById(`swatchInfo-${pickerId}`);
  if (swatchInfoElement) {
    if (selectedSwatches[pickerId]) {
      swatchInfoElement.textContent = selectedSwatches[pickerId];
    } else {
      swatchInfoElement.textContent = '';
    }
  }
}

function saveColor(pickerId, color, fromGallery = false) {
  saveColorToStorage(pickerId, color);
  if (!fromGallery) {
    clearSwatchInfo(pickerId);
  }
  färbeSVG();
}

function clearSwatchInfo(pickerId) {
  try {
    // Lösche Swatch-Info spezifisch für die aktuelle SVG-Datei
    const storageKey = `svgSwatches_${currentSVGFile}`;
    let storedSwatches = JSON.parse(localStorage.getItem(storageKey) || '{}');
    delete storedSwatches[pickerId];
    localStorage.setItem(storageKey, JSON.stringify(storedSwatches));
    delete selectedSwatches[pickerId];
    updateSwatchDisplay(pickerId);
  } catch (error) {
    console.error('Fehler beim Löschen der Swatch-Info:', error);
  }
}

// SVG einfärben - jetzt mit dynamischem Mapping
function färbeSVG() {
  // Für jedes Mapping die Farbe setzen
  Object.entries(colorPickerMapping).forEach(([pickerId, svgElementId]) => {
    const picker = document.getElementById(pickerId);
    const element = document.getElementById(svgElementId);
    
    if (picker && element) {
      const color = picker.value;
      element.setAttribute("fill", color);
    }
  });
}

// Galerie-Funktionen
function openGallery(pickerId) {
  currentPickerId = pickerId;
  
  if (lastSelectedBrand) {
    currentBrand = lastSelectedBrand;
    showColorSelection(lastSelectedBrand);
  } else {
    currentBrand = null;
    showBrandSelection();
  }
  
  document.getElementById('colorModal').style.display = 'block';
}

function closeModal() {
  document.getElementById('colorModal').style.display = 'none';
  currentPickerId = null;
  currentBrand = null;
}

function showBrandSelection() {
  lastSelectedBrand = null;
  currentBrand = null;
  
  const modalContent = document.getElementById('modalContent');
  modalContent.innerHTML = `
    <h2 class="modal-title">Hersteller auswählen</h2>
    <div class="brand-selection" id="brandSelection"></div>
  `;
  
  const brandSelection = document.getElementById('brandSelection');
  
  if (!jsondata || Object.keys(jsondata).length === 0) {
    brandSelection.innerHTML = '<p style="text-align: center; color: #666;">Keine Hersteller-Daten verfügbar.</p>';
    return;
  }
  
  Object.values(jsondata).forEach(brandData => {
    const brandItem = document.createElement('div');
    brandItem.className = 'brand-item';
    brandItem.innerHTML = `
      <h3>${brandData.brand}</h3>
      <p>${brandData.label}</p>
    `;
    brandItem.onclick = () => showColorSelection(brandData);
    brandSelection.appendChild(brandItem);
  });
}

function showColorSelection(brandData) {
  currentBrand = brandData;
  lastSelectedBrand = brandData;
  
  const modalContent = document.getElementById('modalContent');
  modalContent.innerHTML = `
    <h2 class="modal-title">${brandData.brand} - Farben auswählen</h2>
    <button class="back-button" onclick="showBrandSelection()">← Zurück</button>
    <div class="search-container">
      <input type="text" id="swatchSearch" class="search-input" placeholder="Farben durchsuchen..." oninput="filterSwatches()">
    </div>
    <div class="color-grid" id="colorGrid"></div>
    <div id="noResults" class="no-results" style="display: none;">Keine Farben gefunden</div>
  `;
  
  displaySwatches(brandData.swatches, brandData.brand);
}

function displaySwatches(swatches, brandName) {
  const colorGrid = document.getElementById('colorGrid');
  const noResults = document.getElementById('noResults');
  
  colorGrid.innerHTML = '';
  
  if (swatches.length === 0) {
    noResults.style.display = 'block';
    return;
  }
  
  noResults.style.display = 'none';
  
  swatches.forEach(swatch => {
    const colorItem = document.createElement('div');
    colorItem.className = 'color-item';
    colorItem.innerHTML = `
      <div class="color-square" style="background-color: ${swatch.hex}"></div>
      <div class="color-label">${swatch.label}</div>
    `;
    colorItem.onclick = () => selectColor(swatch.hex, swatch.label, brandName);
    colorGrid.appendChild(colorItem);
  });
}

function filterSwatches() {
  if (!currentBrand) return;
  
  const searchTerm = document.getElementById('swatchSearch').value.toLowerCase();
  
  if (searchTerm === '') {
    displaySwatches(currentBrand.swatches, currentBrand.brand);
  } else {
    const filteredSwatches = currentBrand.swatches.filter(swatch => 
      swatch.label.toLowerCase().includes(searchTerm)
    );
    displaySwatches(filteredSwatches, currentBrand.brand);
  }
}

function selectColor(hexColor, swatchLabel, brandName) {
  if (currentPickerId) {
    const picker = document.getElementById(currentPickerId);
    if (picker) {
      picker.value = hexColor;
      saveColor(currentPickerId, hexColor, true);
      saveSwatchInfo(currentPickerId, `${brandName}: ${swatchLabel}`);
    }
  }
  closeModal();
}

function initializeEventListeners() {
  const colorPickers = document.querySelectorAll('input[type="color"]');
  colorPickers.forEach(picker => {
    picker.addEventListener('change', function(e) {
      saveColor(this.id, this.value);
    });
    
    picker.addEventListener('input', function(e) {
      saveColor(this.id, this.value);
    });
  });
}

// Modal schließen beim Klick außerhalb
window.onclick = function(event) {
  const modal = document.getElementById('colorModal');
  if (event.target === modal) {
    closeModal();
  }
}

function initializeColors() {
  // Event Listener werden jetzt in createColorPickers() hinzugefügt
  // Diese Funktion wird nach der Picker-Erstellung aufgerufen
}

// Neue Funktion zum Wiederherstellen der Farben nach der Erstellung
function restoreColorsAfterCreation() {
  const loadedColors = loadColorsFromStorage();
  const loadedSwatches = loadSwatchesFromStorage();
  
  function restoreValues() {
    Object.entries(loadedColors).forEach(([pickerId, color]) => {
      const picker = document.getElementById(pickerId);
      if (picker) {
        picker.value = color;
      }
    });
    
    Object.entries(loadedSwatches).forEach(([pickerId, swatchLabel]) => {
      const swatchElement = document.getElementById(`swatchInfo-${pickerId}`);
      if (swatchElement) {
        swatchElement.textContent = swatchLabel;
      }
    });
    
    färbeSVG();
  }
  
  setTimeout(restoreValues, 100);
}



// Initialisierung beim Laden
setTimeout(() => {
  loadAvailableSVGFiles(); // Lädt automatisch die erste verfügbare SVG-Datei
}, 100);

setTimeout(() => {
  loadSwatchesData().then(() => {
    // initializeColors wird automatisch nach der Picker-Erstellung aufgerufen
  });
}, 200);

// Dynamische ViewBox-Anpassung - Hauptfunktion
function adjustViewBoxToContent() {
  const svg = document.getElementById('svgbox');
  
  if (!svg || svg.children.length === 0) {
    return;
  }
  
  try {
    // Warte kurz bis alle Elemente gerendert sind
    requestAnimationFrame(() => {
      const bbox = svg.getBBox();
      
      // Intelligentes Padding basierend auf Größe
      const padding = Math.max(10, Math.min(bbox.width, bbox.height) * 0.05);
      
      // ViewBox mit optimaler Zentrierung
      const newViewBox = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + 2 * padding} ${bbox.height + 2 * padding}`;
      svg.setAttribute('viewBox', newViewBox);
      
      console.log('ViewBox dynamisch angepasst:', newViewBox);
      
      // Event für andere Komponenten
      svg.dispatchEvent(new CustomEvent('viewboxUpdated', { 
        detail: { viewBox: newViewBox, bbox: bbox }
      }));
    });
    
  } catch (error) {
    console.warn('Fehler beim Anpassen der ViewBox:', error);
    // Fallback: Versuche es mit Standard-Dimensionen
    svg.setAttribute('viewBox', '0 0 670 670');
  }
}

// Dynamische ViewBox-Anpassung - Hauptfunktion
function adjustViewBoxToContent() {
  const svg = document.getElementById('svgbox');
  
  if (!svg || svg.children.length === 0) {
    return;
  }
  
  try {
    // Warte kurz bis alle Elemente gerendert sind
    requestAnimationFrame(() => {
      const bbox = svg.getBBox();
      
      // Intelligentes Padding basierend auf Größe
      const padding = Math.max(10, Math.min(bbox.width, bbox.height) * 0.05);
      
      // ViewBox mit optimaler Zentrierung
      const newViewBox = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + 2 * padding} ${bbox.height + 2 * padding}`;
      svg.setAttribute('viewBox', newViewBox);
      
      console.log('ViewBox dynamisch angepasst:', newViewBox);
      
      // Event für andere Komponenten
      svg.dispatchEvent(new CustomEvent('viewboxUpdated', { 
        detail: { viewBox: newViewBox, bbox: bbox }
      }));
    });
    
  } catch (error) {
    console.warn('Fehler beim Anpassen der ViewBox:', error);
    // Fallback: Versuche es mit Standard-Dimensionen
    svg.setAttribute('viewBox', '0 0 670 670');
  }
}

// Dynamischer Observer für Echtzeit-Updates
function setupDynamicViewBoxObserver() {
  const svg = document.getElementById('svgbox');
  
  if (!svg) return null;
  
  // Debouncing für Performance
  let updateTimeout;
  const debouncedUpdate = () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(adjustViewBoxToContent, 150);
  };
  
  // MutationObserver für DOM-Änderungen
  const mutationObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
      // Prüfe auf relevante Änderungen
      if (mutation.type === 'childList') {
        shouldUpdate = true;
      } else if (mutation.type === 'attributes') {
        const relevantAttributes = ['d', 'points', 'cx', 'cy', 'r', 'width', 'height', 'x', 'y', 'transform'];
        if (relevantAttributes.includes(mutation.attributeName)) {
          shouldUpdate = true;
        }
      }
    });
    
    if (shouldUpdate) {
      debouncedUpdate();
    }
  });
  
  // Observer starten
  mutationObserver.observe(svg, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['d', 'points', 'cx', 'cy', 'r', 'width', 'height', 'x', 'y', 'transform', 'fill', 'stroke']
  });
  
  // ResizeObserver für Größenänderungen (falls unterstützt)
  let resizeObserver = null;
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      debouncedUpdate();
    });
    resizeObserver.observe(svg);
  }
  
  console.log('Dynamischer ViewBox Observer aktiviert');
  
  return {
    mutationObserver,
    resizeObserver,
    destroy() {
      mutationObserver.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      clearTimeout(updateTimeout);
      console.log('ViewBox Observer deaktiviert');
    }
  };
}

// Automatische Initialisierung - füge dies am Ende deiner app.js hinzu
let dynamicViewBoxObserver = null;

// Initialisierung beim Laden der Seite
function initializeDynamicViewBox() {
  // Observer setup
  dynamicViewBoxObserver = setupDynamicViewBoxObserver();
  
  // Event Listener für SVG-Laden
  const svgSelector = document.getElementById('svgSelector');
  if (svgSelector) {
    svgSelector.addEventListener('change', () => {
      // Kurze Verzögerung für SVG-Laden
      setTimeout(adjustViewBoxToContent, 200);
    });
  }
  
  // Event Listener für Farbänderungen (falls diese die Größe beeinflussen)
  document.addEventListener('change', (e) => {
    if (e.target.type === 'color') {
      // Sehr kurze Verzögerung für Farbänderungen
      setTimeout(adjustViewBoxToContent, 50);
    }
  });
  
  // Initiale Anpassung falls bereits Inhalt vorhanden
  setTimeout(adjustViewBoxToContent, 100);
  
  console.log('Dynamische ViewBox-Anpassung initialisiert');
}

// Cleanup-Funktion
function cleanupDynamicViewBox() {
  if (dynamicViewBoxObserver) {
    dynamicViewBoxObserver.destroy();
    dynamicViewBoxObserver = null;
  }
}

// Auto-Start wenn DOM bereit ist
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDynamicViewBox);
} else {
  initializeDynamicViewBox();
}

// Cleanup beim Verlassen der Seite
window.addEventListener('beforeunload', cleanupDynamicViewBox);

// Zusätzliche Hilfsfunktionen für Debugging und manuelle Kontrolle
function logCurrentViewBox() {
  const svg = document.getElementById('svgbox');
  if (svg) {
    console.log('Aktuelle ViewBox:', svg.getAttribute('viewBox'));
    console.log('SVG Bounding Box:', svg.getBBox());
  }
}

// Manuelle ViewBox-Anpassung für Testing
function setCustomViewBox(x, y, width, height) {
  const svg = document.getElementById('svgbox');
  if (svg) {
    svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    console.log(`ViewBox manuell gesetzt: ${x} ${y} ${width} ${height}`);
  }
}

// Force Update der ViewBox
function forceViewBoxUpdate() {
  adjustViewBoxToContent();
}

// Funktion zur manuellen ViewBox-Anpassung (für Testing)
function setCustomViewBox(x, y, width, height) {
  const svg = document.getElementById('svgbox');
  if (svg) {
    svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  }
}

// Dynamischer Observer für Echtzeit-Updates
function setupDynamicViewBoxObserver() {
  const svg = document.getElementById('svgbox');
  
  if (!svg) return null;
  
  // Debouncing für Performance
  let updateTimeout;
  const debouncedUpdate = () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(adjustViewBoxToContent, 150);
  };
  
  // MutationObserver für DOM-Änderungen
  const mutationObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
      // Prüfe auf relevante Änderungen
      if (mutation.type === 'childList') {
        shouldUpdate = true;
      } else if (mutation.type === 'attributes') {
        const relevantAttributes = ['d', 'points', 'cx', 'cy', 'r', 'width', 'height', 'x', 'y', 'transform'];
        if (relevantAttributes.includes(mutation.attributeName)) {
          shouldUpdate = true;
        }
      }
    });
    
    if (shouldUpdate) {
      debouncedUpdate();
    }
  });
  
  // Observer starten
  mutationObserver.observe(svg, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['d', 'points', 'cx', 'cy', 'r', 'width', 'height', 'x', 'y', 'transform', 'fill', 'stroke']
  });
  
  // ResizeObserver für Größenänderungen (falls unterstützt)
  let resizeObserver = null;
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      debouncedUpdate();
    });
    resizeObserver.observe(svg);
  }
  
  console.log('Dynamischer ViewBox Observer aktiviert');
  
  return {
    mutationObserver,
    resizeObserver,
    destroy() {
      mutationObserver.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      clearTimeout(updateTimeout);
      console.log('ViewBox Observer deaktiviert');
    }
  };
}

// Automatische Initialisierung - füge dies am Ende deiner app.js hinzu
let viewBoxObserver = null;

// Initialisierung beim Laden der Seite
function initializeDynamicViewBox() {
  // Observer setup
  viewBoxObserver = setupDynamicViewBoxObserver();
  
  // Event Listener für SVG-Laden
  const svgSelector = document.getElementById('svgSelector');
  if (svgSelector) {
    svgSelector.addEventListener('change', () => {
      // Kurze Verzögerung für SVG-Laden
      setTimeout(adjustViewBoxToContent, 200);
    });
  }
  
  // Event Listener für Farbänderungen (falls diese die Größe beeinflussen)
  document.addEventListener('change', (e) => {
    if (e.target.type === 'color') {
      // Sehr kurze Verzögerung für Farbänderungen
      setTimeout(adjustViewBoxToContent, 50);
    }
  });
  
  // Initiale Anpassung falls bereits Inhalt vorhanden
  setTimeout(adjustViewBoxToContent, 100);
  
  console.log('Dynamische ViewBox-Anpassung initialisiert');
}

// Cleanup-Funktion
function cleanupDynamicViewBox() {
  if (viewBoxObserver) {
    viewBoxObserver.destroy();
    viewBoxObserver = null;
  }
}

// Auto-Start wenn DOM bereit ist
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDynamicViewBox);
} else {
  initializeDynamicViewBox();
}

// Cleanup beim Verlassen der Seite
window.addEventListener('beforeunload', cleanupDynamicViewBox);