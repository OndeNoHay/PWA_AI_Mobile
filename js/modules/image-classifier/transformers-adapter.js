/**
 * Transformers.js v3 Adapter
 * Handles image classification using Transformers.js v3 (optimized for PC/Android with WebGPU)
 */

class TransformersAdapter {
  constructor(loadingManager, errorHandler) {
    this.loadingManager = loadingManager;
    this.errorHandler = errorHandler;
    this.pipeline = null;
    this.modelLoaded = false;
    this.transformers = null;
  }

  /**
   * Initialize Transformers.js with the specified model
   * @param {string} modelId - HuggingFace model ID
   * @param {Object} options - Configuration options
   * @returns {Promise<void>}
   */
  async initialize(modelId, options = {}) {
    try {
      console.log('[Transformers Adapter] ===== Starting initialization =====');
      console.log('[Transformers Adapter] Model ID:', modelId);
      console.log('[Transformers Adapter] Options:', options);

      this.loadingManager.showLoading('Cargando Transformers.js v3...');

      // Import Transformers.js v3 from CDN
      console.log('[Transformers Adapter] Importing Transformers.js v3...');
      this.transformers = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@3.0.2');
      console.log('[Transformers Adapter] Transformers.js v3 imported successfully');

      // Configure environment
      this.transformers.env.allowLocalModels = false;
      this.transformers.env.allowRemoteModels = true;
      this.transformers.env.backends.onnx.wasm.numThreads = options.numThreads || 4;

      // Detect device (WebGPU or WASM)
      const device = await this.detectDevice();
      console.log('[Transformers Adapter] Using device:', device);

      this.loadingManager.updateMessage(`Cargando modelo ${modelId}...`);

      // Create pipeline with progress callback
      console.log('[Transformers Adapter] Creating pipeline...');
      this.pipeline = await this.transformers.pipeline(
        'image-classification',
        modelId,
        {
          device: device,
          dtype: device === 'webgpu' ? 'fp32' : 'fp32',
          progress_callback: (progress) => {
            console.log('[Transformers Adapter] Progress:', progress);
            this.updateLoadProgress(progress);
          }
        }
      );
      console.log('[Transformers Adapter] Pipeline created successfully');

      this.modelLoaded = true;
      this.loadingManager.hideLoading();

      console.log('[Transformers Adapter] ===== Initialization complete =====');

    } catch (error) {
      this.modelLoaded = false;
      this.loadingManager.hideLoading();

      console.error('[Transformers Adapter] ===== Error initializing =====');
      console.error('[Transformers Adapter] Error:', error);
      console.error('[Transformers Adapter] Stack:', error.stack);

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
          console.log('[Transformers Adapter] WebGPU available');
          return 'webgpu';
        }
      } catch (error) {
        console.log('[Transformers Adapter] WebGPU not available:', error.message);
      }
    }

    console.log('[Transformers Adapter] Falling back to WASM');
    return 'wasm';
  }

  /**
   * Update loading progress
   * @param {Object} progress - Progress information from Transformers.js
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
    } else if (progress.status === 'initiate') {
      this.loadingManager.updateMessage('Iniciando descarga...');
      this.loadingManager.updateProgress(0);
    }
  }

  /**
   * Classify an image
   * @param {HTMLImageElement|string} imageSource - Image element or URL to classify
   * @param {number} topK - Number of top results to return
   * @returns {Promise<Object>} Classification results
   */
  async classifyImage(imageSource, topK = 5) {
    if (!this.modelLoaded || !this.pipeline) {
      throw new Error('Model not loaded. Please initialize first.');
    }

    try {
      console.log('[Transformers Adapter] Starting classification...');
      this.loadingManager.showLoading('Clasificando imagen...');

      const startTime = performance.now();

      // Run classification using Transformers.js pipeline
      // The pipeline handles all preprocessing internally
      console.log('[Transformers Adapter] Running inference...');
      const results = await this.pipeline(imageSource, {
        topk: topK
      });

      const endTime = performance.now();
      const inferenceTime = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`[Transformers Adapter] Classification completed in ${inferenceTime}s`);
      console.log('[Transformers Adapter] Results:', results);

      this.loadingManager.hideLoading();

      return {
        results: results,
        inferenceTime: inferenceTime,
        model: 'transformers-v3',
        timestamp: Date.now()
      };

    } catch (error) {
      this.loadingManager.hideLoading();
      console.error('[Transformers Adapter] Error during classification:', error);
      throw error;
    }
  }

  /**
   * Check if model is loaded
   * @returns {boolean}
   */
  isModelLoaded() {
    return this.modelLoaded;
  }

  /**
   * Get adapter name
   * @returns {string}
   */
  getName() {
    return 'Transformers.js v3';
  }

  /**
   * Get adapter version
   * @returns {string}
   */
  getVersion() {
    return '3.0.2';
  }
}

export default TransformersAdapter;
