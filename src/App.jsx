/**
 * Componente raíz: reparte las vistas, coordina las hojas modales y conecta el
 * estado con el sistema de notificaciones.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Cabecera from './componentes/Cabecera.jsx';
import NavegacionInferior from './componentes/NavegacionInferior.jsx';
import VistaHoy from './componentes/VistaHoy.jsx';
import VistaAgenda from './componentes/VistaAgenda.jsx';
import VistaCalendario from './componentes/VistaCalendario.jsx';
import VistaResumen from './componentes/VistaResumen.jsx';
import VistaAjustes from './componentes/VistaAjustes.jsx';
import FormularioRecordatorio from './componentes/FormularioRecordatorio.jsx';
import HojaPosponer from './componentes/HojaPosponer.jsx';
import Bienvenida from './componentes/Bienvenida.jsx';
import Icono from './componentes/Icono.jsx';
import { BannerAviso, Tostada } from './componentes/Avisos.jsx';
import { useRecordatorios } from './contexto/ContextoRecordatorios.jsx';
import { useNotificaciones } from './hooks/useNotificaciones.js';
import { VISTAS } from './utilidades/constantes.js';
import { aFechaISO, esHoy, formatearHora, textoRelativo } from './utilidades/fechas.js';
import { estaVencido, fechaEfectiva } from './utilidades/modelo.js';
import { sonarAviso, sonarConfirmacion, vibrar } from './utilidades/sonido.js';

/* ------------------------------------------------------------------ */
/* Ayudas de color para el tema personalizado                          */
/* ------------------------------------------------------------------ */

