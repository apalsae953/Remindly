/**
 * Presentación de la primera vez.
 *
 * Tres pasos cortos: qué es, activar los avisos e instalarla en el móvil. El
 * permiso de notificaciones se pide aquí porque es el momento en el que el
 * usuario entiende para qué sirve, y así el navegador no lo bloquea de entrada.
 */

import { useState } from 'react';
import Icono from './Icono.jsx';
import HojaModal from './HojaModal.jsx';

const PASOS = [
  {
    icono: 'wand-magic-sparkles',
    titulo: 'Escribe como hablas',
    texto:
      'Apunta “llamar a Ana mañana a las 9” y la aplicación entiende la fecha, la hora y hasta la categoría. También puedes rellenarlo todo a mano si lo prefieres.'
  },
  {
    icono: 'repeat',
    titulo: 'Repite lo que haga falta',
    texto:
      'Cada día, entre semana, los martes y jueves, cada tres meses o hasta una fecha concreta. Al completar uno, el siguiente se programa solo.'
  },
  {
    icono: 'bell',
    titulo: 'Que no se te pase nada',
    texto:
      'Para que el móvil te avise a su hora hace falta dar permiso. Puedes cambiarlo cuando quieras desde los ajustes.'
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
      titulo="Bienvenido a Recuerda"
      icono="bell"
      alCerrar={alTerminar}
      pie={
        <>
          <button type="button" className="boton secundario" onClick={alTerminar}>
            {esUltimo ? 'Ahora no' : 'Saltar'}
          </button>
          <button type="button" className="boton principal" onClick={avanzar} disabled={pidiendo}>
            <Icono nombre={esUltimo ? 'bell' : 'chevron-right'} />
            {esUltimo ? 'Activar avisos' : 'Siguiente'}
          </button>
        </>
      }
    >
      <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
        <div
          style={{
            width: 72,
            height: 72,
            margin: '0 auto 18px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.8rem',
            color: 'var(--principal-claro)',
            background: 'color-mix(in srgb, var(--principal) 18%, transparent)'
          }}
        >
          <Icono nombre={actual.icono} />
        </div>

        <h3 style={{ fontSize: '1.2rem', marginBottom: 10 }}>{actual.titulo}</h3>
        <p style={{ color: 'var(--texto-medio)', lineHeight: 1.6, fontSize: '0.92rem' }}>
          {actual.texto}
        </p>

        {esUltimo && capacidades.esIOS && !capacidades.esStandalone ? (
          <div className="aviso-caja info" style={{ marginTop: 18, textAlign: 'left' }}>
            <span className="icono-caja">
              <Icono nombre="mobile-screen" />
            </span>
            <span>
              <strong>Estás en iPhone</strong>
              Para recibir avisos, añade antes la aplicación a la pantalla de inicio desde el botón
              Compartir de Safari.
            </span>
          </div>
        ) : null}

        {/* Indicador de paso */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 24 }}>
          {PASOS.map((_, indice) => (
            <span
              key={indice}
              style={{
                width: indice === paso ? 22 : 7,
                height: 7,
                borderRadius: 999,
                background: indice === paso ? 'var(--principal)' : 'var(--borde-fuerte)',
                transition: 'all 200ms ease'
              }}
            />
          ))}
        </div>
      </div>
    </HojaModal>
  );
}

export default Bienvenida;
