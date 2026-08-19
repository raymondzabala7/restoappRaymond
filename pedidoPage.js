// pedidoPage.js
// Controlador de la vista "Tomar pedido". Modelo de carrito: se pueden
// agregar varios platos antes de confirmar el pedido completo, que se
// guarda en Firebase (con reintentos automáticos vía pocketflow).

import { obtenerMenuConReintentos, guardarPedidoConReintentos } from "./menuFlow.js";
import { validarPedido, validarCarrito, calcularCarrito, formatearMoneda } from "./pedidos.js";

let menuActual = [];
let carrito = []; // [{ platoId, name, cantidad, precioUnitario }]

const el = {
  mesa: document.getElementById("mesa"),
  select: document.getElementById("plato"),
  cantidad: document.getElementById("cantidad"),
  precio: document.getElementById("precio"),
  btnAgregar: document.getElementById("btnAgregar"),
  btnConfirmar: document.getElementById("btnConfirmar"),
  listaCarrito: document.getElementById("listaCarrito"),
  totalesCarrito: document.getElementById("totalesCarrito"),
  resultado: document.getElementById("res"),
  avisoMenu: document.getElementById("avisoMenu"),
};

async function cargarMenuEnSelect() {
  el.select.innerHTML = '<option value="">--Cargando menú--</option>';
  if (el.avisoMenu) el.avisoMenu.textContent = "";
  try {
    const { menu, desdeCache } = await obtenerMenuConReintentos();
    menuActual = menu;
    el.select.innerHTML = '<option value="">--Selecciona plato--</option>';
    menuActual.forEach((plato) => {
      const opt = document.createElement("option");
      opt.value = plato.id;
      opt.textContent = `${plato.name} (${formatearMoneda(plato.price)})`;
      el.select.appendChild(opt);
    });
    if (desdeCache && el.avisoMenu) {
      el.avisoMenu.textContent =
        "No hay conexión con el servidor: mostrando el último menú guardado.";
      el.avisoMenu.className = "mensaje error";
    }
  } catch (err) {
    console.error("Error cargando menú:", err);
    el.select.innerHTML = '<option value="">--Error cargando menú--</option>';
    if (el.avisoMenu) {
      el.avisoMenu.textContent = "No se pudo cargar el menú. Verifica tu conexión.";
      el.avisoMenu.className = "mensaje error";
    }
  }
}

function autocompletarPrecio() {
  const plato = menuActual.find((p) => String(p.id) === el.select.value);
  el.precio.value = plato ? plato.price : "";
}

function renderCarrito() {
  if (carrito.length === 0) {
    el.listaCarrito.innerHTML = '<p class="vacio">Todavía no has agregado platos.</p>';
    el.totalesCarrito.innerHTML = "";
    el.btnConfirmar.disabled = true;
    return;
  }

  el.listaCarrito.innerHTML = carrito
    .map((item, idx) => {
      const subtotal = item.cantidad * item.precioUnitario;
      return `
        <div class="fila-carrito">
          <span>${item.cantidad} × ${item.name}</span>
          <span>${formatearMoneda(subtotal)}</span>
          <button type="button" class="quitar" data-idx="${idx}" aria-label="Quitar">×</button>
        </div>`;
    })
    .join("");

  const { subtotal, iva, total } = calcularCarrito(carrito);
  el.totalesCarrito.innerHTML = `
    <div class="fila-total"><span>Subtotal</span><span>${formatearMoneda(subtotal)}</span></div>
    <div class="fila-total"><span>IVA (19%)</span><span>${formatearMoneda(iva)}</span></div>
    <div class="fila-total fila-total-final"><span>Total</span><span>${formatearMoneda(total)}</span></div>
  `;

  el.btnConfirmar.disabled = false;

  el.listaCarrito.querySelectorAll(".quitar").forEach((btn) => {
    btn.addEventListener("click", () => {
      carrito.splice(Number(btn.dataset.idx), 1);
      renderCarrito();
    });
  });
}

function agregarAlCarrito() {
  const datos = {
    platoId: el.select.value,
    cantidad: Number(el.cantidad.value),
    precioUnitario: Number(el.precio.value),
  };

  const validacion = validarPedido(datos);
  if (!validacion.ok) {
    el.resultado.textContent = validacion.mensaje;
    el.resultado.classList.add("mensaje", "error");
    return;
  }

  const plato = menuActual.find((p) => String(p.id) === datos.platoId);
  carrito.push({
    platoId: datos.platoId,
    name: plato ? plato.name : datos.platoId,
    cantidad: datos.cantidad,
    precioUnitario: datos.precioUnitario,
  });

  el.resultado.textContent = "";
  el.resultado.classList.remove("error");
  el.select.value = "";
  el.cantidad.value = "";
  el.precio.value = "";
  renderCarrito();
}

async function confirmarPedido() {
  const pedido = { mesa: el.mesa.value.trim(), items: carrito };
  const validacion = validarCarrito(pedido);
  if (!validacion.ok) {
    el.resultado.textContent = validacion.mensaje;
    el.resultado.classList.add("mensaje", "error");
    return;
  }

  const { subtotal, iva, total } = calcularCarrito(carrito);

  el.btnConfirmar.disabled = true;
  el.btnConfirmar.textContent = "Guardando (con reintentos si es necesario)...";
  try {
    await guardarPedidoConReintentos({ mesa: pedido.mesa, items: carrito, subtotal, iva, total });

    el.resultado.classList.remove("error");
    const detalle = carrito.map((item) => `${item.cantidad} × ${item.name}`).join("\n");
    el.resultado.textContent =
      `Pedido guardado — Mesa/Cliente: ${pedido.mesa}\n` +
      `${detalle}\n` +
      `Subtotal: ${formatearMoneda(subtotal)}\n` +
      `IVA (19%): ${formatearMoneda(iva)}\n` +
      `Total: ${formatearMoneda(total)}`;

    carrito = [];
    el.mesa.value = "";
    renderCarrito();
  } catch (err) {
    console.error("Error guardando pedido:", err);
    el.resultado.textContent = err.message || "No se pudo guardar el pedido.";
    el.resultado.classList.add("mensaje", "error");
  } finally {
    el.btnConfirmar.disabled = carrito.length === 0;
    el.btnConfirmar.textContent = "Confirmar pedido";
  }
}

el.select.addEventListener("change", autocompletarPrecio);
el.btnAgregar.addEventListener("click", agregarAlCarrito);
el.btnConfirmar.addEventListener("click", confirmarPedido);

renderCarrito();
cargarMenuEnSelect();
