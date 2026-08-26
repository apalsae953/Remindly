/**
 * Envoltorio de Font Awesome.
 *
 * Todos los iconos están registrados en la librería (ver utilidades/iconos.js),
 * así que basta con pasar el nombre: <Icono nombre="bell" />.
 */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export function Icono({ nombre, className = '', ...resto }) {
  if (!nombre) return null;
  return <FontAwesomeIcon icon={nombre} className={className} {...resto} />;
}

export default Icono;
