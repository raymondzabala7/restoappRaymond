// js/firebaseConfig.js
// Configuración centralizada de la fuente de datos.
// Antes la URL estaba repetida (hardcodeada) dentro de cada función.
// Ahora vive en un único lugar: si cambia la base de datos, solo se toca este archivo.

export const FIREBASE_BASE_URL = "https://restaurante-1ab32-default-rtdb.firebaseio.com";

export const ENDPOINTS = {
  menu: `${FIREBASE_BASE_URL}/menu.json`,
  pedidos: `${FIREBASE_BASE_URL}/pedidos.json`,
};
