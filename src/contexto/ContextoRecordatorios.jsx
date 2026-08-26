/**
 * Estado global de la aplicación.
 *
 * Se resuelve con useReducer en lugar de una librería externa porque el
 * conjunto de acciones es acotado y así el proyecto no arrastra dependencias.
 * Cada cambio se persiste en localStorage de forma automática.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  AJUSTES_POR_DEFECTO,
  CLAVE_ALMACEN_AJUSTES,
  CLAVE_ALMACEN_HISTORIAL,
  CLAVE_ALMACEN_RECORDATORIOS
} from '../utilidades/constantes.js';
import {
  escribirAlmacen,
  generarId,
  leerAlmacen,
  solicitarAlmacenamientoPersistente
} from '../utilidades/almacenamiento.js';
import { crearRecordatorio, momentoEfectivo, normalizarRecordatorio } from '../utilidades/modelo.js';
import { avanzarRecordatorio, esRepetitivo } from '../utilidades/repeticion.js';
import { aFechaISO } from '../utilidades/fechas.js';

const ContextoRecordatorios = createContext(null);

/* ------------------------------------------------------------------ */
/* Estado inicial                                                      */
/* ------------------------------------------------------------------ */

function estadoInicial() {
  const guardados = leerAlmacen(CLAVE_ALMACEN_RECORDATORIOS, []);
  const recordatorios = Array.isArray(guardados)
    ? guardados.map(normalizarRecordatorio).filter(Boolean)
    : [];

  return {
    recordatorios,
    ajustes: { ...AJUSTES_POR_DEFECTO, ...leerAlmacen(CLAVE_ALMACEN_AJUSTES, {}) },
    historial: leerAlmacen(CLAVE_ALMACEN_HISTORIAL, []),
    // Instantánea del estado anterior para poder deshacer la última acción.
    deshacer: null
  };
}

/* ------------------------------------------------------------------ */
/* Reductor                                                            */
/* ------------------------------------------------------------------ */

