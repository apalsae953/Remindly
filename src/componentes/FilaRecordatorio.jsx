/**
 * Una línea de la agenda.
 *
 * No es una tarjeta: es una fila de tres columnas (hora, contenido y casilla)
 * separada de la siguiente por una línea de un píxel. Todo el color está
 * reservado para lo que ya ha vencido; el resto lo resuelve la tipografía.
 */

import Icono from './Icono.jsx';
import { obtenerCategoria, obtenerPrioridad } from '../utilidades/constantes.js';
import { descripcionRepeticion, esRepetitivo } from '../utilidades/repeticion.js';
import { formatearHora, textoRelativo } from '../utilidades/fechas.js';
import { estaVencido, fechaEfectiva, progresoSubtareas } from '../utilidades/modelo.js';

export function FilaRecordatorio({
  recordatorio,
  alCompletar,
  alEditar,
  alPosponer,
  alAlternarSubtarea
}) {
  const categoria = obtenerCategoria(recordatorio.categoria);
  const prioridad = obtenerPrioridad(recordatorio.prioridad);
  const momento = fechaEfectiva(recordatorio);
  const vencido = estaVencido(recordatorio);
  const progreso = progresoSubtareas(recordatorio);
  const repetitivo = esRepetitivo(recordatorio);

  const clases = ['fila', vencido ? 'vencida' : '', recordatorio.completado ? 'hecha' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <article className={clases}>
      <div className="fila-hora">
        {recordatorio.todoElDia ? 'Día' : formatearHora(momento)}
      </div>

      <div className="fila-texto">
        <button type="button" className="fila-principal" onClick={() => alEditar?.(recordatorio)}>
          <span className="fila-titulo">{recordatorio.titulo}</span>
          {recordatorio.notas ? <span className="fila-notas">{recordatorio.notas}</span> : null}
        </button>

        <div className="fila-datos">
          {vencido ? <span className="dato urgente">{textoRelativo(momento)}</span> : null}

          {prioridad.id !== 'normal' ? (
            <span className={`dato ${prioridad.id === 'urgente' ? 'urgente' : ''}`}>
              <Icono nombre={prioridad.id === 'urgente' ? 'fire' : 'flag'} />
              {prioridad.nombre}
            </span>
          ) : null}

          <span className="dato">
            <i className="punto-categoria" style={{ '--color-categoria': categoria.color }} />
            {categoria.nombre}
          </span>

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

          {progreso ? (
            <span className="dato">
              <Icono nombre="list-check" />
              {progreso.hechas} de {progreso.total}
            </span>
          ) : null}

          {recordatorio.avisosPrevios?.some((m) => m > 0) ? (
            <span className="dato">
              <Icono nombre="bell" />
              Aviso previo
            </span>
          ) : null}

          {/*
            Las acciones van juntas en su propio grupo: así se separan de los
            datos y, cuando la línea se parte, bajan las dos a la vez.
            "Editar" se dice con todas las letras porque tocar el título
            también abre la ficha, pero eso no lo ve nadie.
          */}
          <span className="fila-acciones">
            <button
              type="button"
              className="enlace-accion"
              onClick={() => alEditar?.(recordatorio)}
            >
              Editar
            </button>

            {/* Posponer solo aparece donde hace falta: en lo que ya toca. */}
            {!recordatorio.completado && alPosponer ? (
              <button
                type="button"
                className="enlace-accion"
                onClick={() => alPosponer(recordatorio)}
              >
                Posponer
              </button>
            ) : null}
          </span>
        </div>

        {progreso ? (
          <div className="subtareas">
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
                <span className="etiqueta-subtarea">{subtarea.texto}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={`fila-casilla ${recordatorio.completado ? 'marcada' : ''}`}
        onClick={() => alCompletar?.(recordatorio)}
        aria-label={
          recordatorio.completado
            ? `Devolver a pendientes: ${recordatorio.titulo}`
            : `Marcar como hecho: ${recordatorio.titulo}`
        }
      >
        <Icono nombre="check" />
      </button>
    </article>
  );
}

export default FilaRecordatorio;
