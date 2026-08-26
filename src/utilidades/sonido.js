/**
 * Señales acústicas y hápticas.
 *
 * El tono se sintetiza con la Web Audio API en lugar de cargar un archivo de
 * audio: pesa cero, funciona sin conexión y no hay que precargar nada.
 */

let contexto = null;

function obtenerContexto() {
  if (typeof window === 'undefined') return null;
  const Constructor = window.AudioContext || window.webkitAudioContext;
  if (!Constructor) return null;
  if (!contexto) contexto = new Constructor();
  // Los navegadores móviles suspenden el contexto hasta que hay interacción.
  if (contexto.state === 'suspended') contexto.resume().catch(() => null);
  return contexto;
}

/** Reproduce una secuencia de notas sencillas. */
function reproducirNotas(notas, volumen = 0.18) {
  const ctx = obtenerContexto();
  if (!ctx) return;

  let desfase = 0;
  notas.forEach(({ frecuencia, duracion }) => {
    const oscilador = ctx.createOscillator();
    const ganancia = ctx.createGain();

    oscilador.type = 'sine';
    oscilador.frequency.setValueAtTime(frecuencia, ctx.currentTime + desfase);

    // Envolvente suave para que el tono no suene a chasquido.
    ganancia.gain.setValueAtTime(0, ctx.currentTime + desfase);
    ganancia.gain.linearRampToValueAtTime(volumen, ctx.currentTime + desfase + 0.02);
    ganancia.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + desfase + duracion);

    oscilador.connect(ganancia);
    ganancia.connect(ctx.destination);
    oscilador.start(ctx.currentTime + desfase);
    oscilador.stop(ctx.currentTime + desfase + duracion + 0.02);

    desfase += duracion * 0.85;
  });
}

/** Aviso principal: dos notas ascendentes, claras pero no estridentes. */
export function sonarAviso() {
  reproducirNotas([
    { frecuencia: 880, duracion: 0.18 },
    { frecuencia: 1174.7, duracion: 0.28 }
  ]);
}

/** Confirmación breve al completar una tarea. */
export function sonarConfirmacion() {
  reproducirNotas(
    [
      { frecuencia: 659.3, duracion: 0.09 },
      { frecuencia: 987.8, duracion: 0.14 }
    ],
    0.12
  );
}

/** Toque discreto para acciones menores. */
export function sonarClic() {
  reproducirNotas([{ frecuencia: 520, duracion: 0.05 }], 0.07);
}

/** Vibración del dispositivo, si el navegador la soporta. */
export function vibrar(patron = [40]) {
  try {
    if (navigator.vibrate) navigator.vibrate(patron);
  } catch (error) {
    /* algunos navegadores lanzan si la pestaña no está en primer plano */
  }
}
