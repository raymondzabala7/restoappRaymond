// adminPage.js
// Controlador de la vista de administración. Exige sesión activa
// (requerirSesion redirige a login.html si no la hay) antes de hacer nada más.

import { requerirSesion, estaAutenticado, cerrarSesion } from "./auth.js";
import { crearProductoConReintentos } from "./menuFlow.js";
import { obtenerMenu, actualizarPlato, eliminarPlato } from "./menu.js";
import { formatearMoneda } from "./pedidos.js";

requerirSesion("login.html");

// requerirSesion() inicia la redirección pero no detiene la ejecución del
// script por sí sola, así que cortamos aquí para no conectar listeners
// ni hacer llamadas de red en una página que ya está siendo abandonada.
if (!estaAutenticado()) {
  throw new Error("Sesión no activa: redirigiendo a login.");
}

const el = {
  nombre: document.getElementById("nombre"),
  precio: document.getElementById("precioNuevo"),
  boton: document.getElementById("btnCrear"),
  mensaje: document.getElementById("prodMsg"),
  logout: document.getElementById("btnLogout"),
  lista: document.getElementById("listaMenu"),
};

async function cargarListaMenu() {
  el.lista.innerHTML = '<p class="vacio">Cargando menú...</p>';
  try {
    const menu = await obtenerMenu();
    if (menu.length === 0) {
      el.lista.innerHTML = '<p class="vacio">Todavía no hay platos creados.</p>';
      return;
    }
    el.lista.innerHTML = "";
    menu.forEach((plato) => el.lista.appendChild(renderFilaPlato(plato)));
  } catch (err) {
    console.error("Error listando el menú:", err);
    el.lista.innerHTML = '<p class="vacio">No se pudo cargar el menú.</p>';
  }
}

function renderFilaPlato(plato) {
  const fila = document.createElement("div");
  fila.className = "fila-admin";
  fila.innerHTML = `
    <span>${plato.name}</span>
    <input type="number" min="0" step="0.01" value="${plato.price}">
    <button type="button" class="btn-mini">Guardar</button>
    <button type="button" class="btn-mini eliminar">Eliminar</button>
  `;

  const input = fila.querySelector("input");
  const [btnGuardar, btnEliminar] = fila.querySelectorAll("button");

  btnGuardar.addEventListener("click", async () => {
    const nuevoPrecio = Number(input.value);
    if (!(nuevoPrecio >= 0)) {
      el.mensaje.textContent = "Precio inválido.";
      el.mensaje.className = "mensaje error";
      return;
    }
    btnGuardar.disabled = true;
    try {
      await actualizarPlato(plato.id, { price: nuevoPrecio });
      el.mensaje.textContent = `Precio de "${plato.name}" actualizado.`;
      el.mensaje.className = "mensaje exito";
    } catch (err) {
      console.error("Error actualizando plato:", err);
      el.mensaje.textContent = "No se pudo actualizar el precio.";
      el.mensaje.className = "mensaje error";
    } finally {
      btnGuardar.disabled = false;
    }
  });

  btnEliminar.addEventListener("click", async () => {
    if (!confirm(`¿Eliminar "${plato.name}" del menú?`)) return;
    btnEliminar.disabled = true;
    try {
      await eliminarPlato(plato.id);
      fila.remove();
      el.mensaje.textContent = `"${plato.name}" eliminado del menú.`;
      el.mensaje.className = "mensaje exito";
    } catch (err) {
      console.error("Error eliminando plato:", err);
      el.mensaje.textContent = "No se pudo eliminar el plato.";
      el.mensaje.className = "mensaje error";
      btnEliminar.disabled = false;
    }
  });

  return fila;
}

async function manejarCrearProducto() {
  const nombre = el.nombre.value.trim();
  const precio = Number(el.precio.value);

  if (!nombre || !(precio > 0)) {
    el.mensaje.textContent = "Ingresa un nombre y un precio válido (> 0).";
    el.mensaje.className = "mensaje error";
    return;
  }

  el.boton.disabled = true;
  el.mensaje.textContent = "Creando (con reintentos automáticos si es necesario)...";
  el.mensaje.className = "mensaje";
  try {
    await crearProductoConReintentos({ name: nombre, price: precio });
    el.mensaje.textContent = "Producto creado correctamente.";
    el.mensaje.className = "mensaje exito";
    el.nombre.value = "";
    el.precio.value = "";
    await cargarListaMenu();
  } catch (err) {
    console.error("Error creando producto:", err);
    el.mensaje.textContent = err.message || "No se pudo crear el producto.";
    el.mensaje.className = "mensaje error";
  } finally {
    el.boton.disabled = false;
  }
}

function manejarLogout() {
  cerrarSesion();
  window.location.href = "login.html";
}

el.boton.addEventListener("click", manejarCrearProducto);
el.logout.addEventListener("click", manejarLogout);

cargarListaMenu();
