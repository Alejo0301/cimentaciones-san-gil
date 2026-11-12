const servicio = "https://services2.arcgis.com/RVvWzU3lgJISqdke/ArcGIS/rest/services/CATASTRO_PUBLICO_31082026/FeatureServer";
const municipio = "codigo_municipio='68679'";
const zoomMinimo = 16;
const limiteRegistros = 1800;

// Extensión WGS 84 de la capa U_PERIMETRO (2) del IGAC para el municipio 68679.
const ventanaSanGil = {
  sur: 6.526006710861792,
  oeste: -73.15459004899054,
  norte: 6.572312541417814,
  este: -73.11745357535351,
};

const capasCatastrales = {
  predios: {
    id: 7,
    nombre: "Predios",
    titulo: "Predio urbano",
    campos: "OBJECTID",
    orden: 0,
    estilo: { color: "#a35a16", opacity: 0.88, weight: 1, fillOpacity: 0.04 },
  },
  construcciones: {
    id: 3,
    nombre: "Construcciones",
    titulo: "Huella de construcción",
    campos: "NUMERO_PISOS",
    orden: 1,
    estilo: { color: "#6a54aa", opacity: 0.9, weight: 1, fillOpacity: 0.23 },
  },
  vias: {
    id: 0,
    nombre: "Nomenclatura vial",
    titulo: "Nomenclatura vial",
    campos: "TEXTO",
    orden: 2,
    estilo: { color: "#08727b", opacity: 0.85, weight: 3, dashArray: "6 5" },
  },
};

function extensionVisible(mapa) {
  const vista = mapa.getBounds();
  const oeste = Math.max(vista.getWest(), ventanaSanGil.oeste);
  const sur = Math.max(vista.getSouth(), ventanaSanGil.sur);
  const este = Math.min(vista.getEast(), ventanaSanGil.este);
  const norte = Math.min(vista.getNorth(), ventanaSanGil.norte);
  if (oeste >= este || sur >= norte) return null;
  return [oeste, sur, este, norte].join(",");
}

function contenidoFicha(clave, configuracion, propiedades = {}) {
  const ficha = document.createElement("div");
  const titulo = document.createElement("strong");
  const nombreVia = typeof propiedades.TEXTO === "string" ? propiedades.TEXTO.trim() : "";
  titulo.textContent = clave === "vias" && nombreVia ? nombreVia : configuracion.titulo;
  ficha.append(titulo);

  if (clave === "construcciones") {
    const pisos = Number(propiedades.NUMERO_PISOS);
    const detalle = document.createElement("div");
    detalle.textContent = Number.isInteger(pisos) && pisos > 0
      ? `${pisos} ${pisos === 1 ? "piso registrado en esta huella" : "pisos registrados en esta huella"}`
      : "Número de pisos sin registro";
    ficha.append(detalle);
  }
  return ficha;
}

async function consultar(id, parametros, signal) {
  const url = new URL(`${servicio}/${id}/query`);
  url.search = new URLSearchParams(parametros).toString();
  const respuesta = await fetch(url, { signal });
  if (!respuesta.ok) throw new Error("Error al consultar el servicio catastral");
  const datos = await respuesta.json();
  if (!datos || datos.error) throw new Error("Respuesta del servicio catastral no válida");
  return datos;
}

async function consultarCapa({ id, campos }, geometria, signal) {
  const filtro = {
    where: municipio,
    geometry: geometria,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326",
  };
  const { count } = await consultar(id, { ...filtro, f: "json", returnCountOnly: "true" }, signal);
  if (!Number.isInteger(count) || count < 0) throw new Error("Conteo catastral no válido");
  if (count > limiteRegistros) return { excedida: true };
  if (!count) return { elementos: [] };

  const datos = await consultar(id, {
    ...filtro,
    f: "geojson",
    outSR: "4326",
    returnGeometry: "true",
    outFields: campos,
    resultRecordCount: String(limiteRegistros + 1),
  }, signal);
  if (datos.type !== "FeatureCollection" || !Array.isArray(datos.features)) {
    throw new Error("GeoJSON catastral no válido");
  }
  if (datos.exceededTransferLimit || datos.properties?.exceededTransferLimit || datos.features.length > limiteRegistros) {
    return { excedida: true };
  }
  if (datos.features.length !== count) throw new Error("Respuesta catastral incompleta");
  return { elementos: datos.features.filter((elemento) => elemento.geometry) };
}

