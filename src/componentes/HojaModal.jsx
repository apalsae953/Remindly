/**
 * Hoja deslizante reutilizable.
 *
 * En el móvil sube desde abajo (patrón habitual en aplicaciones nativas) y en
 * pantallas grandes se centra como un diálogo. Cierra con Escape, tocando
 * fuera o arrastrando el asa hacia abajo.
 */

import { useEffect, useRef, useState } from 'react';
import Icono from './Icono.jsx';

export function HojaModal({ abierta, titulo, icono, alCerrar, pie, children }) {
  const referenciaHoja = useRef(null);
  const [arrastre, setArrastre] = useState(0);
  const inicioArrastre = useRef(null);

  // Cerrar con la tecla Escape y bloquear el desplazamiento del fondo.
  useEffect(() => {
    if (!abierta) return undefined;

    const alPulsarTecla = (evento) => {
      if (evento.key === 'Escape') alCerrar?.();
    };

    const desbordamientoPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', alPulsarTecla);

    return () => {
      document.body.style.overflow = desbordamientoPrevio;
      document.removeEventListener('keydown', alPulsarTecla);
    };
  }, [abierta, alCerrar]);

  if (!abierta) return null;

  /* Gesto de arrastre sobre el asa para cerrar la hoja. */
  const alEmpezar = (evento) => {
    inicioArrastre.current = evento.touches[0].clientY;
  };

  const alMover = (evento) => {
    if (inicioArrastre.current === null) return;
    const desplazamiento = evento.touches[0].clientY - inicioArrastre.current;
    if (desplazamiento > 0) setArrastre(desplazamiento);
  };

  const alSoltar = () => {
    if (arrastre > 110) alCerrar?.();
    setArrastre(0);
    inicioArrastre.current = null;
  };

  return (
    <div
      className="velo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) alCerrar?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="hoja"
        ref={referenciaHoja}
        style={arrastre ? { transform: `translateY(${arrastre}px)`, transition: 'none' } : undefined}
      >
        <div
          className="hoja-asa"
          onTouchStart={alEmpezar}
          onTouchMove={alMover}
          onTouchEnd={alSoltar}
        />

        <header className="hoja-cabecera">
          {icono ? <Icono nombre={icono} style={{ color: 'var(--principal-claro)' }} /> : null}
          <h2>{titulo}</h2>
          <button type="button" className="boton-icono" onClick={alCerrar} aria-label="Cerrar">
            <Icono nombre="xmark" />
          </button>
        </header>

        <div className="hoja-contenido">{children}</div>

        {pie ? <footer className="hoja-pie">{pie}</footer> : null}
      </div>
    </div>
  );
}

export default HojaModal;
