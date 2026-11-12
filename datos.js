const columnas = [
  "id", "nombre", "direccion", "latitud", "longitud", "pisos", "altura_m",
  "tipo_cimentacion", "estado_cimentacion", "fuente", "enlace_fuente", "observaciones", "enlace_ubicacion",
];
const estadosConTipo = new Map([
  ["verificada", "verificada"],
  ["verificado", "verificada"],
  ["reportada", "reportada"],
  ["reportado", "reportada"],
]);

export const META = 11;

export function normalizar(texto) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function leerFilas(csv) {
  const texto = csv.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const filas = [];
  let fila = [];
  let celda = "";
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];
    if (entreComillas && caracter === '"' && texto[i + 1] === '"') {
      celda += '"';
      i++;
    } else if (caracter === '"' && (entreComillas || celda === "")) {
      entreComillas = !entreComillas;
    } else if (!entreComillas && (caracter === ";" || caracter === "\n")) {
      fila.push(celda.trim());
      celda = "";
      if (caracter === "\n") {
        filas.push(fila);
        fila = [];
      }
    } else {
      celda += caracter;
    }
  }

  if (entreComillas) throw new Error("Una celda tiene comillas sin cerrar.");
  if (fila.length || celda) filas.push([...fila, celda.trim()]);
  return filas.filter((fila) => fila.some(Boolean));
}

function decimal(texto) {
  if (!/^[+-]?\d+(?:[.,]\d+)?$/.test(texto)) return null;
  const numero = Number(texto.replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

function enlaceSeguro(texto) {
  try {
    const url = new URL(texto);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

export function leerInventario(csv) {
  const [encabezado, ...filas] = leerFilas(csv);
  if (encabezado?.join(";") !== columnas.join(";")) {
    throw new Error("El encabezado del inventario no coincide con la plantilla.");
  }
  const ids = new Set();

  return filas.flatMap((fila) => {
    const [id, nombre, direccion, latitud, longitud, pisos, altura, tipo, estado, fuente, enlace, observaciones, enlaceUbicacion] = fila;
    if (fila.length !== columnas.length || !/^E(?:0[1-9]|1[01])$/.test(id) || ids.has(id)) {
      throw new Error(`Fila inválida o repetida en el inventario (${id || "sin identificador"}).`);
    }
    ids.add(id);
    if (!nombre) return [];

    const lat = decimal(latitud);
    const lon = decimal(longitud);
    const coordenadas = lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
      ? [lat, lon]
      : null;
    const nivel = decimal(pisos);
    const metros = decimal(altura);
    const estadoCimentacion = tipo && fuente
      ? estadosConTipo.get(normalizar(estado)) ?? "pendiente"
      : "pendiente";

    return [{
      id, nombre, direccion, coordenadas, fuente, observaciones, estadoCimentacion,
      verificada: estadoCimentacion === "verificada",
      pisos: Number.isInteger(nivel) && nivel > 0 ? nivel : null,
      altura: metros > 0 ? metros : null,
      tipo: estadoCimentacion === "pendiente" ? "" : tipo,
      enlace: enlaceSeguro(enlace),
      enlaceUbicacion: enlaceSeguro(enlaceUbicacion),
    }];
  });
}
