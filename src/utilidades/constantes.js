/**
 * Catálogos fijos de la aplicación: categorías, prioridades, tipos de
 * repetición, avisos previos y plantillas rápidas.
 *
 * Todo lo que aquí se define es puramente descriptivo, sin lógica, para que
 * añadir una categoría nueva sea cuestión de una sola línea.
 */

/* ------------------------------------------------------------------ */
/* Categorías                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORIAS = [
  { id: 'personal', nombre: 'Personal', icono: 'house', color: '#6c5ce7' },
  { id: 'trabajo', nombre: 'Trabajo', icono: 'briefcase', color: '#0984e3' },
  { id: 'salud', nombre: 'Salud', icono: 'heart-pulse', color: '#e84393' },
  { id: 'medicacion', nombre: 'Medicación', icono: 'pills', color: '#00b894' },
  { id: 'compras', nombre: 'Compras', icono: 'cart-shopping', color: '#fdcb6e' },
  { id: 'pagos', nombre: 'Pagos', icono: 'money-bill-wave', color: '#00cec9' },
  { id: 'estudios', nombre: 'Estudios', icono: 'graduation-cap', color: '#a29bfe' },
  { id: 'ejercicio', nombre: 'Ejercicio', icono: 'dumbbell', color: '#ff7675' },
  { id: 'hogar', nombre: 'Hogar', icono: 'wrench', color: '#b2bec3' },
  { id: 'familia', nombre: 'Familia', icono: 'users', color: '#fd79a8' },
  { id: 'cumpleanos', nombre: 'Cumpleaños', icono: 'cake-candles', color: '#e17055' },
  { id: 'mascotas', nombre: 'Mascotas', icono: 'paw', color: '#55efc4' },
  { id: 'coche', nombre: 'Coche', icono: 'car', color: '#636e72' },
  { id: 'viajes', nombre: 'Viajes', icono: 'plane', color: '#74b9ff' },
  { id: 'ocio', nombre: 'Ocio', icono: 'film', color: '#ffeaa7' },
  { id: 'plantas', nombre: 'Plantas', icono: 'seedling', color: '#26de81' },
  { id: 'llamadas', nombre: 'Llamadas', icono: 'phone', color: '#4834d4' },
  { id: 'otros', nombre: 'Otros', icono: 'tag', color: '#95a5a6' }
];

const MAPA_CATEGORIAS = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));

export function obtenerCategoria(id) {
  return MAPA_CATEGORIAS[id] || MAPA_CATEGORIAS.otros;
}

/* ------------------------------------------------------------------ */
/* Prioridades                                                         */
/* ------------------------------------------------------------------ */

export const PRIORIDADES = [
  { id: 'baja', nombre: 'Baja', color: '#74b9ff', peso: 0, icono: 'flag' },
  { id: 'media', nombre: 'Media', color: '#fdcb6e', peso: 1, icono: 'flag' },
  { id: 'alta', nombre: 'Alta', color: '#ff7675', peso: 2, icono: 'flag' },
  { id: 'urgente', nombre: 'Urgente', color: '#d63031', peso: 3, icono: 'fire' }
];

const MAPA_PRIORIDADES = Object.fromEntries(PRIORIDADES.map((p) => [p.id, p]));

export function obtenerPrioridad(id) {
  return MAPA_PRIORIDADES[id] || MAPA_PRIORIDADES.media;
}

/* ------------------------------------------------------------------ */
/* Repeticiones                                                        */
/* ------------------------------------------------------------------ */

export const TIPOS_REPETICION = [
  { id: 'ninguna', nombre: 'No se repite', icono: 'calendar-day' },
  { id: 'horas', nombre: 'Cada X horas', icono: 'stopwatch' },
  { id: 'diaria', nombre: 'Cada día', icono: 'sun' },
  { id: 'laborables', nombre: 'De lunes a viernes', icono: 'briefcase' },
  { id: 'finsemana', nombre: 'Fines de semana', icono: 'bed' },
  { id: 'semanal', nombre: 'Días concretos de la semana', icono: 'calendar-days' },
  { id: 'mensual', nombre: 'Cada mes', icono: 'calendar' },
  { id: 'anual', nombre: 'Cada año', icono: 'cake-candles' },
  { id: 'personalizada', nombre: 'Personalizada', icono: 'sliders' }
];

// La semana empieza en lunes, como es habitual en España.
export const DIAS_SEMANA = [
  { indice: 1, corto: 'L', nombre: 'Lunes' },
  { indice: 2, corto: 'M', nombre: 'Martes' },
  { indice: 3, corto: 'X', nombre: 'Miércoles' },
  { indice: 4, corto: 'J', nombre: 'Jueves' },
  { indice: 5, corto: 'V', nombre: 'Viernes' },
  { indice: 6, corto: 'S', nombre: 'Sábado' },
  { indice: 0, corto: 'D', nombre: 'Domingo' }
];

export const UNIDADES_PERSONALIZADAS = [
  { id: 'dias', nombre: 'días' },
  { id: 'semanas', nombre: 'semanas' },
  { id: 'meses', nombre: 'meses' },
  { id: 'anos', nombre: 'años' }
];

/* ------------------------------------------------------------------ */
/* Avisos previos y posposiciones                                      */
/* ------------------------------------------------------------------ */

export const AVISOS_PREVIOS = [
  { minutos: 0, nombre: 'A la hora exacta' },
  { minutos: 5, nombre: '5 minutos antes' },
  { minutos: 10, nombre: '10 minutos antes' },
  { minutos: 15, nombre: '15 minutos antes' },
  { minutos: 30, nombre: '30 minutos antes' },
  { minutos: 60, nombre: '1 hora antes' },
  { minutos: 120, nombre: '2 horas antes' },
  { minutos: 1440, nombre: '1 día antes' },
  { minutos: 2880, nombre: '2 días antes' },
  { minutos: 10080, nombre: '1 semana antes' }
];

