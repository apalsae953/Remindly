/**
 * Hoja de posposición rápida.
 *
 * Además de los saltos fijos permite elegir una hora concreta del mismo día,
 * que es lo que hace falta cuando sabes exactamente cuándo podrás atenderlo.
 */

import { useState } from 'react';
import Icono from './Icono.jsx';
import HojaModal from './HojaModal.jsx';
import { OPCIONES_POSPONER } from '../utilidades/constantes.js';
import { aHoraISO, sumarMinutos } from '../utilidades/fechas.js';

export function HojaPosponer({ abierta, recordatorio, alPosponer, alCerrar }) {
  const [horaConcreta, setHoraConcreta] = useState(() => aHoraISO(sumarMinutos(new Date(), 60)));

  if (!recordatorio) return null;

  /** Convierte la hora elegida en minutos desde ahora, saltando al día siguiente si ya pasó. */
  const posponerHastaHora = () => {
    const [horas, minutos] = horaConcreta.split(':').map(Number);
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
      icono="clock-rotate-left"
      alCerrar={alCerrar}
      pie={
        <button type="button" className="boton secundario ancho" onClick={alCerrar}>
          Cancelar
        </button>
      }
    >
      <p className="texto-ayuda" style={{ marginTop: 0, marginBottom: 16 }}>
        <Icono nombre="circle-info" /> Se volverá a avisar de “{recordatorio.titulo}” dentro de:
      </p>

      <div className="rejilla-opciones">
        {OPCIONES_POSPONER.map((opcion) => (
          <button
            key={opcion.minutos}
            type="button"
            className="opcion-cuadro"
            onClick={() => alPosponer(recordatorio.id, opcion.minutos)}
          >
            <Icono nombre={opcion.icono} />
            <span>{opcion.nombre}</span>
          </button>
        ))}
      </div>

      <div className="separador" />

      <div className="campo">
        <div className="campo-etiqueta">
          <Icono nombre="clock" />
          O a una hora concreta
        </div>
        <div className="fila-campos">
          <input
            type="time"
            className="entrada"
            value={horaConcreta}
            onChange={(e) => setHoraConcreta(e.target.value)}
          />
          <button
            type="button"
            className="boton principal"
            style={{ flex: '0 0 auto' }}
            onClick={posponerHastaHora}
          >
            <Icono nombre="check" />
          </button>
        </div>
        <p className="texto-ayuda">Si la hora ya ha pasado, se avisará mañana a esa hora.</p>
      </div>
    </HojaModal>
  );
}

export default HojaPosponer;
