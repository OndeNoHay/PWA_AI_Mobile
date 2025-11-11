# REPORTE TÉCNICO: PWA CON IA LOCAL EN MÓVIL
## Clasificador de Imágenes + Traductor Técnico Offline

**Versión:** 1.0  
**Fecha:** 11 de noviembre de 2025  
**Autor:** JJO - Executive Assistant / AI Projects Lead  
**Propósito:** Especificación técnica completa para desarrollo con Claude Code

---

## RESUMEN EJECUTIVO

Este documento especifica la arquitectura completa de una Progressive Web App (PWA) que ejecuta dos modelos de Inteligencia Artificial completamente en modo local (offline) en dispositivos móviles Android e iOS, sin requerir instalación desde app stores.

**Casos de uso integrados:**
1. **Clasificador de Imágenes Técnicas**: Identifica componentes aeroespaciales/industriales en fotografías
2. **Traductor Técnico Offline**: Traduce terminología técnica especializada (aerospace/industrial)

**Justificación de negocio:**
- Funcionamiento en entornos con información clasificada (sin envío de datos a servidores)
- Compatible con dispositivos de gama alta (ej: Samsung S25) sin necesidad de desarrollo nativo
- Demostración de capacidades de IA edge computing para proyectos con clientes aerospace/defense
- Sin costes de infraestructura cloud para inferencia

---

## 1. ARQUITECTURA GENERAL DEL SISTEMA

### 1.1 Stack Tecnológico Principal

```
┌─────────────────────────────────────────────────────┐
│                   INTERFAZ USUARIO                   │
│           (HTML5 + CSS3 + JavaScript ES6)            │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              CAPA DE APLICACIÓN PWA                  │
│  • Service Worker (sw.js)                            │
│  • App Controller (app.js)                           │
│  • Manifest.json                                     │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│          MOTOR DE IA - TRANSFORMERS.JS V3            │
│  • Pipeline Image Classification (WebGPU/WASM)       │
│  • Pipeline Translation (WebGPU/WASM)                │
│  • Model Manager                                     │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              CAPA DE ALMACENAMIENTO                  │
│  • Cache Storage (assets estáticos)                  │
│  • IndexedDB (modelos AI, datos app, historial)     │
└─────────────────────────────────────────────────────┘
```

### 1.2 Componentes del Sistema

| Componente | Tecnología | Propósito | Tamaño Estimado |
|------------|------------|-----------|-----------------|
| Transformers.js | @huggingface/transformers v3.x | Motor de inferencia IA | ~2-5 MB |
| MobileNetV4 | onnx-community/mobilenetv4_conv_small.e2400_r224_in1k | Clasificación imágenes | ~15-20 MB |
| NLLB-200 (distilled) | Xenova/nllb-200-distilled-600M | Traducción multilingüe | ~250-300 MB |
| Service Worker | JavaScript nativo | Gestión offline/cache | ~15 KB |
| IndexedDB Wrapper | idb library (opcional) | Gestión almacenamiento | ~5 KB |
| UI Framework | Vanilla JS + CSS Grid/Flexbox | Interfaz responsive | ~50 KB |

**Tamaño total aproximado de descarga inicial:** 270-330 MB (primera vez únicamente)

---

## 2. MÓDULOS FUNCIONALES DETALLADOS

### 2.1 MÓDULO 1: Clasificador de Imágenes Técnicas

#### 2.1.1 Especificaciones Funcionales

**Objetivo**: Identificar componentes técnicos en fotografías tomadas con la cámara del móvil o cargadas desde galería.

**Flujo de usuario**:
1. Usuario selecciona "Clasificar Imagen"
2. Opción de capturar foto (cámara) o cargar desde galería
3. Previsualización de imagen con indicador de procesamiento
4. Resultados mostrados en <1 segundo con:
   - Top 5 categorías identificadas
   - Porcentaje de confianza para cada una
   - Visualización gráfica (barras de confianza)
5. Opción de guardar resultado en historial local

**Características técnicas**:
- **Modelo base**: MobileNetV4-small (optimizado para móviles)
- **Entrada**: Imágenes RGB de cualquier resolución (redimensionadas a 224x224 internamente)
- **Salida**: Array de objetos `{label: string, score: number}` ordenado por confianza
- **Rendimiento esperado**: 
  - Primera inferencia (carga modelo): 3-5 segundos
  - Inferencias subsecuentes: <1 segundo con WebGPU, ~2-3 segundos con WASM
- **Categorías soportadas**: 1000+ clases de ImageNet (componentes industriales, herramientas, vehículos, equipamiento)

#### 2.1.2 Arquitectura del Módulo

```javascript
// Estructura de archivos del módulo
/modules/image-classifier/
├── image-classifier.js       // Lógica principal
├── image-processor.js        // Preprocesamiento imágenes
├── ui-controller.js          // Interfaz específica
└── model-config.js           // Configuración del modelo
```

**Pseudocódigo de implementación**:
```javascript
class ImageClassifier {
  constructor() {
    this.pipeline = null;
    this.modelLoaded = false;
  }

  async initialize() {
    // Importar Transformers.js desde CDN
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0');
    
    // Crear pipeline con aceleración WebGPU si está disponible
    this.pipeline = await pipeline(
      'image-classification',
      'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k',
      { 
        device: this.detectWebGPU() ? 'webgpu' : 'wasm',
        progress_callback: (progress) => this.updateLoadProgress(progress)
      }
    );
    this.modelLoaded = true;
  }

  async classifyImage(imageSource) {
    if (!this.modelLoaded) {
      throw new Error('Model not loaded');
    }

    // Clasificar imagen
    const results = await this.pipeline(imageSource, {
      topk: 5  // Top 5 resultados
    });

    // Guardar en historial (IndexedDB)
    await this.saveToHistory(imageSource, results);

    return results;
  }

  detectWebGPU() {
    return 'gpu' in navigator;
  }

  async saveToHistory(image, results) {
    // Guardar en IndexedDB para historial
    const db = await this.getDB();
    const entry = {
      timestamp: Date.now(),
      imageThumb: await this.createThumbnail(image),
      results: results,
      moduleType: 'image-classification'
    };
    await db.add('history', entry);
  }
}
```

