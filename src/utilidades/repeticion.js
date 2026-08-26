/**
 * Motor de repeticiones.
 *
 * Un recordatorio guarda siempre la ocurrencia "actual" en sus campos fecha y
 * hora. Cuando se completa o se salta, el motor calcula la siguiente y
 * actualiza el recordatorio. Además sabe generar las ocurrencias futuras de un
 * intervalo, que es lo que consume la vista de calendario.
 */

import {
  aFechaISO,
  combinarFechaHora,
  deFechaISO,
  finDelDia,
  sumarAnos,
  sumarDias,
  sumarMeses
} from './fechas.js';
import { DIAS_SEMANA } from './constantes.js';

// Tope de seguridad para que ningún bucle se dispare con datos incoherentes.
const MAXIMO_ITERACIONES = 2000;

export const REPETICION_VACIA = {
  tipo: 'ninguna',
  intervalo: 1,
  diasSemana: [],
  diaMes: null,
  unidad: 'dias',
  fin: { tipo: 'nunca', fecha: null, repeticiones: 10 },
  completadas: 0
};

export function normalizarRepeticion(repeticion) {
  if (!repeticion) return { ...REPETICION_VACIA };
  return {
    ...REPETICION_VACIA,
    ...repeticion,
    intervalo: Math.max(1, Number(repeticion.intervalo) || 1),
    diasSemana: Array.isArray(repeticion.diasSemana) ? repeticion.diasSemana : [],
    fin: { ...REPETICION_VACIA.fin, ...(repeticion.fin || {}) }
  };
}

export function esRepetitivo(recordatorio) {
  return Boolean(recordatorio?.repeticion && recordatorio.repeticion.tipo !== 'ninguna');
}

/* ------------------------------------------------------------------ */
/* Cálculo de ocurrencias                                              */
/* ------------------------------------------------------------------ */

/** Días de la semana implicados según el tipo de repetición. */
function diasObjetivo(repeticion) {
  if (repeticion.tipo === 'laborables') return [1, 2, 3, 4, 5];
  if (repeticion.tipo === 'finsemana') return [6, 0];
  if (repeticion.tipo === 'semanal') {
    return repeticion.diasSemana.length ? repeticion.diasSemana : null;
  }
  return null;
}

/**
 * Devuelve la ocurrencia inmediatamente posterior a "desde".
 * Si la serie ya ha terminado devuelve null.
 */
export function siguienteOcurrencia(recordatorio, desde = new Date()) {
  const repeticion = normalizarRepeticion(recordatorio.repeticion);
  const base = combinarFechaHora(recordatorio.fecha, recordatorio.hora);
  if (!base) return null;

  const limite = referenciaFin(repeticion);
  const objetivo = desde.getTime();

  if (repeticion.tipo === 'ninguna') {
    return base.getTime() > objetivo ? base : null;
  }

  let actual = new Date(base);
  let vueltas = 0;

  while (vueltas < MAXIMO_ITERACIONES) {
    vueltas += 1;
    actual = avanzarUnPaso(actual, repeticion, base);
    if (!actual) return null;
    if (limite && actual.getTime() > limite) return null;
    if (actual.getTime() > objetivo) return actual;
  }
  return null;
}

/** Aplica un único salto de la repetición sobre la fecha indicada. */
function avanzarUnPaso(fecha, repeticion, base) {
  const intervalo = repeticion.intervalo;

  switch (repeticion.tipo) {
    case 'horas': {
      return new Date(fecha.getTime() + intervalo * 60 * 60 * 1000);
    }
    case 'diaria':
      return sumarDias(fecha, intervalo);

    case 'laborables':
    case 'finsemana':
    case 'semanal': {
      const dias = diasObjetivo(repeticion);
      if (!dias || !dias.length) return sumarDias(fecha, 7 * intervalo);
      return siguienteDiaSemanaValido(fecha, dias, repeticion.tipo === 'semanal' ? intervalo : 1, base);
    }

    case 'mensual': {
      const siguiente = sumarMeses(fecha, intervalo);
      if (repeticion.diaMes) {
        const ajustada = new Date(siguiente);
        const ultimoDia = new Date(ajustada.getFullYear(), ajustada.getMonth() + 1, 0).getDate();
        ajustada.setDate(Math.min(repeticion.diaMes, ultimoDia));
        return ajustada;
      }
      return siguiente;
    }

    case 'anual':
      return sumarAnos(fecha, intervalo);

    case 'personalizada': {
      if (repeticion.unidad === 'semanas') return sumarDias(fecha, 7 * intervalo);
      if (repeticion.unidad === 'meses') return sumarMeses(fecha, intervalo);
      if (repeticion.unidad === 'anos') return sumarAnos(fecha, intervalo);
      return sumarDias(fecha, intervalo);
    }

    default:
      return null;
  }
}

