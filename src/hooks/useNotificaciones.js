/**
 * Gestión completa de los avisos del sistema.
 *
 * Este hook hace de puente entre el estado de la aplicación y el service
 * worker: calcula qué avisos hay pendientes, se los manda al worker para que
 * los programe y, mientras la aplicación está abierta, dispara él mismo los
 * que van venciendo. También detecta qué capacidades ofrece el dispositivo
 * para poder explicárselo al usuario en la pantalla de ajustes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ocurrenciasEntre, esRepetitivo } from '../utilidades/repeticion.js';
import { dentroDeNoMolestar, formatearHora, textoRelativo } from '../utilidades/fechas.js';
import { obtenerCategoria } from '../utilidades/constantes.js';

// Ventana de tiempo para la que se preparan avisos por adelantado.
const HORIZONTE_DIAS = 30;

// Tope de avisos entregados al sistema operativo, para no saturarlo.
const MAXIMO_AVISOS = 150;

// Cada cuánto revisa la aplicación abierta si hay algún aviso que disparar.
const INTERVALO_REVISION = 20 * 1000;

/* ------------------------------------------------------------------ */
/* Detección de capacidades                                            */
/* ------------------------------------------------------------------ */

export function detectarCapacidades() {
  const hayNotificaciones = typeof window !== 'undefined' && 'Notification' in window;
  const hayServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

  let hayDisparadores = false;
  try {
    hayDisparadores = hayNotificaciones && 'showTrigger' in Notification.prototype;
  } catch (error) {
    hayDisparadores = false;
  }

  const esStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true);

  const agente = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const esIOS = /iPad|iPhone|iPod/.test(agente) || (agente.includes('Mac') && 'ontouchend' in document);

  return {
    hayNotificaciones,
    hayServiceWorker,
    hayDisparadores,
    haySyncPeriodica: hayServiceWorker && 'periodicSync' in (window.ServiceWorkerRegistration?.prototype || {}),
    hayVibracion: typeof navigator !== 'undefined' && 'vibrate' in navigator,
    esStandalone,
    esIOS,
    permiso: hayNotificaciones ? Notification.permission : 'unsupported'
  };
}

/* ------------------------------------------------------------------ */
/* Cálculo de los avisos pendientes                                    */
/* ------------------------------------------------------------------ */

function textoCuerpo(recordatorio, momento, minutosAntes) {
  const categoria = obtenerCategoria(recordatorio.categoria);
  const partes = [];

  if (minutosAntes > 0) {
    partes.push(`Empieza ${textoRelativo(momento)} (${formatearHora(momento)})`);
  } else if (!recordatorio.todoElDia) {
    partes.push(`Ahora, a las ${formatearHora(momento)}`);
  } else {
    partes.push('Hoy');
  }

  if (recordatorio.notas) partes.push(recordatorio.notas.slice(0, 120));
  else partes.push(categoria.nombre);

  return partes.join(' · ');
}

/**
 * Recorre los recordatorios activos y devuelve la lista ordenada de avisos que
 * hay que programar, incluyendo los avisos previos de cada ocurrencia.
 */
export function calcularAvisos(recordatorios, ajustes) {
  const ahora = Date.now();
  const horizonte = ahora + HORIZONTE_DIAS * 24 * 60 * 60 * 1000;
  const avisos = [];

  recordatorios.forEach((recordatorio) => {
    if (recordatorio.archivado) return;
    if (recordatorio.completado && !esRepetitivo(recordatorio)) return;

    const momentos = [];

    // Una posposición manda sobre la hora original.
    if (recordatorio.pospuestoHasta && recordatorio.pospuestoHasta > ahora - 60000) {
      momentos.push({ fecha: new Date(recordatorio.pospuestoHasta), esPosposicion: true });
    } else {
      ocurrenciasEntre(recordatorio, new Date(ahora - 60000), new Date(horizonte), 12).forEach(
        (fecha) => momentos.push({ fecha, esPosposicion: false })
      );
    }

    const previos = recordatorio.avisosPrevios?.length ? recordatorio.avisosPrevios : [0];

    momentos.forEach(({ fecha, esPosposicion }) => {
      const listaPrevios = esPosposicion ? [0] : previos;

      listaPrevios.forEach((minutos) => {
        const instante = fecha.getTime() - Number(minutos || 0) * 60000;

        // Se descartan los que ya quedaron muy atrás y los demasiado lejanos.
        if (instante < ahora - 5 * 60000) return;
        if (instante > horizonte) return;

        const silenciado =
          Boolean(recordatorio.silencioso) ||
          (ajustes.noMolestar &&
            dentroDeNoMolestar(
              new Date(instante),
              ajustes.noMolestarDesde,
              ajustes.noMolestarHasta
            ));

        avisos.push({
          id: `${recordatorio.id}@${instante}`,
          idRecordatorio: recordatorio.id,
          titulo: recordatorio.titulo,
          cuerpo: textoCuerpo(recordatorio, fecha, Number(minutos || 0)),
          momento: instante,
          esPrevio: Number(minutos || 0) > 0,
          persistente: Boolean(recordatorio.persistente),
          silencioso: silenciado || !ajustes.sonido,
          vibrar: Boolean(ajustes.vibracion) && !silenciado
        });
      });
    });
  });

  return avisos.sort((a, b) => a.momento - b.momento).slice(0, MAXIMO_AVISOS);
}

/* ------------------------------------------------------------------ */
/* Hook principal                                                      */
/* ------------------------------------------------------------------ */