function reductor(estado, accion) {
  switch (accion.tipo) {
    case 'CREAR': {
      const nuevo = normalizarRecordatorio(accion.recordatorio);
      return { ...estado, recordatorios: [...estado.recordatorios, nuevo], deshacer: null };
    }

    case 'ACTUALIZAR': {
      return {
        ...estado,
        recordatorios: estado.recordatorios.map((r) =>
          r.id === accion.id ? { ...r, ...accion.cambios, actualizado: Date.now() } : r
        ),
        deshacer: null
      };
    }

    case 'ELIMINAR': {
      const objetivo = estado.recordatorios.find((r) => r.id === accion.id);
      return {
        ...estado,
        recordatorios: estado.recordatorios.filter((r) => r.id !== accion.id),
        deshacer: objetivo
          ? {
              mensaje: `"${objetivo.titulo}" eliminado`,
              recordatorios: estado.recordatorios,
              historial: estado.historial
            }
          : null
      };
    }

    case 'COMPLETAR': {
      const objetivo = estado.recordatorios.find((r) => r.id === accion.id);
      if (!objetivo) return estado;

      const ahora = Date.now();
      const aTiempo = ahora <= momentoEfectivo(objetivo) + 60 * 1000;

      const registro = {
        id: generarId('hist'),
        idRecordatorio: objetivo.id,
        titulo: objetivo.titulo,
        categoria: objetivo.categoria,
        prioridad: objetivo.prioridad,
        completadoEn: ahora,
        dia: aFechaISO(new Date(ahora)),
        aTiempo
      };

      // Un recordatorio repetitivo no se "termina": salta a su próxima cita.
      const siguiente = esRepetitivo(objetivo) ? avanzarRecordatorio(objetivo, new Date(ahora)) : null;

      const actualizado = siguiente
        ? {
            ...siguiente,
            vecesCompletado: (objetivo.vecesCompletado || 0) + 1,
            racha: aTiempo ? (objetivo.racha || 0) + 1 : 0,
            actualizado: ahora
          }
        : {
            ...objetivo,
            completado: true,
            completadoEn: ahora,
            pospuestoHasta: null,
            vecesCompletado: (objetivo.vecesCompletado || 0) + 1,
            racha: aTiempo ? (objetivo.racha || 0) + 1 : 0,
            actualizado: ahora
          };

      return {
        ...estado,
        recordatorios: estado.recordatorios.map((r) => (r.id === accion.id ? actualizado : r)),
        historial: [registro, ...estado.historial].slice(0, 1000),
        deshacer: {
          mensaje: siguiente
            ? `"${objetivo.titulo}" hecho, siguiente programado`
            : `"${objetivo.titulo}" completado`,
          recordatorios: estado.recordatorios,
          historial: estado.historial
        }
      };
    }

    case 'REABRIR': {
      return {
        ...estado,
        recordatorios: estado.recordatorios.map((r) =>
          r.id === accion.id
            ? { ...r, completado: false, completadoEn: null, actualizado: Date.now() }
            : r
        ),
        historial: estado.historial.filter((h) => h.idRecordatorio !== accion.id || !h.reciente),
        deshacer: null
      };
    }

    case 'POSPONER': {
      const destino = Date.now() + accion.minutos * 60 * 1000;
      return {
        ...estado,
        recordatorios: estado.recordatorios.map((r) =>
          r.id === accion.id
            ? { ...r, pospuestoHasta: destino, completado: false, actualizado: Date.now() }
            : r
        ),
        deshacer: null
      };
    }

    case 'SALTAR': {
      const objetivo = estado.recordatorios.find((r) => r.id === accion.id);
      if (!objetivo || !esRepetitivo(objetivo)) return estado;
      const siguiente = avanzarRecordatorio(objetivo, new Date());
      if (!siguiente) return estado;

      return {
        ...estado,
        recordatorios: estado.recordatorios.map((r) =>
          r.id === accion.id ? { ...siguiente, racha: 0, actualizado: Date.now() } : r
        ),
        deshacer: {
          mensaje: `Ocurrencia de "${objetivo.titulo}" saltada`,
          recordatorios: estado.recordatorios,
          historial: estado.historial
        }
      };
    }

    case 'ALTERNAR_SUBTAREA': {
      return {
        ...estado,
        recordatorios: estado.recordatorios.map((r) => {
          if (r.id !== accion.id) return r;
          return {
            ...r,
            subtareas: r.subtareas.map((s) =>
              s.id === accion.idSubtarea ? { ...s, hecha: !s.hecha } : s
            ),
            actualizado: Date.now()
          };
        }),
        deshacer: null
      };
    }

    case 'ALTERNAR_CAMPO': {
      return {
        ...estado,
        recordatorios: estado.recordatorios.map((r) =>
          r.id === accion.id ? { ...r, [accion.campo]: !r[accion.campo], actualizado: Date.now() } : r
        ),
        deshacer: null
      };
    }

    case 'LIMPIAR_COMPLETADOS': {
      const restantes = estado.recordatorios.filter((r) => !r.completado);
      if (restantes.length === estado.recordatorios.length) return estado;
      return {
        ...estado,
        recordatorios: restantes,
        deshacer: {
          mensaje: 'Completados eliminados',
          recordatorios: estado.recordatorios,
          historial: estado.historial
        }
      };
    }

    case 'ACTUALIZAR_AJUSTES': {
      return { ...estado, ajustes: { ...estado.ajustes, ...accion.cambios } };
    }

    case 'IMPORTAR': {
      const importados = Array.isArray(accion.datos?.recordatorios)
        ? accion.datos.recordatorios.map(normalizarRecordatorio).filter(Boolean)
        : [];

      // Se fusiona por identificador: lo importado sustituye a lo existente.
      const mapa = new Map(estado.recordatorios.map((r) => [r.id, r]));
      importados.forEach((r) => mapa.set(r.id, r));

      return {
        ...estado,
        recordatorios: [...mapa.values()],
        ajustes: { ...estado.ajustes, ...(accion.datos?.ajustes || {}) },
        historial: Array.isArray(accion.datos?.historial)
          ? accion.datos.historial
          : estado.historial,
        deshacer: {
          mensaje: 'Datos importados',
          recordatorios: estado.recordatorios,
          historial: estado.historial
        }
      };
    }

    case 'DESHACER': {
      if (!estado.deshacer) return estado;
      return {
        ...estado,
        recordatorios: estado.deshacer.recordatorios,
        historial: estado.deshacer.historial,
        deshacer: null
      };
    }

    case 'DESCARTAR_DESHACER':
      return { ...estado, deshacer: null };

    case 'BORRAR_TODO':
      return { ...estado, recordatorios: [], historial: [], deshacer: null };

    default:
      return estado;
  }
}