#### 2.1.3 Componentes UI del Módulo

**Pantalla principal del clasificador**:
```html
<div id="image-classifier-module" class="module-container">
  <div class="input-section">
    <button id="capture-photo" class="btn-primary">
      <i class="icon-camera"></i> Capturar Foto
    </button>
    <button id="upload-photo" class="btn-secondary">
      <i class="icon-upload"></i> Subir Imagen
    </button>
    <input type="file" id="file-input" accept="image/*" style="display:none">
  </div>

  <div id="image-preview" class="preview-container">
    <!-- Previsualización de imagen -->
  </div>

  <div id="loading-indicator" class="loader" style="display:none">
    <div class="spinner"></div>
    <p id="load-status">Procesando imagen...</p>
  </div>

  <div id="results-container" class="results-grid">
    <!-- Resultados dinámicos insertados aquí -->
  </div>

  <div class="history-section">
    <button id="view-history" class="btn-link">
      Ver Historial de Clasificaciones
    </button>
  </div>
</div>
```

**Layout de resultados**:
```javascript
// Función para renderizar resultados
function renderClassificationResults(results) {
  const container = document.getElementById('results-container');
  container.innerHTML = `
    <h3>Resultados de Clasificación</h3>
    <div class="results-list">
      ${results.map((result, index) => `
        <div class="result-item" data-rank="${index + 1}">
          <div class="result-rank">#${index + 1}</div>
          <div class="result-label">${result.label}</div>
          <div class="result-confidence">
            <div class="confidence-bar" style="width: ${result.score * 100}%"></div>
            <span class="confidence-value">${(result.score * 100).toFixed(1)}%</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
```

---

### 2.2 MÓDULO 2: Traductor Técnico Offline

#### 2.2.1 Especificaciones Funcionales

**Objetivo**: Traducir terminología técnica especializada (aerospace, industrial, mechanical) entre idiomas sin conexión.

**Idiomas soportados (inicial)**:
- Inglés ↔ Español
- Inglés ↔ Francés  
- Inglés ↔ Alemán
- (Extensible a 200+ idiomas con NLLB)

**Flujo de usuario**:
1. Usuario selecciona "Traductor Técnico"
2. Selecciona idioma origen y destino
3. Ingresa o pega texto técnico (máx 500 palabras)
4. Presiona "Traducir"
5. Resultado mostrado en 2-4 segundos
6. Opciones de:
   - Copiar traducción
   - Invertir idiomas y re-traducir
   - Guardar en glosario personal
   - Compartir

**Características técnicas**:
- **Modelo base**: NLLB-200-distilled-600M (No Language Left Behind de Meta)
- **Entrada**: Texto en idioma origen (máx 512 tokens / ~400 palabras)
- **Salida**: Texto traducido en idioma destino
- **Rendimiento esperado**:
  - Primera traducción (carga modelo): 10-15 segundos
  - Traducciones subsecuentes: 2-4 segundos dependiendo de longitud
- **Precisión**: Especializado en mantener terminología técnica precisa

#### 2.2.2 Arquitectura del Módulo

```javascript
// Estructura de archivos del módulo
/modules/technical-translator/
├── translator.js             // Lógica principal
├── language-detector.js      // Detección automática de idioma
├── glossary-manager.js       // Gestión glosario personal
└── ui-controller.js          // Interfaz específica
```

**Pseudocódigo de implementación**:
```javascript
class TechnicalTranslator {
  constructor() {
    this.pipeline = null;
    this.modelLoaded = false;
    this.supportedLanguages = {
      'en': 'eng_Latn',  // Inglés
      'es': 'spa_Latn',  // Español
      'fr': 'fra_Latn',  // Francés
      'de': 'deu_Latn',  // Alemán
      // ... mapeo completo de códigos NLLB
    };
  }

  async initialize() {
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0');
    
    // Cargar modelo de traducción NLLB
    this.pipeline = await pipeline(
      'translation',
      'Xenova/nllb-200-distilled-600M',
      {
        device: this.detectWebGPU() ? 'webgpu' : 'wasm',
        progress_callback: (progress) => this.updateLoadProgress(progress)
      }
    );
    this.modelLoaded = true;
  }

  async translate(text, sourceLang, targetLang) {
    if (!this.modelLoaded) {
      throw new Error('Translation model not loaded');
    }

    // Validar longitud
    if (text.length > 2000) {
      throw new Error('Text too long. Maximum 500 words.');
    }

    // Obtener códigos NLLB
    const srcCode = this.supportedLanguages[sourceLang];
    const tgtCode = this.supportedLanguages[targetLang];

    // Ejecutar traducción
    const result = await this.pipeline(text, {
      src_lang: srcCode,
      tgt_lang: tgtCode
    });

    // Guardar en historial
    await this.saveTranslation(text, result[0].translation_text, sourceLang, targetLang);

    return result[0].translation_text;
  }

  async detectLanguage(text) {
    // Implementación de detección automática (opcional)
    // Usar modelo adicional o heurísticas simples
    // Por ahora: forzar selección manual
    return null;
  }

  async saveTranslation(source, target, srcLang, tgtLang) {
    const db = await this.getDB();
    const entry = {
      timestamp: Date.now(),
      sourceText: source,
      translatedText: target,
      sourceLang: srcLang,
      targetLang: tgtLang,
      moduleType: 'translation'
    };
    await db.add('history', entry);
  }

  async addToGlossary(term, translation, context) {
    const db = await this.getDB();
    await db.add('glossary', {
      term,
      translation,
      context,
      timestamp: Date.now()
    });
  }

  detectWebGPU() {
    return 'gpu' in navigator;
  }
}
```

#### 2.2.3 Componentes UI del Módulo

**Pantalla principal del traductor**:
```html
<div id="translator-module" class="module-container">
  <div class="language-selector">
    <select id="source-lang" class="lang-select">
      <option value="en">English</option>
      <option value="es" selected>Español</option>
      <option value="fr">Français</option>
      <option value="de">Deutsch</option>
    </select>
    
    <button id="swap-languages" class="btn-icon">
      <i class="icon-swap"></i>
    </button>
    
    <select id="target-lang" class="lang-select">
      <option value="en" selected>English</option>
      <option value="es">Español</option>
      <option value="fr">Français</option>
      <option value="de">Deutsch</option>
    </select>
  </div>

  <div class="translation-workspace">
    <div class="input-panel">
      <textarea 
        id="source-text" 
        placeholder="Introduce el texto técnico a traducir..."
        maxlength="2000"
        rows="8"
      ></textarea>
      <div class="char-counter">
        <span id="char-count">0</span> / 2000 caracteres
      </div>
    </div>

    <div class="control-panel">
      <button id="translate-btn" class="btn-primary">
        <i class="icon-translate"></i> Traducir
      </button>
      <button id="clear-btn" class="btn-secondary">Limpiar</button>
    </div>

    <div id="translation-loading" class="loader" style="display:none">
      <div class="spinner"></div>
      <p>Traduciendo...</p>
    </div>

    <div class="output-panel">
      <div id="translated-text" class="translation-result">
        <!-- Traducción aparecerá aquí -->
      </div>
      <div class="action-buttons">
        <button id="copy-translation" class="btn-icon" title="Copiar">
          <i class="icon-copy"></i>
        </button>
        <button id="save-glossary" class="btn-icon" title="Guardar en glosario">
          <i class="icon-bookmark"></i>
        </button>
        <button id="share-translation" class="btn-icon" title="Compartir">
          <i class="icon-share"></i>
        </button>
      </div>
    </div>
  </div>

  <div class="glossary-section">
    <button id="view-glossary" class="btn-link">
      Ver Mi Glosario Técnico
    </button>
  </div>
</div>
```

---

## 3. ARQUITECTURA DE ALMACENAMIENTO

### 3.1 Estructura de IndexedDB

**Base de datos**: `ai-pwa-db` (versión 1)

**Object Stores**:

```javascript
// Definición de esquema IndexedDB
const dbSchema = {
  name: 'ai-pwa-db',
  version: 1,
  stores: {
    // Almacén de modelos AI descargados
    models: {
      keyPath: 'modelId',
      indexes: [
        { name: 'type', keyPath: 'type' },
        { name: 'lastUsed', keyPath: 'lastUsed' }
      ]
    },
    
    // Historial de uso (ambos módulos)
    history: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'moduleType', keyPath: 'moduleType' }
      ]
    },
    
    // Glosario personal del usuario
    glossary: {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'term', keyPath: 'term' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    },
    
    // Configuración de la aplicación
    settings: {
      keyPath: 'key'
    }
  }
};
```

**Estructura de datos - Historial de clasificación**:
```javascript
{
  id: 1,  // Auto-incrementado
  timestamp: 1699721234567,
  moduleType: 'image-classification',
  imageThumb: 'data:image/jpeg;base64,...',  // Thumbnail 100x100px
  results: [
    { label: 'aircraft_component', score: 0.92 },
    { label: 'turbine_blade', score: 0.85 },
    // ...
  ]
}
```

**Estructura de datos - Historial de traducción**:
```javascript
{
  id: 2,
  timestamp: 1699721345678,
  moduleType: 'translation',
  sourceText: 'Inspect the turbine blade for cracks...',
  translatedText: 'Inspeccionar el álabe de turbina para grietas...',
  sourceLang: 'en',
  targetLang: 'es'
}
```

**Estructura de datos - Glosario**:
```javascript
{
  id: 1,
  term: 'turbine blade',
  translation: 'álabe de turbina',
  context: 'aerospace',
  notes: 'Componente crítico del motor',
  sourceLang: 'en',
  targetLang: 'es',
  timestamp: 1699721456789
}
```

### 3.2 Gestión de Cache Storage

**Estrategia de caching**:

```javascript
// Cache names
const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  static: `ai-pwa-static-${CACHE_VERSION}`,
  models: `ai-pwa-models-${CACHE_VERSION}`,
  runtime: `ai-pwa-runtime-${CACHE_VERSION}`
};

// Assets a cachear en instalación
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/styles/modules.css',
  '/js/app.js',
  '/js/modules/image-classifier.js',
  '/js/modules/translator.js',
  '/js/utils/db-manager.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Service Worker - Event: Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Service Worker - Event: Fetch
self.addEventListener('fetch', (event) => {
  // Estrategia: Cache First para assets estáticos
  if (event.request.url.includes('/static/') || 
      event.request.url.includes('/icons/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
  
  // Estrategia: Network First para CDN de Transformers.js
  else if (event.request.url.includes('cdn.jsdelivr.net') ||
           event.request.url.includes('huggingface.co')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cachear respuesta exitosa
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAMES.models).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback a cache si red falla
          return caches.match(event.request);
        })
    );
  }
});
```

### 3.3 Gestión de Cuotas de Almacenamiento

**Monitoreo de espacio disponible**:
```javascript
class StorageManager {
  async checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const percentUsed = (estimate.usage / estimate.quota) * 100;
      
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentUsed: percentUsed.toFixed(2),
        available: estimate.quota - estimate.usage
      };
    }
    return null;
  }

  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      console.log(`Storage persisted: ${isPersisted}`);
      return isPersisted;
    }
    return false;
  }

  async clearOldData() {
    // Limpiar entradas de historial mayores a 30 días
    const db = await this.getDB();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const index = store.index('timestamp');
    
    let cursor = await index.openCursor(IDBKeyRange.upperBound(thirtyDaysAgo));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }
}
```

---

## 4. CONFIGURACIÓN PWA

### 4.1 Manifest.json

```json
{
  "name": "AI Technical Assistant",
  "short_name": "AI Tech",
  "description": "Clasificador de imágenes y traductor técnico offline con IA",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#1e3a8a",
  "icons": [
    {
      "src": "/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/mobile-2.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["productivity", "utilities", "business"],
  "shortcuts": [
    {
      "name": "Clasificar Imagen",
      "short_name": "Clasificar",
      "description": "Clasificar una imagen técnica",
      "url": "/?module=classifier",
      "icons": [{ "src": "/icons/shortcut-classifier.png", "sizes": "96x96" }]
    },
    {
      "name": "Traducir Texto",
      "short_name": "Traducir",
      "description": "Traducir texto técnico",
      "url": "/?module=translator",
      "icons": [{ "src": "/icons/shortcut-translator.png", "sizes": "96x96" }]
    }
  ],
  "prefer_related_applications": false
}
```

### 4.2 Service Worker (sw.js) - Estructura Completa

```javascript
// sw.js - Service Worker Principal
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
  static: `ai-pwa-static-${CACHE_VERSION}`,
  models: `ai-pwa-models-${CACHE_VERSION}`,
  runtime: `ai-pwa-runtime-${CACHE_VERSION}`
};

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/styles/components.css',
  '/js/app.js',
  '/js/modules/image-classifier.js',
  '/js/modules/translator.js',
  '/js/utils/db-manager.js',
  '/js/utils/storage-manager.js',
  '/manifest.json'
];

// INSTALL EVENT
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE EVENT
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Eliminar caches antiguos
          if (cacheName.startsWith('ai-pwa-') && 
              !Object.values(CACHE_NAMES).includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH EVENT
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Estrategia 1: Cache First para assets estáticos
  if (STATIC_ASSETS.includes(url.pathname) || 
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/styles/') ||
      url.pathname.startsWith('/js/')) {
    event.respondWith(cacheFirst(request));
  }
  
  // Estrategia 2: Network First con fallback para modelos AI
  else if (url.hostname.includes('cdn.jsdelivr.net') ||
           url.hostname.includes('huggingface.co')) {
    event.respondWith(networkFirstWithCache(request));
  }
  
  // Estrategia 3: Network Only para APIs externas
  else {
    event.respondWith(fetch(request));
  }
});

// Cache First Strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAMES.static);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    // Retornar página offline si está disponible
    return caches.match('/offline.html');
  }
}

// Network First with Cache Fallback
async function networkFirstWithCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAMES.models);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, falling back to cache');
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// MESSAGE EVENT (para comunicación con app)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map((name) => caches.delete(name)));
      })
    );
  }
});
```

---

## 5. INTERFAZ DE USUARIO

### 5.1 Estructura de Navegación

```
┌───────────────────────────────────────┐
│         HEADER (Fixed Top)            │
│  [Logo] AI Technical Assistant [Menu] │
├───────────────────────────────────────┤
│                                       │
│         NAVIGATION TABS               │
│  [Clasificador] [Traductor] [Config]  │
│                                       │
├───────────────────────────────────────┤
│                                       │
│                                       │
│        MODULE CONTAINER               │
│      (Contenido dinámico según        │
│         módulo seleccionado)          │
│                                       │
│                                       │
├───────────────────────────────────────┤
│         FOOTER (Fixed Bottom)         │
│   Status: ● Online | Storage: 45%    │
└───────────────────────────────────────┘
```

### 5.2 Diseño Responsive

**Breakpoints**:
- Mobile: 320px - 768px (diseño principal)
- Tablet: 769px - 1024px
- Desktop: 1025px+ (opcional, bonus)

**Principios de diseño**:
- Mobile-first approach
- Touch-friendly (botones mínimo 44x44px)
- Alto contraste para legibilidad
- Feedback visual inmediato en todas las acciones
- Loading states claros y animados
- Gestión de errores user-friendly

### 5.3 Sistema de Temas

```css
/* Variables CSS para tematización */
:root {
  /* Colores principales */
  --primary-color: #1e3a8a;
  --primary-light: #3b82f6;
  --primary-dark: #1e40af;
  
  --secondary-color: #0891b2;
  --secondary-light: #06b6d4;
  
  --success-color: #059669;
  --warning-color: #d97706;
  --error-color: #dc2626;
  
  /* Colores neutros */
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  
  /* Sombras */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  /* Espaciado */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Tipografía */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Courier New', monospace;
  
  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;
}

/* Dark mode (opcional para Fase 2) */
[data-theme="dark"] {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
}
```

### 5.4 Componentes Reutilizables

**Botones**:
```css
.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 1rem;
  min-height: 44px;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--text-secondary);
}

.btn-icon {
  padding: var(--spacing-sm);
  border-radius: var(--radius-full);
  aspect-ratio: 1;
}
```

**Loaders**:
```css
.loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--bg-secondary);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 6. PLAN DE DESARROLLO DETALLADO

### 6.1 Fase 1: Setup Inicial y Estructura Base (Días 1-2)

**Día 1 - Estructura del proyecto**:
- [ ] Crear estructura de directorios
- [ ] Configurar manifest.json
- [ ] Implementar Service Worker básico
- [ ] Crear HTML base con navegación por tabs
- [ ] Setup CSS con variables y sistema de diseño
- [ ] Implementar sistema de routing simple (hash-based)

**Día 2 - Infraestructura de datos**:
- [ ] Implementar DBManager con IndexedDB
- [ ] Crear StorageManager para gestión de cuotas
- [ ] Setup de logging y error handling
- [ ] Crear utils de comprobación de capacidades (WebGPU detection)
- [ ] Implementar offline detector

**Entregables Fase 1**:
- PWA funcional con instalabilidad
- Navegación entre módulos (sin funcionalidad AI aún)
- Sistema de almacenamiento operativo
- Service Worker registrado y caching básico

### 6.2 Fase 2: Módulo de Clasificación de Imágenes (Días 3-5)

**Día 3 - Integración de Transformers.js (Clasificador)**:
- [ ] Importar Transformers.js v3
- [ ] Implementar ImageClassifier class
- [ ] Cargar modelo MobileNetV4
- [ ] Implementar progress callback para carga de modelo
- [ ] Testing básico con imágenes de prueba

**Día 4 - UI del Clasificador**:
- [ ] Implementar captura de cámara
- [ ] Implementar selección de archivo
- [ ] Crear componente de previsualización
- [ ] Implementar visualización de resultados
- [ ] Añadir loading states

**Día 5 - Funcionalidades avanzadas Clasificador**:
- [ ] Implementar historial de clasificaciones
- [ ] Crear vista de historial con filtros
- [ ] Implementar borrado de entradas
- [ ] Optimizar tamaño de thumbnails
- [ ] Testing en dispositivos reales

**Entregables Fase 2**:
- Clasificador de imágenes 100% funcional
- Almacenamiento de historial operativo
- UI responsive y touch-friendly
- Performance < 1s por inferencia (post-carga)

### 6.3 Fase 3: Módulo de Traducción (Días 6-8)

**Día 6 - Integración Modelo de Traducción**:
- [ ] Implementar TechnicalTranslator class
- [ ] Cargar modelo NLLB-200-distilled
- [ ] Implementar mapeo de idiomas
- [ ] Testing de traducción básica
- [ ] Validación de longitud de texto

**Día 7 - UI del Traductor**:
- [ ] Crear interfaz de selección de idiomas
- [ ] Implementar textarea con contador de caracteres
- [ ] Crear panel de resultados
- [ ] Implementar botón de intercambio de idiomas
- [ ] Añadir funcionalidad de copiar al portapapeles

**Día 8 - Glosario Personal**:
- [ ] Implementar GlossaryManager
- [ ] Crear UI de gestión de glosario
- [ ] Implementar búsqueda en glosario
- [ ] Añadir funcionalidad de exportar/importar
- [ ] Integrar glosario con traductor

**Entregables Fase 3**:
- Traductor técnico 100% funcional
- Sistema de glosario personal operativo
- Historial de traducciones
- 4+ pares de idiomas soportados

### 6.4 Fase 4: Optimización y Testing (Días 9-10)

**Día 9 - Optimización de Performance**:
- [ ] Profiling de carga inicial
- [ ] Optimización de tamaños de cache
- [ ] Implementar lazy loading de módulos
- [ ] Comprimir assets (CSS/JS)
- [ ] Optimizar tamaños de imágenes/iconos
- [ ] Testing de velocidad en 3G/4G

**Día 10 - Testing Cross-browser y Debugging**:
- [ ] Testing en Chrome Android
- [ ] Testing en Safari iOS
- [ ] Testing en Firefox Mobile (opcional)
- [ ] Verificar instalabilidad en ambas plataformas
- [ ] Testing de funcionalidad offline completa
- [ ] Fix de bugs encontrados

**Entregables Fase 4**:
- Aplicación optimizada (<3s carga inicial)
- Verificado en Android + iOS
- Lista de bugs conocidos documentada
- Performance metrics documentados

### 6.5 Fase 5: Pulido Final y Documentación (Día 11-12)

**Día 11 - Pulido UI/UX**:
- [ ] Revisar todos los estados de loading
- [ ] Mejorar mensajes de error
- [ ] Añadir micro-interacciones
- [ ] Revisar accesibilidad básica (ARIA labels)
- [ ] Tutorial de primera vez (onboarding)
- [ ] Pantalla de configuración

**Día 12 - Documentación**:
- [ ] Documentar código con JSDoc
- [ ] Crear README.md detallado
- [ ] Documentar API de módulos
- [ ] Crear guía de usuario
- [ ] Video demo de funcionalidades
- [ ] Presentación para stakeholders

**Entregables Fase 5**:
- Aplicación pulida y profesional
- Documentación completa
- Material de presentación
- Versión 1.0 lista para producción

---

## 7. REQUISITOS TÉCNICOS Y COMPATIBILIDAD

### 7.1 Requisitos del Dispositivo Usuario

**Mínimos**:
- Smartphone Android 10+ o iOS 14+
- 4 GB RAM
- 500 MB espacio disponible (post-descarga de modelos)
- Navegador moderno (Chrome 113+, Safari 16+)

**Recomendados**:
- Smartphone gama alta (ej: Samsung S23+, iPhone 14+)
- 8 GB+ RAM
- GPU compatible con WebGPU (para mejor performance)
- 2 GB espacio disponible
- Conexión WiFi para descarga inicial de modelos

### 7.2 Soporte de Navegadores

| Navegador | Versión Mínima | WebGPU | WASM | IndexedDB | Service Workers | Estado |
|-----------|----------------|--------|------|-----------|-----------------|--------|
| Chrome Android | 113+ | ✅ | ✅ | ✅ | ✅ | **Soportado** |
| Safari iOS | 16+ | ⚠️ (flag) | ✅ | ✅ | ✅ | **Soportado** |
| Firefox Android | 120+ | ❌ | ✅ | ✅ | ✅ | Parcial (sin WebGPU) |
| Samsung Internet | 20+ | ✅ | ✅ | ✅ | ✅ | **Soportado** |
| Edge Mobile | 113+ | ✅ | ✅ | ✅ | ✅ | **Soportado** |

**Notas**:
- WebGPU mejora performance 5-10x vs WASM
- Safari iOS 16.4+ soporta WebGPU con feature flag
- Fallback automático a WASM si WebGPU no disponible

### 7.3 Detección de Capacidades

```javascript
class CapabilityDetector {
  async detectCapabilities() {
    const caps = {
      webgpu: await this.detectWebGPU(),
      serviceWorker: 'serviceWorker' in navigator,
      indexedDB: 'indexedDB' in window,
      camera: 'mediaDevices' in navigator,
      storage: 'storage' in navigator,
      share: 'share' in navigator,
      installable: await this.checkInstallability()
    };
    
    return caps;
  }

  async detectWebGPU() {
    if (!('gpu' in navigator)) {
      return { supported: false, reason: 'WebGPU not available' };
    }
    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return { supported: false, reason: 'No GPU adapter found' };
      }
      return { supported: true, adapter: adapter };
    } catch (error) {
      return { supported: false, reason: error.message };
    }
  }

  async checkInstallability() {
    // Detectar si la app puede ser instalada
    let deferredPrompt = null;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });
    
    return deferredPrompt !== null;
  }
}
```

---

## 8. MÉTRICAS DE RENDIMIENTO

### 8.1 KPIs Técnicos

| Métrica | Objetivo | Método de Medición |
|---------|----------|-------------------|
| Carga inicial (sin cache) | < 5s | Performance API |
| Carga inicial (con cache) | < 1s | Performance API |
| Tiempo de carga modelo (primera vez) | < 15s | Custom timing |
| Inferencia clasificación | < 1s | Performance.now() |
| Inferencia traducción | < 4s | Performance.now() |
| Tamaño total app | < 350 MB | Chrome DevTools |
| FCP (First Contentful Paint) | < 2s | Lighthouse |
| TTI (Time to Interactive) | < 3s | Lighthouse |
| Lighthouse PWA Score | > 90 | Lighthouse CLI |

### 8.2 Implementación de Métricas

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
  }

  startTimer(label) {
    this.metrics[label] = {
      start: performance.now()
    };
  }

  endTimer(label) {
    if (this.metrics[label]) {
      this.metrics[label].end = performance.now();
      this.metrics[label].duration = 
        this.metrics[label].end - this.metrics[label].start;
      
      console.log(`[Perf] ${label}: ${this.metrics[label].duration.toFixed(2)}ms`);
      return this.metrics[label].duration;
    }
  }

  async measureModelLoad(modelName, loadFunction) {
    this.startTimer(`model-load-${modelName}`);
    try {
      const result = await loadFunction();
      this.endTimer(`model-load-${modelName}`);
      return result;
    } catch (error) {
      console.error(`[Perf] Error loading ${modelName}:`, error);
      throw error;
    }
  }

  async measureInference(moduleName, inferenceFunction) {
    this.startTimer(`inference-${moduleName}`);
    try {
      const result = await inferenceFunction();
      const duration = this.endTimer(`inference-${moduleName}`);
      
      // Enviar a analytics (opcional)
      this.sendToAnalytics({
        type: 'inference',
        module: moduleName,
        duration: duration
      });
      
      return result;
    } catch (error) {
      console.error(`[Perf] Inference error:`, error);
      throw error;
    }
  }

  sendToAnalytics(data) {
    // Implementar envío a sistema de analytics
    // Por ahora solo log
    console.log('[Analytics]', data);
  }

  getMetricsSummary() {
    return Object.entries(this.metrics).map(([label, data]) => ({
      label,
      duration: data.duration?.toFixed(2),
      timestamp: data.start
    }));
  }
}
```

