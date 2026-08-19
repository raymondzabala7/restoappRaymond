// js/auth.js
// Encapsula el estado de autenticación (Ejercicio 2: sin variables globales sueltas).
//
// TODO (Ejercicio 3 para estudiantes):
//   Esta sigue siendo autenticación en el cliente con credenciales hardcodeadas,
//   igual que en la versión legacy. Se dejó así a propósito para que la detecten
//   y la reemplacen por una de estas dos opciones:
//     a) Firebase Authentication (recomendado, no requiere backend propio), o
//     b) Un backend mínimo que valide credenciales y devuelva un token,
//        y reglas de seguridad en Realtime Database que exijan ese token
//        para poder escribir en /menu.json.
//   Mientras tanto, NINGÚN dato sensible real debería depender de este login.

const SESSION_KEY = "restoapp_admin_session";

// Aún hardcodeadas a propósito (ver TODO arriba). No usar en producción.
const ADMIN_USER = "Raymond";
const ADMIN_PASS = "82HAHAHA";

/**
 * Intenta iniciar sesión. Si es correcto, guarda el estado en sessionStorage
 * (se pierde al cerrar la pestaña, a diferencia de una variable global en memoria
 * que además se perdía con cualquier recarga de página).
 * @returns {boolean} true si el login fue exitoso
 */
export function iniciarSesion(usuario, contrasena) {
  const valido = usuario === ADMIN_USER && contrasena === ADMIN_PASS;
  if (valido) {
    sessionStorage.setItem(SESSION_KEY, "1");
  }
  return valido;
}

export function cerrarSesion() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function estaAutenticado() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

/**
 * Protege una página: si no hay sesión, redirige a login.html.
 * Se llama al cargar páginas restringidas como admin.html.
 */
export function requerirSesion(rutaLogin = "login.html") {
  if (!estaAutenticado()) {
    window.location.href = rutaLogin;
  }
}