/** Aclara u oscurece un color hexadecimal un porcentaje dado. */
function ajustarColor(hex, porcentaje) {
  const limpio = hex.replace('#', '');
  const numero = parseInt(limpio, 16);
  const canal = (desplazamiento) => {
    const valor = (numero >> desplazamiento) & 0xff;
    const nuevo = Math.round(valor + (porcentaje > 0 ? (255 - valor) : valor) * porcentaje);
    return Math.max(0, Math.min(255, nuevo));
  };
  return `#${[canal(16), canal(8), canal(0)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

/* ------------------------------------------------------------------ */
/* Aplicación                                                          */
/* ------------------------------------------------------------------ */

export default function App() {
  const { recordatorios, ajustes, historial, deshacer, acciones, aplicarAccionesNotificacion } =
    useRecordatorios();

  const [vista, setVista] = useState('hoy');
  const [busqueda, setBusqueda] = useState('');
  const [formulario, setFormulario] = useState({ abierto: false, recordatorio: null, plantilla: null });
  const [posposicion, setPosposicion] = useState({ abierta: false, recordatorio: null });
  const [avisoEnPantalla, setAvisoEnPantalla] = useState(null);
  const [tostada, setTostada] = useState(null);
  const [promptInstalacion, setPromptInstalacion] = useState(null);

  /* ---------------- Notificaciones ---------------- */

  const alDispararAviso = useCallback(
    (aviso) => {
      // Cuando el service worker pide abrir un recordatorio concreto.
      if (aviso.soloAbrir) {
        const objetivo = recordatorios.find((r) => r.id === aviso.idRecordatorio);
        if (objetivo) setFormulario({ abierto: true, recordatorio: objetivo, plantilla: null });
        return;
      }

      setAvisoEnPantalla(aviso);
      if (ajustes.sonido && !aviso.silencioso) sonarAviso();
      if (ajustes.vibracion && aviso.vibrar) vibrar([180, 90, 180]);
    },
    [recordatorios, ajustes.sonido, ajustes.vibracion]
  );

  const {
    capacidades,
    estadoWorker,
    avisos,
    proximoAviso,
    pedirPermiso,
    probarNotificacion
  } = useNotificaciones({
    recordatorios,
    ajustes,
    alDisparar: alDispararAviso,
    alRecibirAcciones: aplicarAccionesNotificacion
  });

  /* ---------------- Tema y color ---------------- */

  useEffect(() => {
    const raiz = document.documentElement;

    const aplicarTema = () => {
      const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const tema = ajustes.tema === 'auto' ? (prefiereOscuro ? 'oscuro' : 'claro') : ajustes.tema;
      raiz.setAttribute('data-tema', tema);

      const metaColor = document.querySelector('meta[name="theme-color"]');
      if (metaColor) metaColor.setAttribute('content', tema === 'oscuro' ? '#0f0f17' : '#f4f5fa');
    };

    aplicarTema();

    const consulta = window.matchMedia('(prefers-color-scheme: dark)');
    consulta.addEventListener('change', aplicarTema);
    return () => consulta.removeEventListener('change', aplicarTema);
  }, [ajustes.tema]);

  useEffect(() => {
    const raiz = document.documentElement;
    const color = ajustes.colorPrincipal || '#6c5ce7';
    raiz.style.setProperty('--principal', color);
    raiz.style.setProperty('--principal-claro', ajustarColor(color, 0.35));
    raiz.style.setProperty('--principal-oscuro', ajustarColor(color, -0.3));
  }, [ajustes.colorPrincipal]);

  /* ---------------- Instalación de la PWA ---------------- */

  useEffect(() => {
    const alPoderInstalar = (evento) => {
      evento.preventDefault();
      setPromptInstalacion(evento);
    };
    window.addEventListener('beforeinstallprompt', alPoderInstalar);
    return () => window.removeEventListener('beforeinstallprompt', alPoderInstalar);
  }, []);

  const instalar = async () => {
    if (!promptInstalacion) return;
    promptInstalacion.prompt();
    await promptInstalacion.userChoice;
    setPromptInstalacion(null);
  };

  /* ---------------- Parámetros de la dirección ---------------- */

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);

    if (parametros.get('accion') === 'nuevo') {
      setFormulario({ abierto: true, recordatorio: null, plantilla: null });
    }

    const vistaPedida = parametros.get('vista');
    if (vistaPedida && VISTAS.some((v) => v.id === vistaPedida)) setVista(vistaPedida);

    const idRecordatorio = parametros.get('recordatorio');
    if (idRecordatorio) {
      const objetivo = recordatorios.find((r) => r.id === idRecordatorio);
      if (objetivo) setFormulario({ abierto: true, recordatorio: objetivo, plantilla: null });
    }

    // Se limpia la dirección para que al recargar no se repita la acción.
    if (parametros.toString()) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    // Solo debe ejecutarse en el primer montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Mensajes de confirmación ---------------- */

  useEffect(() => {
    if (deshacer?.mensaje) {
      setTostada({ mensaje: deshacer.mensaje, conDeshacer: true });
    }
  }, [deshacer]);

  const cerrarTostada = useCallback(() => {
    setTostada(null);
    acciones.descartarDeshacer();
  }, [acciones]);

  /* ---------------- Manejadores de la lista ---------------- */

  const completar = useCallback(
    (recordatorio) => {
      if (recordatorio.completado) {
        acciones.reabrir(recordatorio.id);
        return;
      }
      acciones.completar(recordatorio.id);
      if (ajustes.sonido) sonarConfirmacion();
      if (ajustes.vibracion) vibrar([35]);
      // Si el aviso en pantalla era de este recordatorio, ya no hace falta.
      setAvisoEnPantalla((actual) =>
        actual?.idRecordatorio === recordatorio.id ? null : actual
      );
    },
    [acciones, ajustes.sonido, ajustes.vibracion]
  );

  const manejadoresLista = useMemo(
    () => ({
      alCompletar: completar,
      alEditar: (recordatorio) => {
        // En el calendario se muestran copias de las ocurrencias futuras, así
        // que se busca siempre el recordatorio real por identificador.
        const real = recordatorios.find((r) => r.id === recordatorio.id) || recordatorio;
        setFormulario({ abierto: true, recordatorio: real, plantilla: null });
      },
      alPosponer: (recordatorio) => setPosposicion({ abierta: true, recordatorio }),
      alFijar: (recordatorio) => acciones.alternarCampo(recordatorio.id, 'fijado'),
      alAlternarSubtarea: (id, idSubtarea) => acciones.alternarSubtarea(id, idSubtarea)
    }),
    [completar, acciones, recordatorios]
  );

  /* ---------------- Guardado ---------------- */

  const guardar = (borrador) => {
    if (borrador.id && recordatorios.some((r) => r.id === borrador.id)) {
      acciones.actualizar(borrador.id, borrador);
      setTostada({ mensaje: 'Cambios guardados' });
    } else {
      acciones.crear(borrador);
      setTostada({ mensaje: 'Recordatorio creado' });
    }
    setFormulario({ abierto: false, recordatorio: null, plantilla: null });
  };

  const crearDesdeTexto = (interpretado) => {
    if (!interpretado) return;
    acciones.crear({
      titulo: interpretado.titulo,
      fecha: interpretado.fecha || aFechaISO(new Date()),
      hora: interpretado.hora || ajustes.horaPorDefecto,
      categoria: interpretado.categoria || 'personal',
      prioridad: interpretado.prioridad || 'media',
      etiquetas: interpretado.etiquetas || [],
      repeticion: interpretado.repeticion
        ? {
            tipo: 'ninguna',
            intervalo: 1,
            diasSemana: [],
            diaMes: null,
            unidad: 'dias',
            fin: { tipo: 'nunca', fecha: null, repeticiones: 10 },
            completadas: 0,
            ...interpretado.repeticion
          }
        : undefined
    });
    setTostada({ mensaje: `“${interpretado.titulo}” añadido` });
  };

  const eliminar = (recordatorio) => {
    acciones.eliminar(recordatorio.id);
    setFormulario({ abierto: false, recordatorio: null, plantilla: null });
  };

  const duplicar = (recordatorio) => {
    const { id, creado, actualizado, completado, completadoEn, ...resto } = recordatorio;
    acciones.crear({ ...resto, titulo: `${resto.titulo} (copia)` });
    setFormulario({ abierto: false, recordatorio: null, plantilla: null });
    setTostada({ mensaje: 'Recordatorio duplicado' });
  };

  const posponer = (id, minutos) => {
    acciones.posponer(id, minutos);
    setPosposicion({ abierta: false, recordatorio: null });
    setAvisoEnPantalla((actual) => (actual?.idRecordatorio === id ? null : actual));
    setTostada({ mensaje: `Pospuesto ${minutos < 60 ? `${minutos} min` : `${Math.round(minutos / 60)} h`}` });
  };

  /* ---------------- Datos derivados para la interfaz ---------------- */

  const activos = recordatorios.filter((r) => !r.archivado && !r.completado);
  const atrasados = activos.filter((r) => estaVencido(r)).length;
  const pendientesHoy = activos.filter((r) => !estaVencido(r) && esHoy(fechaEfectiva(r))).length;
  const completadosHoy = historial.filter((h) => h.dia === aFechaISO(new Date())).length;

  const textoProximoAviso = useMemo(() => {
    if (!proximoAviso) return null;
    return `${proximoAviso.titulo} · ${formatearHora(proximoAviso.momento)} (${textoRelativo(
      proximoAviso.momento
    )})`;
  }, [proximoAviso]);

  const tituloVista = {
    hoy: 'Hoy',
    agenda: 'Mi agenda',
    calendario: 'Calendario',
    resumen: 'Resumen',
    ajustes: 'Ajustes'
  }[vista];

  return (
    <div className="aplicacion">
      <Cabecera
        titulo={tituloVista}
        busqueda={busqueda}
        alBuscar={setBusqueda}
        mostrarBuscador={vista === 'agenda' || vista === 'hoy'}
        permisoNotificaciones={capacidades.permiso}
        alPulsarCampana={() => {
          if (capacidades.permiso === 'granted') setVista('ajustes');
          else pedirPermiso();
        }}
      />

      <main className="contenido">
        {vista === 'hoy' ? (
          <VistaHoy
            recordatorios={
              busqueda
                ? recordatorios.filter((r) =>
                    r.titulo.toLowerCase().includes(busqueda.toLowerCase())
                  )
                : recordatorios
            }
            completadosHoy={completadosHoy}
            proximoAviso={textoProximoAviso}
            alCrearRapido={crearDesdeTexto}
            alUsarPlantilla={(plantilla) =>
              setFormulario({ abierto: true, recordatorio: null, plantilla })
            }
            alAbrirFormulario={() =>
              setFormulario({ abierto: true, recordatorio: null, plantilla: null })
            }
            {...manejadoresLista}
          />
        ) : null}

        {vista === 'agenda' ? (
          <VistaAgenda
            recordatorios={recordatorios}
            busqueda={busqueda}
            ajustes={ajustes}
            alActualizarAjustes={acciones.actualizarAjustes}
            alLimpiarCompletados={acciones.limpiarCompletados}
            {...manejadoresLista}
          />
        ) : null}

        {vista === 'calendario' ? (
          <VistaCalendario recordatorios={recordatorios} {...manejadoresLista} />
        ) : null}

        {vista === 'resumen' ? (
          <VistaResumen recordatorios={recordatorios} historial={historial} />
        ) : null}

        {vista === 'ajustes' ? (
          <VistaAjustes
            ajustes={ajustes}
            alActualizarAjustes={acciones.actualizarAjustes}
            recordatorios={recordatorios}
            historial={historial}
            capacidades={capacidades}
            estadoWorker={estadoWorker}
            totalAvisos={avisos.length}
            alPedirPermiso={pedirPermiso}
            alProbarNotificacion={probarNotificacion}
            alImportar={(datos) => {
              acciones.importar(datos);
              setTostada({ mensaje: 'Copia restaurada' });
            }}
            alBorrarTodo={() => {
              acciones.borrarTodo();
              setTostada({ mensaje: 'Datos borrados' });
            }}
            promptInstalacion={promptInstalacion}
            alInstalar={instalar}
          />
        ) : null}
      </main>

      {vista !== 'ajustes' ? (
        <button
          type="button"
          className="boton-flotante"
          onClick={() => setFormulario({ abierto: true, recordatorio: null, plantilla: null })}
          aria-label="Nuevo recordatorio"
        >
          <Icono nombre="plus" />
        </button>
      ) : null}

      <NavegacionInferior
        vistaActiva={vista}
        alCambiarVista={setVista}
        pendientesHoy={pendientesHoy}
        atrasados={atrasados}
      />

      <FormularioRecordatorio
        abierto={formulario.abierto}
        recordatorio={formulario.recordatorio}
        plantilla={formulario.plantilla}
        ajustes={ajustes}
        alGuardar={guardar}
        alEliminar={eliminar}
        alDuplicar={duplicar}
        alCerrar={() => setFormulario({ abierto: false, recordatorio: null, plantilla: null })}
      />

      <HojaPosponer
        abierta={posposicion.abierta}
        recordatorio={posposicion.recordatorio}
        alPosponer={posponer}
        alCerrar={() => setPosposicion({ abierta: false, recordatorio: null })}
      />

      <Bienvenida
        abierta={Boolean(ajustes.primeraVez)}
        capacidades={capacidades}
        alPedirPermiso={pedirPermiso}
        alTerminar={() => acciones.actualizarAjustes({ primeraVez: false })}
      />

      <BannerAviso
        aviso={avisoEnPantalla}
        alCompletar={() => {
          const objetivo = recordatorios.find((r) => r.id === avisoEnPantalla?.idRecordatorio);
          if (objetivo) completar(objetivo);
          setAvisoEnPantalla(null);
        }}
        alPosponer={() => {
          const objetivo = recordatorios.find((r) => r.id === avisoEnPantalla?.idRecordatorio);
          setAvisoEnPantalla(null);
          if (objetivo) setPosposicion({ abierta: true, recordatorio: objetivo });
        }}
        alCerrar={() => setAvisoEnPantalla(null)}
      />

      <Tostada
        mensaje={tostada?.mensaje}
        textoAccion={tostada?.conDeshacer ? 'Deshacer' : null}
        alPulsarAccion={() => {
          acciones.deshacer();
          setTostada(null);
        }}
        alCerrar={cerrarTostada}
      />
    </div>
  );
}
