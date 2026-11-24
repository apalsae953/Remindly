/**
 * Ajustes, en hoja en lugar de pestaña.
 *
 * Arriba va el estado real de los avisos, que es la duda más frecuente en una
 * aplicación web instalada: depende mucho del navegador y del sistema, así
 * que se explica con claridad en vez de dejarlo adivinar.
 */

import { useRef, useState } from 'react';
import Icono from './Icono.jsx';
import HojaModal from './HojaModal.jsx';
import { AVISOS_PREVIOS } from '../utilidades/constantes.js';
import { exportarICS, exportarJSON } from '../utilidades/calendario.js';
import { sonarAviso, vibrar } from '../utilidades/sonido.js';

const TEMAS = [
  { id: 'auto', nombre: 'Automático', icono: 'circle-half-stroke' },
  { id: 'claro', nombre: 'Claro', icono: 'sun' },
  { id: 'oscuro', nombre: 'Oscuro', icono: 'moon' }
];

function Opcion({ titulo, ayuda, valor, alCambiar }) {
  return (
    <div className="opcion">
      <div className="opcion-texto">
        <p className="opcion-titulo">{titulo}</p>
        {ayuda ? <p className="opcion-ayuda">{ayuda}</p> : null}
      </div>
      <button
        type="button"
        className="interruptor"
        aria-pressed={valor}
        aria-label={titulo}
        onClick={() => alCambiar(!valor)}
      />
    </div>
  );
}

function Diagnostico({ titulo, correcto, ayuda }) {
  return (
    <div className="opcion">
      <div className="opcion-texto">
        <p className="opcion-titulo">
          <Icono
            nombre={correcto ? 'circle-check' : 'circle-info'}
            style={{
              color: correcto ? 'var(--color-hecho)' : 'var(--color-ink-3)',
              marginRight: 'var(--space-2)'
            }}
          />
          {titulo}
        </p>
        <p className="opcion-ayuda">{ayuda}</p>
      </div>
    </div>
  );
}