export const OPCIONES_POSPONER = [
  { minutos: 5, nombre: '5 min', icono: 'clock' },
  { minutos: 10, nombre: '10 min', icono: 'clock' },
  { minutos: 30, nombre: '30 min', icono: 'clock' },
  { minutos: 60, nombre: '1 hora', icono: 'hourglass-half' },
  { minutos: 180, nombre: '3 horas', icono: 'hourglass-half' },
  { minutos: 1440, nombre: 'Mañana', icono: 'calendar-day' }
];

/* ------------------------------------------------------------------ */
/* Plantillas rápidas                                                  */
/* ------------------------------------------------------------------ */

/**
 * Atajos para crear recordatorios habituales con un solo toque. Cada plantilla
 * rellena el formulario, pero el usuario siempre puede ajustar lo que quiera.
 */
export const PLANTILLAS = [
  {
    id: 'medicacion',
    nombre: 'Tomar pastilla',
    icono: 'pills',
    categoria: 'medicacion',
    prioridad: 'alta',
    repeticion: { tipo: 'diaria', intervalo: 1 },
    persistente: true
  },
  {
    id: 'agua',
    nombre: 'Beber agua',
    icono: 'droplet',
    categoria: 'salud',
    prioridad: 'baja',
    repeticion: { tipo: 'horas', intervalo: 2 }
  },
  {
    id: 'reunion',
    nombre: 'Reunión',
    icono: 'users',
    categoria: 'trabajo',
    prioridad: 'alta',
    avisosPrevios: [0, 15]
  },
  {
    id: 'basura',
    nombre: 'Sacar la basura',
    icono: 'inbox',
    categoria: 'hogar',
    prioridad: 'media',
    repeticion: { tipo: 'diaria', intervalo: 1 }
  },
  {
    id: 'recibo',
    nombre: 'Pagar recibo',
    icono: 'money-bill-wave',
    categoria: 'pagos',
    prioridad: 'alta',
    repeticion: { tipo: 'mensual', intervalo: 1 },
    avisosPrevios: [0, 1440]
  },
  {
    id: 'gimnasio',
    nombre: 'Ir al gimnasio',
    icono: 'dumbbell',
    categoria: 'ejercicio',
    prioridad: 'media',
    repeticion: { tipo: 'semanal', intervalo: 1, diasSemana: [1, 3, 5] }
  },
  {
    id: 'cumple',
    nombre: 'Cumpleaños',
    icono: 'cake-candles',
    categoria: 'cumpleanos',
    prioridad: 'media',
    todoElDia: true,
    repeticion: { tipo: 'anual', intervalo: 1 },
    avisosPrevios: [0, 1440]
  },
  {
    id: 'plantas',
    nombre: 'Regar las plantas',
    icono: 'seedling',
    categoria: 'plantas',
    prioridad: 'baja',
    repeticion: { tipo: 'personalizada', intervalo: 3, unidad: 'dias' }
  },
  {
    id: 'llamada',
    nombre: 'Llamar a alguien',
    icono: 'phone',
    categoria: 'llamadas',
    prioridad: 'media'
  },
  {
    id: 'coche',
    nombre: 'Revisión del coche',
    icono: 'car',
    categoria: 'coche',
    prioridad: 'media',
    repeticion: { tipo: 'personalizada', intervalo: 6, unidad: 'meses' },
    avisosPrevios: [0, 10080]
  }
];

/* ------------------------------------------------------------------ */
/* Vistas y ordenaciones                                               */
/* ------------------------------------------------------------------ */

export const VISTAS = [
  { id: 'hoy', nombre: 'Hoy', icono: 'bolt' },
  { id: 'agenda', nombre: 'Agenda', icono: 'list-check' },
  { id: 'calendario', nombre: 'Calendario', icono: 'calendar-days' },
  { id: 'resumen', nombre: 'Resumen', icono: 'chart-simple' },
  { id: 'ajustes', nombre: 'Ajustes', icono: 'gear' }
];

export const ORDENACIONES = [
  { id: 'fecha', nombre: 'Por fecha', icono: 'clock' },
  { id: 'prioridad', nombre: 'Por prioridad', icono: 'flag' },
  { id: 'categoria', nombre: 'Por categoría', icono: 'layer-group' },
  { id: 'alfabetico', nombre: 'Alfabético', icono: 'bars' }
];

/* ------------------------------------------------------------------ */
/* Valores por defecto                                                 */
/* ------------------------------------------------------------------ */

export const AJUSTES_POR_DEFECTO = {
  tema: 'auto', // 'auto' | 'claro' | 'oscuro'
  colorPrincipal: '#6c5ce7',
  sonido: true,
  vibracion: true,
  minutosPosponerRapido: 10,
  horaPorDefecto: '09:00',
  avisosPreviosPorDefecto: [0],
  noMolestar: false,
  noMolestarDesde: '23:00',
  noMolestarHasta: '07:30',
  ordenacion: 'fecha',
  mostrarCompletados: false,
  agruparPorDia: true,
  primeraVez: true
};

export const CLAVE_ALMACEN_RECORDATORIOS = 'recuerda.recordatorios';
export const CLAVE_ALMACEN_AJUSTES = 'recuerda.ajustes';
export const CLAVE_ALMACEN_HISTORIAL = 'recuerda.historial';
