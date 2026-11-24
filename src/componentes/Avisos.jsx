/**
 * Elementos flotantes: la tostada de confirmación (con deshacer) y el banner
 * que aparece cuando salta un recordatorio teniendo la aplicación abierta.
 */

import { useEffect } from 'react';
import Icono from './Icono.jsx';

/** Confirmación breve al pie, con una acción opcional. */
export function Tostada({ mensaje, textoAccion, alPulsarAccion, alCerrar, duracion = 5000 }) {
  useEffect(() => {
    if (!mensaje) return undefined;
    const id = setTimeout(() => alCerrar?.(), duracion);
    return () => clearTimeout(id);
  }, [mensaje, duracion, alCerrar]);

  if (!mensaje) return null;

  return (
    <div className="tostada" role="status">
      <span className="tostada-texto">{mensaje}</span>
      {textoAccion ? (
        <button type="button" className="tostada-accion" onClick={alPulsarAccion}>
          {textoAccion}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Repite dentro de la aplicación el aviso que acaba de saltar, por si el
 * usuario tiene la pantalla delante y no llega a ver la notificación.
 */
export function BannerAviso({ aviso, alCompletar, alPosponer, alCerrar }) {
  if (!aviso) return null;

  return (
    <div className="banner" role="alert">
      <p className="banner-rotulo">
        <Icono nombre="bell" /> Toca ahora
      </p>
      <p className="banner-titulo">{aviso.titulo}</p>
      <p className="banner-cuerpo">{aviso.cuerpo}</p>

      <div className="banner-acciones">
        <button type="button" className="boton solido" onClick={alCompletar}>
          Hecho
        </button>
        <button type="button" className="boton contorno" onClick={alPosponer}>
          Posponer
        </button>
        <button type="button" className="boton contorno" onClick={alCerrar}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
