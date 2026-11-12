# Cimentaciones de San Gil

Visor del levantamiento de 11 edificaciones de mayor altura en San Gil, Santander. La página estática muestra el avance, la ubicación y las fichas de revisión documental. La base del mapa es OpenStreetMap y el botón **Geoportal IGAC** abre el módulo catastral de Colombia en Mapas.

## Actualizar el inventario

Edita `data/edificaciones.csv`. El archivo usa UTF-8 y punto y coma. Conserva la primera fila y los identificadores `E01` a `E11`. Una fila con nombre aparece en el listado y aparece en el mapa al agregar latitud y longitud confirmadas en grados decimales WGS 84. Puedes usar punto o coma decimal. Si un campo contiene punto y coma, ponlo entre comillas dobles.

Registra pisos y altura en sus columnas respectivas cuando estén documentados. Para mostrar el tipo de cimentación, completa `tipo_cimentacion`, indica `Verificado` en `estado_cimentacion` e incluye una referencia publicable en `fuente`. Usa `Por verificar` cuando falte respaldo o haya discrepancias. En `observaciones` puedes precisar si el dato describe el diseño o la obra ejecutada y señalar qué torre o zona cubre el documento.

GitHub Pages publica el CSV junto con el sitio. Mantén los expedientes, firmas y datos personales en el archivo interno de la Secretaría. Usa enlaces HTTPS públicos en `enlace_fuente` y, cuando haya una ficha cartográfica de la edificación, en `enlace_ubicacion`.

El punto de E01 corresponde al centroide de la huella de la edificación y los pisos provienen de la capa de construcciones urbanas. Estos datos derivados de la **Base Catastral Pública del IGAC**, corte del 31 de agosto de 2026, se comparten bajo CC BY-SA 4.0. [Ficha de la base catastral](https://www.arcgis.com/sharing/rest/content/items/a55304e6ce4a47fb97f988ac321f1440?f=pjson) · [Licencia](https://creativecommons.org/licenses/by-sa/4.0/deed.es)

## Abrir en el computador

Con Node.js instalado, abre una terminal en esta carpeta y ejecuta `node servidor-local.mjs`. Luego abre [el visor local](http://127.0.0.1:8765/). El mapa base requiere conexión a internet. Para cerrar el servidor, pulsa `Ctrl+C` en la terminal.

## Publicar en GitHub Pages

Sube el contenido de esta carpeta, incluido `.nojekyll`, a la raíz de la rama `main` de tu repositorio. En **Settings → Pages**, selecciona **Deploy from a branch**, elige `main` y `/(root)` y guarda. La sección **Pages** muestra el enlace una vez termine el despliegue. [Documentación de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
