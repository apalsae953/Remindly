/**
 * Motor de repeticiones.
 *
 * Un recordatorio guarda siempre la ocurrencia "actual" en sus campos fecha y
 * hora. Cuando se completa o se salta, el motor calcula la siguiente y
 * actualiza el recordatorio. Además sabe generar las ocurrencias futuras de un
 * intervalo, que es lo que consumen la vista de calendario, los avisos y la
 * previsualización del editor.
 *
 * Una regla se compone de dos cosas independientes:
 *
 *   1. Cada cuánto se repite el DÍA (cada N días, ciertos días de la semana,
 *      cada N meses, cada N años).
 *   2. A qué HORAS de ese día hay que avisar (una o varias).
 *
 * Separarlas es lo que permite expresar "cada 2 días a las 9:00, 15:00 y
 * 21:00" sin inventar un tipo nuevo para cada combinación. El tipo "horas" es
 * el único distinto: ahí el reloj manda y no se razona por días, aunque se
 * puede limitar a una franja para que no avise de madrugada.
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

const MINUTOS_DIA = 24 * 60;

// Más de esto en un mismo día no es un recordatorio, es una alarma rota.
const MAXIMO_HORAS_DIA = 24;

export const TIPOS_REPETICION_VALIDOS = [
  'ninguna',
  'horas',
  'diaria',
  'semanal',
  'mensual',
  'anual'
];

export const REPETICION_VACIA = {
  tipo: 'ninguna',
  intervalo: 1,
  // Días de la semana (0 = domingo). Vacío en 'semanal' = el día de la fecha.
  diasSemana: [],
  // Día del mes en 'mensual'. Null = el mismo día que la fecha elegida.
  diaMes: null,
  // Horas del día en las que avisa. Vacío = solo la hora del recordatorio.
  horas: [],
  // Franja horaria de 'horas': { desde: 'HH:MM', hasta: 'HH:MM' } o null.
  franja: null,
  fin: { tipo: 'nunca', fecha: null, repeticiones: 10 },
  completadas: 0
};

/* ------------------------------------------------------------------ */
/* Horas como minutos                                                  */
/* ------------------------------------------------------------------ */

/** 'HH:MM' a minutos desde la medianoche. */
export function horaAMinutos(hora) {
  const [h, m] = String(hora ?? '').split(':');
  const horas = Number(h);
  const minutos = Number(m);
  if (!Number.isFinite(horas)) return null;
  return (horas % 24) * 60 + (Number.isFinite(minutos) ? minutos % 60 : 0);
}