/**
 * Busca el siguiente día que encaje con los días de la semana elegidos,
 * respetando el intervalo de semanas (por ejemplo, cada dos semanas).
 */
function siguienteDiaSemanaValido(fecha, dias, intervaloSemanas, base) {
  const semanaBase = numeroDeSemana(base);
  let candidato = sumarDias(fecha, 1);

  for (let i = 0; i < 400; i += 1) {
    const encajaDia = dias.includes(candidato.getDay());
    const encajaSemana =
      intervaloSemanas <= 1 || (numeroDeSemana(candidato) - semanaBase) % intervaloSemanas === 0;

    if (encajaDia && encajaSemana) return candidato;
    candidato = sumarDias(candidato, 1);
  }
  return null;
}

/** Semanas transcurridas desde una referencia fija, para comparar intervalos. */
function numeroDeSemana(fecha) {
  const referencia = new Date(2000, 0, 3); // primer lunes del año 2000
  const dias = Math.floor((new Date(fecha) - referencia) / (24 * 60 * 60 * 1000));
  return Math.floor(dias / 7);
}

/** Instante límite de la serie según la condición de fin, o null si no hay. */
function referenciaFin(repeticion) {
  if (repeticion.fin?.tipo === 'fecha' && repeticion.fin.fecha) {
    const fin = deFechaISO(repeticion.fin.fecha);
    return fin ? finDelDia(fin).getTime() : null;
  }
  return null;
}

/** Comprueba si la serie ya ha agotado el número de repeticiones previsto. */
export function serieAgotada(recordatorio) {
  const repeticion = normalizarRepeticion(recordatorio.repeticion);
  if (repeticion.fin?.tipo !== 'repeticiones') return false;
  return (repeticion.completadas || 0) + 1 >= Number(repeticion.fin.repeticiones || 0);
}

/**
 * Genera las ocurrencias de un recordatorio dentro de un intervalo.
 * Incluye la ocurrencia actual si cae dentro del rango.
 */
export function ocurrenciasEntre(recordatorio, inicio, fin, limite = 120) {
  const resultado = [];
  const base = combinarFechaHora(recordatorio.fecha, recordatorio.hora);
  if (!base) return resultado;

  const desde = new Date(inicio).getTime();
  const hasta = new Date(fin).getTime();

  if (base.getTime() >= desde && base.getTime() <= hasta) {
    resultado.push(new Date(base));
  }

  if (!esRepetitivo(recordatorio)) return resultado;

  const repeticion = normalizarRepeticion(recordatorio.repeticion);
  const tope = referenciaFin(repeticion);
  const maximoRepeticiones =
    repeticion.fin?.tipo === 'repeticiones' ? Number(repeticion.fin.repeticiones) : Infinity;

  let actual = new Date(base);
  let generadas = 0;

  while (resultado.length < limite && generadas < MAXIMO_ITERACIONES) {
    generadas += 1;
    actual = avanzarUnPaso(actual, repeticion, base);
    if (!actual) break;

    const momento = actual.getTime();
    if (tope && momento > tope) break;
    if (generadas >= maximoRepeticiones) break;
    if (momento > hasta) break;
    if (momento >= desde) resultado.push(new Date(actual));
  }

  return resultado;
}

