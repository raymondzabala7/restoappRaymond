// ordenesPage.js
// Controlador de la vista "Pedidos": lista los pedidos guardados en Firebase
// y permite marcarlos como entregados o eliminarlos. Protegida por sesión,
// igual que admin.html.

import { requerirSesion, estaAutenticado, cerrarSesion } from "./auth.js";
import { obtenerPedidos, actualizarEstadoPedido, eliminarPedido } from "./pedidosApi.js";
import { formatearMoneda } from "./pedidos.js";

requerirSesion("login.html");

if (!estaAutenticado()) {
  throw new Error("Sesión no activa: redirigiendo a login.");
}

const el = {
  lista: document.getElementById("listaPedidos"),
  logout: document.getElementById("btnLogout"),
  btnRefrescar: document.getElementById("btnRefrescar"),
};

function formatearFecha(iso) {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

function renderTarjetaPedido(pedido) {
  const tarjeta = document.createElement("div");
  tarjeta.className = "tarjeta-pedido";

  const items = (pedido.items || [])
    .map((item) => `<li>${item.cantidad} × ${item.name} — ${formatearMoneda(item.cantidad * item.precioUnitario)}</li>`)
    .join("");

  tarjeta.innerHTML = `
    <header>
      <span>${pedido.mesa || "Sin mesa"} · ${formatearFecha(pedido.creadoEn)}</span>
      <span class="badge ${pedido.estado === "entregado" ? "entregado" : "pendiente"}">${pedido.estado || "pendiente"}</span>
    </header>
    <ul>${items}</ul>
    <div class="fila-total fila-total-final"><span>Total</span><span>${formatearMoneda(pedido.total || 0)}</span></div>
    <div class="item" style="flex-direction:row; gap:8px; margin-top:8px;">
      <button type="button" class="btn-mini btnEntregado" ${pedido.estado === "entregado" ? "disabled" : ""}>
        Marcar entregado
      </button>
      <button type="button" class="btn-mini eliminar btnEliminar">Eliminar</button>
    </div>
  `;

  tarjeta.querySelector(".btnEntregado").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      await actualizarEstadoPedido(pedido.id, "entregado");
      await cargarPedidos();
    } catch (err) {
      console.error("Error actualizando pedido:", err);
      e.target.disabled = false;
      alert("No se pudo actualizar el pedido.");
    }
  });

  tarjeta.querySelector(".btnEliminar").addEventListener("click", async () => {
    if (!confirm("¿Eliminar este pedido?")) return;
    try {
      await eliminarPedido(pedido.id);
      tarjeta.remove();
    } catch (err) {
      console.error("Error eliminando pedido:", err);
      alert("No se pudo eliminar el pedido.");
    }
  });

  return tarjeta;
}

async function cargarPedidos() {
  el.lista.innerHTML = '<p class="vacio">Cargando pedidos...</p>';
  try {
    const pedidos = await obtenerPedidos();
    if (pedidos.length === 0) {
      el.lista.innerHTML = '<p class="vacio">Todavía no hay pedidos registrados.</p>';
      return;
    }
    el.lista.innerHTML = "";
    pedidos.forEach((pedido) => el.lista.appendChild(renderTarjetaPedido(pedido)));
  } catch (err) {
    console.error("Error cargando pedidos:", err);
    el.lista.innerHTML = '<p class="vacio">No se pudieron cargar los pedidos.</p>';
  }
}

function manejarLogout() {
  cerrarSesion();
  window.location.href = "login.html";
}

el.logout.addEventListener("click", manejarLogout);
el.btnRefrescar.addEventListener("click", cargarPedidos);

cargarPedidos();
