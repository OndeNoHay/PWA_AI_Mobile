/**
 * ONNX Runtime Web Adapter
 * Handles image classification using ONNX Runtime Web (optimized for iOS Safari)
 */

import { loadImageNetLabels, getLabelByIndex } from './imagenet-labels.js';

class ONNXAdapter {
  constructor(loadingManager, errorHandler) {
    this.loadingManager = loadingManager;
    this.errorHandler = errorHandler;
    this.session = null;
    this.modelLoaded = false;
    this.labels = null;
    this.ort = null;
  }

  /**
   * Initialize ONNX Runtime Web with the specified model
   * @param {string} modelPath - Path to ONNX model file (URL or local path)
   * @param {Object} options - Configuration options
   * @returns {Promise<void>}
   */
  async initialize(modelPath, options = {}) {
    try {
      console.log('[ONNX Adapter] ===== Starting initialization =====');
      console.log('[ONNX Adapter] Model path:', modelPath);

      this.loadingManager.showLoading('Cargando ONNX Runtime Web...');

      // Import ONNX Runtime Web from CDN
      console.log('[ONNX Adapter] Importing ONNX Runtime Web from CDN...');
      this.ort = await import('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.esm.min.js');
      console.log('[ONNX Adapter] ONNX Runtime Web imported successfully');

      // Configure environment for iOS Safari
      this.ort.env.wasm.numThreads = 1; // Single thread for iOS stability
      this.ort.env.wasm.simd = true; // Enable SIMD if available
      this.ort.env.wasm.proxy = false; // Disable proxy workers on iOS

      // Load ImageNet labels
      console.log('[ONNX Adapter] Loading ImageNet labels...');
      this.labels = await loadImageNetLabels();
      console.log('[ONNX Adapter] Labels loaded:', this.labels.length);

      // Create inference session with WebGL execution provider (best for iOS)
      const executionProvider = options.executionProvider || 'webgl';
      console.log('[ONNX Adapter] Using execution provider:', executionProvider);

      this.loadingManager.updateMessage('Cargando modelo ONNX...');

      const sessionOptions = {
        executionProviders: [executionProvider],
        graphOptimizationLevel: 'all',
        executionMode: 'sequential',
        enableCpuMemArena: false, // Disable for iOS
        enableMemPattern: false    // Disable for iOS
      };

      // Try to load model with caching support
      console.log('[ONNX Adapter] Loading model with cache support...');
      const modelData = await this.loadModelWithCache(modelPath);

      console.log('[ONNX Adapter] Creating inference session...');
      this.session = await this.ort.InferenceSession.create(modelData, sessionOptions);
      console.log('[ONNX Adapter] Session created successfully');
      console.log('[ONNX Adapter] Input names:', this.session.inputNames);
      console.log('[ONNX Adapter] Output names:', this.session.outputNames);

      this.modelLoaded = true;
      this.loadingManager.hideLoading();

      console.log('[ONNX Adapter] ===== Initialization complete =====');

    } catch (error) {
      this.modelLoaded = false;
      this.loadingManager.hideLoading();

      console.error('[ONNX Adapter] ===== Error initializing =====');
      console.error('[ONNX Adapter] Error:', error);
      console.error('[ONNX Adapter] Stack:', error.stack);

      throw error;
    }
  }

