/**
 * Definición del recordatorio: creación, normalización y consultas derivadas.
 *
 * Mantener aquí la forma del objeto evita que cada componente invente campos
 * distintos y permite migrar datos antiguos cuando cambia el modelo.
 */

import { generarId } from './almacenamiento.js';
import {
  aFechaISO,
  aHoraISO,
  combinarFechaHora,
  inicioDelDia,
  momentoDe,
  sumarDias
} from './fechas.js';
import {
  REPETICION_VACIA,
  esRepetitivo,
  normalizarRepeticion,
  siguienteOcurrencia
} from './repeticion.js';
import {
  CATEGORIAS_ANTIGUAS,
  PRIORIDADES_ANTIGUAS,
  obtenerCategoria,
  obtenerPrioridad
} from './constantes.js';

/** Crea un recordatorio nuevo con valores razonables por defecto. */
export function crearRecordatorio(parcial = {}, ajustes = {}) {
  const ahora = Date.now();

  return {
    id: generarId('rec'),
    titulo: '',
    notas: '',
    categoria: 'personal',
    prioridad: 'normal',
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
 * Coloca una serie recién creada en su primera vez que aún no haya pasado.
 *
 * Escribir "pastilla 3 veces al día" a las cinco de la tarde no debería
 * dejar dos avisos atrasados nada más guardarlo: lo que se quiere es la
 * próxima toma. Solo se aplica al crear; al editar manda lo que diga el
 * usuario.
 */
export function alinearConLaSerie(recordatorio, ahora = new Date()) {
  if (!esRepetitivo(recordatorio) || recordatorio.todoElDia) return recordatorio;

  const actual = combinarFechaHora(recordatorio.fecha, recordatorio.hora);
  if (!actual || actual.getTime() > ahora.getTime()) return recordatorio;

  const siguiente = siguienteOcurrencia(recordatorio, ahora);
  if (!siguiente) return recordatorio;

  return { ...recordatorio, fecha: aFechaISO(siguiente), hora: aHoraISO(siguiente) };
}

/**
 * Rellena lo que falte y traduce los valores de versiones anteriores, para que
 * la interfaz nunca reciba una categoría o prioridad que ya no existe.
 */
export function normalizarRecordatorio(bruto) {
  if (!bruto || typeof bruto !== 'object') return null;
  const base = crearRecordatorio();

  const categoria = CATEGORIAS_ANTIGUAS[bruto.categoria] || bruto.categoria || 'personal';
  const prioridad = PRIORIDADES_ANTIGUAS[bruto.prioridad] || bruto.prioridad || 'normal';

  return {
    ...base,
    ...bruto,
    id: bruto.id || base.id,
    titulo: String(bruto.titulo || '').trim() || 'Sin título',
    categoria: obtenerCategoria(categoria).id,
    prioridad: obtenerPrioridad(prioridad).id,
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
 * Instante efectivo. Si está pospuesto manda la posposición, porque es lo que
 * el usuario espera ver en la lista.
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

/** Progreso de las subtareas. Devuelve null si no tiene ninguna. */
export function progresoSubtareas(recordatorio) {
  const total = recordatorio.subtareas?.length || 0;
  if (!total) return null;
  const hechas = recordatorio.subtareas.filter((s) => s.hecha).length;
  return { hechas, total, ratio: hechas / total };
}

/* ------------------------------------------------------------------ */
/* Reparto en tramos                                                   */
/* ------------------------------------------------------------------ */

/**
 * Reparte los recordatorios en los tres tramos de la pantalla principal.
 *
 * "Hoy" incluye lo atrasado a propósito: si algo venció ayer y sigue sin
 * hacerse, el sitio donde hay que verlo es hoy, no escondido en otra pestaña.
 */
export function repartirEnTramos(recordatorios, referencia = new Date()) {
  const finDeHoy = inicioDelDia(sumarDias(referencia, 1)).getTime();

  const hoy = [];
  const proximos = [];
  const hechos = [];

  recordatorios.forEach((recordatorio) => {
    if (recordatorio.archivado) return;

    if (recordatorio.completado) {
      hechos.push(recordatorio);
      return;
    }

    if (momentoEfectivo(recordatorio) < finDeHoy) hoy.push(recordatorio);
    else proximos.push(recordatorio);
  });

  const porMomento = (a, b) => momentoEfectivo(a) - momentoEfectivo(b);

  return {
    hoy: hoy.sort(porMomento),
    proximos: proximos.sort(porMomento),
    // Lo último completado va primero: es lo que se quiere revisar o deshacer.
    hechos: hechos.sort((a, b) => (b.completadoEn || 0) - (a.completadoEn || 0))
  };
}

/* ------------------------------------------------------------------ */
/* Búsqueda y agrupación                                               */
/* ------------------------------------------------------------------ */

export function buscarRecordatorios(recordatorios, texto) {
  const busqueda = (texto || '').trim().toLowerCase();
  if (!busqueda) return recordatorios;

  return recordatorios.filter((r) => {
    const contenido = [
      r.titulo,
      r.notas,
      r.ubicacion,
      ...(r.etiquetas || []),
      ...(r.subtareas || []).map((s) => s.texto)
    ]
      .join(' ')
      .toLowerCase();
    return contenido.includes(busqueda);
  });
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

export { esRepetitivo };