export function iniciarCatastro(L, mapa) {
  const controles = document.getElementById("capas-catastro");
  const estado = document.getElementById("estado-catastro");
  if (!controles || !estado) return;

  mapa.attributionControl.addAttribution(
    '<a href="https://www.arcgis.com/home/item.html?id=a55304e6ce4a47fb97f988ac321f1440" target="_blank" rel="noopener">Catastro IGAC</a>',
  );

  const nombrePanel = "catastro-igac";
  const panel = mapa.createPane(nombrePanel);
  panel.style.zIndex = 410;
  const renderer = L.canvas({ pane: nombrePanel });
  const entradas = [...controles.querySelectorAll('input[type="checkbox"][data-capa]')];
  const capas = entradas.flatMap((entrada) => {
    const clave = entrada.dataset.capa;
    if (!Object.hasOwn(capasCatastrales, clave)) return [];
    const configuracion = capasCatastrales[clave];
    const capa = L.geoJSON(null, {
      pane: nombrePanel,
      renderer,
      style: configuracion.estilo,
      onEachFeature: (elemento, figura) => figura.bindPopup(
        () => contenidoFicha(clave, configuracion, elemento.properties ?? {}),
        { className: "catastro-popup", autoPan: false },
      ),
    });
    return [{ entrada, configuracion, capa }];
  }).sort((a, b) => a.configuracion.orden - b.configuracion.orden);

  let solicitud;
  let espera;

  async function cargar(activas, geometria) {
    const control = new AbortController();
    solicitud = control;
    const tiempoMaximo = setTimeout(() => control.abort(), 12000);
    const resultados = await Promise.allSettled(activas.map(({ configuracion }) => (
      consultarCapa(configuracion, geometria, control.signal)
    )));
    clearTimeout(tiempoMaximo);
    if (solicitud !== control) return;
    solicitud = undefined;

    let hayDatos = false;
    const errores = [];
    const excedidas = [];
    resultados.forEach((resultado, indice) => {
      const { configuracion, capa } = activas[indice];
      if (resultado.status === "rejected") {
        errores.push(configuracion.nombre);
      } else if (resultado.value.excedida) {
        excedidas.push(configuracion.nombre);
      } else if (resultado.value.elementos.length) {
        try {
          capa.addData(resultado.value.elementos).addTo(mapa);
          hayDatos = true;
        } catch {
          capa.clearLayers().remove();
          errores.push(configuracion.nombre);
        }
      }
    });

    const mensajes = [];
    if (excedidas.length) mensajes.push(`Acerca el mapa para consultar ${excedidas.join(", ").toLowerCase()}.`);
    if (errores.length) mensajes.push(`No se pudo cargar ${errores.join(", ").toLowerCase()} del IGAC. Mueve el mapa para reintentar.`);
    if (!mensajes.length) {
      mensajes.push(hayDatos ? "Selecciona un elemento del mapa para consultar el catastro." : "El IGAC no devolvió elementos para esta vista.");
    }
    estado.textContent = mensajes.join(" ");
  }

  function actualizar() {
    clearTimeout(espera);
    solicitud?.abort();
    solicitud = undefined;
    const activas = capas.filter(({ entrada }) => entrada.checked);
    capas.forEach(({ capa }) => capa.clearLayers().remove());

    if (!activas.length) {
      estado.textContent = "";
      return;
    }
    if (mapa.getZoom() < zoomMinimo) {
      estado.textContent = "Acerca el mapa para consultar las capas catastrales.";
      return;
    }
    const geometria = extensionVisible(mapa);
    if (!geometria) {
      estado.textContent = "Desplaza el mapa hacia la cabecera de San Gil para consultar el catastro.";
      return;
    }

    estado.textContent = "Consultando capas catastrales del IGAC…";
    espera = setTimeout(() => cargar(activas, geometria), 200);
  }

  controles.addEventListener("change", actualizar);
  mapa.on("moveend", actualizar);
  actualizar();
}
