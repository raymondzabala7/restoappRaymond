// loginPage.js
// Controlador de la vista de login. Delega toda la lógica de credenciales
// a auth.js; aquí solo se lee el formulario y se redirige.

import { iniciarSesion, estaAutenticado } from "./auth.js";

const el = {
  usuario: document.getElementById("usuario"),
  contrasena: document.getElementById("contrasena"),
  boton: document.getElementById("btnLogin"),
  mensaje: document.getElementById("authMsg"),
};

if (estaAutenticado()) {
  window.location.href = "admin.html";
}

function manejarLogin() {
  const ok = iniciarSesion(el.usuario.value, el.contrasena.value);
  if (ok) {
    window.location.href = "admin.html";
  } else {
    el.mensaje.textContent = "Credenciales inválidas.";
    el.mensaje.className = "mensaje error";
  }
}

el.boton.addEventListener("click", manejarLogin);
el.contrasena.addEventListener("keydown", (e) => {
  if (e.key === "Enter") manejarLogin();
});
