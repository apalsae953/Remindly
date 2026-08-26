/**
 * Formulario de creación y edición de recordatorios.
 *
 * Trabaja sobre un borrador local y solo avisa al exterior al guardar, para
 * que cancelar no deje cambios a medias. Al escribir el título de un
 * recordatorio nuevo se intenta reconocer fecha, hora y repetición del propio
 * texto y se ofrece aplicarlo con un toque.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Icono from './Icono.jsx';
import HojaModal from './HojaModal.jsx';
import EditorRepeticion from './EditorRepeticion.jsx';
import {
  AVISOS_PREVIOS,
  CATEGORIAS,
  PRIORIDADES,
  obtenerCategoria
} from '../utilidades/constantes.js';
import { crearRecordatorio } from '../utilidades/modelo.js';
import { generarId } from '../utilidades/almacenamiento.js';
import { aFechaISO, formatearFechaLarga, sumarDias } from '../utilidades/fechas.js';
import { interpretarTexto } from '../utilidades/lenguaje.js';
import { compartirRecordatorio, enlaceGoogleCalendar } from '../utilidades/calendario.js';
import { sonarClic, vibrar } from '../utilidades/sonido.js';

export function FormularioRecordatorio({
  abierto,
  recordatorio,
  plantilla,
  ajustes,
  alGuardar,
  alEliminar,
  alDuplicar,
  alCerrar
}) {
  const esNuevo = !recordatorio?.id;
  const [borrador, setBorrador] = useState(() => crearRecordatorio({}, ajustes));
  const [textoEtiqueta, setTextoEtiqueta] = useState('');
  const [textoSubtarea, setTextoSubtarea] = useState('');
  const [sugerencia, setSugerencia] = useState(null);
  const [avanzado, setAvanzado] = useState(false);
  const campoTitulo = useRef(null);

  // Cada vez que se abre la hoja se reinicia el borrador con lo que toque.
  useEffect(() => {
    if (!abierto) return;

    if (recordatorio?.id) {
      setBorrador({ ...recordatorio });
      setAvanzado(
        Boolean(recordatorio.enlace || recordatorio.ubicacion || recordatorio.persistente)
      );
    } else {
      const desdePlantilla = plantilla
        ? {
            titulo: plantilla.nombre,
            categoria: plantilla.categoria,
            prioridad: plantilla.prioridad,
            todoElDia: Boolean(plantilla.todoElDia),
            persistente: Boolean(plantilla.persistente),
            repeticion: plantilla.repeticion
              ? { ...crearRecordatorio().repeticion, ...plantilla.repeticion }
              : undefined,
            avisosPrevios: plantilla.avisosPrevios
          }
        : {};

      setBorrador(
        crearRecordatorio(
          { ...limpiarIndefinidos(desdePlantilla), ...limpiarIndefinidos(recordatorio || {}) },
          ajustes
        )
      );
      setAvanzado(false);
    }

    setSugerencia(null);
    setTextoEtiqueta('');
    setTextoSubtarea('');
  }, [abierto, recordatorio, plantilla, ajustes]);

  // El foco automático en el móvil abre el teclado y tapa la hoja, así que
  // solo se hace en pantallas amplias.
  useEffect(() => {
    if (abierto && esNuevo && window.innerWidth >= 760) {
      const identificador = setTimeout(() => campoTitulo.current?.focus(), 260);
      return () => clearTimeout(identificador);
    }
    return undefined;
  }, [abierto, esNuevo]);

  const categoria = obtenerCategoria(borrador.categoria);
  const valido = borrador.titulo.trim().length > 0;

  const cambiar = (cambios) => setBorrador((previo) => ({ ...previo, ...cambios }));

  /* ---------------- Reconocimiento del texto ---------------- */

  const alEscribirTitulo = (texto) => {
    cambiar({ titulo: texto });
    if (!esNuevo || texto.trim().length < 5) {
      setSugerencia(null);
      return;
    }

    const interpretado = interpretarTexto(texto);
    if (interpretado?.detectado?.length) setSugerencia(interpretado);
    else setSugerencia(null);
  };

  const aplicarSugerencia = () => {
    if (!sugerencia) return;
    cambiar({
      titulo: sugerencia.titulo,
      fecha: sugerencia.fecha || borrador.fecha,
      hora: sugerencia.hora || borrador.hora,
      categoria: sugerencia.categoria || borrador.categoria,
      prioridad: sugerencia.prioridad || borrador.prioridad,
      etiquetas: sugerencia.etiquetas.length ? sugerencia.etiquetas : borrador.etiquetas,
      repeticion: sugerencia.repeticion
        ? { ...borrador.repeticion, ...sugerencia.repeticion }
        : borrador.repeticion
    });
    setSugerencia(null);
    sonarClic();
  };

  /* ---------------- Subtareas y etiquetas ---------------- */

  const anadirSubtarea = () => {
    const texto = textoSubtarea.trim();
    if (!texto) return;
    cambiar({
      subtareas: [...borrador.subtareas, { id: generarId('sub'), texto, hecha: false }]
    });
    setTextoSubtarea('');
  };

  const quitarSubtarea = (id) => {
    cambiar({ subtareas: borrador.subtareas.filter((s) => s.id !== id) });
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

  // Se parte siempre del estado real para que varias pulsaciones seguidas
  // sobre las pastillas de aviso no se pisen entre ellas.
  const alternarAvisoPrevio = (minutos) => {
    setBorrador((previo) => {
      const actuales = previo.avisosPrevios || [];
      const nuevos = actuales.includes(minutos)
        ? actuales.filter((m) => m !== minutos)
        : [...actuales, minutos].sort((a, b) => a - b);
      return { ...previo, avisosPrevios: nuevos.length ? nuevos : [0] };
    });
  };

  /* ---------------- Atajos de fecha ---------------- */

  const atajosFecha = useMemo(
    () => [
      { nombre: 'Hoy', fecha: aFechaISO(new Date()) },
      { nombre: 'Mañana', fecha: aFechaISO(sumarDias(new Date(), 1)) },
      { nombre: 'En 3 días', fecha: aFechaISO(sumarDias(new Date(), 3)) },
      { nombre: 'En una semana', fecha: aFechaISO(sumarDias(new Date(), 7)) },
      { nombre: 'En un mes', fecha: aFechaISO(sumarDias(new Date(), 30)) }
    ],
    []
  );

  const guardar = () => {
    if (!valido) return;
    vibrar([30]);
    alGuardar({ ...borrador, titulo: borrador.titulo.trim() });
  };

  const enlaceGoogle = enlaceGoogleCalendar(borrador);

  return (
    <HojaModal
      abierta={abierto}
      titulo={esNuevo ? 'Nuevo recordatorio' : 'Editar recordatorio'}
      icono={esNuevo ? 'calendar-plus' : 'pen'}
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="boton secundario" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="button" className="boton principal" onClick={guardar} disabled={!valido}>
            <Icono nombre="check" />
            {esNuevo ? 'Crear recordatorio' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      {/* Título */}
      <div className="campo">
        <div className="campo-etiqueta">
          <Icono nombre="pen" />
          ¿Qué quieres recordar?
        </div>
        <input
          ref={campoTitulo}
          type="text"
          className="entrada grande"
          placeholder="Ej: Llamar a Ana mañana a las 9"
          value={borrador.titulo}
          onChange={(e) => alEscribirTitulo(e.target.value)}
          maxLength={140}
        />

        {sugerencia ? (
          <button
            type="button"
            className="aviso-caja info"
            style={{ marginTop: 10, width: '100%', textAlign: 'left' }}
            onClick={aplicarSugerencia}
          >
            <span className="icono-caja">
              <Icono nombre="wand-magic-sparkles" />
            </span>
            <span>
              <strong>He entendido: {sugerencia.detectado.join(', ')}</strong>
              Toca para aplicarlo y dejar el título como “{sugerencia.titulo}”.
            </span>
          </button>
        ) : null}
      </div>

      {/* Fecha y hora */}
      <div className="campo">
        <div className="campo-etiqueta">
          <Icono nombre="calendar-day" />
          Cuándo
        </div>

        <div className="tiras-filtro" style={{ margin: '0 0 10px', padding: 0 }}>
          {atajosFecha.map((atajo) => (
            <button
              key={atajo.nombre}
              type="button"
              className={`pastilla ${borrador.fecha === atajo.fecha ? 'activa' : ''}`}
              onClick={() => cambiar({ fecha: atajo.fecha })}
            >
              {atajo.nombre}
            </button>
          ))}
        </div>

        <div className="fila-campos">
          <input
            type="date"
            className="entrada"
            value={borrador.fecha}
            onChange={(e) => cambiar({ fecha: e.target.value })}
          />
          <input
            type="time"
            className="entrada"
            value={borrador.hora}
            disabled={borrador.todoElDia}
            onChange={(e) => cambiar({ hora: e.target.value })}
          />
        </div>

        <p className="texto-ayuda">
          <Icono nombre="circle-info" /> {formatearFechaLarga(borrador.fecha || new Date())}
          {borrador.todoElDia ? ' · todo el día' : ` · a las ${borrador.hora}`}
        </p>

        <div className="interruptor-fila">
          <div className="interruptor-texto">
            <div className="titulo">
              <Icono nombre="sun" />
              Todo el día
            </div>
            <div className="ayuda">Sin hora concreta; el aviso llegará por la mañana.</div>
          </div>
          <button
            type="button"
            className={`interruptor ${borrador.todoElDia ? 'activo' : ''}`}
            onClick={() => cambiar({ todoElDia: !borrador.todoElDia })}
            aria-pressed={borrador.todoElDia}
            aria-label="Todo el día"
          />
        </div>
      </div>

      {/* Categoría */}
      <div className="campo">
        <div className="campo-etiqueta">
          <Icono nombre="layer-group" />
          Categoría
        </div>
        <div className="rejilla-opciones">
          {CATEGORIAS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`opcion-cuadro ${borrador.categoria === item.id ? 'activa' : ''}`}
              style={{ '--color-opcion': item.color }}
              onClick={() => cambiar({ categoria: item.id })}
            >
              <Icono nombre={item.icono} />
              <span>{item.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Prioridad */}
      <div className="campo">
        <div className="campo-etiqueta">
          <Icono nombre="flag" />
          Prioridad
        </div>
        <div className="rejilla-opciones" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {PRIORIDADES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`opcion-cuadro ${borrador.prioridad === item.id ? 'activa' : ''}`}
              style={{ '--color-opcion': item.color }}
              onClick={() => cambiar({ prioridad: item.id })}
            >
              <Icono nombre={item.icono} />
              <span>{item.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Repetición */}
      <EditorRepeticion
        valor={borrador.repeticion}
        alCambiar={(actualizar) =>
          setBorrador((previo) => ({
            ...previo,
            repeticion:
              typeof actualizar === 'function' ? actualizar(previo.repeticion) : actualizar
          }))
        }
      />

      {/* Avisos previos */}
      <div className="campo">
        <div className="campo-etiqueta">
          <Icono nombre="bell" />
          Avisarme
        </div>
        <div className="tiras-filtro" style={{ margin: 0, padding: 0, flexWrap: 'wrap' }}>
          {AVISOS_PREVIOS.map((aviso) => (
            <button
              key={aviso.minutos}
              type="button"
              className={`pastilla ${
                borrador.avisosPrevios?.includes(aviso.minutos) ? 'activa' : ''
              }`}
              onClick={() => alternarAvisoPrevio(aviso.minutos)}
            >
              {aviso.nombre}
            </button>
          ))}
        </div>
        <p className="texto-ayuda">
          Puedes elegir varios: recibirás una notificación por cada uno.
        </p>
      </div>

      {/* Notas */}
      <div className="campo">
        <div className="campo-etiqueta">
          <Icono nombre="note-sticky" />
          Notas
        </div>
        <textarea
          className="area-texto"
          placeholder="Detalles, teléfono, dirección..."
          value={borrador.notas}
          onChange={(e) => cambiar({ notas: e.target.value })}
          maxLength={600}
        />
      </div>

      {/* Subtareas */}
      <div className="campo">
        <div className="campo-etiqueta">
          <Icono nombre="list-check" />
          Subtareas
        </div>

        {borrador.subtareas.length ? (
          <div className="subtareas" style={{ borderTop: 'none', paddingTop: 0, marginBottom: 10 }}>
            {borrador.subtareas.map((subtarea) => (
              <div key={subtarea.id} className="subtarea" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icono nombre="square-check" style={{ color: 'var(--texto-suave)' }} />
                  {subtarea.texto}
                </span>
                <button
                  type="button"
                  className="accion-mini peligro"
                  onClick={() => quitarSubtarea(subtarea.id)}
                  aria-label="Quitar subtarea"
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
            className="boton secundario"
            style={{ flex: '0 0 auto' }}
            onClick={anadirSubtarea}
          >
            <Icono nombre="plus" />
          </button>
        </div>
      </div>

      {/* Etiquetas */}
      <div className="campo">
        <div className="campo-etiqueta">
          <Icono nombre="tag" />
          Etiquetas
        </div>

        {borrador.etiquetas.length ? (
          <div className="etiquetas-lista" style={{ marginBottom: 10 }}>
            {borrador.etiquetas.map((etiqueta) => (
              <button
                key={etiqueta}
                type="button"
                className="etiqueta-chip"
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
            placeholder="Ej: casa, urgente, verano"
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
            className="boton secundario"
            style={{ flex: '0 0 auto' }}
            onClick={anadirEtiqueta}
          >
            <Icono nombre="plus" />
          </button>
        </div>
      </div>

      {/* Opciones avanzadas */}
      <button
        type="button"
        className="boton secundario ancho"
        onClick={() => setAvanzado((v) => !v)}
      >
        <Icono nombre={avanzado ? 'chevron-up' : 'chevron-down'} />
        {avanzado ? 'Ocultar opciones avanzadas' : 'Más opciones'}
      </button>

      {avanzado ? (
        <div className="seccion" style={{ marginTop: 16 }}>
          <div className="campo">
            <div className="campo-etiqueta">
              <Icono nombre="link" />
              Enlace
            </div>
            <input
              type="url"
              className="entrada"
              placeholder="https://..."
              value={borrador.enlace}
              onChange={(e) => cambiar({ enlace: e.target.value })}
            />
          </div>

          <div className="campo">
            <div className="campo-etiqueta">
              <Icono nombre="location-dot" />
              Lugar
            </div>
            <input
              type="text"
              className="entrada"
              placeholder="Dónde tiene que pasar"
              value={borrador.ubicacion}
              onChange={(e) => cambiar({ ubicacion: e.target.value })}
            />
          </div>

          <div className="lista-ajustes">
            <div className="interruptor-fila">
              <div className="interruptor-texto">
                <div className="titulo">
                  <Icono nombre="thumbtack" />
                  Destacado
                </div>
                <div className="ayuda">Aparece siempre arriba del todo.</div>
              </div>
              <button
                type="button"
                className={`interruptor ${borrador.fijado ? 'activo' : ''}`}
                onClick={() => cambiar({ fijado: !borrador.fijado })}
                aria-label="Destacado"
              />
            </div>

            <div className="interruptor-fila">
              <div className="interruptor-texto">
                <div className="titulo">
                  <Icono nombre="circle-exclamation" />
                  Aviso insistente
                </div>
                <div className="ayuda">
                  La notificación se queda en pantalla hasta que la atiendes.
                </div>
              </div>
              <button
                type="button"
                className={`interruptor ${borrador.persistente ? 'activo' : ''}`}
                onClick={() => cambiar({ persistente: !borrador.persistente })}
                aria-label="Aviso insistente"
              />
            </div>

            <div className="interruptor-fila">
              <div className="interruptor-texto">
                <div className="titulo">
                  <Icono nombre="volume-xmark" />
                  Aviso silencioso
                </div>
                <div className="ayuda">Llega la notificación pero sin sonido ni vibración.</div>
              </div>
              <button
                type="button"
                className={`interruptor ${borrador.silencioso ? 'activo' : ''}`}
                onClick={() => cambiar({ silencioso: !borrador.silencioso })}
                aria-label="Aviso silencioso"
              />
            </div>
          </div>

          <div className="separador" />

          <div className="fila-campos" style={{ flexWrap: 'wrap', gap: 8 }}>
            {enlaceGoogle ? (
              <a
                className="boton secundario"
                href={enlaceGoogle}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Icono nombre="calendar-plus" />
                Añadir a Google Calendar
              </a>
            ) : null}

            <button
              type="button"
              className="boton secundario"
              onClick={() =>
                compartirRecordatorio(borrador, formatearFechaLarga(borrador.fecha || new Date()))
              }
            >
              <Icono nombre="share-nodes" />
              Compartir
            </button>

            {!esNuevo ? (
              <button
                type="button"
                className="boton secundario"
                onClick={() => alDuplicar?.(borrador)}
              >
                <Icono nombre="copy" />
                Duplicar
              </button>
            ) : null}
          </div>

          {!esNuevo ? (
            <button
              type="button"
              className="boton peligro ancho"
              style={{ marginTop: 10 }}
              onClick={() => alEliminar?.(borrador)}
            >
              <Icono nombre="trash" />
              Eliminar recordatorio
            </button>
          ) : null}
        </div>
      ) : null}

      <div style={{ height: 8 }} />
    </HojaModal>
  );
}

/** Quita las claves con valor indefinido para que no pisen los valores base. */
function limpiarIndefinidos(objeto) {
  return Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined));
}

export default FormularioRecordatorio;
