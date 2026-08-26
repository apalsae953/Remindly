/**
 * Ajustes, diagnóstico de avisos y copias de seguridad.
 *
 * La parte de arriba explica con claridad si las notificaciones van a llegar o
 * no, porque es la duda más habitual en una aplicación web instalada como PWA
 * y depende mucho del navegador y del sistema.
 */

import { useRef, useState } from 'react';
import Icono from './Icono.jsx';
import { AVISOS_PREVIOS } from '../utilidades/constantes.js';
import { exportarICS, exportarJSON } from '../utilidades/calendario.js';
import { sonarAviso, vibrar } from '../utilidades/sonido.js';

const COLORES = [
  { id: '#6c5ce7', nombre: 'Violeta' },
  { id: '#0984e3', nombre: 'Azul' },
  { id: '#00b894', nombre: 'Verde' },
  { id: '#e17055', nombre: 'Naranja' },
  { id: '#e84393', nombre: 'Rosa' },
  { id: '#d63031', nombre: 'Rojo' },
  { id: '#2d3436', nombre: 'Grafito' }
];

const TEMAS = [
  { id: 'auto', nombre: 'Automático', icono: 'circle-half-stroke' },
  { id: 'claro', nombre: 'Claro', icono: 'sun' },
  { id: 'oscuro', nombre: 'Oscuro', icono: 'moon' }
];

function Interruptor({ icono, titulo, ayuda, valor, alCambiar }) {
  return (
    <div className="interruptor-fila">
      <div className="interruptor-texto">
        <div className="titulo">
          <Icono nombre={icono} />
          {titulo}
        </div>
        {ayuda ? <div className="ayuda">{ayuda}</div> : null}
      </div>
      <button
        type="button"
        className={`interruptor ${valor ? 'activo' : ''}`}
        onClick={() => alCambiar(!valor)}
        aria-pressed={valor}
        aria-label={titulo}
      />
    </div>
  );
}