export function useNotificaciones({ recordatorios, ajustes, alDisparar, alRecibirAcciones }) {
  const [capacidades, setCapacidades] = useState(() => detectarCapacidades());
  const [registro, setRegistro] = useState(null);
  const [estadoWorker, setEstadoWorker] = useState('pendiente');

  const disparadosRef = useRef(new Set());
  const alDispararRef = useRef(alDisparar);
  const alRecibirAccionesRef = useRef(alRecibirAcciones);

  alDispararRef.current = alDisparar;
  alRecibirAccionesRef.current = alRecibirAcciones;

  const avisos = useMemo(() => calcularAvisos(recordatorios, ajustes), [recordatorios, ajustes]);

  /* ---------------- Registro del service worker ---------------- */

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setEstadoWorker('no-soportado');
      return undefined;
    }

    let cancelado = false;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async (reg) => {
        if (cancelado) return;
        setRegistro(reg);
        setEstadoWorker('activo');

        // Red de seguridad en segundo plano para Android con la app instalada.
        try {
          if ('periodicSync' in reg) {
            const permiso = await navigator.permissions?.query({
              name: 'periodic-background-sync'
            });
            if (!permiso || permiso.state === 'granted') {
              await reg.periodicSync.register('revision-recordatorios', {
                minInterval: 6 * 60 * 60 * 1000
              });
            }
          }
        } catch (error) {
          /* la sincronización periódica es opcional */
        }

        // Se reclaman las acciones que el usuario pulsó en la notificación
        // mientras la aplicación estaba cerrada.
        navigator.serviceWorker.controller?.postMessage({ tipo: 'RECLAMAR_ACCIONES' });
      })
      .catch(() => {
        if (!cancelado) setEstadoWorker('error');
      });

    const alRecibirMensaje = (evento) => {
      const datos = evento.data || {};
      if (datos.tipo === 'ACCIONES_NOTIFICACION' && Array.isArray(datos.acciones)) {
        alRecibirAccionesRef.current?.(datos.acciones);
      }
      if (datos.tipo === 'ABRIR_RECORDATORIO' && datos.idRecordatorio) {
        alDispararRef.current?.({ idRecordatorio: datos.idRecordatorio, soloAbrir: true });
      }
    };

    navigator.serviceWorker.addEventListener('message', alRecibirMensaje);

    return () => {
      cancelado = true;
      navigator.serviceWorker.removeEventListener('message', alRecibirMensaje);
    };
  }, []);

  /* ---------------- Sincronización de avisos ---------------- */

  useEffect(() => {
    if (!registro) return;
    if (capacidades.permiso !== 'granted') return;

    const destino = registro.active || navigator.serviceWorker.controller;
    if (!destino) return;

    destino.postMessage({ tipo: 'SINCRONIZAR_AVISOS', avisos });
  }, [avisos, registro, capacidades.permiso]);

  /* ---------------- Disparo con la aplicación abierta ---------------- */

  /**
   * Aunque el service worker programe los avisos, mientras la pestaña está
   * abierta se revisa cada pocos segundos: es la vía más fiable en los
   * navegadores que no soportan Notification Triggers.
   */
  useEffect(() => {
    const revisar = () => {
      const ahora = Date.now();
      avisos.forEach((aviso) => {
        if (aviso.momento > ahora) return;
        if (ahora - aviso.momento > 10 * 60 * 1000) return;
        if (disparadosRef.current.has(aviso.id)) return;

        disparadosRef.current.add(aviso.id);

        // La notificación del sistema la muestra siempre el service worker,
        // porque solo así admite botones de acción.
        const destino = registro?.active || navigator.serviceWorker?.controller;
        if (destino && capacidades.permiso === 'granted') {
          destino.postMessage({ tipo: 'MOSTRAR_AHORA', aviso });
        }

        alDispararRef.current?.(aviso);
      });

      // Se limpian los identificadores antiguos para no acumular memoria.
      if (disparadosRef.current.size > 400) disparadosRef.current.clear();
    };

    revisar();
    const identificador = setInterval(revisar, INTERVALO_REVISION);

    const alVolver = () => {
      if (document.visibilityState === 'visible') {
        revisar();
        navigator.serviceWorker?.controller?.postMessage({ tipo: 'RECLAMAR_ACCIONES' });
      }
    };
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      clearInterval(identificador);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [avisos, registro, capacidades.permiso]);

  /* ---------------- Permisos ---------------- */

  const pedirPermiso = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';
    try {
      const resultado = await Notification.requestPermission();
      setCapacidades(detectarCapacidades());
      return resultado;
    } catch (error) {
      return 'denied';
    }
  }, []);

  /** Lanza una notificación de prueba para comprobar que todo funciona. */
  const probarNotificacion = useCallback(async () => {
    if (Notification.permission !== 'granted') {
      const resultado = await pedirPermiso();
      if (resultado !== 'granted') return false;
    }

    const destino = registro?.active || navigator.serviceWorker?.controller;
    const aviso = {
      id: `prueba-${Date.now()}`,
      idRecordatorio: null,
      titulo: 'Notificación de prueba',
      cuerpo: 'Si ves este aviso, los recordatorios llegarán correctamente.',
      momento: Date.now(),
      persistente: false,
      silencioso: false,
      vibrar: Boolean(ajustes.vibracion)
    };

    if (destino) {
      destino.postMessage({ tipo: 'MOSTRAR_AHORA', aviso });
      return true;
    }

    // Sin service worker se recurre a la notificación simple del navegador.
    try {
      new Notification(aviso.titulo, { body: aviso.cuerpo });
      return true;
    } catch (error) {
      return false;
    }
  }, [registro, ajustes.vibracion, pedirPermiso]);

  const refrescarCapacidades = useCallback(() => setCapacidades(detectarCapacidades()), []);

  return {
    capacidades,
    estadoWorker,
    avisos,
    proximoAviso: avisos.find((a) => a.momento > Date.now()) || null,
    pedirPermiso,
    probarNotificacion,
    refrescarCapacidades
  };
}
