/**
 * Ficha de un recordatorio.
 *
 * Solo dos bloques a la vista: qué y cuándo. Todo lo demás (categoría,
 * prioridad, notas, subtareas, etiquetas, enlaces y opciones de aviso) está
 * detrás de "Detalles", porque la inmensa mayoría de las veces no hace falta.
 */

import { useEffect, useRef, useState } from 'react';
import Icono from './Icono.jsx';
import HojaModal from './HojaModal.jsx';
import EditorRepeticion from './EditorRepeticion.jsx';
import { AVISOS_PREVIOS, CATEGORIAS, PRIORIDADES } from '../utilidades/constantes.js';
import { crearRecordatorio } from '../utilidades/modelo.js';
import { normalizarRepeticion } from '../utilidades/repeticion.js';
import { generarId } from '../utilidades/almacenamiento.js';
import { aFechaISO, formatearFechaLarga, sumarDias } from '../utilidades/fechas.js';
import { compartirRecordatorio, enlaceGoogleCalendar } from '../utilidades/calendario.js';
import { vibrar } from '../utilidades/sonido.js';

/** Convierte lo entendido de una frase en campos del formulario. */
function desdeLectura(lectura, ajustes) {
  if (!lectura) return {};
  return {
    titulo: lectura.titulo || '',
    fecha: lectura.fecha || aFechaISO(new Date()),
    hora: lectura.hora || ajustes.horaPorDefecto || '09:00',
    categoria: lectura.categoria || 'personal',
    prioridad: lectura.prioridad || 'normal',
    etiquetas: lectura.etiquetas || [],
    repeticion: lectura.repeticion
      ? { ...crearRecordatorio().repeticion, ...lectura.repeticion }
      : undefined
  };
}

function limpiarIndefinidos(objeto) {
  return Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined));
}