/** Minutos desde la medianoche a 'HH:MM'. */
export function minutosAHora(minutos) {
  const total = ((Math.round(minutos) % MINUTOS_DIA) + MINUTOS_DIA) % MINUTOS_DIA;
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** Deja una lista de horas limpia: válidas, sin repetidos y en orden. */
function normalizarHoras(lista) {
  if (!Array.isArray(lista)) return [];
  const minutos = lista
    .map(horaAMinutos)
    .filter((m) => m !== null)
    .sort((a, b) => a - b);
  return [...new Set(minutos)].slice(0, MAXIMO_HORAS_DIA).map(minutosAHora);
}

/** Una franja solo vale si tiene dos extremos distintos. */
function normalizarFranja(franja) {
  if (!franja) return null;
  const desde = horaAMinutos(franja.desde);
  const hasta = horaAMinutos(franja.hasta);
  if (desde === null || hasta === null || desde === hasta) return null;
  return { desde: minutosAHora(desde), hasta: minutosAHora(hasta) };
}

function normalizarDias(lista) {
  if (!Array.isArray(lista)) return [];
  const indices = lista.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return [...new Set(indices)];
}

/* ------------------------------------------------------------------ */
/* Normalización y migración                                           */
/* ------------------------------------------------------------------ */

/**
 * Antes había un tipo por cada combinación ('laborables', 'finsemana',
 * 'personalizada' con una unidad aparte). Se traducen al vuelo, así que los
 * recordatorios guardados con el modelo viejo siguen funcionando igual.
 */
const UNIDADES_ANTIGUAS = {
  dias: 'diaria',
  semanas: 'semanal',
  meses: 'mensual',
  anos: 'anual'
};

function migrarTipo(repeticion) {
  switch (repeticion.tipo) {
    case 'laborables':
      return { tipo: 'semanal', intervalo: 1, diasSemana: [1, 2, 3, 4, 5] };
    case 'finsemana':
      return { tipo: 'semanal', intervalo: 1, diasSemana: [6, 0] };
    case 'personalizada':
      return { tipo: UNIDADES_ANTIGUAS[repeticion.unidad] || 'diaria' };
    default:
      return {};
  }
}

export function normalizarRepeticion(repeticion) {
  if (!repeticion) return { ...REPETICION_VACIA };

  const base = { ...REPETICION_VACIA, ...repeticion, ...migrarTipo(repeticion) };
  const tipo = TIPOS_REPETICION_VALIDOS.includes(base.tipo) ? base.tipo : 'ninguna';

  // Se devuelven solo las claves canónicas: así los datos antiguos dejan de
  // arrastrar 'unidad' en cuanto se vuelven a guardar.
  return {
    tipo,
    intervalo: Math.min(999, Math.max(1, Number(base.intervalo) || 1)),
    diasSemana: normalizarDias(base.diasSemana),
    diaMes: base.diaMes ? Math.min(31, Math.max(1, Number(base.diaMes))) : null,
    horas: tipo === 'horas' || tipo === 'ninguna' ? [] : normalizarHoras(base.horas),
    franja: tipo === 'horas' ? normalizarFranja(base.franja) : null,
    fin: { ...REPETICION_VACIA.fin, ...(base.fin || {}) },
    completadas: Math.max(0, Number(base.completadas) || 0)
  };
}

export function esRepetitivo(recordatorio) {
  return Boolean(recordatorio?.repeticion && recordatorio.repeticion.tipo !== 'ninguna');
}

/** Horas en las que avisa un día activo de la serie. Nunca está vacío. */
export function horasDelDia(repeticion, horaBase = '09:00') {
  const r = normalizarRepeticion(repeticion);
  if (r.horas.length) return r.horas;
  const minutos = horaAMinutos(horaBase);
  return [minutosAHora(minutos === null ? 540 : minutos)];
}

/** Cuántas veces al día avisa la serie. */
export function vecesAlDia(repeticion, horaBase) {
  const r = normalizarRepeticion(repeticion);
  if (r.tipo === 'horas') {
    const ancho = r.franja ? minutosDeFranja(r.franja) : MINUTOS_DIA;
    return Math.max(1, Math.floor(ancho / (r.intervalo * 60)) + (r.franja ? 1 : 0));
  }
  return horasDelDia(r, horaBase).length;
}

function minutosDeFranja(franja) {
  const desde = horaAMinutos(franja.desde);
  const hasta = horaAMinutos(franja.hasta);
  return hasta > desde ? hasta - desde : MINUTOS_DIA - desde + hasta;
}

/* ------------------------------------------------------------------ */
/* Cálculo de ocurrencias                                              */
/* ------------------------------------------------------------------ */

/** Días de la semana implicados; null si el tipo no va por días de semana. */
function diasObjetivo(repeticion, base) {
  if (repeticion.tipo !== 'semanal') return null;
  if (repeticion.diasSemana.length) return repeticion.diasSemana;
  // Sin días marcados se entiende "el mismo día de la semana que la fecha".
  return [new Date(base).getDay()];
}

/** Devuelve la misma fecha con otra hora del día. */
function conMinutos(fecha, minutos) {
  const d = new Date(fecha);
  d.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
  return d;
}

/**
 * Mueve un instante dentro de la franja permitida. Siempre hacia delante, de
 * modo que el bucle que la usa no puede quedarse quieto.
 */
function encajarEnFranja(fecha, franja) {
  const desde = horaAMinutos(franja.desde);
  const hasta = horaAMinutos(franja.hasta);
  const actual = fecha.getHours() * 60 + fecha.getMinutes();

  if (desde < hasta) {
    if (actual < desde) return conMinutos(fecha, desde);
    if (actual > hasta) return conMinutos(sumarDias(fecha, 1), desde);
    return fecha;
  }

  // Franja que cruza la medianoche (por ejemplo de 22:00 a 06:00).
  if (actual >= desde || actual <= hasta) return fecha;
  return conMinutos(fecha, desde);
}

/** Avanza la FECHA un paso de la serie, sin tocar la hora. */
function avanzarDia(fecha, repeticion, base) {
  const intervalo = repeticion.intervalo;

  switch (repeticion.tipo) {
    case 'diaria':
      return sumarDias(fecha, intervalo);

    case 'semanal': {
      const dias = diasObjetivo(repeticion, base);
      return siguienteDiaSemanaValido(fecha, dias, intervalo, base);
    }

    case 'mensual': {
      const siguiente = sumarMeses(fecha, intervalo);
      const dia = repeticion.diaMes;
      if (!dia) return siguiente;
      const ultimoDia = new Date(siguiente.getFullYear(), siguiente.getMonth() + 1, 0).getDate();
      const ajustada = new Date(siguiente);
      ajustada.setDate(Math.min(dia, ultimoDia));
      return ajustada;
    }

    case 'anual':
      return sumarAnos(fecha, intervalo);

    default:
      return null;
  }
}

/**
 * Siguiente instante de la serie después de "fecha".
 *
 * Primero se busca otra hora del mismo día; solo cuando no quedan se salta al
 * siguiente día activo y se empieza por su primera hora.
 */
function siguienteInstante(fecha, repeticion, base, horaBase) {
  if (repeticion.tipo === 'horas') {
    const siguiente = new Date(fecha.getTime() + repeticion.intervalo * 60 * 60 * 1000);
    return repeticion.franja ? encajarEnFranja(siguiente, repeticion.franja) : siguiente;
  }

  const horas = horasDelDia(repeticion, horaBase).map(horaAMinutos);
  const actual = fecha.getHours() * 60 + fecha.getMinutes();

  const restante = horas.find((m) => m > actual);
  if (restante !== undefined) return conMinutos(fecha, restante);

  const dia = avanzarDia(fecha, repeticion, base);
  if (!dia) return null;
  return conMinutos(dia, horas[0]);
}

/**
 * Busca el siguiente día que encaje con los días de la semana elegidos,
 * respetando el intervalo de semanas (por ejemplo, cada dos semanas).
 */
function siguienteDiaSemanaValido(fecha, dias, intervaloSemanas, base) {
  if (!dias || !dias.length) return sumarDias(fecha, 7 * intervaloSemanas);

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

/**
 * Devuelve la ocurrencia inmediatamente posterior a "desde".
 * Si la serie ya ha terminado devuelve null.
 */
export function siguienteOcurrencia(recordatorio, desde = new Date()) {
  const repeticion = normalizarRepeticion(recordatorio.repeticion);
  const base = combinarFechaHora(recordatorio.fecha, recordatorio.hora);
  if (!base) return null;

  const limite = referenciaFin(repeticion);
  const objetivo = new Date(desde).getTime();

  if (repeticion.tipo === 'ninguna') {
    return base.getTime() > objetivo ? base : null;
  }

  let actual = new Date(base);
  let vueltas = 0;

  while (vueltas < MAXIMO_ITERACIONES) {
    vueltas += 1;
    actual = siguienteInstante(actual, repeticion, base, recordatorio.hora);
    if (!actual) return null;
    if (limite && actual.getTime() > limite) return null;
    if (actual.getTime() > objetivo) return actual;
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
    actual = siguienteInstante(actual, repeticion, base, recordatorio.hora);
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
 * Próximas ocurrencias agrupadas por día, para que el editor pueda enseñar
 * cómo queda la regla antes de guardarla. Enseñar tres o cuatro días reales
 * explica una repetición mejor que cualquier texto.
 */
export function previsualizarOcurrencias(recordatorio, maximoDias = 4, maximoPorDia = 8) {
  const base = combinarFechaHora(recordatorio.fecha, recordatorio.hora);
  if (!base) return [];

  // Se arranca en la ocurrencia actual aunque ya haya pasado: así el editor
  // enseña siempre la serie completa y no un hueco. La ventana se estira hasta
  // tres años por delante de lo que esté más lejos, porque una fecha muy
  // futura (un aniversario de 2030) tiene que seguir viéndose.
  const inicio = new Date(Math.min(Date.now(), base.getTime()));
  const fin = sumarAnos(new Date(Math.max(Date.now(), base.getTime())), 3);
  const ocurrencias = ocurrenciasEntre(recordatorio, inicio, fin, maximoDias * maximoPorDia + 4);

  const dias = [];
  ocurrencias.forEach((momento) => {
    const clave = aFechaISO(momento);
    let grupo = dias.find((d) => d.clave === clave);
    if (!grupo) {
      if (dias.length >= maximoDias) return;
      grupo = { clave, fecha: new Date(momento), horas: [] };
      dias.push(grupo);
    }
    if (grupo.horas.length < maximoPorDia) {
      grupo.horas.push(
        `${String(momento.getHours()).padStart(2, '0')}:${String(momento.getMinutes()).padStart(2, '0')}`
      );
    } else {
      grupo.recortado = true;
    }
  });

  return dias;
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
  const orden = DIAS_SEMANA.map((d) => d.indice);
  const nombres = indices
    .slice()
    .sort((a, b) => orden.indexOf(a) - orden.indexOf(b))
    .map((i) => DIAS_SEMANA.find((d) => d.indice === i)?.nombre.toLowerCase())
    .filter(Boolean);

  if (nombres.length === 0) return '';
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** Enumera horas en lenguaje natural: "9:00, 15:00 y 21:00". */
export function listarHoras(horas) {
  const limpias = (horas || []).map((h) => h.replace(/^0/, ''));
  if (limpias.length === 0) return '';
  if (limpias.length === 1) return limpias[0];
  return `${limpias.slice(0, -1).join(', ')} y ${limpias[limpias.length - 1]}`;
}

/** Cada cuánto se repite el día, sin mencionar las horas. */
function textoFrecuencia(r) {
  const n = r.intervalo;

  switch (r.tipo) {
    case 'horas': {
      const cada = n === 1 ? 'Cada hora' : `Cada ${n} horas`;
      if (!r.franja) return cada;
      return `${cada}, de ${r.franja.desde.replace(/^0/, '')} a ${r.franja.hasta.replace(/^0/, '')}`;
    }
    case 'diaria':
      return n === 1 ? 'Cada día' : `Cada ${n} días`;
    case 'semanal': {
      const cada = n === 1 ? '' : ` (cada ${n} semanas)`;
      if (!r.diasSemana.length) return n === 1 ? 'Cada semana' : `Cada ${n} semanas`;

      // Los tres conjuntos habituales tienen nombre propio: enumerar los
      // cinco días laborables uno a uno no cabe en una línea y no se lee.
      const conjunto = [...r.diasSemana].sort().join(',');
      if (conjunto === '1,2,3,4,5') return `De lunes a viernes${cada}`;
      if (conjunto === '0,6') return `Fines de semana${cada}`;
      if (conjunto === '0,1,2,3,4,5,6') return `Todos los días${cada}`;

      return `Los ${listarDias(r.diasSemana)}${cada}`;
    }
    case 'mensual': {
      const cada = n === 1 ? 'Cada mes' : `Cada ${n} meses`;
      return r.diaMes ? `${cada}, el día ${r.diaMes}` : cada;
    }
    case 'anual':
      return n === 1 ? 'Cada año' : `Cada ${n} años`;
    default:
      return 'Se repite';
  }
}

/**
 * Texto corto para la lista y el compositor. Se queda en "3 veces al día"
 * en lugar de enumerar las horas, que no caben en una línea de móvil; las
 * horas concretas se ven en el editor y en la previsualización.
 */
export function descripcionRepeticion(repeticion) {
  if (!repeticion || repeticion.tipo === 'ninguna') return 'No se repite';
  const r = normalizarRepeticion(repeticion);

  let texto = textoFrecuencia(r);

  if (r.horas.length > 1) texto += `, ${r.horas.length} veces al día`;

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

/** Versión larga, con las horas enumeradas. Se usa dentro del editor. */
export function descripcionCompleta(repeticion, horaBase) {
  if (!repeticion || repeticion.tipo === 'ninguna') return 'No se repite';
  const r = normalizarRepeticion(repeticion);
  if (r.tipo === 'horas') return descripcionRepeticion(r);

  const horas = horasDelDia(r, horaBase);
  return `${textoFrecuencia(r)}, a las ${listarHoras(horas)}`;
}
