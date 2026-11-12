import { leerInventario, normalizar, resumenDesplante, TIPOS } from "./datos.js?v=4";
import { iniciarCatastro } from "./catastro.js?v=2";

const centro = [6.55, -73.133333];
const porId = (id) => document.getElementById(id);
const listado = porId("listado");
const ficha = porId("ficha");
const buscar = porId("buscar");
const filtro = porId("filtro");
const conteo = porId("conteo-fichas");
const encuadrar = porId("encuadrar");
const avisoMapa = porId("estado-mapa");
const mapaAlterno = porId("mapa-alterno");
const formatoNumero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const L = window.L;
let mapa;
let capaMarcadores;
const marcadores = new Map();
let edificios = [];
let visibles = [];
let seleccionado = null;

function crear(etiqueta, texto, clase) {
  const nodo = document.createElement(etiqueta);
  if (texto) nodo.textContent = texto;
  if (clase) nodo.className = clase;
  return nodo;
}

function iniciarTipos() {
  const leyenda = porId("leyenda-tipos");
  for (const [clave, etiqueta] of Object.entries(TIPOS)) {
    const opcion = crear("option", etiqueta);
    opcion.value = clave;
    filtro.append(opcion);
    const item = crear("span");
    item.append(crear("i", "", `dot ${clave}`), etiqueta);
    leyenda.append(item);
  }
}

function colorDeFicha({ categorias }) {
  return filtro.value === "todas" ? categorias[0] ?? "" : filtro.value;
}

function mostrarResumen() {
  const total = edificios.length;
  const conTipo = edificios.filter(({ categorias }) => categorias.length).length;
  const conCota = edificios.filter(({ cotaProyecto }) => cotaProyecto);
  const { cantidad, promedio } = resumenDesplante(edificios);
  porId("resumen-inventario").textContent = `${total} fichas en el inventario · ${conTipo} con tipo de cimentación identificado · ${conCota.length} con cotas en planos`;

  const filas = Object.entries(TIPOS).map(([tipo, etiqueta]) => {
    const n = edificios.filter(({ categorias }) => categorias.includes(tipo)).length;
    const fila = crear("li", "", tipo);
    const detalle = crear("div", "", "stat-label");
    detalle.append(crear("span", etiqueta), crear("strong", `${n} de ${total}`));
    const barra = crear("div", "", "stat-track");
    barra.setAttribute("aria-hidden", "true");
    const relleno = crear("span");
    relleno.style.width = `${total ? n / total * 100 : 0}%`;
    barra.append(relleno);
    fila.append(detalle, barra);
    return fila;
  });
  porId("resumen-tipos").replaceChildren(...filas);
  porId("resumen-cotas").replaceChildren(...conCota.map(({ nombre, cotaProyecto }) => {
    const fila = crear("div");
    fila.append(crear("dt", nombre), crear("dd", cotaProyecto));
    return fila;
  }));
  porId("nota-desplante").textContent = promedio === null
    ? "Las cotas tienen referencias distintas. El inventario no reúne suficientes profundidades de desplante medidas desde el terreno para calcular un promedio."
    : `Profundidad media de desplante: ${formatoNumero.format(promedio)} m, con ${cantidad} medidas desde el terreno hasta la base de la cimentación. Las cotas de plano se muestran aparte.`;
}

function estadoDeMapa(mensaje) {
  avisoMapa.textContent = mensaje;
  avisoMapa.hidden = !mensaje;
  mapaAlterno.hidden = !mensaje;
}

function iniciarMapa() {
  if (!L) {
    estadoDeMapa("El mapa interactivo no pudo cargar.");
    return;
  }

  mapa = L.map("mapa", { scrollWheelZoom: false }).setView(centro, 15);
  mapa.zoomControl.setPosition("bottomleft");
  mapa.zoomControl.getContainer().querySelector(".leaflet-control-zoom-in").setAttribute("aria-label", "Acercar");
  mapa.zoomControl.getContainer().querySelector(".leaflet-control-zoom-out").setAttribute("aria-label", "Alejar");
  mapa.attributionControl.setPrefix(false);

  let cargada = false;
  const base = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
  base.on("loading", () => { cargada = false; });
  base.on("tileload", () => { cargada = true; });
  base.on("load", () => estadoDeMapa(cargada ? "" : "El mapa base no está disponible."));
  base.addTo(mapa);
  capaMarcadores = L.layerGroup().addTo(mapa);
  L.control.scale({ imperial: false, position: "bottomright" }).addTo(mapa);
  porId("capas-catastro").disabled = false;
  iniciarCatastro(L, mapa);
  encuadrar.disabled = false;
  encuadrar.addEventListener("click", ajustarMapa);
}

function ajustarMapa() {
  if (!mapa) return;
  const puntos = visibles.flatMap((edificio) => edificio.coordenadas ? [edificio.coordenadas] : []);
  if (puntos.length) {
    mapa.fitBounds(L.latLngBounds(puntos), { padding: [32, 32], maxZoom: 17 });
  } else {
    mapa.setView(centro, 15);
  }
}

function dibujarMarcadores() {
  if (!mapa) return;
  capaMarcadores.clearLayers();
  marcadores.clear();
  for (const edificio of visibles) {
    if (!edificio.coordenadas) continue;
    const { id, nombre, coordenadas } = edificio;
    const icono = L.divIcon({
      className: `map-pin ${colorDeFicha(edificio)}`,
      html: crear("span", id.slice(1)),
      iconSize: [31, 31],
      iconAnchor: [15, 15],
    });
    const marca = L.marker(coordenadas, { icon: icono, title: nombre, riseOnHover: true });
    marca.addTo(capaMarcadores);
    marca.getElement().setAttribute("aria-label", nombre);
    marca.on("click", () => mostrarFicha(edificio, false));
    marcadores.set(id, marca);
  }
}