---

## 9. ESTRATEGIA DE MANEJO DE ERRORES

### 9.1 Tipos de Errores y Respuestas

```javascript
class ErrorHandler {
  constructor() {
    this.errorLog = [];
  }

  handleError(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };

    this.errorLog.push(errorInfo);
    console.error('[Error]', errorInfo);

    // Determinar tipo de error y respuesta apropiada
    if (error.name === 'QuotaExceededError') {
      this.handleStorageError();
    } else if (error.message.includes('Model not found')) {
      this.handleModelError();
    } else if (error.message.includes('WebGPU')) {
      this.handleWebGPUError();
    } else {
      this.handleGenericError(error);
    }
  }

  handleStorageError() {
    this.showUserMessage(
      'Almacenamiento lleno',
      'No hay suficiente espacio. Por favor, libera espacio o limpia el historial.',
      'warning'
    );
  }

  handleModelError() {
    this.showUserMessage(
      'Error cargando modelo',
      'No se pudo cargar el modelo de IA. Verifica tu conexión e intenta de nuevo.',
      'error'
    );
  }

  handleWebGPUError() {
    this.showUserMessage(
      'GPU no disponible',
      'Se usará CPU (más lento). Para mejor rendimiento, actualiza tu navegador.',
      'info'
    );
  }

  handleGenericError(error) {
    this.showUserMessage(
      'Error inesperado',
      'Ocurrió un error. Por favor, intenta de nuevo.',
      'error'
    );
  }

  showUserMessage(title, message, type) {
    // Implementar UI toast/notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  getErrorLog() {
    return this.errorLog;
  }

  clearErrorLog() {
    this.errorLog = [];
  }
}
```

