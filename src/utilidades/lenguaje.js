/**
 * Interpretación de texto escrito en lenguaje natural.
 *
 * Permite crear un recordatorio escribiendo una frase corriente, por ejemplo:
 *   "Llamar a Ana mañana a las 9 #familia urgente"
 *   "Pagar el alquiler el día 1 cada mes"
 *   "Sacar la basura todos los días a las 21:30"
 *
 * El objetivo no es entenderlo todo, sino acertar con las formas habituales y
 * dejar siempre el resto del texto como título. Lo que no se reconoce no
 * estorba: simplemente se queda en el título.
 */

import { aFechaISO, sumarDias } from './fechas.js';
import { REPARTOS_HORAS } from './constantes.js';
import { horaAMinutos, minutosAHora } from './repeticion.js';

const NUMEROS_ESCRITOS = { una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };

/**
 * Reparte N avisos a lo largo del día. Si hay un reparto típico para ese
 * número se usa ese; si no, se espacian entre las 8:00 y las 22:00.
 */
function repartoDeHoras(veces) {
  if (!Number.isFinite(veces) || veces < 2 || veces > 12) return null;
  const tipico = REPARTOS_HORAS.find((reparto) => reparto.horas.length === veces);
  if (tipico) return tipico.horas;

  const paso = Math.round((14 * 60) / (veces - 1));
  return Array.from({ length: veces }, (sinUsar, i) => minutosAHora(8 * 60 + i * paso));
}

/**
 * Recoloca una lista de horas para que empiece en otra, conservando los huecos
 * entre avisos: "3 veces al día a las 10" son las 10, las 16 y las 22.
 */
function recolocarHoras(horas, primera) {
  const inicio = horaAMinutos(primera);
  if (inicio === null) return horas;
  const base = horas.map(horaAMinutos);
  return base.map((minutos) => minutosAHora(inicio + (minutos - base[0])));
}

const DIAS = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  'miércoles': 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  'sábado': 6
};

const MESES = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11
};

