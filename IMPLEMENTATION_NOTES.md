# Implementación Dual-Library (ONNX + Transformers.js)

## 📋 Resumen

Se ha implementado una arquitectura de **doble librería** para maximizar el rendimiento y compatibilidad en todas las plataformas:

- **iOS/iPadOS**: ONNX Runtime Web 1.20.1 con WebGL
- **PC/Android**: Transformers.js v3.0.2 con WebGPU/WASM

## 🏗️ Arquitectura

### Estructura de Módulos

```
js/modules/image-classifier/
├── platform-detector.js      # Detecta plataforma y capacidades
├── onnx-adapter.js           # Adaptador ONNX Runtime Web (iOS)
├── transformers-adapter.js   # Adaptador Transformers.js v3 (PC/Android)
├── imagenet-labels.js        # Wrapper para labels de ImageNet
├── imagenet-labels.json      # 1000 labels de ImageNet
├── classifier.js             # Interfaz unificada (actualizada)
└── ui-controller.js          # Controlador UI (sin cambios)
```

### Flujo de Inicialización

```
1. App.init()
   ↓
2. ImageClassifier constructor
   ↓
3. PlatformDetector.detect()
   ↓ (detecta iOS/iPadOS vs PC/Android)
   ↓
4a. iOS → ONNXAdapter.initialize()
   │   - Carga ONNX Runtime Web desde CDN
   │   - Usa MobileNetV2 en formato ONNX
   │   - Execution Provider: WebGL
   │
4b. PC/Android → TransformersAdapter.initialize()
    - Carga Transformers.js v3 desde CDN
    - Usa MobileNetV4 desde HuggingFace
    - Execution Provider: WebGPU (fallback WASM)
```

## 🔍 Detección de Plataforma

### Criterios de Detección iOS

```javascript
// Detecta iPhone, iPad, iPod
const isIOSPlatform = ['iPad', 'iPhone', 'iPod'].includes(navigator.platform);

// Detecta iPad en iOS 13+ (se reporta como Mac)
const isIPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1;

// Verifica user agent
const isIOSUserAgent = /iPad|iPhone|iPod/.test(navigator.userAgent);

→ isIOS = isIOSPlatform || isIPadOS || isIOSUserAgent
```

### Capacidades Detectadas

- **WebGPU**: `'gpu' in navigator`
- **WebGL/WebGL2**: Canvas context test
- **WASM**: `typeof WebAssembly === 'object'`
- **SIMD**: WebAssembly validation
- **Threads**: `typeof SharedArrayBuffer !== 'undefined'`

## 📦 Modelos Utilizados

### iOS/iPadOS (ONNX)

| Modelo | Formato | Tamaño | Fuente |
|--------|---------|--------|--------|
| MobileNetV2-12 | ONNX (.onnx) | 13.3 MB | ONNX Model Zoo |
| Input Shape | [1, 3, 224, 224] | NCHW | Float32 |
| Output | [1, 1000] | Logits | Float32 |

**URL**: `https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv2-12.onnx`

### PC/Android (Transformers.js)

| Modelo | Formato | Tamaño | Fuente |
|--------|---------|--------|--------|
| MobileNetV4 Small | ONNX (auto) | ~15 MB | HuggingFace |
| MobileNetV3 Large | ONNX (auto) | ~20 MB | HuggingFace |
| ResNet50 | ONNX (auto) | ~100 MB | HuggingFace |

**IDs HuggingFace**:
- `onnx-community/mobilenetv4_conv_small.e2400_r224_in1k`
- `Xenova/mobilenet_v3_large`
- `Xenova/resnet-50`

## ⚙️ Preprocesamiento de Imágenes

### ONNX Adapter (Manual)

```javascript
// 1. Redimensionar a 224x224
canvas.drawImage(img, 0, 0, 224, 224);

// 2. Convertir HWC → CHW
for (let i = 0; i < 224 * 224; i++) {
  float32Data[i] = R_channel;                    // Canal R
  float32Data[224*224 + i] = G_channel;          // Canal G
  float32Data[2*224*224 + i] = B_channel;        // Canal B
}

// 3. Normalizar con ImageNet stats
mean = [0.485, 0.456, 0.406]
std = [0.229, 0.224, 0.225]

normalized = (pixel / 255.0 - mean) / std

// 4. Crear tensor ONNX
tensor = new ort.Tensor('float32', float32Data, [1, 3, 224, 224]);
```

### Transformers Adapter (Automático)

```javascript
// Transformers.js maneja todo internamente
const results = await pipeline(imageElement, { topk: 5 });
```

## 🔄 Post-procesamiento

### ONNX Adapter

```javascript
// 1. Obtener logits de salida
const logits = Array.from(outputTensor.data);

// 2. Aplicar softmax
const probabilities = softmax(logits);

// 3. Obtener top K
const topK = getTopKIndices(probabilities, 5);

// 4. Mapear a labels
const results = topK.map(({ index, score }) => ({
  label: getLabelByIndex(index),
  score: score
}));
```