### 9.2 Manejo de Estados de Carga

```javascript
class LoadingStateManager {
  constructor() {
    this.activeLoaders = new Set();
  }

  showLoader(loaderId, message = 'Cargando...') {
    this.activeLoaders.add(loaderId);
    
    const loader = document.getElementById(loaderId);
    if (loader) {
      loader.style.display = 'flex';
      const statusText = loader.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = message;
      }
    }
  }

  hideLoader(loaderId) {
    this.activeLoaders.delete(loaderId);
    
    const loader = document.getElementById(loaderId);
    if (loader) {
      loader.style.display = 'none';
    }
  }

  updateProgress(loaderId, progress) {
    const loader = document.getElementById(loaderId);
    if (loader) {
      const progressBar = loader.querySelector('.progress-bar');
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      
      const progressText = loader.querySelector('.progress-text');
      if (progressText) {
        progressText.textContent = `${Math.round(progress)}%`;
      }
    }
  }

  isLoading() {
    return this.activeLoaders.size > 0;
  }
}
```

---

## 10. TESTING Y VALIDACIÓN

### 10.1 Checklist de Testing

**Funcionalidad Core**:
- [ ] Instalación como PWA en Android
- [ ] Instalación como PWA en iOS
- [ ] Service Worker se registra correctamente
- [ ] Funcionalidad offline completa
- [ ] Clasificación de imágenes con 5 imágenes diferentes
- [ ] Traducción en 3 pares de idiomas diferentes
- [ ] Historial guarda correctamente
- [ ] Glosario funciona correctamente
- [ ] Cache se gestiona correctamente