/**
 * Devuelve el recordatorio movido a su siguiente ocurrencia.
 * Si la serie ha terminado devuelve null, y quien llama decide si archivar.
 */
export function avanzarRecordatorio(recordatorio, desde = new Date()) {
  if (!esRepetitivo(recordatorio)) return null;
  if (serieAgotada(recordatorio)) return null;

  const siguiente = siguienteOcurrencia(recordatorio, desde);
  if (!siguiente) return null;

  const repeticion = normalizarRepeticion(recordatorio.repeticion);

  return {
    ...recordatorio,
    fecha: aFechaISO(siguiente),
    hora: recordatorio.todoElDia
      ? recordatorio.hora
      : `${String(siguiente.getHours()).padStart(2, '0')}:${String(siguiente.getMinutes()).padStart(2, '0')}`,
    completado: false,
    completadoEn: null,
    pospuestoHasta: null,
    // Las subtareas se reinician para que la nueva ocurrencia empiece limpia.
    subtareas: (recordatorio.subtareas || []).map((s) => ({ ...s, hecha: false })),
    repeticion: { ...repeticion, completadas: (repeticion.completadas || 0) + 1 }
  };
}

/* ------------------------------------------------------------------ */
/* Descripción legible                                                 */
/* ------------------------------------------------------------------ */

function listarDias(indices) {
  const nombres = indices
    .slice()
    .sort((a, b) => {
      const orden = DIAS_SEMANA.map((d) => d.indice);
      return orden.indexOf(a) - orden.indexOf(b);
    })
    .map((i) => DIAS_SEMANA.find((d) => d.indice === i)?.nombre.toLowerCase())
    .filter(Boolean);

  if (nombres.length === 0) return '';
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** Texto corto que se muestra en la tarjeta y en el formulario. */
export function descripcionRepeticion(repeticion) {
  if (!repeticion || repeticion.tipo === 'ninguna') return 'No se repite';
  const r = normalizarRepeticion(repeticion);
  const n = r.intervalo;

  let texto;
  switch (r.tipo) {
    case 'horas':
      texto = n === 1 ? 'Cada hora' : `Cada ${n} horas`;
      break;
    case 'diaria':
      texto = n === 1 ? 'Cada día' : `Cada ${n} días`;
      break;
    case 'laborables':
      texto = 'De lunes a viernes';
      break;
    case 'finsemana':
      texto = 'Sábados y domingos';
      break;
    case 'semanal': {
      const dias = listarDias(r.diasSemana);
      const cada = n === 1 ? '' : ` (cada ${n} semanas)`;
      texto = dias ? `Los ${dias}${cada}` : n === 1 ? 'Cada semana' : `Cada ${n} semanas`;
      break;
    }
    case 'mensual':
      texto = n === 1 ? 'Cada mes' : `Cada ${n} meses`;
      if (r.diaMes) texto += `, el día ${r.diaMes}`;
      break;
    case 'anual':
      texto = n === 1 ? 'Cada año' : `Cada ${n} años`;
      break;
    case 'personalizada': {
      const unidades = { dias: 'días', semanas: 'semanas', meses: 'meses', anos: 'años' };
      const singular = { dias: 'día', semanas: 'semana', meses: 'mes', anos: 'año' };
      texto = n === 1 ? `Cada ${singular[r.unidad]}` : `Cada ${n} ${unidades[r.unidad]}`;
      break;
    }
    default:
      texto = 'Se repite';
  }

  if (r.fin?.tipo === 'fecha' && r.fin.fecha) {
    const fin = deFechaISO(r.fin.fecha);
    if (fin) texto += ` hasta el ${fin.toLocaleDateString('es-ES')}`;
  }
  if (r.fin?.tipo === 'repeticiones' && r.fin.repeticiones) {
    const restantes = Math.max(0, Number(r.fin.repeticiones) - (r.completadas || 0));
    texto += ` (${restantes} ${restantes === 1 ? 'vez restante' : 'veces restantes'})`;
  }

  return texto;
}
