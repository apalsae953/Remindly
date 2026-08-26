/**
 * Elementos flotantes de aviso: la tostada de confirmación (con opción de
 * deshacer) y el banner que aparece cuando salta un recordatorio teniendo la
 * aplicación abierta.
 */

import { useEffect } from 'react';
import Icono from './Icono.jsx';

/** Mensaje breve en la parte inferior, con acción opcional. */
export function Tostada({ mensaje, textoAccion, alPulsarAccion, alCerrar, duracion = 5000 }) {
  useEffect(() => {
    if (!mensaje) return undefined;
    const identificador = setTimeout(() => alCerrar?.(), duracion);
    return () => clearTimeout(identificador);
  }, [mensaje, duracion, alCerrar]);

  if (!mensaje) return null;

  return (
    <div className="tostada" role="status">
      <Icono nombre="circle-check" style={{ color: 'var(--exito)' }} />
      <span className="texto">{mensaje}</span>
      {textoAccion ? (
        <button type="button" className="accion" onClick={alPulsarAccion}>
          {textoAccion}
        </button>
      ) : null}
      <button type="button" className="accion-mini" onClick={alCerrar} aria-label="Cerrar aviso">
        <Icono nombre="xmark" />
      </button>
    </div>
  );
}

/**
 * Banner que reproduce dentro de la aplicación el aviso que acaba de saltar,
 * por si el usuario tiene la pantalla delante y no ve la notificación.
 */
export function BannerAviso({ aviso, alCompletar, alPosponer, alCerrar }) {
  if (!aviso) return null;

  return (
    <div className="banner-aviso" role="alert">
      <div className="campana">
        <Icono nombre="bell" />
      </div>

      <div className="contenido-banner">
        <div className="titulo-banner">{aviso.titulo}</div>
        <div className="cuerpo-banner">{aviso.cuerpo}</div>

        <div className="banner-acciones">
          <button type="button" className="destacado" onClick={alCompletar}>
            <Icono nombre="check" /> Hecho
          </button>
          <button type="button" onClick={alPosponer}>
            <Icono nombre="clock-rotate-left" /> Posponer
          </button>
          <button type="button" onClick={alCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
