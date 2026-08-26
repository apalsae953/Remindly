/* eslint-env serviceworker */
/**
 * Service worker de "Recuerda".
 *
 * Responsabilidades:
 *  1. Cachear el esqueleto de la aplicacion para que funcione sin conexion.
 *  2. Guardar en IndexedDB los avisos pendientes que le manda la aplicacion.
 *  3. Lanzar las notificaciones en el momento adecuado usando la mejor
 *     estrategia disponible en el dispositivo:
 *       - Notification Triggers (TimestampTrigger): el sistema operativo se
 *         encarga del aviso aunque el navegador este cerrado. Es lo ideal.
 *       - Temporizadores dentro del propio service worker mientras siga vivo.
 *       - Repesca al arrancar: si un aviso vencio mientras el dispositivo
 *         estaba apagado, se muestra en cuanto la app o el worker despiertan.
 *       - Sincronizacion periodica en segundo plano (periodicSync) como red
 *         de seguridad en Android con la PWA instalada.
 *  4. Atender las acciones rapidas de la notificacion (completar y posponer).
 */

const VERSION_CACHE = 'recuerda-v1';
const RECURSOS_BASE = ['/', '/index.html', '/manifest.webmanifest', '/iconos/icono.svg'];

const NOMBRE_BD = 'recuerda-sw';
const ALMACEN_AVISOS = 'avisos';
const ALMACEN_ACCIONES = 'acciones';

// Margen en milisegundos para considerar que un aviso "acaba de vencer" y
// merece mostrarse aunque haya pasado su hora exacta.
const MARGEN_REPESCA = 12 * 60 * 60 * 1000;

// Los temporizadores internos solo cubren un horizonte corto porque el
// navegador puede detener el service worker en cualquier momento.
const HORIZONTE_TEMPORIZADORES = 10 * 60 * 1000;

const temporizadores = new Map();

/* ------------------------------------------------------------------ */
/* Acceso minimo a IndexedDB sin dependencias externas                  */
/* ------------------------------------------------------------------ */

function abrirBaseDatos() {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(NOMBRE_BD, 1);
    peticion.onupgradeneeded = () => {
      const bd = peticion.result;
      if (!bd.objectStoreNames.contains(ALMACEN_AVISOS)) {
        bd.createObjectStore(ALMACEN_AVISOS, { keyPath: 'id' });
      }
      if (!bd.objectStoreNames.contains(ALMACEN_ACCIONES)) {
        bd.createObjectStore(ALMACEN_ACCIONES, { keyPath: 'id' });
      }
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

function leerTodo(nombre) {
  return abrirBaseDatos().then(
    (bd) =>
      new Promise((resolver, rechazar) => {
        const transaccion = bd.transaction(nombre, 'readonly');
        const peticion = transaccion.objectStore(nombre).getAll();
        peticion.onsuccess = () => resolver(peticion.result || []);
        peticion.onerror = () => rechazar(peticion.error);
        transaccion.oncomplete = () => bd.close();
      })
  );
}

function escribir(nombre, operacion) {
  return abrirBaseDatos().then(
    (bd) =>
      new Promise((resolver, rechazar) => {
        const transaccion = bd.transaction(nombre, 'readwrite');
        operacion(transaccion.objectStore(nombre));
        transaccion.oncomplete = () => {
          bd.close();
          resolver(true);
        };
        transaccion.onerror = () => {
          bd.close();
          rechazar(transaccion.error);
        };
      })
  );
}

function guardarLote(nombre, elementos) {
  return escribir(nombre, (almacen) => {
    almacen.clear();
    elementos.forEach((elemento) => almacen.put(elemento));
  });
}

function anadirElemento(nombre, elemento) {
  return escribir(nombre, (almacen) => almacen.put(elemento));
}

function borrarElemento(nombre, clave) {
  return escribir(nombre, (almacen) => almacen.delete(clave));
}

/* ------------------------------------------------------------------ */
/* Ciclo de vida                                                        */
/* ------------------------------------------------------------------ */

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION_CACHE)
      .then((cache) => cache.addAll(RECURSOS_BASE))
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => n !== VERSION_CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
      await revisarAvisos();
    })()
  );
});

/**
 * Estrategia de red: primero la red para no servir codigo antiguo y, si falla,
 * lo que haya en cache. Asi la app sigue abriendose sin conexion.
 */
