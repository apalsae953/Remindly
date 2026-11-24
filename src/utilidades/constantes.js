/**
 * Catálogos fijos de la aplicación.
 *
 * Las categorías bajaron de dieciocho a ocho: con dieciocho nadie elegía, se
 * quedaba todo en "Personal". Ocho caben de un vistazo y siguen cubriendo lo
 * que la gente apunta de verdad.
 */

/* ------------------------------------------------------------------ */
/* Categorías                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORIAS = [
  { id: 'personal', nombre: 'Personal', icono: 'user', color: 'var(--cat-personal)' },
  { id: 'trabajo', nombre: 'Trabajo', icono: 'briefcase', color: 'var(--cat-trabajo)' },
  { id: 'salud', nombre: 'Salud', icono: 'heart-pulse', color: 'var(--cat-salud)' },
  { id: 'casa', nombre: 'Casa', icono: 'house', color: 'var(--cat-casa)' },
  { id: 'dinero', nombre: 'Dinero', icono: 'wallet', color: 'var(--cat-dinero)' },
  { id: 'gente', nombre: 'Gente', icono: 'users', color: 'var(--cat-gente)' },
  { id: 'ocio', nombre: 'Ocio', icono: 'compass', color: 'var(--cat-ocio)' },
  { id: 'otros', nombre: 'Otros', icono: 'tag', color: 'var(--cat-otros)' }
];

/**
 * Equivalencias de las categorías antiguas, para que los recordatorios
 * guardados antes del rediseño sigan teniendo una categoría válida.
 */
export const CATEGORIAS_ANTIGUAS = {
  medicacion: 'salud',
  ejercicio: 'salud',
  compras: 'casa',
  hogar: 'casa',
  plantas: 'casa',
  mascotas: 'casa',
  coche: 'casa',
  pagos: 'dinero',
  estudios: 'trabajo',
  familia: 'gente',
  cumpleanos: 'gente',
  llamadas: 'gente',
  viajes: 'ocio'
};

const MAPA_CATEGORIAS = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));

export function obtenerCategoria(id) {
  const directa = MAPA_CATEGORIAS[id];
  if (directa) return directa;
  const migrada = MAPA_CATEGORIAS[CATEGORIAS_ANTIGUAS[id]];
  return migrada || MAPA_CATEGORIAS.otros;
}

/* ------------------------------------------------------------------ */
/* Prioridades                                                         */
/* ------------------------------------------------------------------ */

/**
 * Tres niveles en lugar de cuatro. "Baja" y "Media" nunca se distinguían de
 * verdad: lo único que importa es si algo es normal o si es importante.
 */
export const PRIORIDADES = [
  { id: 'normal', nombre: 'Normal', peso: 0 },
  { id: 'alta', nombre: 'Importante', peso: 1 },
  { id: 'urgente', nombre: 'Urgente', peso: 2 }
];

export const PRIORIDADES_ANTIGUAS = { baja: 'normal', media: 'normal' };

const MAPA_PRIORIDADES = Object.fromEntries(PRIORIDADES.map((p) => [p.id, p]));

export function obtenerPrioridad(id) {
  return MAPA_PRIORIDADES[id] || MAPA_PRIORIDADES[PRIORIDADES_ANTIGUAS[id]] || MAPA_PRIORIDADES.normal;
}

/* ------------------------------------------------------------------ */
/* Repeticiones                                                        */
/* ------------------------------------------------------------------ */

/**
 * Frecuencias de repetición. Las seis caben de un vistazo y cada una lleva su
 * propia explicación, porque "cada X días" o "varias veces al día" no se
 * adivinan desde un chip suelto: hay que decirlo con palabras.
 */
export const FRECUENCIAS = [
  { id: 'ninguna', nombre: 'Una sola vez', ayuda: 'No se repite' },
  { id: 'diaria', nombre: 'Cada día', ayuda: 'También cada 2, 3 o N días' },
  { id: 'semanal', nombre: 'Días de la semana', ayuda: 'Los que elijas, cada N semanas' },
  { id: 'mensual', nombre: 'Cada mes', ayuda: 'Un día fijo del mes' },
  { id: 'anual', nombre: 'Cada año', ayuda: 'Cumpleaños, revisiones' },
  { id: 'horas', nombre: 'Cada pocas horas', ayuda: 'Por reloj, no por días' }
];

