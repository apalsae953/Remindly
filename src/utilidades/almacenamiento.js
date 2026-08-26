/**
 * Persistencia local.
 *
 * Se usa localStorage por sencillez y porque el volumen de datos de una agenda
 * personal es pequeño. Todas las lecturas y escrituras van envueltas en
 * try/catch porque el navegador puede denegar el acceso (modo privado, cuota
 * llena o almacenamiento bloqueado por el usuario).
 */

export function leerAlmacen(clave, valorPorDefecto) {
  try {
    const bruto = window.localStorage.getItem(clave);
    if (bruto === null) return valorPorDefecto;
    const datos = JSON.parse(bruto);
    return datos === null || datos === undefined ? valorPorDefecto : datos;
  } catch (error) {
    console.warn(`No se ha podido leer "${clave}" del almacenamiento local.`, error);
    return valorPorDefecto;
  }
}

export function escribirAlmacen(clave, valor) {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    console.warn(`No se ha podido guardar "${clave}" en el almacenamiento local.`, error);
    return false;
  }
}

export function borrarAlmacen(clave) {
  try {
    window.localStorage.removeItem(clave);
  } catch (error) {
    /* si falla, no hay nada que hacer desde la aplicación */
  }
}

/**
 * Pide al navegador que marque el almacenamiento como persistente para que no
 * lo borre al liberar espacio. Es especialmente importante en una PWA que
 * guarda los recordatorios solo en el dispositivo.
 */
export async function solicitarAlmacenamientoPersistente() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (error) {
    return false;
  }
}

/** Identificador corto y único para recordatorios, subtareas y avisos. */
export function generarId(prefijo = 'r') {
  const aleatorio =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefijo}-${Date.now().toString(36)}-${aleatorio}`;
}
