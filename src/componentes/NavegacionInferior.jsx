/**
 * Barra de navegación inferior, al alcance del pulgar.
 *
 * Muestra un contador rojo sobre "Hoy" cuando hay cosas atrasadas, que es la
 * información que más urge ver nada más abrir la aplicación.
 */

import Icono from './Icono.jsx';
import { VISTAS } from '../utilidades/constantes.js';
import { sonarClic } from '../utilidades/sonido.js';

export function NavegacionInferior({ vistaActiva, alCambiarVista, pendientesHoy, atrasados }) {
  const indicadores = {
    hoy: atrasados > 0 ? atrasados : pendientesHoy > 0 ? pendientesHoy : 0
  };

  return (
    <nav className="navegacion" aria-label="Navegación principal">
      <div className="navegacion-caja">
        {VISTAS.map((vista) => {
          const activa = vistaActiva === vista.id;
          const indicador = indicadores[vista.id];

          return (
            <button
              key={vista.id}
              type="button"
              className={`navegacion-boton ${activa ? 'activo' : ''}`}
              onClick={() => {
                if (!activa) sonarClic();
                alCambiarVista(vista.id);
              }}
              aria-current={activa ? 'page' : undefined}
            >
              <Icono nombre={vista.icono} />
              <span>{vista.nombre}</span>
              {indicador ? (
                <span
                  className="indicador"
                  style={atrasados > 0 ? undefined : { background: 'var(--principal)' }}
                >
                  {indicador > 99 ? '99+' : indicador}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default NavegacionInferior;
