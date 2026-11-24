/**
 * Posposición rápida.
 *
 * Saltos fijos arriba y, debajo, una hora concreta del día: es lo que hace
 * falta cuando ya sabes exactamente cuándo vas a poder atenderlo.
 */

import { useState } from 'react';
import HojaModal from './HojaModal.jsx';
import { OPCIONES_POSPONER } from '../utilidades/constantes.js';
import { aHoraISO, sumarMinutos } from '../utilidades/fechas.js';

export function HojaPosponer({ abierta, recordatorio, alPosponer, alCerrar }) {
  const [hora, setHora] = useState(() => aHoraISO(sumarMinutos(new Date(), 60)));

  if (!recordatorio) return null;

  /** Convierte la hora elegida en minutos desde ahora, saltando al día siguiente si ya pasó. */
  const posponerHastaHora = () => {
    const [horas, minutos] = hora.split(':').map(Number);
    const destino = new Date();
    destino.setHours(horas, minutos, 0, 0);
    if (destino.getTime() <= Date.now()) destino.setDate(destino.getDate() + 1);

    const diferencia = Math.round((destino.getTime() - Date.now()) / 60000);
    alPosponer(recordatorio.id, Math.max(1, diferencia));
  };

  return (
    <HojaModal
      abierta={abierta}
      titulo="Posponer"
      alCerrar={alCerrar}
      pie={
        <button type="button" className="boton contorno ancho" onClick={alCerrar}>
          Cancelar
        </button>
      }
    >
      <div className="campo">
        <p className="campo-nota" style={{ marginTop: 0 }}>
          Volver a avisar de “{recordatorio.titulo}” dentro de:
        </p>

        <div className="chips" style={{ marginTop: 'var(--space-4)' }}>
          {OPCIONES_POSPONER.map((opcion) => (
            <button
              key={opcion.minutos}
              type="button"
              className="chip"
              onClick={() => alPosponer(recordatorio.id, opcion.minutos)}
            >
              {opcion.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span className="campo-rotulo">O a una hora concreta</span>
        <div className="fila-campos">
          <input
            type="time"
            className="entrada"
            value={hora}
            aria-label="Hora a la que avisar"
            onChange={(e) => setHora(e.target.value)}
          />
          <button
            type="button"
            className="boton solido"
            style={{ flex: '0 0 auto' }}
            onClick={posponerHastaHora}
          >
            Posponer
          </button>
        </div>
        <p className="campo-nota">Si esa hora ya ha pasado, se avisará mañana.</p>
      </div>
    </HojaModal>
  );
}

export default HojaPosponer;
