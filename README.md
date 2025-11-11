# AI Technical Assistant - PWA con IA Local

![Version](https://img.shields.io/badge/version-1.0.0_MVP-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![PWA](https://img.shields.io/badge/PWA-enabled-purple)

Progressive Web App que ejecuta modelos de Inteligencia Artificial completamente en modo local (offline) para clasificación de imágenes técnicas.

## Características Principales

- **100% Offline**: Funciona sin conexión a internet después de la carga inicial
- **IA Local**: Procesamiento completamente en el dispositivo, sin envío de datos a servidores
- **Modelos Configurables**: Permite seleccionar entre diferentes modelos de IA según necesidades de velocidad/precisión
- **PWA Instalable**: Se instala como app nativa en Android, iOS y escritorio
- **Responsive**: Diseño adaptado a móviles, tablets y desktop
- **Historial Local**: Guarda clasificaciones anteriores en el dispositivo

## Tecnologías Utilizadas

- **Transformers.js v3**: Motor de inferencia de IA en el navegador
- **WebGPU/WASM**: Aceleración por hardware cuando está disponible
- **IndexedDB**: Almacenamiento persistente de historial
- **Service Workers**: Funcionalidad offline y caché
- **Vanilla JavaScript**: Sin frameworks, aplicación ligera

## Modelos Disponibles

| Modelo | Tamaño | Velocidad | Precisión | Uso Recomendado |
|--------|--------|-----------|-----------|-----------------|
| MobileNetV4 Small | ~15 MB | Rápida | Buena | Pruebas y demos |
| MobileNetV3 Large | ~20 MB | Media | Muy buena | Balance ideal |
| ResNet50 | ~100 MB | Lenta | Excelente | Máxima precisión |

## Requisitos del Sistema

### Mínimos
- Navegador moderno (Chrome 113+, Safari 16+, Edge 113+)
- 500 MB de espacio disponible
- 4 GB de RAM
- Conexión a internet (solo para carga inicial)

### Recomendados
- Dispositivo de gama media/alta
- 8 GB+ de RAM
- WebGPU compatible para mejor rendimiento
- WiFi para descarga inicial de modelos

## Instalación y Uso

### Opción 1: Desarrollo Local

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/OndeNoHay/PWA_AI_Mobile.git
   cd PWA_AI_Mobile
   ```

2. **Servir la aplicación**:

   Necesitas servir la aplicación con HTTPS o desde localhost. Opciones:

   **Usando Python**:
   ```bash
   python -m http.server 8080
   ```

   **Usando Node.js (http-server)**:
   ```bash
   npx http-server -p 8080 -c-1
   ```

   **Usando VS Code Live Server**:
   - Instala la extensión "Live Server"
   - Click derecho en `index.html` > "Open with Live Server"

3. **Abrir en navegador**:
   ```
   http://localhost:8080
   ```

### Opción 2: Despliegue en Producción

#### GitHub Pages
```bash
# Subir a rama principal
git add .
git commit -m "Deploy PWA"
git push origin main

# Configurar GitHub Pages en Settings > Pages > Branch: main
```

#### Netlify
```bash
# Drag & drop la carpeta del proyecto en netlify.com
# O usar CLI:
npx netlify deploy --prod --dir=.
```

#### Vercel
```bash
npx vercel --prod
```

## Guía de Uso

### 1. Primera Carga
- La primera vez, la aplicación descargará el modelo seleccionado (~15-100 MB)
- Verás una barra de progreso durante la descarga
- El modelo se almacena localmente para uso offline posterior

### 2. Seleccionar Modelo
- Usa el selector de modelo en la parte superior
- Cambia entre modelos según tus necesidades de velocidad/precisión
- Cada cambio requiere descargar el nuevo modelo (solo la primera vez)

### 3. Clasificar una Imagen
1. **Subir imagen**:
   - Click en "Seleccionar Imagen"
   - O arrastra y suelta una imagen en el área de carga

2. **Clasificar**:
   - Click en "Clasificar Imagen"
   - Espera 1-4 segundos (según modelo y dispositivo)

3. **Ver resultados**:
   - Top 5 categorías detectadas
   - Porcentaje de confianza para cada una
   - Tiempo de inferencia

4. **Guardar en historial** (opcional):
   - Click en "Guardar en Historial"
   - Accede después desde la sección de historial

### 4. Ver Historial
- Click en "Mostrar/Ocultar" en la sección de historial
- Click en cualquier entrada para ver sus resultados
- Click en "Limpiar Historial" para borrar todo

### 5. Usar Offline
- Después de la primera carga, la app funciona 100% offline
- Todos los modelos y datos están en tu dispositivo
- No se envían datos a internet

## Estructura del Proyecto

```
PWA_AI_Mobile/
├── index.html              # Página principal
├── manifest.json           # Configuración PWA
├── sw.js                   # Service Worker
├── README.md              # Este archivo
│
├── css/
│   ├── main.css           # Estilos base y variables
│   └── components.css     # Componentes UI
│
├── js/
│   ├── app.js             # Punto de entrada principal
│   │
│   ├── modules/
│   │   └── image-classifier/
│   │       ├── classifier.js      # Lógica del clasificador
│   │       └── ui-controller.js   # Control de UI
│   │
│   └── utils/
│       ├── db-manager.js          # Gestión IndexedDB
│       ├── error-handler.js       # Manejo de errores
│       ├── loading-manager.js     # Estados de carga
│       └── storage-manager.js     # Gestión almacenamiento
│
└── icons/
    └── icon.svg           # Icono de la PWA
```

## Instalar como PWA

### En Android (Chrome)
1. Abre la app en Chrome
2. Menú (⋮) > "Agregar a pantalla de inicio" o "Instalar app"
3. La app aparecerá en tu cajón de aplicaciones

### En iOS (Safari)
1. Abre la app en Safari
2. Botón Compartir (cuadro con flecha)
3. "Añadir a pantalla de inicio"
4. La app aparecerá en tu pantalla de inicio

### En Desktop (Chrome/Edge)
1. Abre la app en el navegador
2. Icono de instalación en la barra de direcciones
3. Click "Instalar"

## Solución de Problemas

### La app no carga o muestra errores
- **Verifica conexión**: La primera carga requiere internet
- **Limpia caché**: DevTools > Application > Clear Storage
- **Actualiza navegador**: Asegúrate de tener Chrome 113+ o Safari 16+

### El modelo no se descarga
- **Espacio insuficiente**: Libera al menos 500 MB
- **Conexión lenta**: Espera más tiempo, modelos grandes tardan
- **Prueba otro modelo**: Empieza con MobileNetV4 (más pequeño)

### Clasificación muy lenta (>5s)
- **WebGPU no disponible**: Tu dispositivo usa CPU (WASM)
- **Dispositivo antiguo**: Prueba MobileNetV4 (más rápido)
- **Modelo pesado**: Cambia a un modelo más ligero

### No puedo instalar como PWA
- **HTTPS requerido**: Sirve la app con HTTPS (o localhost)
- **Manifest inválido**: Verifica console para errores
- **Service Worker**: Debe estar registrado correctamente

## Desarrollo

### Ejecutar en modo desarrollo
```bash
# Servir con recarga en caliente
npx http-server -p 8080 -c-1
```

### Depuración
- **Chrome DevTools**: F12 > Console, Application, Network
- **Ver Service Worker**: Application > Service Workers
- **Ver IndexedDB**: Application > Storage > IndexedDB
- **Simular offline**: Network > Offline checkbox

### Hacer cambios
1. Edita los archivos necesarios
2. Incrementa versión en `sw.js` (CACHE_VERSION)
3. Recarga la página (Ctrl+Shift+R para hard reload)

## Roadmap - Próximas Funcionalidades

- [ ] Captura de cámara en tiempo real
- [ ] Módulo traductor técnico offline
- [ ] Más modelos de clasificación disponibles
- [ ] Exportar/importar historial
- [ ] Modo oscuro
- [ ] Estadísticas de uso
- [ ] Comparación de modelos
- [ ] OCR para texto en imágenes

## Arquitectura Técnica

### Service Worker
- **Cache First**: Assets estáticos (HTML, CSS, JS)
- **Network First**: Modelos de IA (con fallback a cache)
- **Runtime Cache**: Recursos dinámicos

### IndexedDB Schema
- **history**: Almacena clasificaciones anteriores
  - id (auto-increment)
  - timestamp
  - moduleType
  - imageThumb (base64)
  - results (array)
  - inferenceTime

- **settings**: Preferencias del usuario
  - key
  - value

## Performance

### Métricas Esperadas
| Métrica | Objetivo | Real (promedio) |
|---------|----------|-----------------|
| Carga inicial (sin cache) | < 5s | ~3s |
| Carga inicial (con cache) | < 1s | ~0.5s |
| Descarga modelo MobileNetV4 | < 30s | ~10s (WiFi) |
| Inferencia (WebGPU) | < 1s | ~0.5s |
| Inferencia (WASM) | < 3s | ~2s |

## Seguridad y Privacidad

- **Sin tracking**: No se envían datos de analytics a terceros
- **Procesamiento local**: Todas las imágenes se procesan en el dispositivo
- **Sin autenticación**: No se requieren cuentas de usuario
- **Datos locales**: Todo se almacena en IndexedDB del navegador
- **Sin cookies**: La app no usa cookies

## Contribuir

Las contribuciones son bienvenidas. Para cambios importantes:

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

MIT License - ver archivo LICENSE para detalles

## Autor

**JJO** - Executive Assistant / AI Projects Lead

## Recursos

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

## Soporte

Para reportar bugs o solicitar features, abre un issue en GitHub.

---

**Versión**: 1.0.0 MVP
**Fecha**: Noviembre 2025
**Estado**: En desarrollo activo
