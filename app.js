let jsondata = {};
let svgElementIds = []; // Speichert die tatsächlichen IDs der SVG-Elemente
let colorPickerMapping = {}; // Mapping zwischen Picker-IDs und SVG-Element-IDs
let availableSVGFiles = []; // Liste der verfügbaren SVG-Dateien
let currentSVGFile = ''; // Aktuell geladene SVG-Datei für separates Speichern

// Funktion zur dynamischen Anpassung der ViewBox
function adjustViewBoxToContent() {
  const svgContainer = document.getElementById('svgbox');
  
  if (!svgContainer) {
    console.error('SVG Container nicht gefunden');
    return;
  }
  
  // Alle sichtbaren Elemente im SVG finden (außer dem SVG selbst)
  const allElements = svgContainer.querySelectorAll('*:not(defs):not(style)');
  
  if (allElements.length === 0) {
    console.log('Keine Elemente im SVG gefunden');
    return;
  }
  
  let minX = Infinity;
  let minY = Infinity; 
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  // Bounding Box aller Elemente berechnen
  allElements.forEach(element => {
    try {
      // getBBox() funktioniert für die meisten SVG-Elemente
      const bbox = element.getBBox();
      
      if (bbox.width > 0 && bbox.height > 0) {
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      }
    } catch (error) {
      // Fallback für Elemente, die getBBox() nicht unterstützen
      console.log('getBBox() fehlgeschlagen für Element:', element.tagName);
      
      // Versuche Attribute zu lesen
      const x = parseFloat(element.getAttribute('x') || 0);
      const y = parseFloat(element.getAttribute('y') || 0);
      const width = parseFloat(element.getAttribute('width') || 0);
      const height = parseFloat(element.getAttribute('height') || 0);
      
      if (width > 0 && height > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      }
    }
  });
  
  // Prüfen ob gültige Bounds gefunden wurden
  if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
    console.warn('Keine gültigen Bounds gefunden, behalte Standard ViewBox');
    return;
  }
  
  // Padding hinzufügen (optional, für bessere Darstellung)
  const padding = 10;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  
  // Neue ViewBox berechnen
  const viewBoxWidth = maxX - minX;
  const viewBoxHeight = maxY - minY;
  
  // ViewBox setzen
  const newViewBox = `${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`;
  svgContainer.setAttribute('viewBox', newViewBox);
  
  console.log('ViewBox angepasst:', newViewBox);
  console.log('Bounds:', { minX, minY, maxX, maxY, width: viewBoxWidth, height: viewBoxHeight });
  
  return {
    x: minX,
    y: minY,
    width: viewBoxWidth,
    height: viewBoxHeight
  };
}