export function FormularioRecordatorio({
  abierto,
  recordatorio,
  lecturaInicial,
  ajustes,
  alGuardar,
  alEliminar,
  alDuplicar,
  alCerrar
}) {
  const esNuevo = !recordatorio?.id;
  const [borrador, setBorrador] = useState(() => crearRecordatorio({}, ajustes));
  const [detalles, setDetalles] = useState(false);
  const [textoEtiqueta, setTextoEtiqueta] = useState('');
  const [textoSubtarea, setTextoSubtarea] = useState('');
  const campoTitulo = useRef(null);

  // Al abrir, el borrador se reinicia con lo que toque.
  useEffect(() => {
    if (!abierto) return;

    if (recordatorio?.id) {
      setBorrador({ ...recordatorio });
      setDetalles(
        Boolean(
          recordatorio.notas ||
            recordatorio.subtareas?.length ||
            recordatorio.etiquetas?.length ||
            recordatorio.enlace ||
            recordatorio.ubicacion
        )
      );
    } else {
      setBorrador(crearRecordatorio(limpiarIndefinidos(desdeLectura(lecturaInicial, ajustes)), ajustes));
      setDetalles(false);
    }

    setTextoEtiqueta('');
    setTextoSubtarea('');
  }, [abierto, recordatorio, lecturaInicial, ajustes]);

  // En el móvil el teclado taparía la hoja, así que solo se enfoca en pantallas anchas.
  useEffect(() => {
    if (abierto && esNuevo && window.innerWidth >= 720) {
      const id = setTimeout(() => campoTitulo.current?.focus(), 280);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [abierto, esNuevo]);

  const valido = borrador.titulo.trim().length > 0;
  // Con varias horas al día la primera la marca esa lista, no este campo:
  // si se pudieran editar los dos, acabarían contradiciéndose.
  const horasMultiples = normalizarRepeticion(borrador.repeticion).horas.length > 1;
  const cambiar = (cambios) => setBorrador((previo) => ({ ...previo, ...cambios }));

  const atajosFecha = [
    { nombre: 'Hoy', fecha: aFechaISO(new Date()) },
    { nombre: 'Mañana', fecha: aFechaISO(sumarDias(new Date(), 1)) },
    { nombre: 'En 3 días', fecha: aFechaISO(sumarDias(new Date(), 3)) },
    { nombre: 'En una semana', fecha: aFechaISO(sumarDias(new Date(), 7)) }
  ];

  const alternarAvisoPrevio = (minutos) => {
    setBorrador((previo) => {
      const actuales = previo.avisosPrevios || [];
      const nuevos = actuales.includes(minutos)
        ? actuales.filter((m) => m !== minutos)
        : [...actuales, minutos].sort((a, b) => a - b);
      return { ...previo, avisosPrevios: nuevos.length ? nuevos : [0] };
    });
  };

  const anadirSubtarea = () => {
    const texto = textoSubtarea.trim();
    if (!texto) return;
    cambiar({
      subtareas: [...borrador.subtareas, { id: generarId('sub'), texto, hecha: false }]
    });
    setTextoSubtarea('');
  };

  const anadirEtiqueta = () => {
    const limpia = textoEtiqueta.trim().toLowerCase().replace(/^#/, '');
    if (!limpia || borrador.etiquetas.includes(limpia)) {
      setTextoEtiqueta('');
      return;
    }
    cambiar({ etiquetas: [...borrador.etiquetas, limpia] });
    setTextoEtiqueta('');
  };

  const guardar = () => {
    if (!valido) return;
    vibrar([25]);
    alGuardar({ ...borrador, titulo: borrador.titulo.trim() });
  };

  const enlaceGoogle = enlaceGoogleCalendar(borrador);

  return (
    <HojaModal
      abierta={abierto}
      titulo={esNuevo ? 'Nuevo recordatorio' : 'Editar'}
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="boton contorno" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="button" className="boton solido" onClick={guardar} disabled={!valido}>
            {esNuevo ? 'Añadir' : 'Guardar'}
          </button>
        </>
      }
    >
      {/* Qué */}
      <div className="campo">
        <input
          ref={campoTitulo}
          type="text"
          className="entrada-titular"
          placeholder="¿Qué quieres recordar?"
          value={borrador.titulo}
          maxLength={140}
          onChange={(e) => cambiar({ titulo: e.target.value })}
        />
      </div>

      {/* Cuándo */}
      <div className="campo">
        <span className="campo-rotulo">Cuándo</span>

        <div className="chips deslizable">
          {atajosFecha.map((atajo) => (
            <button
              key={atajo.nombre}
              type="button"
              className="chip"
              aria-pressed={borrador.fecha === atajo.fecha}
              onClick={() => cambiar({ fecha: atajo.fecha })}
            >
              {atajo.nombre}
            </button>
          ))}
        </div>

        <div className="fila-campos" style={{ marginTop: 'var(--space-3)' }}>
          <input
            type="date"
            className="entrada"
            value={borrador.fecha}
            aria-label="Fecha"
            onChange={(e) => cambiar({ fecha: e.target.value })}
          />
          <input
            type="time"
            className="entrada"
            value={borrador.hora}
            disabled={borrador.todoElDia || horasMultiples}
            aria-label="Hora"
            onChange={(e) => cambiar({ hora: e.target.value })}
          />
        </div>

        <p className="campo-nota">
          {formatearFechaLarga(borrador.fecha || new Date())}
          {borrador.todoElDia ? ' · todo el día' : ` · a las ${borrador.hora}`}
          {horasMultiples ? ' · la marcan las horas de abajo' : ''}
        </p>

        <div className="opcion">
          <div className="opcion-texto">
            <p className="opcion-titulo">Todo el día</p>
            <p className="opcion-ayuda">Sin hora concreta; el aviso llega por la mañana.</p>
          </div>
          <button
            type="button"
            className="interruptor"
            aria-pressed={borrador.todoElDia}
            aria-label="Todo el día"
            onClick={() => cambiar({ todoElDia: !borrador.todoElDia })}
          />
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <EditorRepeticion
            valor={borrador.repeticion}
            fechaBase={borrador.fecha}
            horaBase={borrador.hora}
            todoElDia={borrador.todoElDia}
            alCambiarHora={(hora) => cambiar({ hora })}
            alCambiar={(actualizar) =>
              setBorrador((previo) => ({
                ...previo,
                repeticion:
                  typeof actualizar === 'function' ? actualizar(previo.repeticion) : actualizar
              }))
            }
          />
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <span className="campo-rotulo">Avisarme</span>
          <div className="chips">
            {AVISOS_PREVIOS.map((aviso) => (
              <button
                key={aviso.minutos}
                type="button"
                className="chip"
                aria-pressed={borrador.avisosPrevios?.includes(aviso.minutos)}
                onClick={() => alternarAvisoPrevio(aviso.minutos)}
              >
                {aviso.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detalles */}
      <div className="plegable">
        <button
          type="button"
          className="plegable-cabecera"
          aria-expanded={detalles}
          onClick={() => setDetalles((v) => !v)}
        >
          Detalles
          <Icono nombre="chevron-down" />
        </button>

        {detalles ? (
          <div style={{ paddingBottom: 'var(--space-5)' }}>
            <span className="campo-rotulo">Categoría</span>
            <div className="chips">
              {CATEGORIAS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip"
                  aria-pressed={borrador.categoria === item.id}
                  onClick={() => cambiar({ categoria: item.id })}
                >
                  <i className="punto-categoria" style={{ '--color-categoria': item.color }} />
                  {item.nombre}
                </button>
              ))}
            </div>

            <span className="campo-rotulo" style={{ marginTop: 'var(--space-5)' }}>
              Prioridad
            </span>
            <div className="chips">
              {PRIORIDADES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip"
                  aria-pressed={borrador.prioridad === item.id}
                  onClick={() => cambiar({ prioridad: item.id })}
                >
                  {item.nombre}
                </button>
              ))}
            </div>

            <span className="campo-rotulo" style={{ marginTop: 'var(--space-5)' }}>
              Notas
            </span>
            <textarea
              className="area"
              placeholder="Detalles, teléfono, dirección…"
              value={borrador.notas}
              maxLength={600}
              onChange={(e) => cambiar({ notas: e.target.value })}
            />

            <span className="campo-rotulo" style={{ marginTop: 'var(--space-5)' }}>
              Subtareas
            </span>
            {borrador.subtareas.length ? (
              <div className="apilado" style={{ marginBottom: 'var(--space-3)' }}>
                {borrador.subtareas.map((subtarea) => (
                  <div className="opcion" key={subtarea.id} style={{ padding: 'var(--space-2) 0' }}>
                    <span className="opcion-texto opcion-titulo">{subtarea.texto}</span>
                    <button
                      type="button"
                      className="icono-boton"
                      aria-label={`Quitar ${subtarea.texto}`}
                      onClick={() =>
                        cambiar({ subtareas: borrador.subtareas.filter((s) => s.id !== subtarea.id) })
                      }
                    >
                      <Icono nombre="xmark" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="fila-campos">
              <input
                type="text"
                className="entrada"
                placeholder="Añadir un paso"
                value={textoSubtarea}
                onChange={(e) => setTextoSubtarea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    anadirSubtarea();
                  }
                }}
              />
              <button
                type="button"
                className="boton contorno"
                style={{ flex: '0 0 auto' }}
                onClick={anadirSubtarea}
                aria-label="Añadir subtarea"
              >
                <Icono nombre="plus" />
              </button>
            </div>

            <span className="campo-rotulo" style={{ marginTop: 'var(--space-5)' }}>
              Etiquetas
            </span>
            {borrador.etiquetas.length ? (
              <div className="chips" style={{ marginBottom: 'var(--space-3)' }}>
                {borrador.etiquetas.map((etiqueta) => (
                  <button
                    key={etiqueta}
                    type="button"
                    className="chip"
                    onClick={() =>
                      cambiar({ etiquetas: borrador.etiquetas.filter((e) => e !== etiqueta) })
                    }
                  >
                    #{etiqueta} <Icono nombre="xmark" />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="fila-campos">
              <input
                type="text"
                className="entrada"
                placeholder="casa, verano…"
                value={textoEtiqueta}
                onChange={(e) => setTextoEtiqueta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    anadirEtiqueta();
                  }
                }}
              />
              <button
                type="button"
                className="boton contorno"
                style={{ flex: '0 0 auto' }}
                onClick={anadirEtiqueta}
                aria-label="Añadir etiqueta"
              >
                <Icono nombre="plus" />
              </button>
            </div>

            <span className="campo-rotulo" style={{ marginTop: 'var(--space-5)' }}>
              Enlace y lugar
            </span>
            <div className="apilado">
              <input
                type="url"
                className="entrada"
                placeholder="https://…"
                value={borrador.enlace}
                aria-label="Enlace"
                onChange={(e) => cambiar({ enlace: e.target.value })}
              />
              <input
                type="text"
                className="entrada"
                placeholder="Dónde"
                value={borrador.ubicacion}
                aria-label="Lugar"
                onChange={(e) => cambiar({ ubicacion: e.target.value })}
              />
            </div>

            <div style={{ marginTop: 'var(--space-5)' }}>
              <div className="opcion">
                <div className="opcion-texto">
                  <p className="opcion-titulo">Aviso insistente</p>
                  <p className="opcion-ayuda">Se queda en pantalla hasta que lo atiendes.</p>
                </div>
                <button
                  type="button"
                  className="interruptor"
                  aria-pressed={borrador.persistente}
                  aria-label="Aviso insistente"
                  onClick={() => cambiar({ persistente: !borrador.persistente })}
                />
              </div>

              <div className="opcion">
                <div className="opcion-texto">
                  <p className="opcion-titulo">Aviso silencioso</p>
                  <p className="opcion-ayuda">Llega la notificación, sin sonido ni vibración.</p>
                </div>
                <button
                  type="button"
                  className="interruptor"
                  aria-pressed={borrador.silencioso}
                  aria-label="Aviso silencioso"
                  onClick={() => cambiar({ silencioso: !borrador.silencioso })}
                />
              </div>
            </div>

            <div className="separador" />

            <div className="en-linea">
              {enlaceGoogle ? (
                <a
                  className="enlace-accion"
                  href={enlaceGoogle}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Añadir a Google Calendar
                </a>
              ) : null}

              <button
                type="button"
                className="enlace-accion"
                onClick={() =>
                  compartirRecordatorio(borrador, formatearFechaLarga(borrador.fecha || new Date()))
                }
              >
                Compartir
              </button>

              {!esNuevo ? (
                <button type="button" className="enlace-accion" onClick={() => alDuplicar?.(borrador)}>
                  Duplicar
                </button>
              ) : null}
            </div>

            {!esNuevo ? (
              <button
                type="button"
                className="boton riesgo ancho"
                style={{ marginTop: 'var(--space-5)' }}
                onClick={() => alEliminar?.(borrador)}
              >
                <Icono nombre="trash" />
                Eliminar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </HojaModal>
  );
}

export default FormularioRecordatorio;