function actualizarSeleccion() {
  for (const boton of listado.querySelectorAll("button")) {
    boton.setAttribute("aria-pressed", String(boton.dataset.id === seleccionado));
  }
  for (const [id, marca] of marcadores) {
    marca.getElement()?.classList.toggle("selected", id === seleccionado);
    marca.setZIndexOffset(id === seleccionado ? 1000 : 0);
  }
}

function mostrarFicha(edificio, acercar, moverFoco = true) {
  const { id, nombre, direccion, coordenadas, categorias, tipo, pisos, altura, fuente, enlace, observaciones, enlaceUbicacion, profundidadDesplante, cotaProyecto } = edificio;
  seleccionado = id;
  const tipos = categorias.map((categoria) => {
    const chip = crear("span", "", "chip");
    chip.append(crear("i", "", `dot ${categoria}`), TIPOS[categoria]);
    return chip;
  });
  const etiquetas = crear("div", "", "type-chips");
  etiquetas.append(...tipos);
  const datos = crear("dl");
  const campos = [
    ["Dirección", direccion],
    ["Ubicación", coordenadas ? "Punto registrado en el mapa" : "Coordenadas pendientes de confirmar"],
    ["Pisos", pisos],
    ["Altura", altura ? `${formatoNumero.format(altura)} m` : ""],
    ["Tipo de cimentación", tipo],
    ["Profundidad de desplante", profundidadDesplante === null ? "" : `${formatoNumero.format(profundidadDesplante)} m desde el terreno`],
    ["Cota de proyecto", cotaProyecto],
    ["Fuentes de la ficha", fuente],
    ["Observaciones", observaciones],
  ];
  for (const [etiqueta, valor] of campos) {
    if (!valor) continue;
    const fila = crear("div");
    fila.append(crear("dt", etiqueta), crear("dd", String(valor)));
    datos.append(fila);
  }
  ficha.replaceChildren(crear("h3", `${id} · ${nombre}`), ...(tipos.length ? [etiquetas] : []), datos);
  const enlaces = crear("div", "", "detail-links");
  for (const [url, etiqueta] of [[enlace, "Consultar documento ↗"], [enlaceUbicacion, "Consultar ubicación ↗"]]) {
    if (!url) continue;
    const link = crear("a", etiqueta);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    enlaces.append(link);
  }
  if (enlaces.childElementCount) ficha.append(enlaces);
  ficha.hidden = false;
  actualizarSeleccion();
  if (acercar && coordenadas && mapa) mapa.setView(coordenadas, Math.max(17, mapa.getZoom()));
  if (moverFoco) ficha.focus();
}

function mostrarMensaje(titulo, descripcion) {
  const mensaje = crear("div", "", "empty");
  mensaje.append(crear("strong", titulo), crear("p", descripcion));
  listado.replaceChildren(mensaje);
}

function actualizarListado() {
  const consulta = normalizar(buscar.value);
  visibles = edificios.filter(({ id, nombre, direccion, tipo, observaciones, categorias }) => {
    const coincide = normalizar(`${id} ${nombre} ${direccion} ${tipo} ${categorias.map((categoria) => TIPOS[categoria]).join(" ")} ${observaciones}`).includes(consulta);
    return coincide && (filtro.value === "todas" || categorias.includes(filtro.value));
  });
  if (!visibles.some(({ id }) => id === seleccionado)) {
    seleccionado = null;
    ficha.hidden = true;
  }
  conteo.textContent = edificios.length === visibles.length
    ? `${edificios.length} fichas registradas`
    : `${visibles.length} de ${edificios.length} fichas registradas`;
  listado.replaceChildren();

  for (const edificio of visibles) {
    const { id, nombre, tipo } = edificio;
    const boton = crear("button", "", "building");
    boton.type = "button";
    boton.dataset.id = id;
    const texto = crear("span");
    texto.append(crear("span", nombre, "building-name"));
    if (tipo) texto.append(crear("span", tipo, "building-type"));
    boton.append(crear("span", id, `badge ${colorDeFicha(edificio)}`), texto);
    boton.addEventListener("click", () => mostrarFicha(edificio, true));
    listado.append(boton);
  }

  if (!edificios.length) {
    mostrarMensaje("Inventario en preparación", "Las fichas se incorporarán a medida que avance la revisión de los expedientes.");
  } else if (!visibles.length) {
    mostrarMensaje("Sin coincidencias", "Prueba con otro término o tipo de cimentación.");
  }
  dibujarMarcadores();
  actualizarSeleccion();
}

iniciarMapa();
iniciarTipos();
try {
  const respuesta = await fetch(new URL("./data/edificaciones.csv?v=2", import.meta.url), { cache: "no-cache" });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  edificios = leerInventario(await respuesta.text());
  mostrarResumen();
  porId("controles").hidden = !edificios.length;
  buscar.addEventListener("input", actualizarListado);
  filtro.addEventListener("change", () => {
    actualizarListado();
    ajustarMapa();
  });
  actualizarListado();
  ajustarMapa();
  if (edificios.length === 1) mostrarFicha(edificios[0], false, false);
} catch (error) {
  console.error("No se pudo cargar el inventario.", error);
  conteo.textContent = "Inventario temporalmente no disponible";
  porId("resumen-inventario").textContent = "Estadísticas temporalmente no disponibles";
  mostrarMensaje("Error al cargar las fichas", "Vuelve a cargar la página. El mapa base y los enlaces de consulta siguen disponibles.");
}
