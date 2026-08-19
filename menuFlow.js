// menuFlow.js
// Aquí se arman los flujos de PocketFlow para las dos operaciones de RestoApp
// que dependen de la red (Firebase) y por lo tanto pueden fallar:
//   1) obtenerMenuConReintentos() -> cargar el menú, con reintentos y caché local de respaldo
//   2) crearProductoConReintentos() -> crear un producto, con reintentos
//
// Las páginas (pedidoPage.js, adminPage.js) solo importan estas dos funciones;
// no necesitan saber que por dentro hay un grafo de nodos.

import { Node, BaseNode, Flow } from "./pocketflow.js";
import { fetchMenuRaw, normalizarMenu, crearPlato, sembrarMenuInicial } from "./menu.js";
import { guardarPedido } from "./pedidosApi.js";

const CACHE_KEY = "restoapp_menu_cache_v1";

/**
 * Paso 1 del flujo de menú: pedir los datos crudos a Firebase.
 * Es un Node (no BaseNode) porque es justo el paso que puede fallar por red:
 * 3 intentos con 1 segundo de espera entre cada uno antes de rendirse.
 */
class FetchMenuNode extends Node {
  constructor() {
    super(3, 1); // 3 intentos, 1s de espera entre reintentos
    this.usoCache = false;
  }

  async exec() {
    return await fetchMenuRaw();
  }

  // Se ejecuta solo si los 3 intentos contra Firebase fallaron.
  async execFallback(_prepRes, exc) {
    console.warn("PocketFlow: Firebase no respondió, probando caché local...", exc);
    const cacheado = localStorage.getItem(CACHE_KEY);
    if (cacheado) {
      this.usoCache = true;
      return JSON.parse(cacheado);
    }
    // Sin caché tampoco: no hay nada más que intentar, se propaga el error.
    throw new Error("No se pudo cargar el menú: sin conexión y sin caché local.");
  }

  async post(shared, _prepRes, rawData) {
    shared.rawMenu = rawData;
    shared.desdeCache = this.usoCache;
  }
}

/**
 * Paso 2 del flujo de menú: normalizar los datos crudos y guardarlos en caché
 * si vinieron frescos de Firebase (para poder usarlos como fallback la próxima vez).
 * Es BaseNode (sin reintentos) porque es lógica pura, no hace red.
 */
class NormalizeMenuNode extends BaseNode {
  async prep(shared) {
    return { raw: shared.rawMenu, desdeCache: shared.desdeCache };
  }

  async exec({ raw }) {
    return normalizarMenu(raw);
  }

  async post(shared, prepRes, menu) {
    shared.menu = menu;
    if (!prepRes.desdeCache) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(menu));
      } catch (err) {
        // localStorage puede fallar (modo privado, cuota llena); no es crítico.
        console.warn("No se pudo guardar la caché del menú:", err);
      }
    }
  }
}

/** Arma y corre el flujo fetch->normalizar, devolviendo { menu, desdeCache }. */
async function ejecutarFlujoMenu() {
  const fetchNode = new FetchMenuNode();
  const normalizeNode = new NormalizeMenuNode();
  fetchNode.next(normalizeNode);

  const flow = new Flow(fetchNode);
  const shared = {};
  await flow.run(shared);

  return { menu: shared.menu || [], desdeCache: !!shared.desdeCache };
}

/**
 * Obtiene el menú con reintentos automáticos y, si Firebase no responde tras
 * 3 intentos, cae a la última copia guardada en localStorage.
 *
 * Además: si Firebase respondió pero el menú está vacío (primera vez que se
 * abre la app, sin platos creados todavía), lo llena automáticamente con
 * MENU_SEMILLA para que la plataforma nunca se vea vacía en una primera
 * prueba, y vuelve a cargarlo.
 * @returns {Promise<{menu: Array, desdeCache: boolean}>}
 */
export async function obtenerMenuConReintentos() {
  const resultado = await ejecutarFlujoMenu();

  const menuRealmenteVacio = !resultado.desdeCache && resultado.menu.length === 0;
  if (menuRealmenteVacio) {
    try {
      await sembrarMenuInicial();
      return await ejecutarFlujoMenu();
    } catch (err) {
      console.error("No se pudo sembrar el menú inicial:", err);
      return resultado; // seguimos con el menú vacío antes que romper la página
    }
  }

  return resultado;
}

/**
 * Nodo de creación de producto: 2 intentos con 1s de espera antes de rendirse.
 * A diferencia del menú, aquí no tiene sentido un fallback a caché (es una
 * escritura), así que execFallback solo produce un mensaje de error más claro.
 */
class CrearProductoNode extends Node {
  constructor() {
    super(2, 1);
  }

  async prep(shared) {
    return shared.nuevoPlato;
  }

  async exec(plato) {
    return await crearPlato(plato);
  }

  async execFallback(_prepRes, exc) {
    console.error("PocketFlow: no se pudo crear el producto tras varios intentos.", exc);
    throw new Error("No se pudo crear el producto después de varios intentos. Intenta de nuevo.");
  }

  async post(shared, _prepRes, resultado) {
    shared.resultado = resultado;
  }
}

/**
 * Crea un producto en Firebase con reintentos automáticos.
 * @param {{name: string, price: number}} plato
 */
export async function crearProductoConReintentos(plato) {
  const nodo = new CrearProductoNode();
  const shared = { nuevoPlato: plato };
  await nodo.run(shared);
  return shared.resultado;
}

/**
 * Nodo de guardado de pedido: 3 intentos con 1s de espera. Un pedido que se
 * confirma en el mesero pero no llega a guardarse es justo el tipo de fallo
 * silencioso que este taller busca evitar, así que aquí los reintentos
 * importan más que en cualquier otro flujo.
 */
class GuardarPedidoNode extends Node {
  constructor() {
    super(3, 1);
  }

  async prep(shared) {
    return shared.pedido;
  }

  async exec(pedido) {
    return await guardarPedido(pedido);
  }

  async execFallback(_prepRes, exc) {
    console.error("PocketFlow: no se pudo guardar el pedido tras varios intentos.", exc);
    throw new Error(
      "No se pudo guardar el pedido después de varios intentos. Verifica tu conexión y vuelve a intentar."
    );
  }

  async post(shared, _prepRes, resultado) {
    shared.resultado = resultado;
  }
}

/**
 * Guarda un pedido (carrito confirmado) en Firebase con reintentos automáticos.
 * @param {{mesa: string, items: Array, subtotal: number, iva: number, total: number}} pedido
 */
export async function guardarPedidoConReintentos(pedido) {
  const nodo = new GuardarPedidoNode();
  const shared = { pedido };
  await nodo.run(shared);
  return shared.resultado;
}
