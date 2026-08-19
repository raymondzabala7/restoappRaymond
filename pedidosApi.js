// pedidosApi.js
// Responsabilidad única: persistir y consultar pedidos en Firebase.
// Igual que menu.js, no toca el DOM.

import { ENDPOINTS } from "./firebaseConfig.js";

/**
 * Guarda un pedido nuevo en Firebase.
 * @param {{mesa: string, items: Array, subtotal: number, iva: number, total: number}} pedido
 */
export async function guardarPedido(pedido) {
  const cuerpo = {
    ...pedido,
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
  };
  const res = await fetch(ENDPOINTS.pedidos, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!res.ok) {
    throw new Error("No se pudo guardar el pedido");
  }
  return res.json();
}

/**
 * Obtiene todos los pedidos guardados, más recientes primero.
 * @returns {Promise<Array<{id:string, mesa:string, items:Array, total:number, estado:string, creadoEn:string}>>}
 */
export async function obtenerPedidos() {
  const res = await fetch(ENDPOINTS.pedidos);
  if (!res.ok) {
    throw new Error("No se pudieron obtener los pedidos");
  }
  const data = await res.json();
  if (!data || typeof data !== "object") return [];

  return Object.entries(data)
    .map(([id, pedido]) => ({ id, ...pedido }))
    .sort((a, b) => (b.creadoEn || "").localeCompare(a.creadoEn || ""));
}

/**
 * Cambia el estado de un pedido (ej. "pendiente" -> "entregado").
 */
export async function actualizarEstadoPedido(id, estado) {
  const url = `${ENDPOINTS.pedidos.replace(".json", "")}/${id}.json`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
  if (!res.ok) {
    throw new Error("No se pudo actualizar el estado del pedido");
  }
  return res.json();
}

/**
 * Elimina un pedido (ej. si se registró por error).
 */
export async function eliminarPedido(id) {
  const url = `${ENDPOINTS.pedidos.replace(".json", "")}/${id}.json`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    throw new Error("No se pudo eliminar el pedido");
  }
  return res.json();
}