/** Nombre de la unidad de cada frecuencia, para el contador "Cada N ...". */
export const UNIDAD_FRECUENCIA = {
  diaria: { singular: 'día', plural: 'días', maximo: 365 },
  semanal: { singular: 'semana', plural: 'semanas', maximo: 52 },
  mensual: { singular: 'mes', plural: 'meses', maximo: 24 },
  anual: { singular: 'año', plural: 'años', maximo: 10 },
  horas: { singular: 'hora', plural: 'horas', maximo: 23 }
};

/**
 * Repartos típicos de varias tomas al día. Son los que de verdad se usan
 * (pastillas, riegos, estiramientos) y ahorran teclear cuatro horas a mano.
 */
export const REPARTOS_HORAS = [
  { nombre: '1 vez', horas: ['09:00'] },
  { nombre: '2 veces', horas: ['09:00', '21:00'] },
  { nombre: '3 veces', horas: ['09:00', '15:00', '21:00'] },
  { nombre: '4 veces', horas: ['08:00', '12:00', '16:00', '20:00'] },
  { nombre: '6 veces', horas: ['08:00', '11:00', '14:00', '17:00', '20:00', '23:00'] }
];

/** Franjas habituales para la repetición por horas. */
export const FRANJAS_HORARIAS = [
  { nombre: 'Todo el día', franja: null },
  { nombre: 'De día', franja: { desde: '08:00', hasta: '22:00' } },
  { nombre: 'Horario laboral', franja: { desde: '09:00', hasta: '18:00' } },
  { nombre: 'Solo de noche', franja: { desde: '22:00', hasta: '07:00' } }
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

/* ------------------------------------------------------------------ */
/* Avisos                                                              */
/* ------------------------------------------------------------------ */

export const AVISOS_PREVIOS = [
  { minutos: 0, nombre: 'A la hora' },
  { minutos: 10, nombre: '10 min antes' },
  { minutos: 30, nombre: '30 min antes' },
  { minutos: 60, nombre: '1 h antes' },
  { minutos: 1440, nombre: 'El día antes' },
  { minutos: 10080, nombre: 'La semana antes' }
];

export const OPCIONES_POSPONER = [
  { minutos: 10, nombre: '10 min' },
  { minutos: 30, nombre: '30 min' },
  { minutos: 60, nombre: '1 hora' },
  { minutos: 180, nombre: '3 horas' },
  { minutos: 1440, nombre: 'Mañana' }
];

/* ------------------------------------------------------------------ */
/* Compositor                                                          */
/* ------------------------------------------------------------------ */

/**
 * Frases de ejemplo que aparecen cuando el compositor está vacío y enfocado.
 * Enseñan la sintaxis sin tener que explicarla en ningún sitio.
 */
export const EJEMPLOS_COMPOSITOR = [
  'Llamar a Ana mañana a las 9',
  'Pagar el alquiler cada mes',
  'Gimnasio cada martes a las 19',
  'Sacar la basura todos los días a las 21:30',
  'Revisión del coche el 15 de marzo',
  'Beber agua cada 2 horas'
];

/* ------------------------------------------------------------------ */
/* Tramos de la lista                                                  */
/* ------------------------------------------------------------------ */

export const TRAMOS = [
  { id: 'hoy', nombre: 'Hoy' },
  { id: 'proximos', nombre: 'Próximos' },
  { id: 'hechos', nombre: 'Hechos' }
];

/* ------------------------------------------------------------------ */
/* Valores por defecto                                                 */
/* ------------------------------------------------------------------ */

export const AJUSTES_POR_DEFECTO = {
  tema: 'auto', // 'auto' | 'claro' | 'oscuro'
  sonido: true,
  vibracion: true,
  minutosPosponerRapido: 10,
  horaPorDefecto: '09:00',
  avisosPreviosPorDefecto: [0],
  noMolestar: false,
  noMolestarDesde: '23:00',
  noMolestarHasta: '07:30',
  primeraVez: true
};

export const CLAVE_ALMACEN_RECORDATORIOS = 'recuerda.recordatorios';
export const CLAVE_ALMACEN_AJUSTES = 'recuerda.ajustes';
export const CLAVE_ALMACEN_HISTORIAL = 'recuerda.historial';