self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET' || !peticion.url.startsWith(self.location.origin)) return;

  evento.respondWith(
    fetch(peticion)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches
          .open(VERSION_CACHE)
          .then((cache) => cache.put(peticion, copia))
          .catch(() => null);
        return respuesta;
      })
      .catch(async () => {
        const enCache = await caches.match(peticion);
        if (enCache) return enCache;
        if (peticion.mode === 'navigate') {
          const inicio = await caches.match('/index.html');
          if (inicio) return inicio;
        }
        return new Response('Sin conexion', { status: 503, statusText: 'Sin conexion' });
      })
  );
});

/* ------------------------------------------------------------------ */
/* Mensajes desde la aplicacion                                         */
/* ------------------------------------------------------------------ */

self.addEventListener('message', (evento) => {
  const datos = evento.data || {};

  if (datos.tipo === 'SINCRONIZAR_AVISOS') {
    evento.waitUntil(sincronizarAvisos(datos.avisos || []));
  }

  if (datos.tipo === 'MOSTRAR_AHORA') {
    evento.waitUntil(mostrarNotificacion(datos.aviso, { marcarMostrado: false }));
  }

  if (datos.tipo === 'RECLAMAR_ACCIONES') {
    evento.waitUntil(enviarAccionesPendientes());
  }

  if (datos.tipo === 'SALTAR_ESPERA') {
    self.skipWaiting();
  }
});

/**
 * Guarda la lista completa de avisos futuros y reprograma todo desde cero.
 * La aplicacion siempre manda la foto completa, nunca incrementos, para que
 * el service worker no dependa de haber recibido mensajes anteriores.
 */
async function sincronizarAvisos(avisos) {
  await guardarLote(ALMACEN_AVISOS, avisos);
  await revisarAvisos();
}

/* ------------------------------------------------------------------ */
/* Programacion y disparo de notificaciones                             */
/* ------------------------------------------------------------------ */

function admiteDisparadores() {
  try {
    return 'showTrigger' in Notification.prototype && typeof TimestampTrigger !== 'undefined';
  } catch (error) {
    return false;
  }
}

/**
 * Revisa todos los avisos almacenados: muestra los vencidos, programa los
 * proximos y descarta los caducados.
 */
async function revisarAvisos() {
  let avisos = [];
  try {
    avisos = await leerTodo(ALMACEN_AVISOS);
  } catch (error) {
    return;
  }

  const ahora = Date.now();
  const vigentes = [];

  temporizadores.forEach((identificador) => clearTimeout(identificador));
  temporizadores.clear();

  for (const aviso of avisos) {
    if (!aviso || typeof aviso.momento !== 'number') continue;

    // Aviso ya vencido: se muestra como repesca si no ha pasado demasiado tiempo.
    if (aviso.momento <= ahora) {
      if (!aviso.mostrado && ahora - aviso.momento <= MARGEN_REPESCA) {
        await mostrarNotificacion(aviso, { marcarMostrado: false });
        vigentes.push({ ...aviso, mostrado: true });
      }
      continue;
    }

    vigentes.push(aviso);

    if (admiteDisparadores()) {
      await programarConDisparador(aviso);
    } else if (aviso.momento - ahora <= HORIZONTE_TEMPORIZADORES) {
      const identificador = setTimeout(() => {
        mostrarNotificacion(aviso, { marcarMostrado: true });
        temporizadores.delete(aviso.id);
      }, aviso.momento - ahora);
      temporizadores.set(aviso.id, identificador);
    }
  }

  try {
    await guardarLote(ALMACEN_AVISOS, vigentes);
  } catch (error) {
    /* si falla el guardado no bloqueamos la ejecucion */
  }
}

/**
 * Programa la notificacion en el sistema operativo. Al reprogramar hay que
 * cerrar primero la version anterior con la misma etiqueta o quedarian dos.
 */
async function programarConDisparador(aviso) {
  try {
    const previas = await self.registration.getNotifications({
      tag: aviso.id,
      includeTriggered: true
    });
    previas.forEach((notificacion) => notificacion.close());

    await self.registration.showNotification(aviso.titulo, {
      ...opcionesNotificacion(aviso),
      showTrigger: new TimestampTrigger(aviso.momento)
    });
  } catch (error) {
    /* si el navegador rechaza el disparador seguimos con el resto de estrategias */
  }
}

