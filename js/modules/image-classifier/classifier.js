/**
 * Image Classifier Module
 * Handles image classification using Transformers.js
 */

class ImageClassifier {
  constructor(dbManager, loadingManager, errorHandler) {
    this.dbManager = dbManager;
    this.loadingManager = loadingManager;
    this.errorHandler = errorHandler;

    this.pipeline = null;
    this.modelLoaded = false;
    this.currentModel = null;

    // Model configurations
    this.models = {
      'mobilenet-v4': {
        name: 'MobileNetV4 Small',
        id: 'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k',
        description: 'Modelo ligero optimizado para velocidad. Recomendado para pruebas iniciales.',
        size: '~15 MB',
        speed: 'Rápido',
        iosCompatible: true
      },
      'mobilenet-v3': {
        name: 'MobileNetV3 Large',
        id: 'Xenova/mobilenet_v3_large',
        description: 'Modelo balanceado con buena precisión y velocidad moderada.',
        size: '~20 MB',
        speed: 'Medio',
        iosCompatible: true
      },
      'resnet50': {
        name: 'ResNet50',
        id: 'Xenova/resnet-50',
        description: 'Modelo potente con alta precisión. Más lento pero más preciso.',
        size: '~100 MB',
        speed: 'Lento',
        iosCompatible: true
      }
    };
  }

  /**
   * Initialize the classifier with a specific model
   * @param {string} modelKey - Model key from this.models
   * @returns {Promise<void>}
   */
  async initialize(modelKey = 'mobilenet-v4') {
    try {
      // Check if model exists
      if (!this.models[modelKey]) {
        throw new Error(`Model ${modelKey} not found`);
      }

      this.currentModel = modelKey;
      const modelConfig = this.models[modelKey];

      console.log(`[Classifier] ===== Starting model initialization =====`);
      console.log(`[Classifier] Model: ${modelConfig.name}`);
      console.log(`[Classifier] Model ID: ${modelConfig.id}`);
      console.log(`[Classifier] Platform: ${navigator.platform}`);
      console.log(`[Classifier] User Agent: ${navigator.userAgent}`);

      this.loadingManager.showLoading(`Cargando modelo ${modelConfig.name}...`);

      // Dynamically import Transformers.js v2 (compatible with iOS Safari)
      console.log('[Classifier] Importing Transformers.js v2.15.1...');
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.1');
      console.log('[Classifier] Transformers.js v2.15.1 imported successfully');

      // Configure environment
      env.allowLocalModels = false;
      env.allowRemoteModels = true;
      console.log('[Classifier] Environment configured');

      // Detect WebGPU support
      const device = await this.detectDevice();
      console.log(`[Classifier] Using device: ${device}`);

      // Create pipeline with progress callback
      console.log('[Classifier] Creating pipeline...');
      this.pipeline = await pipeline(
        'image-classification',
        modelConfig.id,
        {
          device: device,
          progress_callback: (progress) => {
            console.log('[Classifier] Progress:', progress);
            this.updateLoadProgress(progress);
          }
        }
      );
      console.log('[Classifier] Pipeline created successfully');

      this.modelLoaded = true;
      this.loadingManager.hideLoading();

      console.log(`[Classifier] ===== Model loaded successfully =====`);
      this.errorHandler.showToast(
        'Modelo cargado',
        `${modelConfig.name} listo para clasificar imágenes`,
        'success'
      );

      // Save selected model to settings
      await this.dbManager.saveSetting('selectedModel', modelKey);

    } catch (error) {
      this.modelLoaded = false;
      this.loadingManager.hideLoading();

      console.error('[Classifier] ===== Error initializing model =====');
      console.error('[Classifier] Error name:', error.name);
      console.error('[Classifier] Error message:', error.message);
      console.error('[Classifier] Error stack:', error.stack);
      console.error('[Classifier] Full error:', error);

      // Check for memory errors (common on iOS/iPad)
      if (error.message?.includes('out of memory') ||
          error.message?.includes('RangeError') ||
          error.message?.includes('memory') ||
          error.name === 'RangeError') {
        console.error('[Classifier] Memory error detected');
        this.errorHandler.showToast(
          'Memoria insuficiente',
          `El modelo ${this.models[modelKey]?.name || modelKey} es demasiado grande. Prueba con MobileNetV4.`,
          'error'
        );
      } else {
        console.error('[Classifier] Non-memory error');
        this.errorHandler.handleError(error, {
          context: 'model-initialization',
          modelKey: modelKey,
          modelConfig: this.models[modelKey]
        });
      }
      throw error;
    }
  }

