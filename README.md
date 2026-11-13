# Cimentaciones de San Gil

Visor de ubicación y cimentación de edificaciones destacadas de San Gil, Santander. La página muestra las fichas disponibles, las estadísticas del inventario y el informe descargable en Word. Las capas de construcciones, predios y nomenclatura vial consultan la Base Catastral Pública del IGAC. La base visual es OpenStreetMap y el botón **Geoportal IGAC** abre el módulo catastral de Colombia en Mapas.

## Actualizar el inventario

Edita `data/edificaciones.csv`. El archivo usa UTF-8 y punto y coma. Conserva la primera fila y los identificadores existentes. Una fila con nombre aparece en el listado y aparece en el mapa al agregar latitud y longitud en grados decimales WGS 84. Puedes usar punto o coma decimal. Si un campo contiene punto y coma, ponlo entre comillas dobles.

Registra pisos y altura en sus columnas respectivas cuando estén documentados. Describe el sistema en `tipo_cimentacion` y escribe su referencia en `fuente`. En `grupos_cimentacion` usa `zapatas`, `zapatas-con-vigas` o `losa`. Si hay varios sistemas, sepáralos con `|` y escribe primero el principal. Si falta el tipo o no se puede atribuir a esa edificación, deja los grupos vacíos y aclara el alcance en `observaciones`. La ficha seguirá apareciendo al ver todos los edificios.

Usa `desplante_recomendado` para la profundidad indicada por el estudio de suelos. Incluye la referencia de medición y conserva el rango o las referencias alternativas cuando las dé el estudio. El visor presenta estas recomendaciones por separado. Guarda los niveles relativos en `cota_proyecto` con su referencia y los espesores de elementos en `observaciones`.

En `observaciones` puedes registrar las dimensiones aportadas, precisar si el dato describe el diseño o la obra ejecutada y señalar qué torre o zona cubre el documento.

Al actualizar el informe, conserva el nombre `informe-cimentaciones-san-gil.docx` en la raíz del sitio y vuelve a revisar sus cifras con el inventario.

GitHub Pages publica el CSV junto con el sitio. Mantén los expedientes, firmas y datos personales en el archivo interno de la Secretaría. Usa enlaces HTTPS públicos en `enlace_fuente` y, cuando haya una ficha cartográfica de la edificación, en `enlace_ubicacion`.

El punto de E01 corresponde al centroide de la huella de la edificación y los pisos provienen de la capa de construcciones urbanas. El punto de E02 corresponde al centroide del predio identificado por la nomenclatura catastral. Sus pisos corresponden a la licencia de construcción. Las capas y los datos derivados de la **Base Catastral Pública del IGAC**, corte del 31 de agosto de 2026, se comparten bajo CC BY-SA 4.0. [Ficha de la base catastral](https://www.arcgis.com/sharing/rest/content/items/a55304e6ce4a47fb97f988ac321f1440?f=pjson) · [Licencia](https://creativecommons.org/licenses/by-sa/4.0/deed.es)

## Abrir en el computador

Con Node.js instalado, abre una terminal en esta carpeta y ejecuta `node servidor-local.mjs`. Luego abre [el visor local](http://127.0.0.1:8765/). El mapa base requiere conexión a internet. Para cerrar el servidor, pulsa `Ctrl+C` en la terminal.

## Publicar en GitHub Pages

El sitio se publica desde la raíz de `main`. Abre un pull request desde una rama de trabajo para actualizar la rama protegida. Una vez fusionado, revisa el despliegue en **Actions** y comprueba el [visor público](https://alejo0301.github.io/cimentaciones-san-gil/). Conserva `.nojekyll` en la raíz.
