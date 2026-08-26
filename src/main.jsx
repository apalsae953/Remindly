/**
 * Punto de entrada.
 *
 * Registra los iconos, monta el proveedor de estado y arranca la aplicación.
 * El service worker se registra desde el hook de notificaciones, para poder
 * reaccionar allí a su estado.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';

import App from './App.jsx';
import { ProveedorRecordatorios } from './contexto/ContextoRecordatorios.jsx';
import { registrarIconos } from './utilidades/iconos.js';
import './estilos/global.css';

// Font Awesome inserta su CSS por su cuenta; como ya se importa arriba, se
// desactiva para evitar iconos gigantes durante la carga.
config.autoAddCss = false;

registrarIconos();

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <ProveedorRecordatorios>
      <App />
    </ProveedorRecordatorios>
  </StrictMode>
);
