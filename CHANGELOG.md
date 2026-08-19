# CHANGELOG — Refactor RestoApp (legacy → MPA)

## Ampliación — Plataforma completa (platos, precios, pedidos, gestión)
A partir de la MPA con PocketFlow, se completó la plataforma para que sea
usable de verdad, no solo una demo de una pantalla:

- **Menú semilla real**: `menu.js` trae `MENU_SEMILLA`, 8 platos típicos
  santandereanos con precio en COP (mute, cabrito, arepa santandereana,
  carne oreada, etc.). Si Firebase responde con el menú vacío (primera vez
  que se usa la app), `menuFlow.js` lo detecta y llama a
  `sembrarMenuInicial()` automáticamente antes de mostrarlo — la plataforma
  nunca se ve vacía en una primera prueba.
- **Carrito de varios platos por pedido**: `pedido.html`/`pedidoPage.js` ya
  no procesan un solo plato a la vez. Ahora se agregan varios platos a un
  carrito (con opción de quitar cada uno), se pide "Mesa / Cliente", y se
  confirma el pedido completo con subtotal/IVA/total.
- **Pedidos persistidos en Firebase**: `pedidosApi.js` guarda cada pedido
  confirmado en `/pedidos` (con estado "pendiente" y fecha), en vez de solo
  mostrarlo en pantalla y perderlo. Usa `guardarPedidoConReintentos()` en
  `menuFlow.js` (mismo patrón de reintentos de PocketFlow).
- **Gestión completa del menú (admin)**: `admin.html`/`adminPage.js` ahora
  además de crear productos, lista todos los platos actuales con opción de
  editar el precio o eliminarlos (`actualizarPlato`/`eliminarPlato` en
  `menu.js`, usando PATCH/DELETE contra Firebase).
- **Nueva página `ordenes.html`**: lista todos los pedidos recibidos
  (protegida por sesión, igual que `admin.html`), con badge de estado
  (pendiente/entregado), botón para marcar como entregado y para eliminar.
- **Precios en pesos colombianos**: `formatearMoneda()` en `pedidos.js`
  ahora usa `Intl.NumberFormat` (`es-CO`, `COP`, sin decimales) en vez del
  formato genérico `$X.XX`.
- Navegación actualizada en las 5 páginas: Inicio · Pedido · Productos · Pedidos.
- Probado sin red real (el sandbox de desarrollo no tiene salida a
  Firebase): `calcularCarrito`, `validarCarrito`, `validarPedido`,
  `normalizarMenu` y `MENU_SEMILLA` se probaron con `node` de forma
  aislada — los 12 casos pasan. Las llamadas reales a Firebase (crear,
  listar, sembrar) no se pudieron probar en este entorno y deben
  verificarse en el navegador.

