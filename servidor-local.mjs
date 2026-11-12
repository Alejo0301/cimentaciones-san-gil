import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const rutas = new Map([
  ["/", ["index.html", "text/html"]],
  ["/index.html", ["index.html", "text/html"]],
  ["/estilos.css", ["estilos.css", "text/css"]],
  ["/datos.js", ["datos.js", "text/javascript"]],
  ["/catastro.js", ["catastro.js", "text/javascript"]],
  ["/visor.js", ["visor.js", "text/javascript"]],
  ["/data/edificaciones.csv", ["data/edificaciones.csv", "text/csv"]],
  ["/assets/alcaldia-san-gil.png", ["assets/alcaldia-san-gil.png", "image/png"]],
  ["/informe-cimentaciones-san-gil.docx", ["informe-cimentaciones-san-gil.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]],
]);
const host = "127.0.0.1";
const puerto = 8765;

const servidor = createServer(async (peticion, respuesta) => {
  const ruta = rutas.get(peticion.url.split("?", 1)[0]);
  if (!ruta) {
    respuesta.writeHead(404).end();
    return;
  }
  try {
    const [archivo, tipo] = ruta;
    const contenido = await readFile(new URL(archivo, import.meta.url));
    const tipoRespuesta = tipo.startsWith("text/") ? `${tipo}; charset=utf-8` : tipo;
    respuesta.writeHead(200, { "Content-Type": tipoRespuesta, "Cache-Control": "no-cache" });
    respuesta.end(contenido);
  } catch (error) {
    console.error(error.message);
    respuesta.writeHead(500).end();
  }
});

servidor.listen(puerto, host, () => console.log(`Visor local disponible en http://${host}:${puerto}/`));