// Maß-Rechner Funktionen - direkt am Anfang definieren!
function calculateMeasurements() {
  console.log('calculateMeasurements() wurde aufgerufen');
  
  // Eingabewerte holen
  const stripWidthEl = document.getElementById('stripWidth');
  const columnsEl = document.getElementById('columns');
  const rowsEl = document.getElementById('rows');
  const frameWidthEl = document.getElementById('frameWidth');
  
  if (!stripWidthEl || !columnsEl || !rowsEl || !frameWidthEl) {
    console.log('Nicht alle Input-Elemente gefunden');
    return;
  }
  
  const stripWidth = parseFloat(stripWidthEl.value) || 0;
  const columns = parseInt(columnsEl.value) || 1;
  const rows = parseInt(rowsEl.value) || 1;
  const frameWidth = parseFloat(frameWidthEl.value) || 0;
  
  console.log('Werte:', {stripWidth, columns, rows, frameWidth});
  
  // Berechnungen
  const blockSize = stripWidth * 10;
  const finalWidthNoFrame = blockSize * columns;
  const finalHeightNoFrame = blockSize * rows;
  const finalWidthWithFrame = finalWidthNoFrame + (frameWidth * 2);
  const finalHeightWithFrame = finalHeightNoFrame + (frameWidth * 2);
  
  // Umrechnung von Inch zu cm (1 inch = 2.54 cm)
  const inchToCm = 2.54;
  
  // Ergebnisse anzeigen
  const blockSizeEl = document.getElementById('blockSize');
  const finalWidthNoFrameEl = document.getElementById('finalWidthNoFrame');
  const finalHeightNoFrameEl = document.getElementById('finalHeightNoFrame');
  const finalWidthWithFrameEl = document.getElementById('finalWidthWithFrame');
  const finalHeightWithFrameEl = document.getElementById('finalHeightWithFrame');
  
  if (blockSizeEl) {
    blockSizeEl.textContent = blockSize.toFixed(1) + ' inch';
  }
  if (finalWidthNoFrameEl) {
    finalWidthNoFrameEl.textContent = 
      finalWidthNoFrame.toFixed(1) + ' inch (' + (finalWidthNoFrame * inchToCm).toFixed(1) + ' cm)';
  }
  if (finalHeightNoFrameEl) {
    finalHeightNoFrameEl.textContent = 
      finalHeightNoFrame.toFixed(1) + ' inch (' + (finalHeightNoFrame * inchToCm).toFixed(1) + ' cm)';
  }
  if (finalWidthWithFrameEl) {
    finalWidthWithFrameEl.textContent = 
      finalWidthWithFrame.toFixed(1) + ' inch (' + (finalWidthWithFrame * inchToCm).toFixed(1) + ' cm)';
  }
  if (finalHeightWithFrameEl) {
    finalHeightWithFrameEl.textContent = 
      finalHeightWithFrame.toFixed(1) + ' inch (' + (finalHeightWithFrame * inchToCm).toFixed(1) + ' cm)';
  }
  
  console.log('Berechnungen abgeschlossen');
}

// Funktion global verfügbar machen
window.calculateMeasurements = calculateMeasurements;

// Drag and Drop Funktionalität für Farbpicker
let draggedElement = null;
let draggedData = null;

function makeDraggable() {
  const colorRows = document.querySelectorAll('.color-row');
  console.log('Gefundene Color-Rows für Drag and Drop:', colorRows.length);
  
  if (colorRows.length === 0) {
    console.log('Keine .color-row Elemente gefunden - Drag and Drop nicht aktiviert');
    return;
  }
  
  colorRows.forEach((row, index) => {
    console.log(`Aktiviere Drag and Drop für Zeile ${index + 1}`);
    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('drop', handleDrop);
    row.addEventListener('dragend', handleDragEnd);
    row.addEventListener('dragenter', handleDragEnter);
    row.addEventListener('dragleave', handleDragLeave);
  });
  
  console.log('Drag and Drop Event Listeners für alle Zeilen hinzugefügt');
}

function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  
  const colorInput = this.querySelector('input[type="color"]');
  const swatchInfo = this.querySelector('.swatch-info');
  const label = this.querySelector('label');
  
  draggedData = {
    pickerId: colorInput.id,
    color: colorInput.value,
    swatchText: swatchInfo.textContent,
    labelText: label.textContent
  };
  
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedElement) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  if (this !== draggedElement) {
    const targetColorInput = this.querySelector('input[type="color"]');
    const targetSwatchInfo = this.querySelector('.swatch-info');
    const targetLabel = this.querySelector('label');
    
    const targetData = {
      pickerId: targetColorInput.id,
      color: targetColorInput.value,
      swatchText: targetSwatchInfo.textContent,
      labelText: targetLabel.textContent
    };
    
    // Tausche die Farben
    targetColorInput.value = draggedData.color;
    draggedElement.querySelector('input[type="color"]').value = targetData.color;
    
    // Tausche die Swatch-Infos
    targetSwatchInfo.textContent = draggedData.swatchText;
    draggedElement.querySelector('.swatch-info').textContent = targetData.swatchText;
    
    // Speichere die neuen Farben
    saveColorToStorage(draggedData.pickerId, targetData.color);
    saveColorToStorage(targetData.pickerId, draggedData.color);
    saveSwatchInfo(draggedData.pickerId, targetData.swatchText);
    saveSwatchInfo(targetData.pickerId, draggedData.swatchText);
    
    // Aktualisiere das SVG
    färbeSVG();
    
    console.log('Farben getauscht:', draggedData.pickerId, '↔', targetData.pickerId);
  }
  
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.color-row').forEach(row => {
    row.classList.remove('drag-over');
  });
  draggedElement = null;
  draggedData = null;
}

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