### Transformers Adapter

```javascript
// Ya viene procesado
results = [
  { label: 'golden retriever', score: 0.95 },
  { label: 'Labrador retriever', score: 0.03 },
  // ...
]
```

## 🎯 Performance Esperado

### iOS/iPadOS (ONNX + WebGL)

- **Primera carga**: 10-15 segundos (descarga + inicialización)
- **Inferencia**: 2-4 segundos
- **Memoria**: ~200-300 MB

### PC/Android (Transformers.js + WebGPU)

- **Primera carga**: 8-12 segundos
- **Inferencia con WebGPU**: 0.5-1 segundo
- **Inferencia con WASM**: 2-3 segundos
- **Memoria**: ~300-400 MB

### Android (Transformers.js + WASM fallback)

- **Primera carga**: 8-12 segundos
- **Inferencia**: 2-3 segundos
- **Memoria**: ~250-350 MB

## 🐛 Debugging

### Logs de Plataforma

```javascript
// En consola del navegador
console.log('[Classifier] Platform:', window.app.classifier.getPlatformInfo());
console.log('[Classifier] Adapter:', window.app.classifier.getAdapterInfo());
```

### Test Manual de Detección

```javascript
// Forzar ONNX (para testing)
const detector = new PlatformDetector();
detector.platform.isIOS = true;
detector.platform.recommendedLibrary = 'onnx';

// Forzar Transformers (para testing)
detector.platform.isIOS = false;
detector.platform.recommendedLibrary = 'transformers';
```

## 📊 Comparativa de Librerías

| Aspecto | ONNX Runtime Web | Transformers.js v3 |
|---------|------------------|---------------------|
| **Uso** | iOS/iPadOS | PC/Android |
| **Backend iOS** | WebGL | N/A (problemas) |
| **Backend PC/Android** | N/A | WebGPU/WASM |
| **Nivel** | Bajo (más control) | Alto (más simple) |
| **Preprocesamiento** | Manual | Automático |
| **Tamaño librería** | ~2 MB | ~3-4 MB |
| **Estabilidad iOS** | ✅ Excelente | ⚠️ Problemas v3 |
| **Performance PC** | ⚠️ Sin WebGPU | ✅ Excelente |

## 🔧 Mantenimiento

### Actualizar ONNX Runtime Web

```javascript
// En onnx-adapter.js, línea 23
await import('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.esm.min.js');
//                                                           ↑ Actualizar versión
```

### Actualizar Transformers.js

```javascript
// En transformers-adapter.js, línea 22
await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@3.0.2');
//                                                               ↑ Actualizar versión
```

### Agregar Nuevo Modelo

```javascript
// En classifier.js, agregar a this.models:
'nuevo-modelo': {
  name: 'Nombre Descriptivo',
  transformersId: 'org/model-id',        // Para PC/Android
  onnxPath: './models/model.onnx',       // Para iOS
  description: 'Descripción del modelo',
  size: '~XX MB',
  speed: 'Rápido|Medio|Lento',
  iosCompatible: true
}
```

## 🚀 Próximos Pasos

### Fase 2: Optimizaciones

1. **Cache de modelos ONNX** en IndexedDB
2. **Cuantización** de modelos (int8) para iOS
3. **Lazy loading** de adaptadores (cargar solo el necesario)
4. **Web Workers** para inferencia en background
5. **Streaming inference** para resultados parciales

### Fase 3: Características Avanzadas

1. **Detección de objetos** (múltiples objetos)
2. **Segmentación de imágenes**
3. **OCR** para texto en imágenes técnicas
4. **Modelos personalizados** específicos aerospace
5. **Fine-tuning** con LoRA

## 📝 Notas Importantes

### ⚠️ Limitaciones Conocidas

1. **iOS WebGPU**: No disponible hasta iOS 26
2. **WASM en iOS 17**: Problemas reportados (por eso usamos WebGL)
3. **Tamaño de modelos**: Limitado por memoria del dispositivo
4. **CORS**: Modelos deben estar en mismo dominio o con CORS habilitado

### ✅ Ventajas de Esta Arquitectura

1. **Máxima compatibilidad**: Funciona en todas las plataformas
2. **Mejor performance**: Cada plataforma usa su librería óptima
3. **Mantenible**: Código bien separado y documentado
4. **Escalable**: Fácil agregar nuevos adaptadores
5. **Debugging**: Logs detallados en cada capa

## 🔗 Referencias

- **ONNX Runtime Web**: https://onnxruntime.ai/docs/get-started/with-javascript/web.html
- **Transformers.js v3**: https://huggingface.co/docs/transformers.js
- **ONNX Model Zoo**: https://github.com/onnx/models
- **ImageNet Labels**: https://github.com/anishathalye/imagenet-simple-labels

---

**Versión**: 2.0.0
**Fecha**: Noviembre 2025
**Autor**: JJO con Claude (Anthropic)