**Performance**:
- [ ] Carga inicial < 5s (sin cache)
- [ ] Carga inicial < 1s (con cache)
- [ ] Clasificación < 1s (WebGPU)
- [ ] Traducción < 4s
- [ ] No memory leaks después de 20 operaciones

**UI/UX**:
- [ ] Responsive en todos los tamaños (320px+)
- [ ] Touch targets > 44px
- [ ] Loading states visibles en todas las operaciones
- [ ] Mensajes de error claros y accionables
- [ ] Navegación intuitiva
- [ ] No elementos cortados en ningún viewport

**Compatibilidad**:
- [ ] Chrome Android 113+
- [ ] Safari iOS 16+
- [ ] Funciona con WebGPU
- [ ] Funciona con WASM (fallback)
- [ ] Maneja correctamente falta de permisos de cámara

### 10.2 Casos de Prueba Detallados

**Test Case 1: Clasificación de Imagen - Happy Path**
```
Precondiciones: App instalada, modelos cargados
Pasos:
1. Abrir módulo clasificador
2. Tomar foto con cámara
3. Esperar resultado

Resultado esperado:
- Imagen se previsualiza correctamente
- Loading state visible durante procesamiento
- Resultados muestran top 5 con scores
- Entrada guardada en historial
- Tiempo total < 2s
```

