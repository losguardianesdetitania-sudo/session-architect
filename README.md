# SESSION ARCHITECT

Build your sound. Shape your session.

PWA para organizar una biblioteca DJ local. Permite importar varios archivos de audio, editar BPM/Camelot/energía, asignar categorías independientes INTRO/DESARROLLO/CLOSING, filtrar, consultar compatibilidad Camelot y exportar CSV/M3U.

## Datos
Los archivos se almacenan en IndexedDB del navegador y no se envían a servidores. Exportar CSV guarda metadatos, no audio. Mantén copias de tus archivos originales.

## Análisis v18.2
BPM y tonalidad se estiman localmente con Essentia.js. La tonalidad detectada se convierte a Camelot cuando existe una correspondencia conocida. La energía se estima con nivel RMS, transitorios, densidad dinámica y tempo. El género y el año se completan desde etiquetas incrustadas del archivo cuando están disponibles; no se deducen solo de BPM/energía ni se inventan si faltan. Los datos editados manualmente se conservan al reanalizar. Las estimaciones pueden requerir revisión; la detección de género por audio no está disponible todavía sin un modelo especializado. M3U exporta nombres de pistas, no rutas absolutas portables.

## GitHub Pages
En Settings > Pages, selecciona Deploy from a branch, branch main y carpeta /(root), y guarda. Abre la URL HTTPS generada.

## Instalar
Android Chrome: abre la URL HTTPS, menú ⋮ y elige Instalar aplicación/Añadir a pantalla de inicio. En escritorio, usa el icono de instalación del navegador.


## Análisis automático de audio
La interfaz integra Essentia.js 0.1.3 (WebAssembly) para estimar BPM y tonalidad a partir de los archivos de audio guardados localmente. La decodificación y el análisis se ejecutan en el navegador; no se envía el audio a un servicio de análisis remoto. La primera carga del motor requiere conexión para descargar los recursos desde jsDelivr. Los resultados son estimaciones y pueden requerir corrección manual, especialmente en temas con tempo variable, intros largas o armonía ambigua. El motor Essentia.js está publicado bajo licencia AGPL-3.0; consulta el proyecto original y sus condiciones en https://github.com/MTG/essentia.js.
