/**
 * Compositor fijo del pie.
 *
 * Sustituye al botón flotante: escribir es la forma principal de crear algo.
 * Hay dos caminos y los dos se ven siempre, sin tener que descubrirlos:
 *
 *   - Escribir y pulsar la flecha: se crea al momento.
 *   - Escribir y pulsar "Configurar": se abre la ficha con el nombre ya
 *     puesto para elegir cuándo, cada cuánto y lo demás antes de añadirlo.
 *
 * Mientras se escribe, la app enseña en una línea lo que ha entendido de la
 * frase, así que no hay que fiarse a ciegas.
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icono from './Icono.jsx';
import { EJEMPLOS_COMPOSITOR, obtenerCategoria, obtenerPrioridad } from '../utilidades/constantes.js';
import { interpretarTexto } from '../utilidades/lenguaje.js';
import { descripcionRepeticion } from '../utilidades/repeticion.js';
import { deFechaISO, etiquetaDia } from '../utilidades/fechas.js';

/** Traduce lo detectado a etiquetas cortas y legibles. */
function construirChips(lectura) {
  if (!lectura) return [];
  const chips = [];

  if (lectura.fecha) {
    const fecha = deFechaISO(lectura.fecha);
    if (fecha) chips.push({ icono: 'calendar', texto: etiquetaDia(fecha) });
  }
  if (lectura.hora) chips.push({ icono: 'clock', texto: lectura.hora });
  if (lectura.repeticion) {
    chips.push({ icono: 'repeat', texto: descripcionRepeticion(lectura.repeticion) });
  }
  if (lectura.prioridad && lectura.prioridad !== 'normal') {
    chips.push({ icono: 'flag', texto: obtenerPrioridad(lectura.prioridad).nombre });
  }
  if (lectura.categoria) {
    chips.push({ icono: 'tag', texto: obtenerCategoria(lectura.categoria).nombre });
  }
  (lectura.etiquetas || []).forEach((etiqueta) => {
    chips.push({ icono: null, texto: `#${etiqueta}` });
  });

  return chips;
}

export function Compositor({
  texto,
  alEscribir,
  alCrear,
  alAbrirFicha,
  mostrarAyuda = false
}) {
  const [enfocado, setEnfocado] = useState(false);
  const campo = useRef(null);
  const caja = useRef(null);
  // El ejemplo cambia cada vez que se enfoca el campo vacío.
  const [ejemplo, setEjemplo] = useState(
    () => EJEMPLOS_COMPOSITOR[Math.floor(Math.random() * EJEMPLOS_COMPOSITOR.length)]
  );

  /**
   * El compositor cambia de alto según lo que muestre (chips de lectura,
   * pista de ejemplo o nada). Se publica su altura real como variable CSS
   * para que ni la lista ni la tostada queden tapadas debajo.
   */
  useLayoutEffect(() => {
    const elemento = caja.current;
    if (!elemento) return undefined;

    const publicar = () => {
      document.documentElement.style.setProperty(
        '--alto-compositor',
        `${Math.round(elemento.offsetHeight)}px`
      );
    };

    publicar();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(publicar);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const limpio = texto.trim();
  const lectura = useMemo(
    () => (limpio.length > 3 ? interpretarTexto(limpio) : null),
    [limpio]
  );
  const chips = useMemo(() => construirChips(lectura), [lectura]);

  const enviar = () => {
    if (!limpio) return;
    alCrear(interpretarTexto(limpio));
    // Se mantiene el foco para poder encadenar varios seguidos.
    campo.current?.focus();
  };

  // La ficha se abre con lo que haya escrito, aunque esté vacío: entonces es
  // sencillamente un recordatorio nuevo en blanco.
  const abrirFicha = () => alAbrirFicha(limpio ? interpretarTexto(limpio) : null);

  // La pista de ejemplo solo mientras la agenda está vacía: una vez hay
  // cosas, ya se sabe escribir y la pista solo estorba.
  const mostrarEjemplo = enfocado && !limpio && mostrarAyuda;

  return (
    <div className="compositor" ref={caja}>
      <div className="compositor-interior">
        <div className="compositor-lectura">
          {/*
            Siempre visible, también con el campo vacío. Es la puerta a
            configurarlo todo antes de añadirlo, y si se esconde detrás de
            algo no la encuentra nadie.
          */}
          <button type="button" className="compositor-opciones" onClick={abrirFicha}>
            <Icono nombre="sliders" />
            Configurar
          </button>

          {chips.map((chip) => (
            <span className="lectura-chip" key={chip.texto}>
              {chip.icono ? <Icono nombre={chip.icono} /> : null}
              {chip.texto}
            </span>
          ))}

          {mostrarEjemplo ? (
            <button
              type="button"
              className="lectura-chip"
              // onMouseDown, no onClick: el click llegaría después del blur.
              onMouseDown={(evento) => {
                evento.preventDefault();
                alEscribir(ejemplo);
              }}
            >
              Prueba: {ejemplo}
            </button>
          ) : null}
        </div>

        <div className="compositor-campo">
          <input
            ref={campo}
            type="text"
            value={texto}
            placeholder="Añade algo…"
            aria-label="Añadir un recordatorio escribiendo"
            enterKeyHint="done"
            autoComplete="off"
            onChange={(e) => alEscribir(e.target.value)}
            onFocus={() => {
              setEnfocado(true);
              setEjemplo(
                EJEMPLOS_COMPOSITOR[Math.floor(Math.random() * EJEMPLOS_COMPOSITOR.length)]
              );
            }}
            onBlur={() => setEnfocado(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                enviar();
              }
            }}
          />

          <button
            type="button"
            className="compositor-enviar"
            onClick={enviar}
            disabled={!limpio}
            aria-label="Añadir ahora"
          >
            <Icono nombre="arrow-up" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Compositor;