**Test Case 2: Traducción - Texto Largo**
```
Precondiciones: App instalada, modelo traducción cargado
Pasos:
1. Abrir módulo traductor
2. Seleccionar EN -> ES
3. Pegar texto de 400 palabras
4. Presionar traducir

Resultado esperado:
- Loading state visible
- Traducción completa y coherente
- Tiempo < 5s
- Opción de copiar funciona
- Entrada guardada en historial
```

**Test Case 3: Funcionalidad Offline**
```
Precondiciones: App usada al menos una vez online
Pasos:
1. Activar modo avión
2. Abrir app desde home screen
3. Intentar clasificar imagen guardada
4. Intentar traducir texto

Resultado esperado:
- App carga correctamente
- Todas las funciones operan normalmente
- Indicador de estado offline visible
- No errores de red
```

---

## 11. SEGURIDAD Y PRIVACIDAD

### 11.1 Principios de Privacidad

**Privacy by Design**:
1. **Procesamiento 100% local**: Ningún dato sale del dispositivo
2. **Sin analytics externas**: No tracking de terceros
3. **Sin autenticación**: No se requieren cuentas de usuario
4. **Datos encriptados**: IndexedDB con cifrado (opcional Fase 2)
5. **Borrado fácil**: Usuario puede limpiar todos los datos

