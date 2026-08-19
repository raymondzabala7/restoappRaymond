// js/menu.js
// Responsabilidad única: obtener y normalizar el menú desde Firebase.
// No manipula el DOM directamente (Ejercicio 5: separar lógica de negocio de la manipulación del DOM).
// El módulo que llama decide qué hacer con los datos (ej. pintar un <select>).

import { ENDPOINTS } from "./firebaseConfig.js";

/**
 * Normaliza la respuesta de Firebase (puede venir como array o como objeto)
 * a una lista uniforme de platos: [{ id, name, price }, ...]
 * Exportada (antes era privada) para que pocketflow pueda usarla como paso
 * independiente del flujo (lógica pura, sin red, no necesita reintentos).
 */
export function normalizarMenu(data) {
  const items = [];

  if (Array.isArray(data)) {
    data.forEach((item, idx) => {
      if (!item) return;
      const id = item.id ?? idx;
      items.push(construirItem(id, item));
    });
  } else if (data && typeof data === "object") {
    Object.entries(data).forEach(([key, item]) => {
      items.push(construirItem(key, item || {}));
    });
  }

  return items;
}

function construirItem(id, item) {
  return {
    id,
    name: item.name || `Plato ${id}`,
    price: Number(item.price ?? item.precio ?? 0),
  };
}

/**
 * Hace únicamente la llamada de red a Firebase y devuelve el JSON crudo,
 * sin normalizar. Separada de obtenerMenu() para que un Node de pocketflow.js
 * pueda reintentar solo este paso (el que realmente puede fallar por red),
 * sin repetir la normalización en cada intento.
 */
export async function fetchMenuRaw() {
  const res = await fetch(ENDPOINTS.menu);
  if (!res.ok) {
    throw new Error("No se pudo obtener el menú (respuesta no OK)");
  }
  return res.json();
}

/**
 * Obtiene el menú actual desde Firebase Realtime Database.
 * Uso simple, sin reintentos. Para reintentos + fallback a caché local,
 * usa obtenerMenuConReintentos() en menuFlow.js.
 * @returns {Promise<Array<{id:string, name:string, price:number}>>}
 */
export async function obtenerMenu() {
  const data = await fetchMenuRaw();
  return normalizarMenu(data);
}

/**
 * Crea un plato nuevo en Firebase.
 * @param {{name: string, price: number}} plato
 */
export async function crearPlato(plato) {
  const res = await fetch(ENDPOINTS.menu, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plato),
  });
  if (!res.ok) {
    throw new Error("No se pudo crear el plato");
  }
  return res.json();
}

/**
 * Actualiza un plato existente (nombre y/o precio).
 * @param {string} id - clave del plato en Firebase
 * @param {{name?: string, price?: number}} cambios
 */
export async function actualizarPlato(id, cambios) {
  const url = `${ENDPOINTS.menu.replace(".json", "")}/${id}.json`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios),
  });
  if (!res.ok) {
    throw new Error("No se pudo actualizar el plato");
  }
  return res.json();
}

/**
 * Elimina un plato del menú.
 * @param {string} id - clave del plato en Firebase
 */
export async function eliminarPlato(id) {
  const url = `${ENDPOINTS.menu.replace(".json", "")}/${id}.json`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    throw new Error("No se pudo eliminar el plato");
  }
  return res.json();
}

/**
 * Menú semilla: platos típicos santandereanos con precios de referencia
 * (COP). Se usa solo la primera vez que se abre la app, si Firebase todavía
 * no tiene ningún plato guardado (ver sembrarMenuInicial más abajo), para
 * que la plataforma nunca se vea vacía en una primera prueba.
 */
export const MENU_SEMILLA = [
  { name: "Mute santandereano", price: 18000 },
  { name: "Cabrito al horno con pepitoria", price: 34000 },
  { name: "Arepa santandereana con queso", price: 6000 },
  { name: "Carne oreada con yuca", price: 30000 },
  { name: "Hormigas culonas (porción)", price: 12000 },
  { name: "Pepitoria", price: 15000 },
  { name: "Bocadillo veleño con queso", price: 8000 },
  { name: "Limonada de coco", price: 9000 },
];

/**
 * Si el menú en Firebase está vacío (primera vez que se usa la app), lo
 * llena de una sola vez con MENU_SEMILLA usando PUT (una sola petición,
 * en vez de un POST por plato). Si ya hay platos guardados, esta función
 * no debería llamarse (ver menuFlow.js, que solo la invoca cuando el
 * menú viene vacío).
 */
export async function sembrarMenuInicial() {
  const objetoMenu = {};
  MENU_SEMILLA.forEach((plato, idx) => {
    const clave = `semilla_${idx}_${plato.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    objetoMenu[clave] = plato;
  });

  const res = await fetch(ENDPOINTS.menu, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(objetoMenu),
  });
  if (!res.ok) {
    throw new Error("No se pudo inicializar el menú semilla");
  }
  return res.json();
}
