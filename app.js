let jsondata = {};
let svgElementIds = [];
let colorPickerMapping = {};
let availableSVGFiles = [];
let currentSVGFile = '';

console.log('Canvg verfügbar?', typeof Canvg);

// Funktion zur dynamischen Anpassung der ViewBox
function adjustViewBoxToContent() {
  const svgContainer = document.getElementById('svgbox');
  
  if (!svgContainer) {
    console.error('SVG Container nicht gefunden');
    return;
  }
  
  const allElements = svgContainer.querySelectorAll('*:not(defs):not(style)');
  
  if (allElements.length === 0) {
    console.log('Keine Elemente im SVG gefunden');
    return;
  }
  
  let minX = Infinity;
  let minY = Infinity; 
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  allElements.forEach(element => {
    try {
      const bbox = element.getBBox();
      
      if (bbox.width > 0 && bbox.height > 0) {
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      }
    } catch (error) {
      console.log('getBBox() fehlgeschlagen für Element:', element.tagName);
      
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
  
  if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
    console.warn('Keine gültigen Bounds gefunden, behalte Standard ViewBox');
    return;
  }
  
  const padding = 10;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  
  const viewBoxWidth = maxX - minX;
  const viewBoxHeight = maxY - minY;
  
  const newViewBox = `${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`;
  svgContainer.setAttribute('viewBox', newViewBox);
  
  console.log('ViewBox angepasst:', newViewBox);
  
  return {
    x: minX,
    y: minY,
    width: viewBoxWidth,
    height: viewBoxHeight
  };
}

// Stoffbedarfsrechner
function calculateFabricRequirementWithValues(columns, rows) {
  console.log('calculateFabricRequirement() wurde aufgerufen');
  
  const stripWidthEl = document.getElementById('stripWidth');
  const frameWidthEl = document.getElementById('frameWidth');
  const techniqueSelect = document.getElementById('techniqueSelect');
  
  if (!stripWidthEl || !frameWidthEl) {
    console.log('Nicht alle Input-Elemente gefunden');
    return;
  }
  
  if (!svgElementIds || svgElementIds.length === 0) {
    console.log('SVG-Elemente noch nicht geladen, warte...');
    setTimeout(() => calculateFabricRequirementWithValues(), 100);
    return;
  }
  
  const stripWidth = parseFloat(stripWidthEl.value) || 0;
  const frameWidth = parseFloat(frameWidthEl.value) || 0;
  
  const technique = techniqueSelect ? techniqueSelect.value : 'logcabin';
  const seamAllowancePerSide = 0.25; // Immer 0.25" pro Seite
  const seamAllowance = seamAllowancePerSide * 2; // 0.5" gesamt
  const fppExtraAllowance = technique === 'fpp' ? 0.25 : 0; // Extra für FPP
  
  const innerMultipliers = [1.25, 2.75, 4.25, 5.75, 7.25, 2, 3.5, 5, 6.5];
  const outerMultipliers = [1.25, 2.75, 4.25, 5.75, 7.25, 2, 3.5, 5, 6.5, 8];
  
  const totalBlocks = columns * columns;
  const fabricWidth = 42;
  const inchToCm = 2.54;
  
  const numberOfColors = svgElementIds.length - 1;
  const isRectangular = columns !== rows;
  
  console.log(`Berechne mit ${numberOfColors} Farben, ${columns}x${rows} Blöcke`);
  
  let allColorsFabricTotal = 0;
  
  innerMultipliers.forEach(multiplier => {
    const stripWidthWithSeam = stripWidth + seamAllowance + fppExtraAllowance;
    const stripLength = stripWidthWithSeam * multiplier;
    allColorsFabricTotal += stripLength * totalBlocks;
  });
  
  outerMultipliers.forEach(multiplier => {
    const stripWidthWithSeam = stripWidth + seamAllowance + fppExtraAllowance;
    const stripLength = stripWidthWithSeam * multiplier;
    allColorsFabricTotal += stripLength * totalBlocks;
  });
  
  const fabricPerColor = allColorsFabricTotal / numberOfColors;
  const fabricLengthPerColor = Math.ceil(fabricPerColor / fabricWidth);
  
  
  const blockSize = stripWidth * 10;
  const quiltWidthNoFrame = blockSize * columns;
  const quiltHeightNoFrame = blockSize * rows;
  
  const frameWidthWithSeam = frameWidth + seamAllowance;
  const frameTopBottom = (quiltWidthNoFrame + 2 * frameWidthWithSeam) * frameWidthWithSeam * 2;
  const frameSides = quiltHeightNoFrame * frameWidthWithSeam * 2;
  const frameFabricTotal = frameTopBottom + frameSides;
  const frameFabricLength = Math.ceil(frameFabricTotal / fabricWidth);
  
  const totalLength = Math.ceil((allColorsFabricTotal / fabricWidth) + frameFabricLength);
  
  let tableHTML = '<table class="calc-table fabric-table">';
  
  if(isRectangular) {
	  const fabricLengthFirstandLast = fabricLengthPerColor / 2;
	  
	  tableHTML += `
    <tr>
      <td class="fabric-label">Erste und letzte Farbe:</td>
      <td class="fabric-value">${fabricLengthFirstandLast.toFixed(0)} inch (${(fabricLengthFirstandLast * inchToCm).toFixed(1)} cm)</td>
    </tr>
	<tr>
      <td class="fabric-label">Restliche Farben (${numberOfColors-2} Farben):</td>
      <td class="fabric-value">${fabricLengthPerColor.toFixed(0)} inch (${(fabricLengthPerColor * inchToCm).toFixed(1)} cm)</td>
    </tr>
    <tr>
      <td class="fabric-label">Rahmen:</td>
      <td class="fabric-value">${frameFabricLength.toFixed(0)} inch (${(frameFabricLength * inchToCm).toFixed(1)} cm)</td>
    </tr>
    <tr class="fabric-total">
      <td class="fabric-label">Gesamt:</td>
      <td class="fabric-value">${totalLength.toFixed(0)} inch (${(totalLength * inchToCm).toFixed(1)} cm)</td>
    </tr>
  `;} else {tableHTML += `
    <tr>
      <td class="fabric-label">Pro Farbe (${numberOfColors} Farben):</td>
      <td class="fabric-value">${fabricLengthPerColor.toFixed(0)} inch (${(fabricLengthPerColor * inchToCm).toFixed(1)} cm)</td>
    </tr>
    <tr>
      <td class="fabric-label">Rahmen:</td>
      <td class="fabric-value">${frameFabricLength.toFixed(0)} inch (${(frameFabricLength * inchToCm).toFixed(1)} cm)</td>
    </tr>
    <tr class="fabric-total">
      <td class="fabric-label">Gesamt:</td>
      <td class="fabric-value">${totalLength.toFixed(0)} inch (${(totalLength * inchToCm).toFixed(1)} cm)</td>
    </tr>
  `;}
	  
  
  tableHTML += '</table>';
  
  const oldTable = document.querySelector('.fabric-table');
  if (oldTable) {
    oldTable.outerHTML = tableHTML;
  }
  
  const hintText = document.getElementById('fabricHintText');
if (hintText) {
  const techniqueName = technique === 'fpp' ? 'FPP (Foundation Paper Piecing)' : 'Log Cabin (klassisches Patchwork)';
  const fppNote = technique === 'fpp' ? '<br>* Inkl. 0.25" Extra-Zugabe für FPP' : '';
  hintText.innerHTML = `
    * Berechnung basiert auf 42" Stoffbreite (WOF)<br>
    * Technik: ${techniqueName}<br>
    * Inkl. ${seamAllowancePerSide}" Nahtzugabe pro Seite${fppNote}<br>
    * Angaben ohne Verschnitt
  `;
}
  
  console.log(`Stoffbedarfsberechnung abgeschlossen (${technique}, ${seamAllowancePerSide}" Nahtzugabe, 42" Stoffbreite, ${numberOfColors} Farben)`);
}

// Maß-Rechner Funktionen
function calculateMeasurementsWithValues(columns, rows) {
  console.log('calculateMeasurementsWithValues() aufgerufen mit:', columns, rows);
  
  const stripWidthEl = document.getElementById('stripWidth');
  const frameWidthEl = document.getElementById('frameWidth');
  
  if (!stripWidthEl || !frameWidthEl) {
    console.log('Nicht alle Input-Elemente gefunden');
    return;
  }
  
  const stripWidth = parseFloat(stripWidthEl.value) || 0;
  const frameWidth = parseFloat(frameWidthEl.value) || 0;
  
  console.log('Berechne mit:', {stripWidth, columns, rows, frameWidth});
  
  const blockSize = stripWidth * 10;
  const finalWidthNoFrame = blockSize * columns;
  const finalHeightNoFrame = blockSize * rows;
  const finalWidthWithFrame = finalWidthNoFrame + (frameWidth * 2);
  const finalHeightWithFrame = finalHeightNoFrame + (frameWidth * 2);
  
  const inchToCm = 2.54;
  
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
  
  calculateFabricRequirementWithValues(columns, rows);
  console.log('Berechnungen abgeschlossen');
}

function calculateMeasurements() {
  console.log('calculateMeasurements() wurde aufgerufen');
  
  const columnsEl = document.getElementById('columns');
  const rowsEl = document.getElementById('rows');
  const columns = parseInt(columnsEl ? columnsEl.textContent : 1) || 1;
  const rows = parseInt(rowsEl ? rowsEl.textContent : 1) || 1;
  
  calculateMeasurementsWithValues(columns, rows);
}

window.calculateMeasurements = calculateMeasurements;

// Drag and Drop Funktionalität
let draggedElement = null;
let draggedData = null;

function makeDraggable() {
  const colorRows = document.querySelectorAll('.color-row');
  console.log('Gefundene Color-Rows für Drag and Drop:', colorRows.length);
  
  if (colorRows.length === 0) {
    console.log('Keine .color-row Elemente gefunden');
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
    
    targetColorInput.value = draggedData.color;
    draggedElement.querySelector('input[type="color"]').value = targetData.color;
    
    targetSwatchInfo.textContent = draggedData.swatchText;
    draggedElement.querySelector('.swatch-info').textContent = targetData.swatchText;
    
    saveColorToStorage(draggedData.pickerId, targetData.color);
    saveColorToStorage(targetData.pickerId, draggedData.color);
    saveSwatchInfo(draggedData.pickerId, targetData.swatchText);
    saveSwatchInfo(targetData.pickerId, draggedData.swatchText);
    
    färbeSVG();
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

// Verfügbare SVG-Dateien laden
async function loadAvailableSVGFiles() {
  try {
    const response = await fetch('svg_files.json');
    if (!response.ok) {
      throw new Error('svg_files.json nicht gefunden');
    }
    
    const fileList = await response.json();
    availableSVGFiles = fileList.files || [];
    
    console.log('SVG-Dateien geladen:', availableSVGFiles);
    
    populateSVGDropdown();
    
  } catch (error) {
    console.error('Fehler beim Laden der svg_files.json:', error);
    
    const testFiles = ['svg_10x10.txt', 'svg_10x8.txt', 'svg_8x8.txt', 'svg_6x6.txt', 'svg_4x4.txt', 'svg_2x2.txt'];
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

// Dropdown mit SVG-Dateien füllen
function populateSVGDropdown() {
  const selector = document.getElementById('svgSelector');
  
  if (availableSVGFiles.length === 0) {
    selector.innerHTML = '<option value="">Keine SVG-Dateien gefunden</option>';
    return;
  }
  
  selector.innerHTML = '<option value="">Größe auswählen...</option>';
  
  availableSVGFiles.forEach(filename => {
    const option = document.createElement('option');
    option.value = filename;
    
    let displayName = filename
      .replace('svg_', '')
      .replace('.txt', '');
    
    if (filename === 'svg_10x10.txt') {
      displayName = '10x10 Blöcke';
    } else if (filename === 'svg_10x8.txt') {
      displayName = '10x8 Blöcke';
    } else if (filename === 'svg_8x8.txt') {
      displayName = '8x8 Blöcke';
    } else if (filename === 'svg_6x6.txt') {
      displayName = '6x6 Blöcke';
    } else if (filename === 'svg_4x4.txt') {
      displayName = '4x4 Blöcke';
    } else if (filename === 'svg_2x2.txt') {
      displayName = '2x2 Blöcke';
    } else {
      displayName = displayName
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      displayName = displayName + ' Blöcke';
    }
    
    option.textContent = displayName;
    selector.appendChild(option);
  });
  
  if (availableSVGFiles.length > 0) {
    const firstFile = availableSVGFiles[0];
    selector.value = firstFile;
    currentSVGFile = firstFile;
    
    const match = firstFile.match(/svg_(\d+)x(\d+)\.txt/);
    if (match) {
      const cols = parseInt(match[1]);
      const rows = parseInt(match[2]);
      
      setTimeout(() => {
        const columnsEl = document.getElementById('columns');
        const rowsEl = document.getElementById('rows');
        
        if (columnsEl) {
          columnsEl.textContent = cols;
        }
        if (rowsEl) {
          rowsEl.textContent = rows;
        }
      }, 250);
    }
    
    loadSelectedSVG();
  }
}

// Ausgewählte SVG-Datei laden
function loadSelectedSVG() {
  const selector = document.getElementById('svgSelector');
  const selectedFile = selector.value;
  
  if (!selectedFile) return;
  
  console.log('Lade SVG-Datei:', selectedFile);
  currentSVGFile = selectedFile;
  
  const match = selectedFile.match(/svg_(\d+)x(\d+)\.txt/);
  if (match) {
    const cols = parseInt(match[1]);
    const rows = parseInt(match[2]);
    
    const columnsEl = document.getElementById('columns');
    const rowsEl = document.getElementById('rows');
    
    if (columnsEl) {
      columnsEl.textContent = cols;
    }
    if (rowsEl) {
      rowsEl.textContent = rows;
    }
    
    console.log(`Automatisch gesetzt: ${cols} Spalten, ${rows} Zeilen`);
    
    setTimeout(() => {
      calculateMeasurementsWithValues(cols, rows);
    }, 250);
  }
  
  loadSVGContent(selectedFile);
}

// SVG-Inhalt laden
function loadSVGContent(filename = 'svg_10x10.txt') {
  currentSVGFile = filename;
  
  fetch(filename)
    .then(response => response.text())
    .then(svgContent => {
      const svgContainer = document.getElementById('svgbox');
      if (svgContainer) {
        svgContainer.innerHTML = svgContent;
        
        findSVGElementsAndCreatePickers();
        
        setTimeout(() => {
          adjustViewBoxToContent();
          färbeSVG();
          calculateMeasurements();
        }, 150);
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

// SVG-Elemente analysieren
function findSVGElementsAndCreatePickers() {
  const svgContainer = document.getElementById('svgbox');
  const elementsWithIds = svgContainer.querySelectorAll('[id]');
  
  svgElementIds = [];
  colorPickerMapping = {};
  
  elementsWithIds.forEach(element => {
    if (element.id) {
      svgElementIds.push(element.id);
    }
  });
  
  console.log('Gefundene SVG-Elemente:', svgElementIds);
  
  createColorPickers(svgElementIds);
}

// Farbpicker erstellen
function createColorPickers(elementIds) {
  const container = document.getElementById('colorPickersContainer');
  
  if (elementIds.length === 0) {
    container.innerHTML = '<p>Keine SVG-Elemente mit IDs gefunden.</p>';
    return;
  }
  
  let tableHTML = '<table style="width: 100% !important; max-width: 100% !important;">';
  
  elementIds.forEach((elementId, index) => {
    let label, pickerId;
    
    if (index === 0) {
      label = 'Rahmenfarbe';
      pickerId = 'colorPickerrahmen';
    } else {
      label = `Farbe ${index}`;
      pickerId = `colorPicker${index}`;
    }
    
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
  
  initializeEventListeners();
  restoreColorsAfterCreation();
  
  setTimeout(() => {
    makeDraggable();
    console.log('Drag and Drop aktiviert');
  }, 200);
}

// JSON-Daten laden
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

// LocalStorage
let savedColors = {};
let selectedSwatches = {};

function saveColorToStorage(pickerId, color) {
  try {
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
    const storageKey = `svgColors_${currentSVGFile}`;
    const storedColors = localStorage.getItem(storageKey);
    if (storedColors) {
      const parsed = JSON.parse(storedColors);
      savedColors = parsed;
      console.log(`Farben für ${currentSVGFile} geladen:`, parsed);
      return parsed;
    }
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
    const storageKey = `svgSwatches_${currentSVGFile}`;
    const storedSwatches = localStorage.getItem(storageKey);
    if (storedSwatches) {
      const parsed = JSON.parse(storedSwatches);
      selectedSwatches = parsed;
      console.log(`Swatches für ${currentSVGFile} geladen:`, parsed);
      return parsed;
    }
    selectedSwatches = {};
    return {};
  } catch (error) {
    console.error('Fehler beim Laden der Swatches:', error);
    selectedSwatches = {};
    return {};
  }
}

function resetAllColors() {
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

function färbeSVG() {
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

window.onclick = function(event) {
  const modal = document.getElementById('colorModal');
  if (event.target === modal) {
    closeModal();
  }
}

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

function initializeCalculatorEvents() {
  const stripWidthEl = document.getElementById('stripWidth');
  const frameWidthEl = document.getElementById('frameWidth');
  const techniqueSelect = document.getElementById('techniqueSelect');
  
  if (stripWidthEl) {
    stripWidthEl.addEventListener('input', calculateMeasurements);
    stripWidthEl.addEventListener('change', calculateMeasurements);
  }
  if (frameWidthEl) {
    frameWidthEl.addEventListener('input', calculateMeasurements);
    frameWidthEl.addEventListener('change', calculateMeasurements);
  }
  if (techniqueSelect) {
    techniqueSelect.addEventListener('change', calculateMeasurements);
  }
  
  console.log('Calculator Event Listeners hinzugefügt');
}

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
window.generatePDF = generatePDF;

// PDF-Generierung
async function convertSvgToPng(svgContainer, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    const svgString = new XMLSerializer().serializeToString(svgContainer);
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = 2000;
    tempCanvas.height = 2000;
    
    const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    
    img.onload = function() {
      tempCtx.fillStyle = 'white';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      
      let minX = tempCanvas.width, minY = tempCanvas.height, maxX = 0, maxY = 0;
      let hasContent = false;
      
      for (let y = 0; y < tempCanvas.height; y++) {
        for (let x = 0; x < tempCanvas.width; x++) {
          const alpha = data[(y * tempCanvas.width + x) * 4 + 3];
          if (alpha > 10) {
            hasContent = true;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      
      URL.revokeObjectURL(url);
      
      if (!hasContent) {
        reject(new Error('Kein sichtbarer Inhalt gefunden'));
        return;
      }
      
      console.log('Gefundener Inhalt Bereich:', {minX, minY, maxX, maxY});
      
      const viewBox = svgContainer.viewBox.baseVal;
      const scaleX = viewBox.width / tempCanvas.width;
      const scaleY = viewBox.height / tempCanvas.height;
      
      const contentBounds = {
        x: viewBox.x + (minX * scaleX),
        y: viewBox.y + (minY * scaleY),
        width: (maxX - minX) * scaleX,
        height: (maxY - minY) * scaleY
      };
      
      console.log('SVG-Koordinaten des Inhalts:', contentBounds);
      
      renderWithCorrectViewBox(svgContainer, contentBounds, maxWidth)
        .then(resolve)
        .catch(reject);
    };
    
    img.onerror = reject;
    img.src = url;
  });
}

async function renderWithCorrectViewBox(svgContainer, contentBounds, maxWidth) {
  return new Promise((resolve, reject) => {
    const svgClone = svgContainer.cloneNode(true);
    
    const padding = Math.max(contentBounds.width * 0.1, contentBounds.height * 0.1, 10);
    const finalViewBox = {
      x: contentBounds.x - padding,
      y: contentBounds.y - padding,
      width: contentBounds.width + padding * 2,
      height: contentBounds.height + padding * 2
    };
    
    console.log('Finale ViewBox:', finalViewBox);
    
    svgClone.setAttribute('viewBox', 
      `${finalViewBox.x} ${finalViewBox.y} ${finalViewBox.width} ${finalViewBox.height}`
    );
    svgClone.removeAttribute('width');
    svgClone.removeAttribute('height');
    
    const svgString = new XMLSerializer().serializeToString(svgClone);
    
    const scale = Math.min(maxWidth / finalViewBox.width, 1);
    const canvasWidth = Math.floor(finalViewBox.width * scale);
    const canvasHeight = Math.floor(finalViewBox.height * scale);
    
    console.log('Final Canvas:', canvasWidth, 'x', canvasHeight);

    const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    
    img.onload = function() {
      try {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        
        URL.revokeObjectURL(url);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: canvasWidth,
          height: canvasHeight
        });
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = reject;
    img.src = url;
  });
}

async function generatePDF() {
  try {
    console.log('Starte PDF-Generierung...');
   
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const maxY = pageHeight - margin;
    
    function checkPageBreak(currentY, neededSpace) {
      if (currentY + neededSpace > maxY) {
        pdf.addPage();
        return margin;
      }
      return currentY;
    }
    
    function addSectionHeader(title, y) {
      pdf.setFillColor(232, 236, 240);
      pdf.rect(margin, y - 5, pageWidth - 2 * margin, 10, 'F');
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(44, 62, 80);
      pdf.text(title, margin + 3, y + 2);
      pdf.setFont(undefined, 'normal');
      return y + 12;
    }
    
    function addDivider(y) {
      pdf.setDrawColor(206, 212, 218);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      return y + 5;
    }
    
    let yPosition = margin;
    
    // SEITE 1: Titel, SVG oben und Farbauswahl mehrspaltig darunter
    
    // Hole Zeilen und Spalten für den Titel
    const columnsEl = document.getElementById('columns');
    const rowsEl = document.getElementById('rows');
    const columns = columnsEl ? columnsEl.textContent : '?';
    const rows = rowsEl ? rowsEl.textContent : '?';
    
    // Haupttitel "Hue Are Amazing"
    pdf.setFontSize(28);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 123, 255);
    pdf.text('Hue Are Amazing', pageWidth / 2, yPosition, { align: 'center' });
    
    // "by meika" rechts daneben (kursiv, grau, kleiner)
    const titleWidth = pdf.getTextWidth('Hue Are Amazing!');
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'italic');
    pdf.setTextColor(100, 100, 100); // Grau
    pdf.text('by meika', (pageWidth / 2) + (titleWidth / 2) + 3, yPosition);
    
    // Zeile darunter: "10x10 Quiltentwurf"
    yPosition += 7;
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${columns}x${rows} Quiltentwurf`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 8;
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(108, 117, 125);
    const currentDate = new Date().toLocaleDateString('de-DE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    pdf.text(currentDate, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    
    const svgContainer = document.getElementById('svgbox');
    
    // SVG oben zentriert einfügen (größere Größe)
    try {
      const result = await convertSvgToPng(svgContainer, 800);
      console.log('Finale PNG Größe:', result.width, 'x', result.height);
      
      const svgMaxWidthMm = pageWidth - 2 * margin; // Volle Breite nutzen
      const aspectRatio = result.height / result.width;
      
      let imgWidthMm = svgMaxWidthMm;
      let imgHeightMm = svgMaxWidthMm * aspectRatio;
      
      const svgMaxHeightMm = 120; // Maximal 120mm Höhe für SVG
      if (imgHeightMm > svgMaxHeightMm) {
        imgHeightMm = svgMaxHeightMm;
        imgWidthMm = svgMaxHeightMm / aspectRatio;
      }
      
      const svgXPosition = (pageWidth - imgWidthMm) / 2;
      
      // Rahmen um das Bild
      pdf.setDrawColor(206, 212, 218);
      pdf.setLineWidth(0.5);
      pdf.rect(svgXPosition - 1, yPosition - 1, imgWidthMm + 2, imgHeightMm + 2);
      
      pdf.addImage(result.dataUrl, 'PNG', svgXPosition, yPosition, imgWidthMm, imgHeightMm);
      yPosition += imgHeightMm + 10;
      
    } catch (err) {
      console.error('Fehler beim SVG-Rendering:', err);
      pdf.setFontSize(10);
      pdf.setTextColor(220, 53, 69);
      pdf.text('Fehler beim Laden der SVG-Grafik', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }
    
    // Farbauswahl mehrspaltig darunter
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(44, 62, 80);
    pdf.text('Farbauswahl', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
    
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    
    const colorPickers = document.querySelectorAll('input[type="color"]');
    const colors = [];
    
    // Sammle alle Farbinformationen
    colorPickers.forEach((picker) => {
      const row = picker.closest('tr');
      if (!row) return;
      
      const labelElement = row.querySelector('label');
      if (!labelElement) return;
      
      const label = labelElement.textContent;
      const color = picker.value;
      const swatchInfo = document.getElementById(`swatchInfo-${picker.id}`);
      const swatchText = swatchInfo ? swatchInfo.textContent : '';
      
      colors.push({ label, color, swatchText });
    });
    
    // Mehrspaltige Darstellung (3 Spalten)
    const numColumns = 3;
    const columnWidth = (pageWidth - 2 * margin) / numColumns;
    const startY = yPosition;
    let maxRowHeight = 10; // Mindesthöhe pro Zeile
    let currentPage = 1;
    
    colors.forEach((colorInfo, index) => {
      const columnIndex = index % numColumns;
      const rowIndex = Math.floor(index / numColumns);
      
      const xPos = margin + (columnIndex * columnWidth);
      let yPos = startY + (rowIndex * maxRowHeight);
      
      // Prüfe ob neue Seite nötig (nur am Anfang einer neuen Zeile)
      if (columnIndex === 0 && yPos > maxY - 20) {
        pdf.addPage();
        currentPage++;
        yPosition = margin;
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Farbauswahl (Fortsetzung)', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        yPos = yPosition;
      }
      
      // Farbquadrat
      pdf.setFillColor(colorInfo.color);
      pdf.rect(xPos, yPos - 3, 5, 5, 'F');
      pdf.setDrawColor(170, 170, 170);
      pdf.setLineWidth(0.2);
      pdf.rect(xPos, yPos - 3, 5, 5);
      
      // Label
      pdf.setFont(undefined, 'bold');
      const labelText = pdf.splitTextToSize(colorInfo.label, 20);
      pdf.text(labelText[0], xPos + 7, yPos);
      
      // Hex-Code
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(108, 117, 125);
      pdf.text(colorInfo.color.toUpperCase(), xPos + 30, yPos);
      pdf.setTextColor(0, 0, 0);
      
      let currentYPos = yPos + 3;
      
      // Swatch-Info (immer anzeigen wenn vorhanden)
      if (colorInfo.swatchText) {
        pdf.setFontSize(6);
        pdf.setTextColor(108, 117, 125);
        const swatchLines = pdf.splitTextToSize(colorInfo.swatchText, columnWidth - 10);
        swatchLines.forEach((line, lineIndex) => {
          if (lineIndex < 2) { // Maximal 2 Zeilen pro Swatch
            pdf.text(line, xPos + 7, currentYPos);
            currentYPos += 2.5;
          }
        });
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
      }
      
      // Berechne die benötigte Höhe für diese Farbe
      const neededHeight = currentYPos - yPos + 2;
      if (columnIndex === numColumns - 1 || index === colors.length - 1) {
        // Am Ende einer Zeile: Setze die maximale Zeilenhöhe
        maxRowHeight = Math.max(maxRowHeight, neededHeight);
      }
    });
    
    // Berechne die finale Y-Position nach allen Farben
    const totalRows = Math.ceil(colors.length / numColumns);
    yPosition = startY + (totalRows * maxRowHeight) + 5;
    
    // SEITE 2: Maße und Stoffbedarf
    pdf.addPage();
    yPosition = margin;
    
    yPosition = addSectionHeader('Maße', yPosition);
    
    pdf.setFontSize(10);
    const measurements = [
      { label: 'Streifenbreite', elem: document.getElementById('stripWidth'), isInput: true, suffix: ' inch (zzgl. NZ)' },
      { label: 'Blockgröße', elem: document.getElementById('blockSize'), isInput: false },
      { label: 'Anzahl Spalten', elem: document.getElementById('columns'), isInput: false },
      { label: 'Anzahl Zeilen', elem: document.getElementById('rows'), isInput: false },
      { label: 'Finale Breite ohne Rahmen', elem: document.getElementById('finalWidthNoFrame'), isInput: false },
      { label: 'Finale Höhe ohne Rahmen', elem: document.getElementById('finalHeightNoFrame'), isInput: false },
      { label: 'Rahmenbreite', elem: document.getElementById('frameWidth'), isInput: true, suffix: ' inch (zzgl. NZ)' },
      { label: 'Finale Breite mit Rahmen', elem: document.getElementById('finalWidthWithFrame'), isInput: false },
      { label: 'Finale Höhe mit Rahmen', elem: document.getElementById('finalHeightWithFrame'), isInput: false }
    ];
    
    measurements.forEach((item, index) => {
      if (item.elem) {
        const value = item.isInput ? item.elem.value : item.elem.textContent;
        const displayValue = value + (item.suffix || '');
        
        pdf.setFont(undefined, 'bold');
        pdf.text(item.label + ':', margin, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.text(displayValue, margin + 70, yPosition);
        yPosition += 7;
      }
    });
    
    yPosition += 10;
    yPosition = addDivider(yPosition);
    yPosition += 5;
    
    yPosition = addSectionHeader('Stoffbedarf', yPosition);
    
    pdf.setFontSize(10);
    const techniqueSelect = document.getElementById('techniqueSelect');
    const technique = techniqueSelect ? techniqueSelect.options[techniqueSelect.selectedIndex].text : '';
    
    pdf.setFont(undefined, 'bold');
    pdf.text('Technik:', margin, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(technique, margin + 30, yPosition);
    yPosition += 10;
    
    const fabricTable = document.querySelector('.fabric-table');
    if (fabricTable) {
      const rows = fabricTable.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 2) {
          const label = cells[0].textContent.trim();
          const value = cells[1].textContent.trim();
          
          const isTotal = label.includes('Gesamt');
          if (isTotal) {
            pdf.setFillColor(208, 231, 255);
            pdf.rect(margin - 2, yPosition - 5, pageWidth - 2 * margin + 4, 9, 'F');
          }
          
          pdf.setFont(undefined, isTotal ? 'bold' : 'bold');
          pdf.text(label, margin, yPosition);
          pdf.setFont(undefined, isTotal ? 'bold' : 'normal');
          pdf.text(value, margin + 70, yPosition);
          yPosition += 8;
        }
      });
    }
    
    yPosition += 5;
    
    const hintText = document.getElementById('fabricHintText');
    if (hintText) {
      yPosition = addDivider(yPosition);
      yPosition += 2;
      
      pdf.setFontSize(8);
      pdf.setTextColor(108, 117, 125);
      const hints = hintText.innerHTML.split('<br>');
      hints.forEach(hint => {
        const cleanHint = hint.replace(/\*/g, '').trim();
        if (cleanHint) {
          pdf.text('• ' + cleanHint, margin, yPosition);
          yPosition += 4;
        }
      });
      pdf.setTextColor(0, 0, 0);
    }
    
    // Fußzeile auf allen Seiten
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `Seite ${i} von ${totalPages} | Erstellt mit HueAreAmazing | Schnittmuster und Anleitung erstellt von Katharina Meissner @meika_mau`, 
        pageWidth / 2, 
        pageHeight - 10, 
        { align: 'center' }
      );
    }
    
    const filename = `HueAreAmazing_${columns}x${rows}_Quiltentwurf-${new Date().toISOString().slice(0,10)}.pdf`;
    pdf.save(filename);
    
    console.log('PDF erfolgreich erstellt!');
    
  } catch (error) {
    console.error('Fehler bei der PDF-Erstellung:', error);
    alert('Fehler bei der PDF-Erstellung. Bitte versuche es erneut.');
  }
}

// DOMContentLoaded Event
document.addEventListener('DOMContentLoaded', function() {
  function initCalculator() {
    if (document.getElementById('stripWidth') && 
        document.getElementById('columns') && 
        document.getElementById('rows') && 
        document.getElementById('frameWidth')) {
      initializeCalculatorEvents();
      calculateMeasurements();
    } else {
      setTimeout(initCalculator, 250);
    }
  }
  
  setTimeout(initCalculator, 300);
});

// Initialisierung beim Laden
setTimeout(() => {
  loadAvailableSVGFiles();
}, 200);

setTimeout(() => {
  loadSwatchesData().then(() => {
    // Wird automatisch nach Picker-Erstellung aufgerufen
  });
}, 200);