### 11.2 Content Security Policy

```html
<!-- En index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="
        default-src 'self';
        script-src 'self' https://cdn.jsdelivr.net;
        style-src 'self' 'unsafe-inline';
        img-src 'self' blob: data:;
        connect-src 'self' https://huggingface.co;
        worker-src 'self' blob:;
        font-src 'self';
      ">
```

### 11.3 Gestión de Permisos

```javascript
class PermissionsManager {
  async requestCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      // Detener stream inmediatamente, solo necesitamos el permiso
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('[Permissions] Camera denied:', error);
      this.showPermissionDeniedMessage('cámara');
      return false;
    }
  }

  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      console.log(`Storage persisted: ${isPersisted}`);
      return isPersisted;
    }
    return false;
  }

  showPermissionDeniedMessage(permissionType) {
    alert(`Se necesita permiso de ${permissionType} para esta función. 
           Por favor, habilítalo en la configuración del navegador.`);
  }
}
```

---

## 12. FUTURAS MEJORAS (POST-V1.0)

### 12.1 Roadmap Fase 2

**Funcionalidades adicionales**:
1. **Detección de objetos**: Múltiples objetos en una imagen
2. **OCR técnico**: Extraer texto de diagramas/manuales
3. **Más idiomas**: Expandir a 20+ idiomas
4. **Reconocimiento de voz**: Dictar texto para traducir
5. **Modo oscuro**: Soporte completo de dark theme
6. **Sincronización cloud** (opcional): Backup de glosario
7. **PWA multiventana**: Soporte para tablets/desktop

### 12.2 Optimizaciones Técnicas

1. **Model quantization**: Reducir tamaño de modelos
2. **Streaming inference**: Resultados parciales en tiempo real
3. **Web Workers**: Mover inferencia a worker dedicado
4. **Shared memory**: Optimizar transferencia de datos
5. **Progressive loading**: Cargar modelos por partes

---

## 13. ESTRUCTURA DE ARCHIVOS FINAL

```
ai-pwa-mobile/
├── index.html
├── manifest.json
├── sw.js
├── offline.html
│
├── css/
│   ├── main.css
│   ├── components.css
│   ├── modules.css
│   └── themes.css
│
├── js/
│   ├── app.js                      # Entry point principal
│   ├── router.js                   # Sistema de navegación
│   │
│   ├── modules/
│   │   ├── image-classifier/
│   │   │   ├── image-classifier.js
│   │   │   ├── image-processor.js
│   │   │   ├── ui-controller.js
│   │   │   └── model-config.js
│   │   │
│   │   └── translator/
│   │       ├── translator.js
│   │       ├── language-detector.js
│   │       ├── glossary-manager.js
│   │       └── ui-controller.js
│   │
│   ├── utils/
│   │   ├── db-manager.js           # IndexedDB wrapper
│   │   ├── storage-manager.js      # Gestión de cuotas
│   │   ├── error-handler.js
│   │   ├── loading-manager.js
│   │   ├── performance-monitor.js
│   │   ├── capability-detector.js
│   │   └── permissions-manager.js
│   │
│   └── workers/
│       └── model-worker.js         # (Opcional Fase 2)
│
├── icons/
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-192.png
│   ├── icon-384.png
│   ├── icon-512.png
│   ├── maskable-192.png
│   └── maskable-512.png
│
├── screenshots/
│   ├── mobile-1.png
│   └── mobile-2.png
│
└── docs/
    ├── README.md
    ├── API.md
    ├── DEPLOYMENT.md
    └── USER_GUIDE.md
```

---

## 14. COMANDOS Y SCRIPTS DE DESARROLLO

### 14.1 Setup Inicial

```bash
# Clonar estructura
mkdir ai-pwa-mobile && cd ai-pwa-mobile

# Crear directorios
mkdir -p css js/{modules/{image-classifier,translator},utils,workers} icons screenshots docs

# Instalar dependencias (si usas npm para development)
npm init -y
npm install --save-dev http-server lighthouse

# Servidor de desarrollo
npx http-server -p 8080 -c-1

# Abrir en navegador
open http://localhost:8080
```

### 14.2 Testing

```bash
# Lighthouse PWA audit
npx lighthouse http://localhost:8080 --view --preset=desktop

# Mobile testing
npx lighthouse http://localhost:8080 --view --preset=mobile --throttling.cpuSlowdownMultiplier=4

# Service Worker testing
# Abrir Chrome DevTools > Application > Service Workers
```

### 14.3 Deployment

**Opción 1: GitHub Pages**
```bash
# Compilar assets (si aplica)
npm run build

# Push a rama gh-pages
git checkout -b gh-pages
git add dist/*
git commit -m "Deploy v1.0"
git push origin gh-pages
```

**Opción 2: Netlify**
```bash
# Instalar CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=.
```

**Opción 3: Vercel**
```bash
# Instalar CLI
npm install -g vercel

# Deploy
vercel --prod
```

---

## 15. PREGUNTAS FRECUENTES Y TROUBLESHOOTING