  /**
   * Load model with cache support using Cache API
   * @param {string} modelUrl - URL or path to model
   * @returns {Promise<ArrayBuffer>} Model data
   */
  async loadModelWithCache(modelUrl) {
    const CACHE_NAME = 'onnx-models-v1';

    try {
      // Try to get from cache first
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(modelUrl);

      if (cachedResponse) {
        console.log('[ONNX Adapter] Model found in cache');
        return await cachedResponse.arrayBuffer();
      }

      // Not in cache, fetch from network
      console.log('[ONNX Adapter] Model not in cache, fetching from network...');

      // Check if online
      if (!navigator.onLine) {
        throw new Error('No hay conexión a internet y el modelo no está en caché. Por favor, conecta a internet para la primera carga.');
      }

      const response = await fetch(modelUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`);
      }

      // Cache for future use
      await cache.put(modelUrl, response.clone());
      console.log('[ONNX Adapter] Model cached successfully');

      return await response.arrayBuffer();

    } catch (error) {
      console.error('[ONNX Adapter] Error loading model:', error);
      throw error;
    }
  }

  /**
   * Classify an image
   * @param {HTMLImageElement} imageElement - Image element to classify
   * @param {number} topK - Number of top results to return
   * @returns {Promise<Object>} Classification results
   */
  async classifyImage(imageElement, topK = 5) {
    if (!this.modelLoaded || !this.session) {
      throw new Error('Model not loaded. Please initialize first.');
    }

    try {
      console.log('[ONNX Adapter] Starting classification...');
      this.loadingManager.showLoading('Clasificando imagen...');

      const startTime = performance.now();

      // Preprocess image to tensor
      const inputTensor = await this.preprocessImage(imageElement);
      console.log('[ONNX Adapter] Input tensor shape:', inputTensor.dims);

      // Run inference
      const inputName = this.session.inputNames[0];
      const feeds = { [inputName]: inputTensor };

      console.log('[ONNX Adapter] Running inference...');
      const results = await this.session.run(feeds);
      console.log('[ONNX Adapter] Inference complete');

      // Get output tensor
      const outputName = this.session.outputNames[0];
      const outputTensor = results[outputName];
      console.log('[ONNX Adapter] Output tensor shape:', outputTensor.dims);

      // Post-process results
      const classifications = this.postprocessResults(outputTensor, topK);

      const endTime = performance.now();
      const inferenceTime = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`[ONNX Adapter] Classification completed in ${inferenceTime}s`);

      this.loadingManager.hideLoading();

      return {
        results: classifications,
        inferenceTime: inferenceTime,
        model: 'onnx-mobilenetv2',
        timestamp: Date.now()
      };

    } catch (error) {
      this.loadingManager.hideLoading();
      console.error('[ONNX Adapter] Error during classification:', error);
      throw error;
    }
  }

  /**
   * Preprocess image to ONNX tensor format
   * @param {HTMLImageElement} imageElement - Image to preprocess
   * @returns {Promise<Tensor>} ONNX tensor in NCHW format
   */
  async preprocessImage(imageElement) {
    // Create canvas and resize image to 224x224
    const canvas = document.createElement('canvas');
    const targetSize = 224;
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0, targetSize, targetSize);

    // Get image data
    const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
    const { data } = imageData;

    // Convert to float32 array with ImageNet normalization
    // ImageNet mean: [0.485, 0.456, 0.406]
    // ImageNet std: [0.229, 0.224, 0.225]
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    const float32Data = new Float32Array(3 * targetSize * targetSize);

    // Convert from HWC (Height, Width, Channels) to CHW (Channels, Height, Width)
    for (let i = 0; i < targetSize * targetSize; i++) {
      // Red channel
      float32Data[i] = ((data[i * 4] / 255.0) - mean[0]) / std[0];
      // Green channel
      float32Data[targetSize * targetSize + i] = ((data[i * 4 + 1] / 255.0) - mean[1]) / std[1];
      // Blue channel
      float32Data[2 * targetSize * targetSize + i] = ((data[i * 4 + 2] / 255.0) - mean[2]) / std[2];
    }

    // Create ONNX tensor with shape [1, 3, 224, 224] (NCHW format)
    const tensor = new this.ort.Tensor('float32', float32Data, [1, 3, targetSize, targetSize]);

    return tensor;
  }

  /**
   * Post-process ONNX output tensor to classification results
   * @param {Tensor} outputTensor - ONNX output tensor
   * @param {number} topK - Number of top results to return
   * @returns {Array<Object>} Top K classifications
   */
  postprocessResults(outputTensor, topK) {
    // Get raw logits from output tensor
    const logits = Array.from(outputTensor.data);

    // Apply softmax to get probabilities
    const probabilities = this.softmax(logits);

    // Get top K indices
    const topKIndices = this.getTopKIndices(probabilities, topK);

    // Map to labels and scores
    const results = topKIndices.map(({ index, score }) => ({
      label: getLabelByIndex(index),
      score: score
    }));

    return results;
  }

  /**
   * Apply softmax function to convert logits to probabilities
   * @param {Array<number>} logits - Raw model outputs
   * @returns {Array<number>} Probabilities
   */
  softmax(logits) {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sumExps);
  }

  /**
   * Get top K indices and scores from array
   * @param {Array<number>} array - Array of scores
   * @param {number} k - Number of top results
   * @returns {Array<Object>} Top K results with index and score
   */
  getTopKIndices(array, k) {
    const indices = array
      .map((score, index) => ({ index, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    return indices;
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
    return 'ONNX Runtime Web';
  }

  /**
   * Get adapter version
   * @returns {string}
   */
  getVersion() {
    return '1.20.1';
  }
}

export default ONNXAdapter;