function opcionesNotificacion(aviso) {
  return {
    body: aviso.cuerpo || '',
    tag: aviso.id,
    icon: '/iconos/icono-192.png',
    badge: '/iconos/insignia.png',
    renotify: true,
    requireInteraction: Boolean(aviso.persistente),
    silent: Boolean(aviso.silencioso),
    vibrate: aviso.vibrar === false ? undefined : [180, 90, 180],
    timestamp: aviso.momento,
    data: {
      idAviso: aviso.id,
      idRecordatorio: aviso.idRecordatorio,
      momento: aviso.momento,
      esPrevio: Boolean(aviso.esPrevio)
    },
    actions: [
      { action: 'completar', title: 'Hecho' },
      { action: 'posponer', title: 'Posponer 10 min' }
    ]
  };
}

async function mostrarNotificacion(aviso, { marcarMostrado }) {
  if (!aviso) return;
  try {
    await self.registration.showNotification(aviso.titulo, opcionesNotificacion(aviso));
    if (marcarMostrado) {
      await anadirElemento(ALMACEN_AVISOS, { ...aviso, mostrado: true });
    }
  } catch (error) {
    /* el navegador puede denegar el permiso en cualquier momento */
  }
}

/* ------------------------------------------------------------------ */
/* Interaccion con la notificacion                                      */
/* ------------------------------------------------------------------ */

self.addEventListener('notificationclick', (evento) => {
  const notificacion = evento.notification;
  const datos = notificacion.data || {};
  notificacion.close();

  const accion = evento.action || 'abrir';

  evento.waitUntil(
    (async () => {
      if (accion === 'completar' || accion === 'posponer') {
        await registrarAccion({
          id: 'accion-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
          accion,
          idRecordatorio: datos.idRecordatorio,
          idAviso: datos.idAviso,
          creada: Date.now()
        });
        await enviarAccionesPendientes();
        return;
      }

      await abrirAplicacion(datos.idRecordatorio);
    })()
  );
});

async function registrarAccion(accion) {
  try {
    await anadirElemento(ALMACEN_ACCIONES, accion);
  } catch (error) {
    /* sin persistencia la accion se pierde, pero el recordatorio sigue visible */
  }
}

/**
 * Entrega a las pestanas abiertas las acciones realizadas desde la
 * notificacion. Si no hay ninguna abierta se quedan guardadas hasta que la
 * aplicacion vuelva a arrancar y las reclame.
 */
async function enviarAccionesPendientes() {
  let acciones = [];
  try {
    acciones = await leerTodo(ALMACEN_ACCIONES);
  } catch (error) {
    return;
  }
  if (!acciones.length) return;

  const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (!clientes.length) return;

  clientes.forEach((cliente) => {
    cliente.postMessage({ tipo: 'ACCIONES_NOTIFICACION', acciones });
  });

  await Promise.all(acciones.map((accion) => borrarElemento(ALMACEN_ACCIONES, accion.id)));
}

async function abrirAplicacion(idRecordatorio) {
  const destino = idRecordatorio ? '/?recordatorio=' + idRecordatorio : '/';
  const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  for (const cliente of clientes) {
    if ('focus' in cliente) {
      cliente.postMessage({ tipo: 'ABRIR_RECORDATORIO', idRecordatorio });
      return cliente.focus();
    }
  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(destino);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Redes de seguridad en segundo plano                                  */
/* ------------------------------------------------------------------ */

self.addEventListener('periodicsync', (evento) => {
  if (evento.tag === 'revision-recordatorios') {
    evento.waitUntil(revisarAvisos());
  }
});

self.addEventListener('sync', (evento) => {
  if (evento.tag === 'revision-recordatorios') {
    evento.waitUntil(revisarAvisos());
  }
});

// Si algun dia se conecta un servidor de push, este bloque ya deja el aviso listo.
self.addEventListener('push', (evento) => {
  let carga = { titulo: 'Recordatorio', cuerpo: '' };
  try {
    if (evento.data) carga = { ...carga, ...evento.data.json() };
  } catch (error) {
    if (evento.data) carga.cuerpo = evento.data.text();
  }
  evento.waitUntil(
    mostrarNotificacion(
      {
        id: carga.id || 'push-' + Date.now(),
        idRecordatorio: carga.idRecordatorio,
        titulo: carga.titulo,
        cuerpo: carga.cuerpo,
        momento: Date.now()
      },
      { marcarMostrado: false }
    )
  );
});
