/**
 * UI Controller for Image Classifier
 * Handles all UI interactions for the classifier module
 */

class ClassifierUIController {
  constructor(classifier, dbManager, errorHandler) {
    this.classifier = classifier;
    this.dbManager = dbManager;
    this.errorHandler = errorHandler;

    this.currentImage = null;
    this.currentResults = null;

    // UI Elements
    this.elements = {};
  }

  /**
   * Initialize the UI controller
   */
  init() {
    this.initializeElements();
    this.attachEventListeners();
    this.setupDragAndDrop();
    this.loadHistory();
  }

  /**
   * Initialize UI element references
   */
  initializeElements() {
    this.elements = {
      // Model selector
      modelSelect: document.getElementById('model-select'),
      modelInfo: document.getElementById('model-info'),

      // Upload area
      uploadArea: document.getElementById('upload-area'),
      uploadBtn: document.getElementById('upload-btn'),
      fileInput: document.getElementById('file-input'),

      // Preview section
      previewSection: document.getElementById('preview-section'),
      previewImage: document.getElementById('preview-image'),
      clearImageBtn: document.getElementById('clear-image-btn'),
      classifyBtn: document.getElementById('classify-btn'),

      // Results section
      resultsSection: document.getElementById('results-section'),
      resultsContainer: document.getElementById('results-container'),
      saveToHistoryBtn: document.getElementById('save-to-history-btn'),
      classifyAnotherBtn: document.getElementById('classify-another-btn'),

      // History section
      toggleHistoryBtn: document.getElementById('toggle-history-btn'),
      historyContainer: document.getElementById('history-container'),
      historyList: document.getElementById('history-list'),
      clearHistoryBtn: document.getElementById('clear-history-btn')
    };
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    // Model selector
    this.elements.modelSelect?.addEventListener('change', (e) => {
      this.handleModelChange(e.target.value);
    });

    // Upload buttons
    this.elements.uploadBtn?.addEventListener('click', () => {
      this.elements.fileInput?.click();
    });

    this.elements.uploadArea?.addEventListener('click', () => {
      this.elements.fileInput?.click();
    });

    this.elements.fileInput?.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files[0]);
    });

    // Preview buttons
    this.elements.clearImageBtn?.addEventListener('click', () => {
      this.clearImage();
    });

    this.elements.classifyBtn?.addEventListener('click', () => {
      this.handleClassify();
    });

    // Results buttons
    this.elements.saveToHistoryBtn?.addEventListener('click', () => {
      this.saveCurrentToHistory();
    });

    this.elements.classifyAnotherBtn?.addEventListener('click', () => {
      this.clearImage();
    });

    // History buttons
    this.elements.toggleHistoryBtn?.addEventListener('click', () => {
      this.toggleHistory();
    });

    this.elements.clearHistoryBtn?.addEventListener('click', () => {
      this.clearHistory();
    });
  }

  /**
   * Setup drag and drop functionality
   */
  setupDragAndDrop() {
    const uploadArea = this.elements.uploadArea;
    if (!uploadArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.remove('drag-over');
      });
    });

    uploadArea.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleFileSelect(file);
      } else {
        this.errorHandler.showToast(
          'Archivo no válido',
          'Por favor, selecciona una imagen válida',
          'warning'
        );
      }
    });
  }

  /**
   * Handle model change
   * @param {string} modelKey - Selected model key
   */
  async handleModelChange(modelKey) {
    const modelConfig = this.classifier.getModelConfig(modelKey);
    if (!modelConfig) return;

    // Update model info
    if (this.elements.modelInfo) {
      this.elements.modelInfo.textContent = modelConfig.description;
    }

    // Initialize the new model
    try {
      await this.classifier.initialize(modelKey);
    } catch (error) {
      console.error('[UI] Error changing model:', error);
    }
  }

  /**
   * Handle file selection
   * @param {File} file - Selected file
   */
  handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.errorHandler.showToast(
        'Archivo no válido',
        'Por favor, selecciona una imagen válida',
        'warning'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.displayImage(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Display image in preview
   * @param {string} imageDataUrl - Image data URL
   */
  displayImage(imageDataUrl) {
    if (this.elements.previewImage) {
      this.elements.previewImage.src = imageDataUrl;
      this.currentImage = imageDataUrl;
    }

    // Show preview section, hide results
    this.showSection(this.elements.previewSection);
    this.hideSection(this.elements.resultsSection);
  }

  /**
   * Clear current image
   */
  clearImage() {
    this.currentImage = null;
    this.currentResults = null;

    if (this.elements.previewImage) {
      this.elements.previewImage.src = '';
    }

    if (this.elements.fileInput) {
      this.elements.fileInput.value = '';
    }

    this.hideSection(this.elements.previewSection);
    this.hideSection(this.elements.resultsSection);
  }

  /**
   * Handle classification
   */
  async handleClassify() {
    if (!this.currentImage) {
      this.errorHandler.showToast(
        'No hay imagen',
        'Por favor, selecciona una imagen primero',
        'warning'
      );
      return;
    }

    if (!this.classifier.isModelLoaded()) {
      this.errorHandler.showToast(
        'Modelo no cargado',
        'Por favor, espera a que el modelo se cargue',
        'warning'
      );
      return;
    }

    try {
      // Classify the image
      const result = await this.classifier.classifyImage(this.currentImage);
      this.currentResults = result;

      // Display results
      this.displayResults(result);
    } catch (error) {
      console.error('[UI] Error during classification:', error);
    }
  }

  /**
   * Display classification results
   * @param {Object} result - Classification result
   */
  displayResults(result) {
    if (!this.elements.resultsContainer) return;

    // Clear previous results
    this.elements.resultsContainer.innerHTML = '';

    // Create result items
    result.results.forEach((item, index) => {
      const resultItem = document.createElement('div');
      resultItem.className = 'result-item';

      const confidence = (item.score * 100).toFixed(1);

      resultItem.innerHTML = `
        <div class="result-rank">#${index + 1}</div>
        <div class="result-label">${this.formatLabel(item.label)}</div>
        <div class="result-confidence">
          <div class="confidence-bar-container">
            <div class="confidence-bar" style="width: ${confidence}%"></div>
          </div>
          <span class="confidence-value">${confidence}%</span>
        </div>
      `;

      this.elements.resultsContainer.appendChild(resultItem);
    });

    // Add inference time info
    const infoDiv = document.createElement('div');
    infoDiv.style.marginTop = '1rem';
    infoDiv.style.fontSize = 'var(--text-sm)';
    infoDiv.style.color = 'var(--text-secondary)';
    infoDiv.textContent = `Tiempo de inferencia: ${result.inferenceTime}s`;
    this.elements.resultsContainer.appendChild(infoDiv);

    // Show results section
    this.showSection(this.elements.resultsSection);
  }

  /**
   * Format label for display
   * @param {string} label - Raw label
   * @returns {string}
   */
  formatLabel(label) {
    return label
      .split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Save current results to history
   */
  async saveCurrentToHistory() {
    if (!this.currentResults || !this.currentImage) {
      this.errorHandler.showToast(
        'No hay resultados',
        'No hay resultados para guardar',
        'warning'
      );
      return;
    }

    try {
      // Create thumbnail
      const img = this.elements.previewImage;
      const thumbnail = await this.classifier.createThumbnail(img);

      // Save to history
      await this.classifier.saveToHistory(this.currentResults, thumbnail);

      this.errorHandler.showToast(
        'Guardado',
        'Resultado guardado en el historial',
        'success'
      );

      // Reload history
      this.loadHistory();
    } catch (error) {
      console.error('[UI] Error saving to history:', error);
    }
  }

  /**
   * Load and display history
   */
  async loadHistory() {
    if (!this.elements.historyList) return;

    try {
      const history = await this.dbManager.getHistory(20);

      if (history.length === 0) {
        this.elements.historyList.innerHTML = `
          <div class="history-empty">
            No hay clasificaciones en el historial
          </div>
        `;
        return;
      }

      this.elements.historyList.innerHTML = '';

      history.forEach(entry => {
        const historyItem = this.createHistoryItem(entry);
        this.elements.historyList.appendChild(historyItem);
      });
    } catch (error) {
      console.error('[UI] Error loading history:', error);
    }
  }

  /**
   * Create history item element
   * @param {Object} entry - History entry
   * @returns {HTMLElement}
   */
  createHistoryItem(entry) {
    const item = document.createElement('div');
    item.className = 'history-item';

    const topResult = entry.results[0];
    const confidence = (topResult.score * 100).toFixed(1);
    const date = new Date(entry.timestamp).toLocaleString('es-ES');

    item.innerHTML = `
      <img src="${entry.imageThumb}" alt="Thumbnail" class="history-thumbnail">
      <div class="history-details">
        <div class="history-label">${this.formatLabel(topResult.label)}</div>
        <div class="history-confidence">Confianza: ${confidence}%</div>
        <div class="history-timestamp">${date}</div>
      </div>
    `;

    // Click to view details (optional enhancement)
    item.addEventListener('click', () => {
      this.displayHistoryEntry(entry);
    });

    return item;
  }

  /**
   * Display a history entry
   * @param {Object} entry - History entry
   */
  displayHistoryEntry(entry) {
    // Display the thumbnail
    this.displayImage(entry.imageThumb);

    // Display the results
    this.displayResults({
      results: entry.results,
      inferenceTime: entry.inferenceTime
    });

    this.errorHandler.showToast(
      'Historial',
      'Mostrando resultado del historial',
      'info'
    );
  }

  /**
   * Toggle history visibility
   */
  toggleHistory() {
    if (!this.elements.historyContainer) return;

    if (this.elements.historyContainer.style.display === 'none') {
      this.elements.historyContainer.style.display = 'block';
      this.loadHistory();
    } else {
      this.elements.historyContainer.style.display = 'none';
    }
  }

  /**
   * Clear all history
   */
  async clearHistory() {
    if (!confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
      return;
    }

    try {
      await this.dbManager.clearHistory();
      this.loadHistory();

      this.errorHandler.showToast(
        'Historial borrado',
        'Todo el historial ha sido eliminado',
        'success'
      );
    } catch (error) {
      console.error('[UI] Error clearing history:', error);
    }
  }

  /**
   * Show a section
   * @param {HTMLElement} section - Section to show
   */
  showSection(section) {
    if (section) {
      section.style.display = 'block';
    }
  }

  /**
   * Hide a section
   * @param {HTMLElement} section - Section to hide
   */
  hideSection(section) {
    if (section) {
      section.style.display = 'none';
    }
  }
}

export default ClassifierUIController;
