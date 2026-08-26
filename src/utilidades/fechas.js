/**
 * Utilidades de fecha y hora.
 *
 * Todo se maneja en hora local del dispositivo. Las fechas se guardan como
 * cadena 'AAAA-MM-DD' y las horas como 'HH:MM' para que el almacenamiento sea
 * legible y no dependa de zonas horarias.
 */

const MILISEGUNDOS_DIA = 24 * 60 * 60 * 1000;

const FORMATO_LARGO = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
});

const FORMATO_CORTO = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short'
});

const FORMATO_COMPLETO = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

const FORMATO_MES = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

/* ------------------------------------------------------------------ */
/* Conversiones básicas                                                */
/* ------------------------------------------------------------------ */

/** Convierte un objeto Date a la cadena 'AAAA-MM-DD' en hora local. */
export function aFechaISO(fecha) {
  const d = new Date(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Convierte 'AAAA-MM-DD' a un Date situado a las 00:00 locales. */
export function deFechaISO(cadena) {
  if (!cadena) return null;
  const [ano, mes, dia] = cadena.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
}

/** Devuelve la hora actual redondeada como 'HH:MM'. */
export function aHoraISO(fecha) {
  const d = new Date(fecha);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Combina la fecha 'AAAA-MM-DD' con la hora 'HH:MM'. Si no hay hora se asume
 * la que se pase como respaldo (o las 09:00 si tampoco la hay).
 */
export function combinarFechaHora(fechaISO, hora, horaRespaldo = '09:00') {
  const base = deFechaISO(fechaISO);
  if (!base) return null;
  const [h, m] = (hora || horaRespaldo).split(':').map(Number);
  base.setHours(h || 0, m || 0, 0, 0);
  return base;
}

/** Marca temporal en milisegundos del recordatorio, útil para ordenar. */
export function momentoDe(recordatorio) {
  const fecha = combinarFechaHora(
    recordatorio.fecha,
    recordatorio.todoElDia ? '09:00' : recordatorio.hora
  );
  return fecha ? fecha.getTime() : Number.MAX_SAFE_INTEGER;
}

/* ------------------------------------------------------------------ */
/* Aritmética de fechas                                                */
/* ------------------------------------------------------------------ */

export function inicioDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function finDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

export function sumarMinutos(fecha, minutos) {
  return new Date(new Date(fecha).getTime() + minutos * 60 * 1000);
}

export function sumarMeses(fecha, meses) {
  const d = new Date(fecha);
  const diaOriginal = d.getDate();
  d.setMonth(d.getMonth() + meses);
  // Si el mes destino es más corto (31 de enero + 1 mes) se ajusta al último día.
  if (d.getDate() < diaOriginal) d.setDate(0);
  return d;
}

export function sumarAnos(fecha, anos) {
  const d = new Date(fecha);
  d.setFullYear(d.getFullYear() + anos);
  return d;
}

export function mismoDia(a, b) {
  if (!a || !b) return false;
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

export function esHoy(fecha) {
  return mismoDia(fecha, new Date());
}

export function esManana(fecha) {
  return mismoDia(fecha, sumarDias(new Date(), 1));
}

export function esAyer(fecha) {
  return mismoDia(fecha, sumarDias(new Date(), -1));
}

/** Número de días completos entre dos fechas, ignorando la hora. */
export function diasDeDiferencia(desde, hasta) {
  const a = inicioDelDia(desde).getTime();
  const b = inicioDelDia(hasta).getTime();
  return Math.round((b - a) / MILISEGUNDOS_DIA);
}

/* ------------------------------------------------------------------ */
/* Formato para pantalla                                               */
/* ------------------------------------------------------------------ */

export function formatearFechaLarga(fecha) {
  return capitalizar(FORMATO_LARGO.format(new Date(fecha)));
}

export function formatearFechaCompleta(fecha) {
  return capitalizar(FORMATO_COMPLETO.format(new Date(fecha)));
}

export function formatearFechaCorta(fecha) {
  return FORMATO_CORTO.format(new Date(fecha)).replace('.', '');
}

export function formatearMes(fecha) {
  return capitalizar(FORMATO_MES.format(new Date(fecha)));
}

export function formatearHora(fecha) {
  return aHoraISO(fecha);
}

/**
 * Etiqueta amable para la cabecera de un grupo de recordatorios:
 * "Hoy", "Mañana", "Ayer" o la fecha larga.
 */
export function etiquetaDia(fecha) {
  if (esHoy(fecha)) return 'Hoy';
  if (esManana(fecha)) return 'Mañana';
  if (esAyer(fecha)) return 'Ayer';

  const diferencia = diasDeDiferencia(new Date(), fecha);
  if (diferencia > 1 && diferencia < 7) return capitalizar(nombreDiaSemana(fecha));
  return formatearFechaLarga(fecha);
}

/**
 * Texto relativo del estilo "en 2 h", "hace 5 min" o "en 3 días".
 * Se usa en las tarjetas para saber de un vistazo cuánto queda.
 */
export function textoRelativo(fecha) {
  const destino = new Date(fecha).getTime();
  const diferencia = destino - Date.now();
  const absoluta = Math.abs(diferencia);
  const pasado = diferencia < 0;

  const minutos = Math.round(absoluta / 60000);
  const horas = Math.round(absoluta / 3600000);
  const dias = Math.abs(diasDeDiferencia(new Date(), fecha));

  let cantidad;
  if (minutos < 1) return pasado ? 'justo ahora' : 'ahora mismo';
  if (minutos < 60) cantidad = `${minutos} min`;
  else if (horas < 24) cantidad = horas === 1 ? '1 hora' : `${horas} horas`;
  else if (dias < 31) cantidad = dias === 1 ? '1 día' : `${dias} días`;
  else {
    const meses = Math.round(dias / 30);
    cantidad = meses === 1 ? '1 mes' : `${meses} meses`;
  }

  return pasado ? `hace ${cantidad}` : `en ${cantidad}`;
}

export function nombreDiaSemana(fecha) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date(fecha));
}

export function capitalizar(texto) {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/* ------------------------------------------------------------------ */
/* Rejilla del calendario                                              */
/* ------------------------------------------------------------------ */

/**
 * Construye la matriz de seis semanas que se pinta en la vista de calendario.
 * Siempre empieza en lunes e incluye los días de relleno del mes anterior y
 * posterior para que la cuadrícula quede completa.
 */
export function generarRejillaMes(ano, mes) {
  const primerDia = new Date(ano, mes, 1);
  // getDay() devuelve 0 para domingo; se convierte a semana que empieza en lunes.
  const desplazamiento = (primerDia.getDay() + 6) % 7;
  const inicio = sumarDias(primerDia, -desplazamiento);

  const celdas = [];
  for (let i = 0; i < 42; i += 1) {
    const dia = sumarDias(inicio, i);
    celdas.push({
      fecha: dia,
      claveISO: aFechaISO(dia),
      delMes: dia.getMonth() === mes,
      esHoy: esHoy(dia)
    });
  }
  return celdas;
}

/**
 * Indica si un instante cae dentro de la franja de "no molestar", que puede
 * cruzar la medianoche (por ejemplo de 23:00 a 07:30).
 */
export function dentroDeNoMolestar(fecha, desde, hasta) {
  if (!desde || !hasta) return false;
  const d = new Date(fecha);
  const minutosActuales = d.getHours() * 60 + d.getMinutes();
  const [hd, md] = desde.split(':').map(Number);
  const [hh, mh] = hasta.split(':').map(Number);
  const inicio = hd * 60 + md;
  const fin = hh * 60 + mh;

  if (inicio === fin) return false;
  if (inicio < fin) return minutosActuales >= inicio && minutosActuales < fin;
  // Franja que cruza la medianoche.
  return minutosActuales >= inicio || minutosActuales < fin;
}