/* ------------------------------------------------------------------ */
/* Proveedor                                                           */
/* ------------------------------------------------------------------ */

export function ProveedorRecordatorios({ children }) {
  const [estado, despachar] = useReducer(reductor, undefined, estadoInicial);
  const primeraCarga = useRef(true);

  // Persistencia automática de cada porción del estado.
  useEffect(() => {
    escribirAlmacen(CLAVE_ALMACEN_RECORDATORIOS, estado.recordatorios);
  }, [estado.recordatorios]);

  useEffect(() => {
    escribirAlmacen(CLAVE_ALMACEN_AJUSTES, estado.ajustes);
  }, [estado.ajustes]);

  useEffect(() => {
    escribirAlmacen(CLAVE_ALMACEN_HISTORIAL, estado.historial);
  }, [estado.historial]);

  // Se pide almacenamiento persistente una única vez al arrancar.
  useEffect(() => {
    if (!primeraCarga.current) return;
    primeraCarga.current = false;
    solicitarAlmacenamientoPersistente();
  }, []);

  const acciones = useMemo(
    () => ({
      crear: (parcial) =>
        despachar({
          tipo: 'CREAR',
          recordatorio: crearRecordatorio(parcial, estado.ajustes)
        }),
      actualizar: (id, cambios) => despachar({ tipo: 'ACTUALIZAR', id, cambios }),
      eliminar: (id) => despachar({ tipo: 'ELIMINAR', id }),
      completar: (id) => despachar({ tipo: 'COMPLETAR', id }),
      reabrir: (id) => despachar({ tipo: 'REABRIR', id }),
      posponer: (id, minutos) => despachar({ tipo: 'POSPONER', id, minutos }),
      saltar: (id) => despachar({ tipo: 'SALTAR', id }),
      alternarSubtarea: (id, idSubtarea) =>
        despachar({ tipo: 'ALTERNAR_SUBTAREA', id, idSubtarea }),
      alternarCampo: (id, campo) => despachar({ tipo: 'ALTERNAR_CAMPO', id, campo }),
      limpiarCompletados: () => despachar({ tipo: 'LIMPIAR_COMPLETADOS' }),
      actualizarAjustes: (cambios) => despachar({ tipo: 'ACTUALIZAR_AJUSTES', cambios }),
      importar: (datos) => despachar({ tipo: 'IMPORTAR', datos }),
      deshacer: () => despachar({ tipo: 'DESHACER' }),
      descartarDeshacer: () => despachar({ tipo: 'DESCARTAR_DESHACER' }),
      borrarTodo: () => despachar({ tipo: 'BORRAR_TODO' })
    }),
    [estado.ajustes]
  );

  /**
   * Aplica las acciones que el usuario ha pulsado directamente en la
   * notificación del sistema (botones "Hecho" y "Posponer").
   */
  const aplicarAccionesNotificacion = useCallback(
    (lista) => {
      lista.forEach(({ accion, idRecordatorio }) => {
        if (!idRecordatorio) return;
        if (accion === 'completar') despachar({ tipo: 'COMPLETAR', id: idRecordatorio });
        if (accion === 'posponer') {
          despachar({
            tipo: 'POSPONER',
            id: idRecordatorio,
            minutos: estado.ajustes.minutosPosponerRapido || 10
          });
        }
      });
    },
    [estado.ajustes.minutosPosponerRapido]
  );

  const valor = useMemo(
    () => ({ ...estado, acciones, aplicarAccionesNotificacion }),
    [estado, acciones, aplicarAccionesNotificacion]
  );

  return <ContextoRecordatorios.Provider value={valor}>{children}</ContextoRecordatorios.Provider>;
}

export function useRecordatorios() {
  const contexto = useContext(ContextoRecordatorios);
  if (!contexto) {
    throw new Error('useRecordatorios debe usarse dentro de ProveedorRecordatorios');
  }
  return contexto;
}