/** Quita los acentos para comparar sin depender de cómo se escriba. */
function sinAcentos(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Analiza la frase y devuelve los campos detectados junto con el título ya
 * limpio de las expresiones consumidas.
 */
export function interpretarTexto(entrada) {
  if (!entrada || !entrada.trim()) return null;

  let texto = ` ${entrada.trim()} `;
  const resultado = {
    titulo: '',
    fecha: null,
    hora: null,
    repeticion: null,
    prioridad: null,
    categoria: null,
    etiquetas: [],
    detectado: []
  };

  const ahora = new Date();
  let fechaDetectada = null;

  /** Elimina del texto la expresión reconocida para que no acabe en el título. */
  const consumir = (expresion, descripcion) => {
    let encontrado = false;
    texto = texto.replace(expresion, (coincidencia) => {
      encontrado = true;
      return ' ';
    });
    if (encontrado && descripcion) resultado.detectado.push(descripcion);
    return encontrado;
  };

  /* ---------------- Etiquetas ---------------- */

  const etiquetas = texto.match(/#([\p{L}\p{N}_-]+)/gu);
  if (etiquetas) {
    resultado.etiquetas = etiquetas.map((e) => e.slice(1).toLowerCase());
    texto = texto.replace(/#[\p{L}\p{N}_-]+/gu, ' ');
  }

  /* ---------------- Prioridad ---------------- */

  if (consumir(/\b(urgent[e]?|urgentemente)\b/i, 'prioridad urgente')) {
    resultado.prioridad = 'urgente';
  } else if (consumir(/\b(importante|prioritario)\b/i, 'prioridad alta')) {
    resultado.prioridad = 'alta';
  }

  /* ---------------- Repetición ---------------- */

  // "cada 2 horas de 8 a 22" limita la repetición a una franja del día.
  const cadaHorasFranja = texto.match(
    /\bcada\s+(\d{1,2})\s*(?:h|horas?)\s+(?:de|entre)\s+(?:las\s+)?(\d{1,2})(?::(\d{2}))?\s+(?:a|hasta|y)\s+(?:las\s+)?(\d{1,2})(?::(\d{2}))?\b/i
  );
  if (cadaHorasFranja) {
    const [, cada, horaDesde, minDesde, horaHasta, minHasta] = cadaHorasFranja;
    resultado.repeticion = {
      tipo: 'horas',
      intervalo: Number(cada),
      franja: {
        desde: minutosAHora(Number(horaDesde) * 60 + Number(minDesde || 0)),
        hasta: minutosAHora(Number(horaHasta) * 60 + Number(minHasta || 0))
      }
    };
    resultado.detectado.push(`cada ${cada} horas, de ${horaDesde} a ${horaHasta}`);
    texto = texto.replace(cadaHorasFranja[0], ' ');
  }

  // "3 veces al día" reparte varios avisos dentro del mismo día.
  const vecesPorDia = texto.match(
    /\b(\d{1,2}|una|dos|tres|cuatro|cinco|seis)\s+veces?\s+al\s+d[ií]a\b/i
  );
  if (vecesPorDia) {
    const bruto = vecesPorDia[1].toLowerCase();
    const veces = NUMEROS_ESCRITOS[bruto] ?? Number(bruto);
    const reparto = repartoDeHoras(veces);
    if (reparto) {
      resultado.repeticion = { tipo: 'diaria', intervalo: 1, horas: reparto };
      resultado.detectado.push(`${veces} veces al día`);
      texto = texto.replace(vecesPorDia[0], ' ');
    }
  }

  const cadaHoras = texto.match(/\bcada\s+(\d{1,2})\s*(h|horas?)\b/i);
  if (!resultado.repeticion && cadaHoras) {
    resultado.repeticion = { tipo: 'horas', intervalo: Number(cadaHoras[1]) };
    resultado.detectado.push(`cada ${cadaHoras[1]} horas`);
    texto = texto.replace(cadaHoras[0], ' ');
  }

  const cadaDias = texto.match(/\bcada\s+(\d{1,3})\s*(d[ií]as?)\b/i);
  if (!resultado.repeticion && cadaDias) {
    resultado.repeticion = { tipo: 'diaria', intervalo: Number(cadaDias[1]) };
    resultado.detectado.push(`cada ${cadaDias[1]} días`);
    texto = texto.replace(cadaDias[0], ' ');
  }

  if (!resultado.repeticion) {
    if (consumir(/\b(cada d[ií]a|todos los d[ií]as|diariamente|a diario)\b/i, 'cada día')) {
      resultado.repeticion = { tipo: 'diaria', intervalo: 1 };
    } else if (consumir(/\b(cada semana|semanalmente|todas las semanas)\b/i, 'cada semana')) {
      resultado.repeticion = { tipo: 'semanal', intervalo: 1 };
    } else if (consumir(/\b(cada mes|mensualmente|todos los meses)\b/i, 'cada mes')) {
      resultado.repeticion = { tipo: 'mensual', intervalo: 1 };
    } else if (consumir(/\b(cada a[nñ]o|anualmente|todos los a[nñ]os)\b/i, 'cada año')) {
      resultado.repeticion = { tipo: 'anual', intervalo: 1 };
    } else if (consumir(/\b(entre semana|de lunes a viernes|laborables)\b/i, 'de lunes a viernes')) {
      resultado.repeticion = { tipo: 'semanal', intervalo: 1, diasSemana: [1, 2, 3, 4, 5] };
    } else if (consumir(/\b(fines de semana|findes?)\b/i, 'fines de semana')) {
      resultado.repeticion = { tipo: 'semanal', intervalo: 1, diasSemana: [6, 0] };
    }
  }

  // "todos los lunes" o "cada martes" fijan un día concreto de la semana.
  const cadaDiaSemana = sinAcentos(texto).match(
    /\b(?:cada|todos los|todas las)\s+(lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)\b/i
  );
  if (cadaDiaSemana) {
    // Ojo: lunes, martes, miércoles, jueves y viernes ya terminan en ese, así
    // que solo se quita el plural cuando la palabra tal cual no existe.
    const bruto = cadaDiaSemana[1].toLowerCase();
    const clave = DIAS[bruto] !== undefined ? bruto : bruto.replace(/s$/, '');
    const indice = DIAS[clave];
    if (indice !== undefined) {
      resultado.repeticion = { tipo: 'semanal', intervalo: 1, diasSemana: [indice] };
      resultado.detectado.push(`cada ${clave}`);
      fechaDetectada = proximoDiaSemana(ahora, indice);
      // Se elimina la expresión respetando el texto original con acentos.
      texto = texto.replace(
        /\b(?:cada|todos los|todas las)\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)\b/i,
        ' '
      );
    }
  }

  /* ---------------- Fecha ---------------- */

  if (!fechaDetectada) {
    if (consumir(/\bpasado ma[nñ]ana\b/i, 'pasado mañana')) {
      fechaDetectada = sumarDias(ahora, 2);
    } else if (consumir(/\bma[nñ]ana\b/i, 'mañana')) {
      fechaDetectada = sumarDias(ahora, 1);
    } else if (consumir(/\bhoy\b/i, 'hoy')) {
      fechaDetectada = new Date(ahora);
    } else if (consumir(/\bpr[oó]xima semana|semana que viene\b/i, 'la semana que viene')) {
      fechaDetectada = sumarDias(ahora, 7);
    }
  }

  // "en 3 días", "en 2 horas", "en 45 minutos"
  const enCantidad = texto.match(/\ben\s+(\d{1,3})\s*(min(?:utos?)?|h(?:oras?)?|d[ií]as?|semanas?)\b/i);
  if (!fechaDetectada && enCantidad) {
    const cantidad = Number(enCantidad[1]);
    const unidad = sinAcentos(enCantidad[2].toLowerCase());
    const destino = new Date(ahora);

    if (unidad.startsWith('min')) destino.setMinutes(destino.getMinutes() + cantidad);
    else if (unidad.startsWith('h')) destino.setHours(destino.getHours() + cantidad);
    else if (unidad.startsWith('semana')) destino.setDate(destino.getDate() + cantidad * 7);
    else destino.setDate(destino.getDate() + cantidad);

    fechaDetectada = destino;
    // Si la referencia era en minutos u horas, también fija la hora exacta.
    if (unidad.startsWith('min') || unidad.startsWith('h')) {
      resultado.hora = `${String(destino.getHours()).padStart(2, '0')}:${String(
        destino.getMinutes()
      ).padStart(2, '0')}`;
    }
    resultado.detectado.push(`en ${cantidad} ${enCantidad[2]}`);
    texto = texto.replace(enCantidad[0], ' ');
  }

  // "el lunes", "este viernes"
  if (!fechaDetectada) {
    const diaSuelto = sinAcentos(texto).match(
      /\b(?:el|este|proximo|pr[oó]ximo)\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/i
    );
    if (diaSuelto) {
      const indice = DIAS[diaSuelto[1].toLowerCase()];
      fechaDetectada = proximoDiaSemana(ahora, indice);
      resultado.detectado.push(diaSuelto[1].toLowerCase());
      texto = texto.replace(
        /\b(?:el|este|pr[oó]ximo)\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i,
        ' '
      );
    }
  }

  // "el 15 de marzo", "el 3 de enero de 2027"
  const fechaLarga = sinAcentos(texto).match(
    /\b(?:el\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?\b/i
  );
  if (!fechaDetectada && fechaLarga) {
    const dia = Number(fechaLarga[1]);
    const mes = MESES[fechaLarga[2].toLowerCase()];
    const ano = fechaLarga[3] ? Number(fechaLarga[3]) : ahora.getFullYear();
    const candidata = new Date(ano, mes, dia);
    // Sin año explícito, si la fecha ya pasó se entiende que es del año que viene.
    if (!fechaLarga[3] && candidata < new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())) {
      candidata.setFullYear(ano + 1);
    }
    fechaDetectada = candidata;
    resultado.detectado.push(`${dia} de ${fechaLarga[2]}`);
    texto = texto.replace(
      /\b(?:el\s+)?(\d{1,2})\s+de\s+[a-zá-úñ]+(?:\s+de\s+\d{4})?\b/i,
      ' '
    );
  }

  // Formato numérico "15/03" o "15-03-2027"
  const fechaNumerica = texto.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (!fechaDetectada && fechaNumerica) {
    const dia = Number(fechaNumerica[1]);
    const mes = Number(fechaNumerica[2]) - 1;
    let ano = fechaNumerica[3] ? Number(fechaNumerica[3]) : ahora.getFullYear();
    if (ano < 100) ano += 2000;
    if (dia >= 1 && dia <= 31 && mes >= 0 && mes <= 11) {
      fechaDetectada = new Date(ano, mes, dia);
      resultado.detectado.push(fechaNumerica[0]);
      texto = texto.replace(fechaNumerica[0], ' ');
    }
  }

  /* ---------------- Hora ---------------- */

  const hora = texto.match(/\b(?:a\s+las?\s+)?(\d{1,2})(?::(\d{2}))?\s*(h|horas|am|pm|de la ma[nñ]ana|de la tarde|de la noche)?\b/i);
  if (!resultado.hora && hora && /a\s+las?|h\b|am|pm|de la/i.test(hora[0])) {
    let horas = Number(hora[1]);
    const minutos = Number(hora[2] || 0);
    const sufijo = (hora[3] || '').toLowerCase();

    if (/pm|de la tarde|de la noche/.test(sufijo) && horas < 12) horas += 12;
    if (/am|de la ma/.test(sufijo) && horas === 12) horas = 0;

    if (horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59) {
      resultado.hora = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
      resultado.detectado.push(`a las ${resultado.hora}`);
      texto = texto.replace(hora[0], ' ');
    }
  }

  /* ---------------- Horas del reparto ---------------- */

  /*
   * Si la frase traía un reparto ("3 veces al día") y además una hora
   * concreta, la lista se recoloca para arrancar en esa hora conservando los
   * huecos. Sin hora concreta, la primera del reparto hace de hora.
   */
  if (resultado.repeticion?.horas?.length > 1) {
    const horas = resultado.hora
      ? recolocarHoras(resultado.repeticion.horas, resultado.hora)
      : resultado.repeticion.horas;
    resultado.repeticion = { ...resultado.repeticion, horas: [...horas].sort() };
    if (!resultado.hora) [resultado.hora] = resultado.repeticion.horas;
  }

  /* ---------------- Categoría ---------------- */

  const textoPlano = sinAcentos(texto.toLowerCase());
  const pistas = {
    trabajo: [
      'reunion',
      'jefe',
      'oficina',
      'cliente',
      'informe',
      'proyecto',
      'curro',
      'examen',
      'estudiar',
      'clase',
      'entrega'
    ],
    salud: [
      'medico',
      'dentista',
      'analitica',
      'consulta',
      'pastilla',
      'medicamento',
      'jarabe',
      'gimnasio',
      'correr',
      'entrenar',
      'padel',
      'natacion'
    ],
    casa: [
      'comprar',
      'supermercado',
      'compra',
      'basura',
      'lavadora',
      'limpiar',
      'regar',
      'plantas',
      'maceta',
      'perro',
      'gato',
      'veterinario',
      'coche',
      'itv',
      'taller',
      'gasolina'
    ],
    dinero: ['pagar', 'factura', 'recibo', 'alquiler', 'hipoteca', 'impuesto', 'banco'],
    gente: ['llamar', 'telefono', 'whatsapp', 'cumple', 'cumpleanos', 'aniversario', 'quedar'],
    ocio: ['viaje', 'vuelo', 'hotel', 'cine', 'concierto', 'cena', 'reservar']
  };

  for (const [categoria, palabras] of Object.entries(pistas)) {
    if (palabras.some((palabra) => textoPlano.includes(palabra))) {
      resultado.categoria = categoria;
      break;
    }
  }

  // Ojo: no se busca el nombre literal de la categoría. Ahora se llaman
  // "Casa", "Gente" u "Ocio", palabras demasiado corrientes: "pagar la luz de
  // casa" acabaría en Casa en vez de en Dinero.

  /* ---------------- Título limpio ---------------- */

  resultado.titulo = texto.replace(/\s{2,}/g, ' ').trim().replace(/^[,;:.\-\s]+/, '');
  if (fechaDetectada) resultado.fecha = aFechaISO(fechaDetectada);

  // Sin título aprovechable, se devuelve el texto original tal cual.
  if (!resultado.titulo) resultado.titulo = entrada.trim();

  resultado.titulo = resultado.titulo.charAt(0).toUpperCase() + resultado.titulo.slice(1);
  return resultado;
}

/** Siguiente aparición de un día de la semana (hoy no cuenta). */
function proximoDiaSemana(desde, indiceObjetivo) {
  const destino = new Date(desde);
  let diferencia = (indiceObjetivo - destino.getDay() + 7) % 7;
  if (diferencia === 0) diferencia = 7;
  destino.setDate(destino.getDate() + diferencia);
  return destino;
}