export function HojaAjustes({
  abierta,
  alCerrar,
  ajustes,
  alActualizarAjustes,
  recordatorios,
  historial,
  capacidades,
  estadoWorker,
  totalAvisos,
  alPedirPermiso,
  alProbarNotificacion,
  alImportar,
  alBorrarTodo,
  promptInstalacion,
  alInstalar
}) {
  const campoArchivo = useRef(null);
  const [mensajePrueba, setMensajePrueba] = useState(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const concedido = capacidades.permiso === 'granted';
  const denegado = capacidades.permiso === 'denied';

  const probar = async () => {
    const resultado = await alProbarNotificacion();
    setMensajePrueba(
      resultado
        ? 'Aviso enviado. Si no lo ves, revisa los permisos del navegador en los ajustes del móvil.'
        : 'No se ha podido enviar. Comprueba que las notificaciones estén permitidas.'
    );
    if (resultado) {
      if (ajustes.sonido) sonarAviso();
      if (ajustes.vibracion) vibrar([120, 60, 120]);
    }
    setTimeout(() => setMensajePrueba(null), 8000);
  };

  const importarArchivo = (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = () => {
      try {
        alImportar(JSON.parse(String(lector.result)));
      } catch (error) {
        window.alert('El archivo no tiene un formato válido.');
      }
    };
    lector.readAsText(archivo);
    evento.target.value = '';
  };

  return (
    <HojaModal
      abierta={abierta}
      titulo="Ajustes"
      alCerrar={alCerrar}
      pie={
        <button type="button" className="boton solido ancho" onClick={alCerrar}>
          Listo
        </button>
      }
    >
      {/* Avisos */}
      <div className="campo">
        <span className="campo-rotulo">Notificaciones</span>

        {!capacidades.hayNotificaciones ? (
          <div className="nota atencion">
            <Icono nombre="triangle-exclamation" />
            <span>
              <strong>Este navegador no admite notificaciones</strong>
              Los recordatorios se guardan igual y verás los avisos dentro de la aplicación, pero
              no llegarán al sistema.
            </span>
          </div>
        ) : denegado ? (
          <div className="nota atencion">
            <Icono nombre="bell-slash" />
            <span>
              <strong>Has bloqueado las notificaciones</strong>
              El navegador ya no volverá a preguntar. Entra en los ajustes del sitio, en el candado
              junto a la dirección, y permítelas a mano.
            </span>
          </div>
        ) : !concedido ? (
          <>
            <div className="nota atencion">
              <Icono nombre="bell-slash" />
              <span>
                <strong>Los avisos están desactivados</strong>
                Sin permiso no se puede avisar con la aplicación cerrada.
              </span>
            </div>
            <button
              type="button"
              className="boton solido ancho"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={alPedirPermiso}
            >
              Activar las notificaciones
            </button>
          </>
        ) : (
          <div className="nota correcta">
            <Icono nombre="circle-check" />
            <span>
              <strong>Todo listo</strong>
              Hay {totalAvisos} {totalAvisos === 1 ? 'aviso programado' : 'avisos programados'} en
              los próximos 30 días.
            </span>
          </div>
        )}

        <button
          type="button"
          className="boton contorno ancho"
          style={{ marginTop: 'var(--space-3)' }}
          onClick={probar}
        >
          Enviar una notificación de prueba
        </button>

        {mensajePrueba ? <p className="campo-nota">{mensajePrueba}</p> : null}

        <div style={{ marginTop: 'var(--space-4)' }}>
          <Diagnostico
            titulo="Aplicación instalada"
            correcto={capacidades.esStandalone}
            ayuda={
              capacidades.esStandalone
                ? 'Se ejecuta como aplicación, que es lo más fiable.'
                : 'Instálala en la pantalla de inicio para que los avisos sean más fiables.'
            }
          />
          <Diagnostico
            titulo="Servicio en segundo plano"
            correcto={estadoWorker === 'activo'}
            ayuda={
              estadoWorker === 'activo'
                ? 'Activo: puede avisar aunque cierres la pestaña.'
                : 'No disponible. Requiere abrir la aplicación por HTTPS o desde localhost.'
            }
          />
          <Diagnostico
            titulo="Avisos programados en el sistema"
            correcto={capacidades.hayDisparadores}
            ayuda={
              capacidades.hayDisparadores
                ? 'El sistema operativo se encarga del aviso a la hora exacta.'
                : 'Tu navegador no lo admite: se usan métodos alternativos igualmente válidos.'
            }
          />
        </div>

        {capacidades.esIOS && !capacidades.esStandalone ? (
          <div className="nota" style={{ marginTop: 'var(--space-3)' }}>
            <Icono nombre="circle-info" />
            <span>
              <strong>En iPhone hay un paso extra</strong>
              Safari solo permite notificaciones si añades la aplicación a la pantalla de inicio:
              toca Compartir y luego “Añadir a pantalla de inicio”.
            </span>
          </div>
        ) : null}

        {promptInstalacion ? (
          <button
            type="button"
            className="boton solido ancho"
            style={{ marginTop: 'var(--space-3)' }}
            onClick={alInstalar}
          >
            Instalar en el móvil
          </button>
        ) : null}
      </div>

      {/* Cómo avisar */}
      <div className="campo">
        <span className="campo-rotulo">Cómo avisar</span>

        <Opcion
          titulo="Sonido"
          ayuda="Un tono breve cuando salta un aviso con la aplicación abierta."
          valor={ajustes.sonido}
          alCambiar={(valor) => alActualizarAjustes({ sonido: valor })}
        />
        <Opcion
          titulo="Vibración"
          ayuda="Solo en dispositivos que la admiten."
          valor={ajustes.vibracion}
          alCambiar={(valor) => alActualizarAjustes({ vibracion: valor })}
        />
        <Opcion
          titulo="No molestar de noche"
          ayuda="En esa franja los avisos llegan en silencio, sin sonido ni vibración."
          valor={ajustes.noMolestar}
          alCambiar={(valor) => alActualizarAjustes({ noMolestar: valor })}
        />

        {ajustes.noMolestar ? (
          <div className="fila-campos" style={{ marginTop: 'var(--space-3)' }}>
            <input
              type="time"
              className="entrada"
              value={ajustes.noMolestarDesde}
              aria-label="No molestar desde"
              onChange={(e) => alActualizarAjustes({ noMolestarDesde: e.target.value })}
            />
            <input
              type="time"
              className="entrada"
              value={ajustes.noMolestarHasta}
              aria-label="No molestar hasta"
              onChange={(e) => alActualizarAjustes({ noMolestarHasta: e.target.value })}
            />
          </div>
        ) : null}

        <div style={{ marginTop: 'var(--space-5)' }}>
          <span className="campo-rotulo">Hora por defecto</span>
          <input
            type="time"
            className="entrada"
            value={ajustes.horaPorDefecto}
            aria-label="Hora por defecto de los recordatorios nuevos"
            onChange={(e) => alActualizarAjustes({ horaPorDefecto: e.target.value })}
          />
          <p className="campo-nota">La que se usa cuando no dices ninguna.</p>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <span className="campo-rotulo">Avisos previos por defecto</span>
          <div className="chips">
            {AVISOS_PREVIOS.map((aviso) => {
              const activo = ajustes.avisosPreviosPorDefecto?.includes(aviso.minutos);
              return (
                <button
                  key={aviso.minutos}
                  type="button"
                  className="chip"
                  aria-pressed={activo}
                  onClick={() => {
                    const actuales = ajustes.avisosPreviosPorDefecto || [0];
                    const nuevos = activo
                      ? actuales.filter((m) => m !== aviso.minutos)
                      : [...actuales, aviso.minutos].sort((a, b) => a - b);
                    alActualizarAjustes({ avisosPreviosPorDefecto: nuevos.length ? nuevos : [0] });
                  }}
                >
                  {aviso.nombre}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <span className="campo-rotulo">Posponer desde la notificación</span>
          <select
            className="selector"
            value={ajustes.minutosPosponerRapido}
            aria-label="Minutos al posponer desde la notificación"
            onChange={(e) => alActualizarAjustes({ minutosPosponerRapido: Number(e.target.value) })}
          >
            {[5, 10, 15, 30, 60].map((minutos) => (
              <option key={minutos} value={minutos}>
                {minutos} minutos
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Aspecto */}
      <div className="campo">
        <span className="campo-rotulo">Aspecto</span>
        <div className="chips">
          {TEMAS.map((tema) => (
            <button
              key={tema.id}
              type="button"
              className="chip"
              aria-pressed={ajustes.tema === tema.id}
              onClick={() => alActualizarAjustes({ tema: tema.id })}
            >
              <Icono nombre={tema.icono} />
              {tema.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Datos */}
      <div className="campo">
        <span className="campo-rotulo">Tus datos</span>

        <div className="nota">
          <Icono nombre="circle-info" />
          <span>
            <strong>Todo se queda en este dispositivo</strong>
            No hay cuenta ni servidor. Haz una copia de vez en cuando si no quieres perder nada al
            cambiar de móvil.
          </span>
        </div>

        <div className="en-linea" style={{ marginTop: 'var(--space-4)' }}>
          <button
            type="button"
            className="boton contorno"
            onClick={() => exportarJSON({ recordatorios, ajustes, historial, version: 2 })}
          >
            <Icono nombre="download" />
            Copia de seguridad
          </button>

          <button
            type="button"
            className="boton contorno"
            onClick={() => campoArchivo.current?.click()}
          >
            <Icono nombre="upload" />
            Restaurar
          </button>
        </div>

        <input
          ref={campoArchivo}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={importarArchivo}
        />

        <button
          type="button"
          className="boton contorno ancho"
          style={{ marginTop: 'var(--space-3)' }}
          onClick={() => exportarICS(recordatorios.filter((r) => !r.archivado))}
        >
          <Icono nombre="calendar-plus" />
          Exportar a calendario (.ics)
        </button>

        <p className="campo-nota">
          El archivo .ics se importa en Google Calendar, Outlook o el calendario del móvil, con las
          repeticiones y los avisos ya incluidos.
        </p>

        <div className="separador" />

        {confirmarBorrado ? (
          <div className="nota atencion">
            <Icono nombre="triangle-exclamation" />
            <span>
              <strong>¿Seguro que quieres borrarlo todo?</strong>
              Se eliminarán los recordatorios y el historial de este dispositivo. No se puede
              deshacer.
              <div className="en-linea" style={{ marginTop: 'var(--space-3)' }}>
                <button
                  type="button"
                  className="boton contorno"
                  onClick={() => setConfirmarBorrado(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="boton riesgo"
                  onClick={() => {
                    alBorrarTodo();
                    setConfirmarBorrado(false);
                  }}
                >
                  Sí, borrar todo
                </button>
              </div>
            </span>
          </div>
        ) : (
          <button
            type="button"
            className="boton riesgo ancho"
            onClick={() => setConfirmarBorrado(true)}
          >
            Borrar todos los datos
          </button>
        )}
      </div>
    </HojaModal>
  );
}

export default HojaAjustes;
