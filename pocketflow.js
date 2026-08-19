// pocketflow.js
// Port minimalista de PocketFlow (https://github.com/The-Pocket/PocketFlow) a JS vanilla,
// sin dependencias, pensado para correr en el navegador.
//
// La idea central: un flujo es un grafo de Nodos. Cada Nodo tiene 3 fases:
//   prep(shared)          -> lee del estado compartido y prepara los datos de entrada
//   exec(prepRes)          -> hace el trabajo real (puede fallar; aquí van los reintentos)
//   post(shared, prep, exec) -> guarda el resultado en el estado compartido y decide
//                               qué "acción" tomar para elegir el siguiente nodo
//
// Se usa en este proyecto (ver menuFlow.js) para dar reintentos automáticos y un
// fallback a caché local cuando falla la conexión con Firebase.

/** Nodo base sin reintentos: útil para pasos de lógica pura (no I/O). */
export class BaseNode {
  constructor() {
    this.params = {};
    this.successors = {};
  }

  setParams(params) {
    this.params = params;
    return this;
  }

  /** Conecta este nodo con el siguiente. `action` permite ramificar el flujo. */
  next(node, action = "default") {
    if (this.successors[action]) {
      console.warn(`PocketFlow: sobrescribiendo la sucesión para la acción '${action}'`);
    }
    this.successors[action] = node;
    return node;
  }

  async prep(_shared) {
    return undefined;
  }

  async exec(_prepRes) {
    return undefined;
  }

  async post(_shared, _prepRes, _execRes) {
    return undefined;
  }

  async _exec(prepRes) {
    return this.exec(prepRes);
  }

  async _run(shared) {
    const prepRes = await this.prep(shared);
    const execRes = await this._exec(prepRes);
    return this.post(shared, prepRes, execRes);
  }

  /** Ejecuta solo este nodo (sin recorrer sucesores). Para eso se usa Flow. */
  async run(shared) {
    if (Object.keys(this.successors).length > 0) {
      console.warn("PocketFlow: este nodo tiene sucesores pero se ejecutó solo. Usa Flow para recorrerlos.");
    }
    return this._run(shared);
  }
}

/**
 * Nodo con reintentos automáticos y fallback: la pieza clave para "mejoras por si falla".
 * Si `exec` lanza una excepción, se reintenta hasta `maxRetries` veces (con espera
 * `wait` segundos entre intentos). Si todos fallan, se llama a `execFallback`.
 */
export class Node extends BaseNode {
  constructor(maxRetries = 1, wait = 0) {
    super();
    this.maxRetries = maxRetries;
    this.wait = wait;
    this.curRetry = 0;
  }

  /** Se llama solo si todos los reintentos de exec() fallaron. Por defecto, relanza el error. */
  async execFallback(_prepRes, exc) {
    throw exc;
  }

  async _exec(prepRes) {
    for (this.curRetry = 0; this.curRetry < this.maxRetries; this.curRetry++) {
      try {
        return await this.exec(prepRes);
      } catch (exc) {
        if (this.curRetry === this.maxRetries - 1) {
          return await this.execFallback(prepRes, exc);
        }
        if (this.wait > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.wait * 1000));
        }
      }
    }
    return undefined;
  }
}

/** Un Flow es a su vez un nodo: orquesta el recorrido del grafo desde un nodo inicial. */
export class Flow extends BaseNode {
  constructor(start) {
    super();
    this.start = start;
  }

  getNextNode(current, action) {
    const next = current.successors[action || "default"];
    if (!next && Object.keys(current.successors).length > 0) {
      console.warn(`PocketFlow: el flujo terminó, no hay sucesor para la acción '${action}'`);
    }
    return next;
  }

  async _orchestrate(shared) {
    let current = this.start;
    let lastAction = null;
    while (current) {
      current.setParams(this.params);
      lastAction = await current._run(shared);
      current = this.getNextNode(current, lastAction);
    }
    return lastAction;
  }

  async _run(shared) {
    const prepRes = await this.prep(shared);
    const orchRes = await this._orchestrate(shared);
    return this.post(shared, prepRes, orchRes);
  }

  async exec(_prepRes) {
    throw new Error("PocketFlow: un Flow no implementa exec() directamente, usa run().");
  }
}
