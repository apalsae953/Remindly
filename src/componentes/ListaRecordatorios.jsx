/**
 * Lista de recordatorios, con opción de agrupar por día natural.
 *
 * La cabecera de cada grupo cambia de color cuando el día ya ha pasado o es
 * hoy, para que la vista se lea sin tener que fijarse en las fechas.
 */

import Icono from './Icono.jsx';
import TarjetaRecordatorio from './TarjetaRecordatorio.jsx';
import { agruparPorDia } from '../utilidades/modelo.js';
import { etiquetaDia, esHoy, inicioDelDia } from '../utilidades/fechas.js';

export function EstadoVacio({ icono = 'inbox', titulo, texto }) {
  return (
    <div className="vacio">
      <div className="icono">
        <Icono nombre={icono} />
      </div>
      <h3>{titulo}</h3>
      {texto ? <p>{texto}</p> : null}
    </div>
  );
}

export function ListaRecordatorios({
  recordatorios,
  agrupar = true,
  mostrarFecha = true,
  vacio,
  ...manejadores
}) {
  if (!recordatorios.length) {
    return (
      vacio || (
        <EstadoVacio
          titulo="Nada por aquí"
          texto="Cuando crees recordatorios aparecerán en esta lista."
        />
      )
    );
  }

  if (!agrupar) {
    return (
      <div className="lista-recordatorios">
        {recordatorios.map((recordatorio) => (
          <TarjetaRecordatorio
            key={recordatorio.id}
            recordatorio={recordatorio}
            mostrarFecha={mostrarFecha}
            {...manejadores}
          />
        ))}
      </div>
    );
  }

  const grupos = agruparPorDia(recordatorios);
  const hoy = inicioDelDia(new Date()).getTime();

  return (
    <div>
      {grupos.map((grupo) => {
        const pasado = grupo.fecha.getTime() < hoy;
        const clase = ['grupo-cabecera', esHoy(grupo.fecha) ? 'hoy' : '', pasado ? 'pasado' : '']
          .filter(Boolean)
          .join(' ');

        return (
          <section className="grupo-dia" key={grupo.clave}>
            <header className={clase}>
              <h3>
                {pasado ? 'Atrasado · ' : ''}
                {etiquetaDia(grupo.fecha)}
              </h3>
              <span className="linea" />
              <span className="contador">{grupo.elementos.length}</span>
            </header>

            <div className="lista-recordatorios">
              {grupo.elementos.map((recordatorio) => (
                <TarjetaRecordatorio
                  key={recordatorio.id}
                  recordatorio={recordatorio}
                  mostrarFecha={false}
                  {...manejadores}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default ListaRecordatorios;
