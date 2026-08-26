/**
 * Tarjeta de un recordatorio dentro de las listas.
 *
 * Muestra lo justo para decidir de un vistazo: título, cuándo toca, categoría,
 * prioridad y progreso de subtareas. Las acciones frecuentes (completar,
 * posponer, editar) están a un solo toque.
 */

import { useMemo } from 'react';
import Icono from './Icono.jsx';
import { obtenerCategoria, obtenerPrioridad } from '../utilidades/constantes.js';
import { descripcionRepeticion, esRepetitivo } from '../utilidades/repeticion.js';
import { esHoy, formatearFechaCorta, formatearHora, textoRelativo } from '../utilidades/fechas.js';
import { estaVencido, fechaEfectiva, progresoSubtareas } from '../utilidades/modelo.js';

export function TarjetaRecordatorio({
  recordatorio,
  alCompletar,
  alEditar,
  alPosponer,
  alFijar,
  alAlternarSubtarea,
  mostrarFecha = true
}) {
  const categoria = obtenerCategoria(recordatorio.categoria);
  const prioridad = obtenerPrioridad(recordatorio.prioridad);
  const momento = fechaEfectiva(recordatorio);
  const vencido = estaVencido(recordatorio);
  const progreso = progresoSubtareas(recordatorio);
  const repetitivo = esRepetitivo(recordatorio);

  // El texto de cuándo toca cambia según lo cerca que esté.
  const textoCuando = useMemo(() => {
    if (recordatorio.completado) return 'Completado';
    const hora = recordatorio.todoElDia ? 'Todo el día' : formatearHora(momento);
    if (esHoy(momento)) return hora;
    if (!mostrarFecha) return hora;
    return `${formatearFechaCorta(momento)} · ${hora}`;
  }, [recordatorio.completado, recordatorio.todoElDia, momento, mostrarFecha]);

  const clases = [
    'tarjeta',
    vencido ? 'vencido' : '',
    recordatorio.completado ? 'completado' : '',
    recordatorio.fijado ? 'fijado' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={clases} style={{ '--color-categoria': categoria.color }}>
      <button
        type="button"
        className={`casilla ${recordatorio.completado ? 'marcada' : ''}`}
        onClick={() => alCompletar?.(recordatorio)}
        aria-label={recordatorio.completado ? 'Marcar como pendiente' : 'Marcar como hecho'}
      >
        <Icono nombre="check" />
      </button>

      <div
        className="tarjeta-cuerpo"
        onClick={() => alEditar?.(recordatorio)}
        role="button"
        tabIndex={0}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            alEditar?.(recordatorio);
          }
        }}
      >
        <div className="tarjeta-titulo">{recordatorio.titulo}</div>

        {recordatorio.notas ? <p className="tarjeta-notas">{recordatorio.notas}</p> : null}

        <div className="tarjeta-meta">
          <span className={`dato ${vencido ? 'urgente' : esHoy(momento) ? 'destacado' : ''}`}>
            <Icono nombre={recordatorio.todoElDia ? 'calendar-day' : 'clock'} />
            {textoCuando}
          </span>

          {!recordatorio.completado ? (
            <span className={`dato ${vencido ? 'urgente' : ''}`}>{textoRelativo(momento)}</span>
          ) : null}

          <span className="insignia-categoria" style={{ '--color-categoria': categoria.color }}>
            <Icono nombre={categoria.icono} />
            {categoria.nombre}
          </span>

          {recordatorio.prioridad !== 'media' ? (
            <span className="dato" style={{ color: prioridad.color }}>
              <Icono nombre={prioridad.icono} />
              {prioridad.nombre}
            </span>
          ) : null}

          {repetitivo ? (
            <span className="dato">
              <Icono nombre="repeat" />
              {descripcionRepeticion(recordatorio.repeticion)}
            </span>
          ) : null}

          {recordatorio.pospuestoHasta ? (
            <span className="dato">
              <Icono nombre="clock-rotate-left" />
              Pospuesto
            </span>
          ) : null}

          {recordatorio.avisosPrevios?.some((m) => m > 0) ? (
            <span className="dato">
              <Icono nombre="bell" />
              Aviso previo
            </span>
          ) : null}

          {recordatorio.racha > 1 ? (
            <span className="racha">
              <Icono nombre="fire" />
              {recordatorio.racha}
            </span>
          ) : null}
        </div>

        {recordatorio.etiquetas?.length ? (
          <div className="etiquetas-lista">
            {recordatorio.etiquetas.map((etiqueta) => (
              <span key={etiqueta} className="etiqueta-chip">
                #{etiqueta}
              </span>
            ))}
          </div>
        ) : null}

        {progreso ? (
          <>
            <div className="subtareas" onClick={(evento) => evento.stopPropagation()}>
              {recordatorio.subtareas.map((subtarea) => (
                <button
                  key={subtarea.id}
                  type="button"
                  className={`subtarea ${subtarea.hecha ? 'hecha' : ''}`}
                  onClick={() => alAlternarSubtarea?.(recordatorio.id, subtarea.id)}
                >
                  <span className="marca">
                    <Icono nombre="check" />
                  </span>
                  <span>{subtarea.texto}</span>
                </button>
              ))}
            </div>
            <div className="progreso-mini">
              <span style={{ width: `${Math.round(progreso.ratio * 100)}%` }} />
            </div>
          </>
        ) : null}
      </div>

      <div className="tarjeta-acciones">
        <button
          type="button"
          className="accion-mini"
          onClick={() => alPosponer?.(recordatorio)}
          aria-label="Posponer"
          title="Posponer"
        >
          <Icono nombre="clock-rotate-left" />
        </button>
        <button
          type="button"
          className="accion-mini"
          onClick={() => alFijar?.(recordatorio)}
          aria-label={recordatorio.fijado ? 'Quitar de destacados' : 'Destacar'}
          title={recordatorio.fijado ? 'Quitar de destacados' : 'Destacar'}
          style={recordatorio.fijado ? { color: 'var(--aviso)' } : undefined}
        >
          <Icono nombre="thumbtack" />
        </button>
      </div>
    </article>
  );
}

export default TarjetaRecordatorio;
