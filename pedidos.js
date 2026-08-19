// js/pedidos.js
// Lógica de negocio del cálculo de pedidos, separada del DOM (Ejercicio 1 y 5).
// Antes vivía mezclada dentro de tomarTodo(), con nombres crípticos (a, b, p).
// Ahora son funciones puras: mismas entradas -> misma salida, fáciles de probar
// sin necesidad de un navegador.

export const IVA = 0.19;

/**
 * Valida los datos crudos de un pedido antes de calcular.
 * @returns {{ok: true} | {ok: false, mensaje: string}}
 */
export function validarPedido({ platoId, cantidad, precioUnitario }) {
  if (!platoId) {
    return { ok: false, mensaje: "Selecciona un plato." };
  }
  if (!(cantidad > 0)) {
    return { ok: false, mensaje: "La cantidad debe ser mayor a 0." };
  }
  if (!(precioUnitario >= 0)) {
    return { ok: false, mensaje: "El precio unitario no es válido." };
  }
  return { ok: true };
}

/**
 * Calcula subtotal, IVA y total de UNA línea (un plato x cantidad).
 * @param {{cantidad: number, precioUnitario: number}} linea
 * @returns {{subtotal: number, iva: number, total: number}}
 */
export function calcularPedido({ cantidad, precioUnitario }) {
  const subtotal = cantidad * precioUnitario;
  const iva = subtotal * IVA;
  const total = subtotal + iva;
  return { subtotal, iva, total };
}

/**
 * Valida el carrito completo antes de confirmar el pedido.
 * @param {{mesa: string, items: Array}} pedido
 */
export function validarCarrito({ mesa, items }) {
  if (!mesa || !mesa.trim()) {
    return { ok: false, mensaje: "Indica la mesa o el nombre del cliente." };
  }
  if (!items || items.length === 0) {
    return { ok: false, mensaje: "Agrega al menos un plato al pedido." };
  }
  return { ok: true };
}

/**
 * Calcula subtotal, IVA y total de un carrito con varios platos.
 * @param {Array<{cantidad: number, precioUnitario: number}>} items
 * @returns {{subtotal: number, iva: number, total: number}}
 */
export function calcularCarrito(items) {
  const subtotal = items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  const iva = subtotal * IVA;
  const total = subtotal + iva;
  return { subtotal, iva, total };
}

/**
 * Da formato de pesos colombianos (sin decimales, con separador de miles).
 */
export function formatearMoneda(valor) {
  return valor.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}
