/**
 * Puente con calendarios externos.
 *
 * No hace falta ninguna cuenta ni permiso de Google: se generan archivos .ics
 * estándar (que Google Calendar, Outlook y el calendario del móvil importan
 * sin problema) y enlaces directos al formulario de Google Calendar.
 *
 * Si algún día se quiere sincronización bidireccional real haría falta OAuth y
 * un pequeño servidor; el modelo de datos ya está preparado para ello.
 */

import { combinarFechaHora, deFechaISO } from './fechas.js';
import { normalizarRepeticion } from './repeticion.js';
import { obtenerCategoria } from './constantes.js';

const CODIGOS_DIA = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' };

/* ------------------------------------------------------------------ */
/* Formatos de fecha del estándar iCalendar                            */
/* ------------------------------------------------------------------ */

/** Fecha en UTC con el formato AAAAMMDDTHHMMSSZ. */
function aFormatoUTC(fecha) {
  return new Date(fecha).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Fecha suelta (eventos de todo el día) con el formato AAAAMMDD. */
function aFormatoDia(fecha) {
  const d = new Date(fecha);
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
}

/** Escapa los caracteres que el formato iCalendar trata de forma especial. */
function escapar(texto) {
  return String(texto || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * El estándar limita las líneas a 75 octetos; las más largas se parten
 * añadiendo un espacio al principio de la continuación.
 */
function plegarLinea(linea) {
  if (linea.length <= 73) return linea;
  const trozos = [];
  let resto = linea;
  trozos.push(resto.slice(0, 73));
  resto = resto.slice(73);
  while (resto.length > 72) {
    trozos.push(' ' + resto.slice(0, 72));
    resto = resto.slice(72);
  }
  if (resto.length) trozos.push(' ' + resto);
  return trozos.join('\r\n');
}

/* ------------------------------------------------------------------ */
/* Regla de repetición                                                 */
/* ------------------------------------------------------------------ */

/** Horas enteras que caen dentro de una franja, incluida la que cruza la medianoche. */
function horasDeFranja(franja) {
  const desde = Number(String(franja.desde).split(':')[0]);
  const hasta = Number(String(franja.hasta).split(':')[0]);
  const horas = [];
  for (let h = 0; h < 24; h += 1) {
    const dentro = desde < hasta ? h >= desde && h <= hasta : h >= desde || h <= hasta;
    if (dentro) horas.push(h);
  }
  return horas;
}

/** Traduce la repetición interna a una RRULE de iCalendar. */
export function construirRRULE(repeticion) {
  if (!repeticion || repeticion.tipo === 'ninguna') return null;
  const r = normalizarRepeticion(repeticion);
  const partes = [];

  switch (r.tipo) {
    case 'horas':
      partes.push('FREQ=HOURLY', `INTERVAL=${r.intervalo}`);
      // La franja se traduce con BYHOUR, que filtra las horas permitidas.
      if (r.franja) partes.push(`BYHOUR=${horasDeFranja(r.franja).join(',')}`);
      break;
    case 'diaria':
      partes.push('FREQ=DAILY', `INTERVAL=${r.intervalo}`);
      break;
    case 'semanal':
      partes.push('FREQ=WEEKLY', `INTERVAL=${r.intervalo}`);
      if (r.diasSemana.length) {
        partes.push(`BYDAY=${r.diasSemana.map((d) => CODIGOS_DIA[d]).join(',')}`);
      }
      break;
    case 'mensual':
      partes.push('FREQ=MONTHLY', `INTERVAL=${r.intervalo}`);
      if (r.diaMes) partes.push(`BYMONTHDAY=${r.diaMes}`);
      break;
    case 'anual':
      partes.push('FREQ=YEARLY', `INTERVAL=${r.intervalo}`);
      break;
    default:
      return null;
  }

  /*
   * Varias horas al día se expresan con BYHOUR y BYMINUTE, pero el estándar
   * las combina entre sí: BYHOUR=9,15 con BYMINUTE=0,30 daría cuatro avisos,
   * no dos. Por eso solo se exportan cuando todas comparten el mismo minuto;
   * con minutos distintos se deja la primera hora, que es la de DTSTART, y el
   * resto se queda en la aplicación.
   */
  if (r.tipo !== 'horas' && r.horas.length > 1) {
    const partidas = r.horas.map((hora) => hora.split(':').map(Number));
    const minutos = [...new Set(partidas.map(([, m]) => m))];
    if (minutos.length === 1) {
      partes.push(`BYHOUR=${partidas.map(([h]) => h).join(',')}`, `BYMINUTE=${minutos[0]}`);
    }
  }

  if (r.fin?.tipo === 'fecha' && r.fin.fecha) {
    const fin = deFechaISO(r.fin.fecha);
    if (fin) {
      fin.setHours(23, 59, 59, 0);
      partes.push(`UNTIL=${aFormatoUTC(fin)}`);
    }
  } else if (r.fin?.tipo === 'repeticiones' && Number(r.fin.repeticiones) > 0) {
    partes.push(`COUNT=${Number(r.fin.repeticiones)}`);
  }

  return partes.join(';');
}

/* ------------------------------------------------------------------ */
/* Generación del archivo .ics                                         */
/* ------------------------------------------------------------------ */

function construirEvento(recordatorio) {
  const inicio = combinarFechaHora(recordatorio.fecha, recordatorio.hora);
  if (!inicio) return [];

  const categoria = obtenerCategoria(recordatorio.categoria);
  const lineas = ['BEGIN:VEVENT'];

  lineas.push(`UID:${recordatorio.id}@recuerda.app`);
  lineas.push(`DTSTAMP:${aFormatoUTC(new Date())}`);

  if (recordatorio.todoElDia) {
    const finDia = new Date(inicio);
    finDia.setDate(finDia.getDate() + 1);
    lineas.push(`DTSTART;VALUE=DATE:${aFormatoDia(inicio)}`);
    lineas.push(`DTEND;VALUE=DATE:${aFormatoDia(finDia)}`);
  } else {
    const fin = new Date(inicio.getTime() + (recordatorio.duracionMinutos || 30) * 60000);
    lineas.push(`DTSTART:${aFormatoUTC(inicio)}`);
    lineas.push(`DTEND:${aFormatoUTC(fin)}`);
  }

  lineas.push(`SUMMARY:${escapar(recordatorio.titulo)}`);

  const descripcion = [
    recordatorio.notas,
    recordatorio.enlace ? `Enlace: ${recordatorio.enlace}` : '',
    (recordatorio.subtareas || []).length
      ? 'Subtareas: ' + recordatorio.subtareas.map((s) => s.texto).join(' / ')
      : ''
  ]
    .filter(Boolean)
    .join('\n');

  if (descripcion) lineas.push(`DESCRIPTION:${escapar(descripcion)}`);
  lineas.push(`CATEGORIES:${escapar(categoria.nombre)}`);

  const prioridadesICS = { urgente: 1, alta: 3, media: 5, baja: 7 };
  lineas.push(`PRIORITY:${prioridadesICS[recordatorio.prioridad] || 5}`);
  lineas.push(`STATUS:${recordatorio.completado ? 'CONFIRMED' : 'TENTATIVE'}`);

  const regla = construirRRULE(recordatorio.repeticion);
  if (regla) lineas.push(`RRULE:${regla}`);

  // Un VALARM por cada aviso previo configurado.
  (recordatorio.avisosPrevios || [0]).forEach((minutos) => {
    lineas.push('BEGIN:VALARM');
    lineas.push('ACTION:DISPLAY');
    lineas.push(`DESCRIPTION:${escapar(recordatorio.titulo)}`);
    lineas.push(`TRIGGER:-PT${Math.max(0, Number(minutos) || 0)}M`);
    lineas.push('END:VALARM');
  });

  lineas.push('END:VEVENT');
  return lineas;
}

/** Construye un calendario .ics completo con los recordatorios indicados. */
export function generarICS(recordatorios) {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Recuerda//Gestor de recordatorios//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Recuerda',
    'X-WR-TIMEZONE:Europe/Madrid'
  ];

  recordatorios.forEach((recordatorio) => {
    lineas.push(...construirEvento(recordatorio));
  });

  lineas.push('END:VCALENDAR');
  return lineas.map(plegarLinea).join('\r\n');
}

/* ------------------------------------------------------------------ */
/* Enlace directo a Google Calendar                                    */
/* ------------------------------------------------------------------ */

/**
 * Genera la URL del formulario "añadir evento" de Google Calendar con todos
 * los datos ya rellenos. Funciona sin cuenta vinculada ni permisos.
 */
export function enlaceGoogleCalendar(recordatorio) {
  const inicio = combinarFechaHora(recordatorio.fecha, recordatorio.hora);
  if (!inicio) return null;

  let fechas;
  if (recordatorio.todoElDia) {
    const finDia = new Date(inicio);
    finDia.setDate(finDia.getDate() + 1);
    fechas = `${aFormatoDia(inicio)}/${aFormatoDia(finDia)}`;
  } else {
    const fin = new Date(inicio.getTime() + (recordatorio.duracionMinutos || 30) * 60000);
    fechas = `${aFormatoUTC(inicio)}/${aFormatoUTC(fin)}`;
  }

  const parametros = new URLSearchParams({
    action: 'TEMPLATE',
    text: recordatorio.titulo || 'Recordatorio',
    dates: fechas
  });

  const detalles = [recordatorio.notas, recordatorio.enlace].filter(Boolean).join('\n');
  if (detalles) parametros.set('details', detalles);

  const regla = construirRRULE(recordatorio.repeticion);
  if (regla) parametros.set('recur', `RRULE:${regla}`);

  return `https://calendar.google.com/calendar/render?${parametros.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Descarga y copia de seguridad                                       */
/* ------------------------------------------------------------------ */

/** Fuerza la descarga de un contenido de texto como archivo. */
export function descargarArchivo(nombre, contenido, tipo = 'text/plain;charset=utf-8') {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  // Se libera con retraso para no cortar la descarga en navegadores lentos.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Exporta todos los recordatorios como calendario descargable. */
export function exportarICS(recordatorios) {
  const marca = new Date().toISOString().slice(0, 10);
  descargarArchivo(`recuerda-${marca}.ics`, generarICS(recordatorios), 'text/calendar;charset=utf-8');
}

/** Copia de seguridad completa en JSON, para restaurar en otro dispositivo. */
export function exportarJSON(datos) {
  const marca = new Date().toISOString().slice(0, 10);
  descargarArchivo(
    `recuerda-copia-${marca}.json`,
    JSON.stringify(datos, null, 2),
    'application/json;charset=utf-8'
  );
}

/**
 * Comparte el recordatorio con las aplicaciones del móvil si el navegador lo
 * permite; si no, deja el texto en el portapapeles.
 */
export async function compartirRecordatorio(recordatorio, textoFecha) {
  const texto = `${recordatorio.titulo}\n${textoFecha}${
    recordatorio.notas ? '\n' + recordatorio.notas : ''
  }`;

  if (navigator.share) {
    try {
      await navigator.share({ title: recordatorio.titulo, text: texto });
      return 'compartido';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelado';
    }
  }

  try {
    await navigator.clipboard.writeText(texto);
    return 'copiado';
  } catch (error) {
    return 'error';
  }
}
