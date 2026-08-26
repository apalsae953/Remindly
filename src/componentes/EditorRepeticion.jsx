/**
 * Editor de la regla de repetición.
 *
 * Se muestra dentro del formulario y va enseñando solo los controles que
 * tienen sentido para el tipo elegido, para no abrumar con opciones.
 */

import Icono from './Icono.jsx';
import {
  DIAS_SEMANA,
  TIPOS_REPETICION,
  UNIDADES_PERSONALIZADAS
} from '../utilidades/constantes.js';
import { descripcionRepeticion, normalizarRepeticion } from '../utilidades/repeticion.js';

export function EditorRepeticion({ valor, alCambiar }) {
  const repeticion = normalizarRepeticion(valor);
  const activa = repeticion.tipo !== 'ninguna';

  // Los cambios se envían como función y no como objeto ya calculado: si el
  // usuario toca varios días muy seguidos, cada pulsación parte del valor real
  // y no de uno leído antes de que React repintase.
  const cambiar = (cambios) =>
    alCambiar((previa) => ({ ...normalizarRepeticion(previa), ...cambios }));

  const alternarDia = (indice) =>
    alCambiar((previa) => {
      const actual = normalizarRepeticion(previa);
      const dias = actual.diasSemana.includes(indice)
        ? actual.diasSemana.filter((d) => d !== indice)
        : [...actual.diasSemana, indice];
      return { ...actual, diasSemana: dias };
    });

  // Igual que arriba, pero para la condición de fin de la serie.
  const cambiarFin = (cambios) =>
    alCambiar((previa) => {
      const actual = normalizarRepeticion(previa);
      return { ...actual, fin: { ...actual.fin, ...cambios } };
    });

  return (
    <div className="campo">
      <div className="campo-etiqueta">
        <Icono nombre="repeat" />
        Repetición
      </div>

      <div className="rejilla-opciones">
        {TIPOS_REPETICION.map((tipo) => (
          <button
            key={tipo.id}
            type="button"
            className={`opcion-cuadro ${repeticion.tipo === tipo.id ? 'activa' : ''}`}
            onClick={() => cambiar({ tipo: tipo.id })}
          >
            <Icono nombre={tipo.icono} />
            <span>{tipo.nombre}</span>
          </button>
        ))}
      </div>

      {/* Cada X horas: solo hace falta el intervalo. */}
      {repeticion.tipo === 'horas' ? (
        <div className="fila-campos" style={{ marginTop: 12 }}>
          <label>
            <span className="campo-etiqueta">Cada cuántas horas</span>
            <input
              type="number"
              className="entrada"
              min="1"
              max="23"
              value={repeticion.intervalo}
              onChange={(e) => cambiar({ intervalo: Number(e.target.value) || 1 })}
            />
          </label>
        </div>
      ) : null}

      {/* Diaria y mensual admiten intervalo. */}
      {repeticion.tipo === 'diaria' || repeticion.tipo === 'mensual' ? (
        <div className="fila-campos" style={{ marginTop: 12 }}>
          <label>
            <span className="campo-etiqueta">
              Cada cuántos {repeticion.tipo === 'diaria' ? 'días' : 'meses'}
            </span>
            <input
              type="number"
              className="entrada"
              min="1"
              max="99"
              value={repeticion.intervalo}
              onChange={(e) => cambiar({ intervalo: Number(e.target.value) || 1 })}
            />
          </label>

          {repeticion.tipo === 'mensual' ? (
            <label>
              <span className="campo-etiqueta">Día del mes</span>
              <input
                type="number"
                className="entrada"
                min="1"
                max="31"
                placeholder="Igual que la fecha"
                value={repeticion.diaMes || ''}
                onChange={(e) => cambiar({ diaMes: Number(e.target.value) || null })}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {/* Semanal: días concretos y cada cuántas semanas. */}
      {repeticion.tipo === 'semanal' ? (
        <div style={{ marginTop: 12 }}>
          <span className="campo-etiqueta">Días de la semana</span>
          <div className="dias-semana">
            {DIAS_SEMANA.map((dia) => (
              <button
                key={dia.indice}
                type="button"
                className={`dia-boton ${repeticion.diasSemana.includes(dia.indice) ? 'activo' : ''}`}
                onClick={() => alternarDia(dia.indice)}
                aria-label={dia.nombre}
                aria-pressed={repeticion.diasSemana.includes(dia.indice)}
              >
                {dia.corto}
              </button>
            ))}
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            <span className="campo-etiqueta">Cada cuántas semanas</span>
            <input
              type="number"
              className="entrada"
              min="1"
              max="52"
              value={repeticion.intervalo}
              onChange={(e) => cambiar({ intervalo: Number(e.target.value) || 1 })}
            />
          </label>
        </div>
      ) : null}

      {/* Personalizada: número + unidad. */}
      {repeticion.tipo === 'personalizada' ? (
        <div className="fila-campos" style={{ marginTop: 12 }}>
          <label>
            <span className="campo-etiqueta">Cada</span>
            <input
              type="number"
              className="entrada"
              min="1"
              max="365"
              value={repeticion.intervalo}
              onChange={(e) => cambiar({ intervalo: Number(e.target.value) || 1 })}
            />
          </label>
          <label>
            <span className="campo-etiqueta">Unidad</span>
            <select
              className="selector"
              value={repeticion.unidad}
              onChange={(e) => cambiar({ unidad: e.target.value })}
            >
              {UNIDADES_PERSONALIZADAS.map((unidad) => (
                <option key={unidad.id} value={unidad.id}>
                  {unidad.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {/* Condición de fin, común a todas las repeticiones. */}
      {activa ? (
        <div style={{ marginTop: 14 }}>
          <span className="campo-etiqueta">
            <Icono nombre="calendar-xmark" />
            Hasta cuándo
          </span>

          <div className="tiras-filtro" style={{ margin: 0, padding: '0 0 10px' }}>
            <button
              type="button"
              className={`pastilla ${repeticion.fin.tipo === 'nunca' ? 'activa' : ''}`}
              onClick={() => cambiarFin({ tipo: 'nunca' })}
            >
              Para siempre
            </button>
            <button
              type="button"
              className={`pastilla ${repeticion.fin.tipo === 'fecha' ? 'activa' : ''}`}
              onClick={() => cambiarFin({ tipo: 'fecha' })}
            >
              Hasta una fecha
            </button>
            <button
              type="button"
              className={`pastilla ${repeticion.fin.tipo === 'repeticiones' ? 'activa' : ''}`}
              onClick={() => cambiarFin({ tipo: 'repeticiones' })}
            >
              Un número de veces
            </button>
          </div>

          {repeticion.fin.tipo === 'fecha' ? (
            <input
              type="date"
              className="entrada"
              value={repeticion.fin.fecha || ''}
              onChange={(e) => cambiarFin({ fecha: e.target.value })}
            />
          ) : null}

          {repeticion.fin.tipo === 'repeticiones' ? (
            <input
              type="number"
              className="entrada"
              min="1"
              max="999"
              value={repeticion.fin.repeticiones || 10}
              onChange={(e) =>
                cambiarFin({ repeticiones: Number(e.target.value) || 1 })
              }
            />
          ) : null}

          <p className="texto-ayuda">
            <Icono nombre="circle-info" /> {descripcionRepeticion(repeticion)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default EditorRepeticion;