### 15.1 Problemas Comunes

**Q: Los modelos no se descargan**
```
A: Verificar:
   1. Conexión a internet estable
   2. Espacio de almacenamiento suficiente (>500MB)
   3. Permisos de almacenamiento del navegador
   4. Logs en Console para errores específicos
```

**Q: Clasificación muy lenta (>5s)**
```
A: Causas posibles:
   1. WebGPU no disponible (caer a WASM es más lento)
   2. Dispositivo con poca RAM
   3. Modelo no cacheado correctamente
   
   Solución: Verificar GPU support con navigator.gpu
```

**Q: La app no se instala como PWA**
```
A: Checklist:
   1. ✓ Servida sobre HTTPS (o localhost)
   2. ✓ manifest.json válido
   3. ✓ Service Worker registrado
   4. ✓ Iconos en manifest
   5. ✓ start_url accesible
```

**Q: Traducción da resultados extraños**
```
A: Verificar:
   1. Idiomas de origen/destino correctos
   2. Texto no supera 500 palabras
   3. Modelo NLLB cargado completamente
   4. No hay caracteres especiales incompatibles
```

### 15.2 Debugging Tips

```javascript
// Activar modo debug
localStorage.setItem('DEBUG', 'true');

// Ver métricas de performance
console.table(performanceMonitor.getMetricsSummary());

// Inspeccionar IndexedDB
// Chrome DevTools > Application > Storage > IndexedDB

// Ver Service Worker logs
// Chrome DevTools > Application > Service Workers > View

// Simular offline
// Chrome DevTools > Network > Offline checkbox

// Ver cuota de almacenamiento
navigator.storage.estimate().then(console.log);
```

---

## 16. GLOSARIO TÉCNICO

| Término | Definición |
|---------|------------|
| **PWA** | Progressive Web App - Aplicación web con capacidades de app nativa |
| **Service Worker** | Script que corre en background para caching y funcionalidad offline |
| **WebGPU** | API web para acceso a GPU, sucesor de WebGL |
| **WASM** | WebAssembly - Formato de bytecode para ejecución de alto rendimiento |
| **IndexedDB** | Base de datos NoSQL del navegador para almacenamiento estructurado |
| **ONNX** | Open Neural Network Exchange - Formato de modelos ML interoperable |
| **Pipeline** | API de alto nivel de Transformers.js para tareas de ML |
| **Inference** | Ejecución del modelo ML para obtener predicciones |
| **Quantization** | Técnica de compresión de modelos ML reduciendo precisión |
| **MobileNetV4** | Arquitectura de red neuronal optimizada para móviles |
| **NLLB** | No Language Left Behind - Modelo de traducción de Meta AI |
| **Cache Storage** | API del navegador para almacenar recursos de red |
| **Manifest.json** | Archivo de configuración de PWA |

---

## 17. CONCLUSIONES Y RECOMENDACIONES

### 17.1 Resumen de Decisiones Técnicas

1. **Transformers.js v3**: Elegido por su madurez, soporte de WebGPU y amplio catálogo de modelos
2. **MobileNetV4**: Modelo de clasificación ligero y rápido, ideal para móviles
3. **NLLB-200-distilled**: Mejor balance entre tamaño y calidad para traducción técnica
4. **IndexedDB**: Solución robusta para almacenamiento estructurado offline
5. **Vanilla JS**: Sin frameworks para minimizar tamaño y complejidad

### 17.2 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Tamaño de modelos muy grande | Media | Alto | Usar modelos distilled/quantized |
| WebGPU no disponible en iOS | Alta | Medio | Fallback automático a WASM |
| Cuota de almacenamiento excedida | Baja | Alto | Limpieza automática de historial antiguo |
| Performance pobre en gama baja | Media | Medio | Advertir requisitos mínimos |
| Cambios en API de Transformers.js | Baja | Medio | Fijar versión específica en imports |

### 17.3 Métricas de Éxito del Proyecto

**Técnicas**:
- ✓ Lighthouse PWA score > 90
- ✓ Tiempo de inferencia < 2s promedio
- ✓ Funcionalidad 100% offline
- ✓ Compatible Android + iOS

**Negocio**:
- ✓ Demo funcional para presentaciones a clientes
- ✓ Proof of concept de AI en edge
- ✓ Justificación para inversión en dispositivos gama alta
- ✓ Casos de uso documentados para aerospace/defense

### 17.4 Próximos Pasos Post-Entrega

1. **Testing con usuarios reales**: Obtener feedback de técnicos/ingenieros
2. **Optimización basada en métricas**: Ajustar según datos de uso real
3. **Evaluación de modelos custom**: Entrenar modelos específicos para componentes aerospace
4. **Integración con sistemas**: Evaluar conexión con sistemas de gestión documental
5. **Escalado a más casos de uso**: OCR, reconocimiento de voz, etc.

---

## APÉNDICES

### Apéndice A: Referencias y Recursos

**Documentación oficial**:
- Transformers.js: https://huggingface.co/docs/transformers.js
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- PWA: https://web.dev/progressive-web-apps/
- WebGPU: https://gpuweb.github.io/gpuweb/

**Modelos recomendados**:
- MobileNetV4: https://huggingface.co/onnx-community/mobilenetv4_conv_small.e2400_r224_in1k
- NLLB-200: https://huggingface.co/Xenova/nllb-200-distilled-600M

**Tools**:
- Lighthouse: https://github.com/GoogleChrome/lighthouse
- Chrome DevTools: https://developer.chrome.com/docs/devtools/
- Can I Use: https://caniuse.com/

### Apéndice B: Contactos y Soporte

**Desarrollador principal**: JJO (Executive Assistant / AI Lead)  
**Organización**: [Tu empresa]  
**Proyecto**: PoC AI Mobile - Fase 1  
**Fecha inicio**: [Fecha]  
**Fecha entrega estimada**: [Fecha + 12 días]

---

**FIN DEL REPORTE TÉCNICO**

*Este documento es un reporte vivo y debe actualizarse conforme el proyecto evoluciona.*

**Versión**: 1.0  
**Última actualización**: 11 de noviembre de 2025  
**Autor**: JJO con asistencia de Claude (Anthropic)
