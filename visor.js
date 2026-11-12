import { leerInventario, META, normalizar } from "./datos.js";

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
    const { id, nombre, coordenadas, verificada } = edificio;
    const icono = L.divIcon({
      className: `map-pin${verificada ? "" : " pending"}`,
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
  const { id, nombre, direccion, coordenadas, verificada, tipo, pisos, altura, fuente, enlace, observaciones, enlaceUbicacion } = edificio;
  seleccionado = id;
  const estado = crear("p", "", "chip");
  estado.append(crear("i", "", `dot ${verificada ? "verified" : "pending"}`), verificada ? "Cimentación verificada" : "Cimentación por verificar");
  const datos = crear("dl");
  const campos = [
    ["Dirección", direccion],
    ["Ubicación", coordenadas ? "Punto registrado en el mapa" : "Coordenadas pendientes de confirmar"],
    ["Pisos", pisos],
    ["Altura", altura ? `${formatoNumero.format(altura)} m` : ""],
    ["Tipo de cimentación", tipo],
    ["Referencia documental", fuente],
    ["Observaciones", observaciones],
  ];
  for (const [etiqueta, valor] of campos) {
    if (!valor) continue;
    const fila = crear("div");
    fila.append(crear("dt", etiqueta), crear("dd", String(valor)));
    datos.append(fila);
  }
  ficha.replaceChildren(crear("h3", `${id} · ${nombre}`), estado, datos);
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
  visibles = edificios.filter(({ id, nombre, direccion, tipo, observaciones, verificada }) => {
    const estado = verificada ? "verificada" : "pendiente";
    const coincide = normalizar(`${id} ${nombre} ${direccion} ${tipo} ${observaciones}`).includes(consulta);
    return coincide && (filtro.value === "todas" || filtro.value === estado);
  });
  if (!visibles.some(({ id }) => id === seleccionado)) {
    seleccionado = null;
    ficha.hidden = true;
  }
  conteo.textContent = edificios.length === visibles.length
    ? `${edificios.length} de ${META} fichas registradas`
    : `${visibles.length} de ${edificios.length} fichas registradas`;
  listado.replaceChildren();

  for (const edificio of visibles) {
    const { id, nombre, tipo, verificada } = edificio;
    const boton = crear("button", "", "building");
    boton.type = "button";
    boton.dataset.id = id;
    const texto = crear("span");
    texto.append(crear("span", nombre, "building-name"), crear("span", tipo || "Cimentación por verificar", "building-type"));
    boton.append(crear("span", id, `badge${verificada ? "" : " pending"}`), texto);
    boton.addEventListener("click", () => mostrarFicha(edificio, true));
    listado.append(boton);
  }

  if (!edificios.length) {
    mostrarMensaje("Inventario en preparación", "Las fichas se incorporarán a medida que avance la revisión de los expedientes.");
  } else if (!visibles.length) {
    mostrarMensaje("Sin coincidencias", "Prueba con otro término o cambia el filtro de estado.");
  }
  dibujarMarcadores();
  actualizarSeleccion();
}

iniciarMapa();
try {
  const respuesta = await fetch(new URL("./data/edificaciones.csv", import.meta.url), { cache: "no-cache" });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  edificios = leerInventario(await respuesta.text());
  const ubicadas = edificios.filter(({ coordenadas }) => coordenadas).length;
  const verificadas = edificios.filter(({ verificada }) => verificada).length;
  porId("total-ubicadas").textContent = String(ubicadas);
  porId("total-verificadas").textContent = String(verificadas);
  if (ubicadas === META && verificadas === META) {
    const etapa = porId("etapa");
    etapa.classList.add("complete");
    etapa.replaceChildren(crear("i", "", "dot verified"), "Levantamiento completo");
  }
  porId("controles").hidden = !edificios.length;
  buscar.addEventListener("input", actualizarListado);
  filtro.addEventListener("change", actualizarListado);
  actualizarListado();
  ajustarMapa();
  if (edificios.length === 1) mostrarFicha(edificios[0], false, false);
} catch (error) {
  console.error("No se pudo cargar el inventario.", error);
  conteo.textContent = "Inventario temporalmente no disponible";
  mostrarMensaje("Error al cargar las fichas", "Vuelve a cargar la página. El mapa base y los enlaces de consulta siguen disponibles.");
}
