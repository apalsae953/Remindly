/**
 * Definición del recordatorio: creación, normalización y consultas derivadas.
 *
 * Mantener aquí la forma del objeto evita que cada componente invente campos
 * distintos y facilita migrar datos antiguos cuando se añaden novedades.
 */

import { generarId } from './almacenamiento.js';
import { aFechaISO, combinarFechaHora, momentoDe } from './fechas.js';
import { REPETICION_VACIA, esRepetitivo, normalizarRepeticion } from './repeticion.js';
import { obtenerPrioridad } from './constantes.js';

/** Crea un recordatorio nuevo con valores razonables por defecto. */
export function crearRecordatorio(parcial = {}, ajustes = {}) {
  const ahora = Date.now();

  return {
    id: generarId('rec'),
    titulo: '',
    notas: '',
    categoria: 'personal',
    prioridad: 'media',
    fecha: aFechaISO(new Date()),
    hora: ajustes.horaPorDefecto || '09:00',
    todoElDia: false,
    duracionMinutos: 30,
    repeticion: { ...REPETICION_VACIA },
    avisosPrevios: [...(ajustes.avisosPreviosPorDefecto || [0])],
    subtareas: [],
    etiquetas: [],
    enlace: '',
    ubicacion: '',
    completado: false,
    completadoEn: null,
    pospuestoHasta: null,
    fijado: false,
    archivado: false,
    persistente: false,
    silencioso: false,
    vecesCompletado: 0,
    racha: 0,
    creado: ahora,
    actualizado: ahora,
    ...parcial
  };
}

/**
 * Rellena los campos que falten en recordatorios guardados con versiones
 * anteriores de la aplicación, para que la interfaz nunca reciba undefined.
 */
export function normalizarRecordatorio(bruto) {
  if (!bruto || typeof bruto !== 'object') return null;
  const base = crearRecordatorio();

  return {
    ...base,
    ...bruto,
    id: bruto.id || base.id,
    titulo: String(bruto.titulo || '').trim() || 'Sin título',
    repeticion: normalizarRepeticion(bruto.repeticion),
    avisosPrevios: Array.isArray(bruto.avisosPrevios) ? bruto.avisosPrevios : [0],
    subtareas: Array.isArray(bruto.subtareas) ? bruto.subtareas : [],
    etiquetas: Array.isArray(bruto.etiquetas) ? bruto.etiquetas : [],
    completado: Boolean(bruto.completado),
    archivado: Boolean(bruto.archivado)
  };
}

/* ------------------------------------------------------------------ */
/* Consultas sobre un recordatorio                                     */
/* ------------------------------------------------------------------ */

/**
 * Instante efectivo del recordatorio. Si está pospuesto manda la posposición,
 * porque es lo que el usuario espera ver en la lista.
 */
export function momentoEfectivo(recordatorio) {
  if (recordatorio.pospuestoHasta) return recordatorio.pospuestoHasta;
  return momentoDe(recordatorio);
}

export function fechaEfectiva(recordatorio) {
  return new Date(momentoEfectivo(recordatorio));
}

/** Está vencido si su momento ya pasó y sigue sin completarse. */
export function estaVencido(recordatorio, referencia = Date.now()) {
  if (recordatorio.completado || recordatorio.archivado) return false;
  return momentoEfectivo(recordatorio) < referencia;
}

/** Progreso de las subtareas, de 0 a 1. Devuelve null si no tiene ninguna. */
export function progresoSubtareas(recordatorio) {
  const total = recordatorio.subtareas?.length || 0;
  if (!total) return null;
  const hechas = recordatorio.subtareas.filter((s) => s.hecha).length;
  return { hechas, total, ratio: hechas / total };
}

/**
 * Puntuación usada para ordenar la lista de "Hoy": primero lo fijado, luego lo
 * vencido, después por cercanía en el tiempo y por prioridad.
 */
export function puntuacionUrgencia(recordatorio) {
  const momento = momentoEfectivo(recordatorio);
  const minutosRestantes = (momento - Date.now()) / 60000;
  const peso = obtenerPrioridad(recordatorio.prioridad).peso;

  let puntos = 0;
  if (recordatorio.fijado) puntos += 10000;
  if (minutosRestantes < 0) puntos += 5000 + Math.min(2000, Math.abs(minutosRestantes));
  else puntos += Math.max(0, 2000 - minutosRestantes);
  puntos += peso * 300;

  return puntos;
}

/* ------------------------------------------------------------------ */
/* Filtros y agrupaciones                                              */
/* ------------------------------------------------------------------ */

export function filtrarRecordatorios(recordatorios, filtros = {}) {
  const {
    texto = '',
    categorias = [],
    prioridades = [],
    etiquetas = [],
    soloRepetitivos = false,
    mostrarCompletados = false,
    mostrarArchivados = false
  } = filtros;

  const busqueda = texto.trim().toLowerCase();

  return recordatorios.filter((r) => {
    if (!mostrarArchivados && r.archivado) return false;
    if (!mostrarCompletados && r.completado) return false;
    if (categorias.length && !categorias.includes(r.categoria)) return false;
    if (prioridades.length && !prioridades.includes(r.prioridad)) return false;
    if (etiquetas.length && !etiquetas.some((e) => r.etiquetas.includes(e))) return false;
    if (soloRepetitivos && !esRepetitivo(r)) return false;

    if (busqueda) {
      const contenido = [
        r.titulo,
        r.notas,
        r.ubicacion,
        ...(r.etiquetas || []),
        ...(r.subtareas || []).map((s) => s.texto)
      ]
        .join(' ')
        .toLowerCase();
      if (!contenido.includes(busqueda)) return false;
    }

    return true;
  });
}

export function ordenarRecordatorios(recordatorios, criterio = 'fecha') {
  const copia = [...recordatorios];

  switch (criterio) {
    case 'prioridad':
      return copia.sort((a, b) => {
        const diferencia =
          obtenerPrioridad(b.prioridad).peso - obtenerPrioridad(a.prioridad).peso;
        return diferencia !== 0 ? diferencia : momentoEfectivo(a) - momentoEfectivo(b);
      });

    case 'categoria':
      return copia.sort((a, b) => {
        const diferencia = a.categoria.localeCompare(b.categoria, 'es');
        return diferencia !== 0 ? diferencia : momentoEfectivo(a) - momentoEfectivo(b);
      });

    case 'alfabetico':
      return copia.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));

    case 'urgencia':
      return copia.sort((a, b) => puntuacionUrgencia(b) - puntuacionUrgencia(a));

    default:
      return copia.sort((a, b) => {
        if (a.fijado !== b.fijado) return a.fijado ? -1 : 1;
        return momentoEfectivo(a) - momentoEfectivo(b);
      });
  }
}

/** Agrupa por día natural devolviendo una lista ordenada de secciones. */
export function agruparPorDia(recordatorios) {
  const grupos = new Map();

  recordatorios.forEach((r) => {
    const clave = aFechaISO(fechaEfectiva(r));
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(r);
  });

  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, elementos]) => ({
      clave,
      fecha: combinarFechaHora(clave, '00:00'),
      elementos: elementos.sort((a, b) => momentoEfectivo(a) - momentoEfectivo(b))
    }));
}

/** Lista de etiquetas usadas, ordenada por frecuencia. */
export function etiquetasUsadas(recordatorios) {
  const cuenta = new Map();
  recordatorios.forEach((r) => {
    (r.etiquetas || []).forEach((etiqueta) => {
      cuenta.set(etiqueta, (cuenta.get(etiqueta) || 0) + 1);
    });
  });
  return [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, veces]) => ({ nombre, veces }));
}
