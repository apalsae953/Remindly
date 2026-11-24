/**
 * Presentación de la primera vez.
 *
 * Dos pasos, no cinco: qué hace especial a esta agenda y el permiso de
 * avisos. El permiso se pide aquí porque es el momento en que se entiende
 * para qué sirve, y así el navegador no lo bloquea de entrada.
 */

import { useState } from 'react';
import HojaModal from './HojaModal.jsx';

const PASOS = [
  {
    numero: 'Uno',
    titulo: 'Escribe como hablas',
    texto:
      'No hay formularios que rellenar para lo normal. Escribe abajo una frase corriente y la agenda entiende la fecha, la hora y si se repite.',
    ejemplo: '“Llamar a Ana mañana a las 9”\n“Pagar el alquiler cada mes”\n“Gimnasio cada martes”'
  },
  {
    numero: 'Dos',
    titulo: 'Que no se te pase nada',
    texto:
      'Para que el móvil avise a su hora hace falta dar permiso. Puedes cambiarlo cuando quieras desde los ajustes.'
  }
];

export function Bienvenida({ abierta, alPedirPermiso, alTerminar, capacidades }) {
  const [paso, setPaso] = useState(0);
  const [pidiendo, setPidiendo] = useState(false);

  const esUltimo = paso === PASOS.length - 1;
  const actual = PASOS[paso];

  const avanzar = async () => {
    if (!esUltimo) {
      setPaso(paso + 1);
      return;
    }
    setPidiendo(true);
    await alPedirPermiso();
    setPidiendo(false);
    alTerminar();
  };

  return (
    <HojaModal
      abierta={abierta}
      titulo="Recuerda"
      alCerrar={alTerminar}
      pie={
        <>
          <button type="button" className="boton contorno" onClick={alTerminar}>
            {esUltimo ? 'Ahora no' : 'Saltar'}
          </button>
          <button type="button" className="boton solido" onClick={avanzar} disabled={pidiendo}>
            {esUltimo ? 'Activar avisos' : 'Siguiente'}
          </button>
        </>
      }
    >
      <div className="bienvenida">
        <p className="bienvenida-numero">{actual.numero}</p>
        <h3 className="bienvenida-titulo">{actual.titulo}</h3>
        <p className="bienvenida-texto">{actual.texto}</p>

        {actual.ejemplo ? (
          <p className="bienvenida-ejemplo" style={{ whiteSpace: 'pre-line' }}>
            {actual.ejemplo}
          </p>
        ) : null}

        {esUltimo && capacidades.esIOS && !capacidades.esStandalone ? (
          <div className="nota" style={{ marginTop: 'var(--space-5)' }}>
            <span>
              <strong>Estás en iPhone</strong>
              Safari solo permite avisos si antes añades la aplicación a la pantalla de inicio,
              desde el botón Compartir.
            </span>
          </div>
        ) : null}

        <div className="bienvenida-pasos">
          {PASOS.map((item, indice) => (
            <i key={item.numero} className={indice <= paso ? 'activo' : ''} />
          ))}
        </div>
      </div>
    </HojaModal>
  );
}

export default Bienvenida;