export function VistaAjustes({
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

  const permisoConcedido = capacidades.permiso === 'granted';
  const permisoDenegado = capacidades.permiso === 'denied';

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
    <>
      {/* Estado de las notificaciones */}
      <section className="seccion" style={{ marginTop: 16 }}>
        <div className="seccion-titulo">
          <h2>
            <Icono nombre="bell" />
            Notificaciones
          </h2>
        </div>

        {!capacidades.hayNotificaciones ? (
          <div className="aviso-caja alerta">
            <span className="icono-caja">
              <Icono nombre="triangle-exclamation" />
            </span>
            <span>
              <strong>Este navegador no admite notificaciones</strong>
              Los recordatorios seguirán guardándose y verás los avisos dentro de la aplicación,
              pero no llegarán al sistema. Prueba con Chrome, Edge o Firefox.
            </span>
          </div>
        ) : permisoDenegado ? (
          <div className="aviso-caja alerta">
            <span className="icono-caja">
              <Icono nombre="bell-slash" />
            </span>
            <span>
              <strong>Has bloqueado las notificaciones</strong>
              El navegador ya no volverá a preguntar. Entra en los ajustes del sitio (el candado
              junto a la dirección) y permite las notificaciones a mano.
            </span>
          </div>
        ) : !permisoConcedido ? (
          <div className="aviso-caja alerta">
            <span className="icono-caja">
              <Icono nombre="bell-slash" />
            </span>
            <span>
              <strong>Los avisos están desactivados</strong>
              Sin permiso no se puede avisar cuando la aplicación está cerrada.
              <button
                type="button"
                className="boton principal ancho"
                style={{ marginTop: 10 }}
                onClick={alPedirPermiso}
              >
                <Icono nombre="bell" />
                Activar las notificaciones
              </button>
            </span>
          </div>
        ) : (
          <div className="aviso-caja exito">
            <span className="icono-caja">
              <Icono nombre="circle-check" />
            </span>
            <span>
              <strong>Todo listo</strong>
              Hay {totalAvisos} {totalAvisos === 1 ? 'aviso programado' : 'avisos programados'} en
              los próximos 30 días.
            </span>
          </div>
        )}

        <button
          type="button"
          className="boton secundario ancho"
          style={{ marginTop: 10 }}
          onClick={probar}
        >
          <Icono nombre="mobile-screen" />
          Enviar una notificación de prueba
        </button>

        {mensajePrueba ? <p className="texto-ayuda">{mensajePrueba}</p> : null}

        {/* Diagnóstico técnico, útil cuando algo no llega */}
        <div className="lista-ajustes" style={{ marginTop: 12 }}>
          <FilaDiagnostico
            titulo="Aplicación instalada"
            valor={capacidades.esStandalone}
            ayuda={
              capacidades.esStandalone
                ? 'Se está ejecutando como aplicación, que es lo más fiable.'
                : 'Instálala en la pantalla de inicio para que los avisos sean más fiables.'
            }
          />
          <FilaDiagnostico
            titulo="Servicio en segundo plano"
            valor={estadoWorker === 'activo'}
            ayuda={
              estadoWorker === 'activo'
                ? 'Activo: puede avisar aunque cierres la pestaña.'
                : 'No disponible. Requiere abrir la app por HTTPS o desde localhost.'
            }
          />
          <FilaDiagnostico
            titulo="Avisos programados en el sistema"
            valor={capacidades.hayDisparadores}
            ayuda={
              capacidades.hayDisparadores
                ? 'El sistema operativo se encarga del aviso a la hora exacta.'
                : 'Tu navegador no lo admite: se usan métodos alternativos igualmente válidos.'
            }
          />
          <FilaDiagnostico
            titulo="Revisión periódica en segundo plano"
            valor={capacidades.haySyncPeriodica}
            ayuda="Red de seguridad para recuperar avisos perdidos."
          />
        </div>

        {capacidades.esIOS && !capacidades.esStandalone ? (
          <div className="aviso-caja info" style={{ marginTop: 12 }}>
            <span className="icono-caja">
              <Icono nombre="circle-info" />
            </span>
            <span>
              <strong>En iPhone hay un paso extra</strong>
              Safari solo permite notificaciones si añades la aplicación a la pantalla de inicio:
              toca Compartir y luego “Añadir a pantalla de inicio”. Después ábrela desde el icono y
              activa los avisos.
            </span>
          </div>
        ) : null}

        {promptInstalacion ? (
          <button
            type="button"
            className="boton principal ancho"
            style={{ marginTop: 12 }}
            onClick={alInstalar}
          >
            <Icono nombre="mobile-screen" />
            Instalar en el móvil
          </button>
        ) : null}
      </section>

      {/* Preferencias de aviso */}
      <section className="seccion">
        <div className="seccion-titulo">
          <h2>
            <Icono nombre="sliders" />
            Cómo quieres que te avise
          </h2>
        </div>

        <div className="lista-ajustes">
          <Interruptor
            icono="volume-high"
            titulo="Sonido"
            ayuda="Reproduce un tono al saltar un aviso con la aplicación abierta."
            valor={ajustes.sonido}
            alCambiar={(valor) => alActualizarAjustes({ sonido: valor })}
          />
          <Interruptor
            icono="mobile-screen"
            titulo="Vibración"
            ayuda="Solo en dispositivos que la admiten."
            valor={ajustes.vibracion}
            alCambiar={(valor) => alActualizarAjustes({ vibracion: valor })}
          />
          <Interruptor
            icono="moon"
            titulo="No molestar"
            ayuda="Durante la franja elegida los avisos llegan en silencio, sin sonido ni vibración."
            valor={ajustes.noMolestar}
            alCambiar={(valor) => alActualizarAjustes({ noMolestar: valor })}
          />
        </div>

        {ajustes.noMolestar ? (
          <div className="fila-campos" style={{ marginTop: 12 }}>
            <label>
              <span className="campo-etiqueta">Desde</span>
              <input
                type="time"
                className="entrada"
                value={ajustes.noMolestarDesde}
                onChange={(e) => alActualizarAjustes({ noMolestarDesde: e.target.value })}
              />
            </label>
            <label>
              <span className="campo-etiqueta">Hasta</span>
              <input
                type="time"
                className="entrada"
                value={ajustes.noMolestarHasta}
                onChange={(e) => alActualizarAjustes({ noMolestarHasta: e.target.value })}
              />
            </label>
          </div>
        ) : null}

        <div className="campo" style={{ marginTop: 18 }}>
          <div className="campo-etiqueta">
            <Icono nombre="clock" />
            Hora por defecto de los recordatorios nuevos
          </div>
          <input
            type="time"
            className="entrada"
            value={ajustes.horaPorDefecto}
            onChange={(e) => alActualizarAjustes({ horaPorDefecto: e.target.value })}
          />
        </div>

        <div className="campo">
          <div className="campo-etiqueta">
            <Icono nombre="clock-rotate-left" />
            Posponer rápido desde la notificación
          </div>
          <select
            className="selector"
            value={ajustes.minutosPosponerRapido}
            onChange={(e) => alActualizarAjustes({ minutosPosponerRapido: Number(e.target.value) })}
          >
            {[5, 10, 15, 30, 60].map((minutos) => (
              <option key={minutos} value={minutos}>
                {minutos} minutos
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <div className="campo-etiqueta">
            <Icono nombre="bell" />
            Avisos previos por defecto
          </div>
          <div className="tiras-filtro" style={{ margin: 0, padding: 0, flexWrap: 'wrap' }}>
            {AVISOS_PREVIOS.slice(0, 7).map((aviso) => {
              const activo = ajustes.avisosPreviosPorDefecto?.includes(aviso.minutos);
              return (
                <button
                  key={aviso.minutos}
                  type="button"
                  className={`pastilla ${activo ? 'activa' : ''}`}
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
      </section>

      {/* Apariencia */}
      <section className="seccion">
        <div className="seccion-titulo">
          <h2>
            <Icono nombre="palette" />
            Apariencia
          </h2>
        </div>

        <div className="campo">
          <div className="campo-etiqueta">Tema</div>
          <div className="rejilla-opciones" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {TEMAS.map((tema) => (
              <button
                key={tema.id}
                type="button"
                className={`opcion-cuadro ${ajustes.tema === tema.id ? 'activa' : ''}`}
                onClick={() => alActualizarAjustes({ tema: tema.id })}
              >
                <Icono nombre={tema.icono} />
                <span>{tema.nombre}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <div className="campo-etiqueta">Color principal</div>
          <div className="selector-colores">
            {COLORES.map((color) => (
              <button
                key={color.id}
                type="button"
                className={`muestra-color ${ajustes.colorPrincipal === color.id ? 'activo' : ''}`}
                style={{ background: color.id }}
                onClick={() => alActualizarAjustes({ colorPrincipal: color.id })}
                aria-label={color.nombre}
                title={color.nombre}
              >
                {ajustes.colorPrincipal === color.id ? <Icono nombre="check" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="lista-ajustes">
          <Interruptor
            icono="calendar-days"
            titulo="Agrupar por día en la agenda"
            valor={ajustes.agruparPorDia}
            alCambiar={(valor) => alActualizarAjustes({ agruparPorDia: valor })}
          />
        </div>
      </section>

      {/* Datos */}
      <section className="seccion">
        <div className="seccion-titulo">
          <h2>
            <Icono nombre="shield-halved" />
            Tus datos
          </h2>
        </div>

        <div className="aviso-caja info">
          <span className="icono-caja">
            <Icono nombre="circle-info" />
          </span>
          <span>
            <strong>Todo se queda en este dispositivo</strong>
            No hay cuenta ni servidor. Haz una copia de seguridad de vez en cuando si no quieres
            perder nada al cambiar de móvil o borrar los datos del navegador.
          </span>
        </div>

        <div className="fila-campos" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="boton secundario"
            onClick={() => exportarJSON({ recordatorios, ajustes, historial, version: 1 })}
          >
            <Icono nombre="download" />
            Copia de seguridad
          </button>

          <button
            type="button"
            className="boton secundario"
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
          className="boton secundario ancho"
          style={{ marginTop: 10 }}
          onClick={() => exportarICS(recordatorios.filter((r) => !r.archivado))}
        >
          <Icono nombre="calendar-plus" />
          Exportar a calendario (.ics)
        </button>

        <p className="texto-ayuda">
          El archivo .ics se importa en Google Calendar, Outlook o el calendario del móvil, con las
          repeticiones y los avisos ya incluidos. En Google Calendar: Configuración, Importar y
          exportar, Importar.
        </p>

        <div className="separador" />

        {confirmarBorrado ? (
          <div className="aviso-caja alerta">
            <span className="icono-caja">
              <Icono nombre="triangle-exclamation" />
            </span>
            <span>
              <strong>¿Seguro que quieres borrarlo todo?</strong>
              Se eliminarán los recordatorios y el historial de este dispositivo. No se puede
              deshacer.
              <div className="fila-campos" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="boton secundario"
                  onClick={() => setConfirmarBorrado(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="boton peligro"
                  onClick={() => {
                    alBorrarTodo();
                    setConfirmarBorrado(false);
                  }}
                >
                  <Icono nombre="trash" />
                  Sí, borrar todo
                </button>
              </div>
            </span>
          </div>
        ) : (
          <button
            type="button"
            className="boton peligro ancho"
            onClick={() => setConfirmarBorrado(true)}
          >
            <Icono nombre="trash" />
            Borrar todos los datos
          </button>
        )}
      </section>

      <p className="texto-ayuda" style={{ textAlign: 'center', marginTop: 24 }}>
        Recuerda · Gestor de recordatorios · Funciona sin conexión
      </p>
    </>
  );
}

function FilaDiagnostico({ titulo, valor, ayuda }) {
  return (
    <div className="interruptor-fila">
      <div className="interruptor-texto">
        <div className="titulo">
          <Icono
            nombre={valor ? 'circle-check' : 'circle-exclamation'}
            style={{ color: valor ? 'var(--exito)' : 'var(--texto-suave)' }}
          />
          {titulo}
        </div>
        <div className="ayuda">{ayuda}</div>
      </div>
    </div>
  );
}

export default VistaAjustes;