  /**
   * Detect best available device (WebGPU or WASM)
   * @returns {Promise<string>}
   */
  async detectDevice() {
    // Check for WebGPU support
    if ('gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          console.log('[Classifier] WebGPU available');
          return 'webgpu';
        }
      } catch (error) {
        console.log('[Classifier] WebGPU not available:', error.message);
      }
    }

    console.log('[Classifier] Falling back to WASM');
    return 'wasm';
  }

  /**
   * Update loading progress
   * @param {Object} progress - Progress information
   */
  updateLoadProgress(progress) {
    if (progress.status === 'downloading') {
      const percent = progress.progress ? Math.round(progress.progress) : 0;
      this.loadingManager.updateProgress(percent);
      this.loadingManager.updateMessage(`Descargando modelo... ${percent}%`);
    } else if (progress.status === 'loading') {
      this.loadingManager.updateMessage('Cargando modelo en memoria...');
      this.loadingManager.updateProgress(90);
    } else if (progress.status === 'ready') {
      this.loadingManager.updateProgress(100);
    }
  }

  /**
   * Classify an image
   * @param {string|File|HTMLImageElement} imageSource - Image to classify
   * @param {number} topK - Number of top results to return
   * @returns {Promise<Array>}
   */
  async classifyImage(imageSource, topK = 5) {
    if (!this.modelLoaded || !this.pipeline) {
      throw new Error('Model not loaded. Please initialize first.');
    }

    try {
      console.log('[Classifier] Classifying image...');
      this.loadingManager.showLoading('Clasificando imagen...');

      const startTime = performance.now();

      // Run classification
      const results = await this.pipeline(imageSource, {
        topk: topK
      });

      const endTime = performance.now();
      const inferenceTime = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`[Classifier] Classification completed in ${inferenceTime}s`);
      console.log('[Classifier] Results:', results);

      this.loadingManager.hideLoading();

      return {
        results: results,
        inferenceTime: inferenceTime,
        model: this.currentModel,
        timestamp: Date.now()
      };

    } catch (error) {
      this.loadingManager.hideLoading();
      console.error('[Classifier] Error during classification:', error);
      this.errorHandler.handleError(error, { context: 'classification' });
      throw error;
    }
  }

  /**
   * Create a thumbnail from an image
   * @param {HTMLImageElement} img - Image element
   * @param {number} maxSize - Maximum size for thumbnail
   * @returns {Promise<string>} Base64 data URL
   */
  async createThumbnail(img, maxSize = 100) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and convert to data URL
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    });
  }

  /**
   * Save classification result to history
   * @param {Object} classificationResult - Classification result
   * @param {string} imageThumbnail - Base64 thumbnail
   * @returns {Promise<number>}
   */
  async saveToHistory(classificationResult, imageThumbnail) {
    try {
      const entry = {
        moduleType: 'image-classification',
        imageThumb: imageThumbnail,
        results: classificationResult.results,
        inferenceTime: classificationResult.inferenceTime,
        model: classificationResult.model
      };

      const id = await this.dbManager.addToHistory(entry);
      console.log('[Classifier] Saved to history with ID:', id);
      return id;
    } catch (error) {
      console.error('[Classifier] Error saving to history:', error);
      this.errorHandler.handleError(error, { context: 'save-history' });
      throw error;
    }
  }

  /**
   * Get model configuration
   * @param {string} modelKey - Model key
   * @returns {Object}
   */
  getModelConfig(modelKey) {
    return this.models[modelKey] || null;
  }

  /**
   * Get all available models
   * @returns {Object}
   */
  getAvailableModels() {
    return this.models;
  }

  /**
   * Check if model is loaded
   * @returns {boolean}
   */
  isModelLoaded() {
    return this.modelLoaded;
  }

  /**
   * Get current model key
   * @returns {string}
   */
  getCurrentModel() {
    return this.currentModel;
  }
}

export default ImageClassifier;