## Ejercicio extra — PocketFlow (resiliencia ante fallos de red)
Se integró un port en JS vanilla de [PocketFlow](https://github.com/The-Pocket/PocketFlow)
(framework minimalista de nodos con `prep → exec → post`, reintentos y fallback)
para las dos operaciones que dependen de Firebase y por lo tanto pueden fallar:

- `pocketflow.js` — el motor (`Node`, `BaseNode`, `Flow`), sin dependencias.
- `menuFlow.js` — los flujos concretos de RestoApp:
  - `obtenerMenuConReintentos()`: 3 intentos contra Firebase (1s de espera entre
    cada uno); si todos fallan, cae a la última copia del menú guardada en
    `localStorage`. Si tampoco hay caché, propaga el error.
  - `crearProductoConReintentos()`: 2 intentos antes de rendirse, con un
    mensaje de error más claro para el usuario.
- `pedidoPage.js` ahora muestra un aviso visible si el menú que se ve viene
  de la caché local (sin conexión) en vez de fallar en silencio.
- `menu.js` se dividió en `fetchMenuRaw()` (solo la llamada de red, la parte
  que puede fallar) y `normalizarMenu()` (lógica pura, sin reintentos
  necesarios), para que el nodo de PocketFlow reintente solo lo que
  realmente puede fallar.
- Probado con `test-pocketflow.mjs` (no incluido en la entrega final):
  reintentos hasta éxito, fallback tras agotar reintentos, y encadenado
  de nodos en un `Flow` — los tres casos pasan.

La primera entrega usaba `css/`, `js/` y `pages/`. Al descargar los archivos
sueltos desde el chat, esa jerarquía se perdía y los enlaces relativos
(`../css/styles.css`, `pages/pedido.html`, etc.) apuntaban a rutas que no
existían: por eso el CSS no cargaba y el botón "Inicio" daba error.
Se movieron todos los archivos a un único nivel (sin carpetas) y se
ajustaron los `href`/`src` para que sean nombres simples (`styles.css`,
`pedido.html`, `menu.js`...). Descarga el proyecto como `.zip` para
mantener esta estructura intacta.

Refactor realizado siguiendo los ejercicios del `README` del taller.
Base de datos actualizada a: `https://restaurante-1ab32-default-rtdb.firebaseio.com/`

## Ejercicio 1 — Convertir a MPA
- Se separó el único `index.html` monolítico en:
  - `index.html` — landing con navegación.
  - `pages/pedido.html` — vista del mesero (antes era todo el body de `index.html`).
  - `pages/login.html` — formulario de acceso, ahora en su propia página en vez de un `<div>` oculto.
  - `pages/admin.html` — creación de productos, protegida por sesión.
- Un único `css/styles.css` compartido por las cuatro páginas.

## Ejercicio 2 — Modularizar JavaScript
- `js/firebaseConfig.js` — URL de la base de datos en un solo lugar (antes estaba repetida como string literal en dos funciones).
- `js/menu.js` — obtener/crear platos (fetch a Firebase), sin tocar el DOM.
- `js/pedidos.js` — cálculo de subtotal/IVA/total y validación, funciones puras.
- `js/auth.js` — estado de sesión con `sessionStorage` en vez de la variable global `isLogged`.
- `js/pedidoPage.js`, `js/loginPage.js`, `js/adminPage.js` — controladores DOM, uno por página, cada uno importando solo lo que necesita.
- Todo usa ES Modules (`type="module"` + `import`/`export`); no quedan variables en `window`.

## Ejercicio 3 — Autenticación y seguridad
- Las credenciales siguen hardcodeadas en el cliente **a propósito**, con un comentario `TODO` explícito en `js/auth.js` para que el estudiante lo identifique y lo resuelva con Firebase Auth o un backend mínimo + reglas de seguridad en Realtime Database.
- El estado de sesión pasó de una variable global en memoria (`isLogged`, se perdía en cada recarga) a `sessionStorage`, y las páginas restringidas (`admin.html`) verifican la sesión al cargar (`requerirSesion`) en vez de solo esconder un `<div>` con CSS.
- Sigue pendiente (a propósito, para el ejercicio): reglas de escritura en Firebase que exijan autenticación real antes de aceptar un `POST` a `/menu.json`.

## Ejercicio 4 — Limpieza y pruebas
- Se eliminó `funcionObsoletaCalculoAnterior` (código muerto, nunca se llamaba).
- Se eliminó `.clase_redundante_que_no_se_usa` del CSS.
- Nombres de variables crípticos (`a`, `b`, `p`) reemplazados por nombres descriptivos (`platoId`, `cantidad`, `precioUnitario`).
- Validaciones más claras con mensajes específicos por campo, en vez de un único `alert("Error en datos")`.

## Ejercicio 5 — Buenas prácticas
- Lógica de negocio (`pedidos.js`, `menu.js`) separada de la manipulación del DOM (`*Page.js`).
- Manejo de errores con `try/catch` y feedback visible al usuario en vez de solo `console.error`.
- Botones se deshabilitan durante peticiones de red (`admin.html`) para evitar doble envío.

## Pendiente para los estudiantes (marcado con TODO en el código)
- Reemplazar la autenticación de cliente por Firebase Auth o backend propio.
- Añadir reglas de seguridad en Firebase Realtime Database.
- Agregar pruebas (manuales o automatizadas) para `pedidos.js`, que al ser funciones puras son las más fáciles de testear primero.
