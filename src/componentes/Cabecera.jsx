/**
 * Cabecera fija con el saludo, el buscador y el acceso al estado de los avisos.
 *
 * El saludo cambia según la hora del día: es un detalle pequeño pero hace que
 * la aplicación se sienta más cercana.
 */

import { useEffect, useState } from 'react';
import Icono from './Icono.jsx';
import { capitalizar, formatearFechaLarga } from '../utilidades/fechas.js';

function saludoSegunHora(fecha = new Date()) {
  const hora = fecha.getHours();
  if (hora < 6) return 'Buenas noches';
  if (hora < 13) return 'Buenos días';
  if (hora < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

export function Cabecera({
  titulo,
  busqueda,
  alBuscar,
  mostrarBuscador = true,
  permisoNotificaciones,
  alPulsarCampana
}) {
  const [desplazada, setDesplazada] = useState(false);

  // Se marca la cabecera con un borde cuando la página deja de estar arriba.
  useEffect(() => {
    const alDesplazar = () => setDesplazada(window.scrollY > 6);
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => window.removeEventListener('scroll', alDesplazar);
  }, []);

  const avisosDesactivados = permisoNotificaciones !== 'granted';

  return (
    <header className={`cabecera ${desplazada ? 'desplazada' : ''}`}>
      <div className="cabecera-fila">
        <div className="cabecera-textos">
          <div className="cabecera-saludo">
            {saludoSegunHora()} · {capitalizar(formatearFechaLarga(new Date()))}
          </div>
          <h1 className="cabecera-titulo">{titulo}</h1>
        </div>

        <button
          type="button"
          className={`boton-icono ${avisosDesactivados ? '' : 'activo'}`}
          onClick={alPulsarCampana}
          aria-label={
            avisosDesactivados ? 'Activar las notificaciones' : 'Las notificaciones están activas'
          }
          title={avisosDesactivados ? 'Activar las notificaciones' : 'Notificaciones activas'}
          style={{ position: 'relative' }}
        >
          <Icono nombre={avisosDesactivados ? 'bell-slash' : 'bell'} />
          {avisosDesactivados ? <span className="punto" /> : null}
        </button>
      </div>

      {mostrarBuscador ? (
        <div className="cabecera-fila">
          <div className="buscador">
            <Icono nombre="magnifying-glass" />
            <input
              type="search"
              placeholder="Buscar recordatorios, notas o etiquetas"
              value={busqueda}
              onChange={(e) => alBuscar(e.target.value)}
              aria-label="Buscar"
            />
            {busqueda ? (
              <button
                type="button"
                className="accion-mini"
                onClick={() => alBuscar('')}
                aria-label="Limpiar búsqueda"
              >
                <Icono nombre="xmark" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default Cabecera;