// SVG-Inhalt laden und Farbpicker erstellen (mit dynamischer ViewBox)
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
        
        // ViewBox nach dem Laden anpassen und dann färben
        setTimeout(() => {
          adjustViewBoxToContent();
          färbeSVG();
        }, 100);
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
      <tr class="color-row" draggable="true">
        <th>
          <span class="drag-handle">⋮⋮</span>
          <label for="${pickerId}">${label}:</label>
        </th>
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
  
  // Drag and Drop für die neuen Picker aktivieren
  setTimeout(() => {
    makeDraggable();
    console.log('Drag and Drop für Farbpicker aktiviert');
  }, 200);
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

// Event Listener Initialisierung
function initializeAllEventListeners() {
  // Calculator Event Listener
  setTimeout(() => {
    const stripWidthEl = document.getElementById('stripWidth');
    const columnsEl = document.getElementById('columns');
    const rowsEl = document.getElementById('rows');
    const frameWidthEl = document.getElementById('frameWidth');
    
    if (stripWidthEl) stripWidthEl.addEventListener('input', calculateMeasurements);
    if (columnsEl) columnsEl.addEventListener('input', calculateMeasurements);
    if (rowsEl) rowsEl.addEventListener('input', calculateMeasurements);
    if (frameWidthEl) frameWidthEl.addEventListener('input', calculateMeasurements);
    
    calculateMeasurements(); // Erste Berechnung beim Laden
    console.log('Calculator Event Listeners hinzugefügt');
  }, 1500);
}

// Funktion zum Hinzufügen der Event Listener für den Rechner
function initializeCalculatorEvents() {
  const stripWidthEl = document.getElementById('stripWidth');
  const columnsEl = document.getElementById('columns');
  const rowsEl = document.getElementById('rows');
  const frameWidthEl = document.getElementById('frameWidth');
  
  if (stripWidthEl) {
    stripWidthEl.addEventListener('input', calculateMeasurements);
    stripWidthEl.addEventListener('change', calculateMeasurements);
  }
  if (columnsEl) {
    columnsEl.addEventListener('input', calculateMeasurements);
    columnsEl.addEventListener('change', calculateMeasurements);
  }
  if (rowsEl) {
    rowsEl.addEventListener('input', calculateMeasurements);
    rowsEl.addEventListener('change', calculateMeasurements);
  }
  if (frameWidthEl) {
    frameWidthEl.addEventListener('input', calculateMeasurements);
    frameWidthEl.addEventListener('change', calculateMeasurements);
  }
  
  console.log('Calculator Event Listeners hinzugefügt');
}

// Funktion zur manuellen ViewBox-Anpassung
function resetViewBox() {
  adjustViewBoxToContent();
}

// Funktionen global verfügbar machen
window.adjustViewBoxToContent = adjustViewBoxToContent;
window.resetViewBox = resetViewBox;
window.loadSelectedSVG = loadSelectedSVG;
window.openGallery = openGallery;
window.closeModal = closeModal;
window.showBrandSelection = showBrandSelection;
window.filterSwatches = filterSwatches;
window.resetAllColors = resetAllColors;

// Besserer Ansatz: Event Listener verwenden
document.addEventListener('DOMContentLoaded', function() {
  // Warte bis alle Inhalte geladen sind
  function initCalculator() {
    if (document.getElementById('stripWidth') && 
        document.getElementById('columns') && 
        document.getElementById('rows') && 
        document.getElementById('frameWidth')) {
      initializeCalculatorEvents();
      calculateMeasurements();
    } else {
      // Falls Elemente noch nicht da sind, nochmal versuchen
      setTimeout(initCalculator, 100);
    }
  }
  
  // Starte die Initialisierung
  setTimeout(initCalculator, 300);
});

// Initialisierung beim Laden
setTimeout(() => {
  loadAvailableSVGFiles(); // Lädt automatisch die erste verfügbare SVG-Datei
}, 100);

setTimeout(() => {
  loadSwatchesData().then(() => {
    // initializeColors wird automatisch nach der Picker-Erstellung aufgerufen
  });
}, 200);