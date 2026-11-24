/**
 * Componente raíz.
 *
 * Una sola pantalla. Arriba la portada del día y los tres tramos; en medio la
 * agenda o el calendario; abajo el compositor. Todo lo demás (ficha, ajustes,
 * posponer, bienvenida) ocurre en hojas que se superponen, así que nunca se
 * pierde el sitio donde estabas.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import CabeceraDiario from './componentes/CabeceraDiario.jsx';
import Compositor from './componentes/Compositor.jsx';
import ListaDiario, { Vacio } from './componentes/ListaDiario.jsx';
import PanelHechos from './componentes/PanelHechos.jsx';
import VistaCalendario from './componentes/VistaCalendario.jsx';
import FormularioRecordatorio from './componentes/FormularioRecordatorio.jsx';
import HojaAjustes from './componentes/HojaAjustes.jsx';
import HojaPosponer from './componentes/HojaPosponer.jsx';
import Bienvenida from './componentes/Bienvenida.jsx';
import Icono from './componentes/Icono.jsx';
import { BannerAviso, Tostada } from './componentes/Avisos.jsx';
import { useRecordatorios } from './contexto/ContextoRecordatorios.jsx';
import { useNotificaciones } from './hooks/useNotificaciones.js';
import { aFechaISO, esHoy } from './utilidades/fechas.js';
import { buscarRecordatorios, estaVencido, fechaEfectiva, repartirEnTramos } from './utilidades/modelo.js';
import { REPETICION_VACIA } from './utilidades/repeticion.js';
import { sonarAviso, sonarConfirmacion, vibrar } from './utilidades/sonido.js';

export default function App() {
  const { recordatorios, ajustes, historial, deshacer, acciones, aplicarAccionesNotificacion } =
    useRecordatorios();

  const [tramo, setTramo] = useState('hoy');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [modoCalendario, setModoCalendario] = useState(false);
  const [ficha, setFicha] = useState({ abierta: false, recordatorio: null, lectura: null });
  // El texto del compositor vive aquí para que abrir la ficha no lo borre:
  // si se cancela, lo escrito sigue donde estaba.
  const [textoCompositor, setTextoCompositor] = useState('');
  const [posposicion, setPosposicion] = useState({ abierta: false, recordatorio: null });
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [avisoEnPantalla, setAvisoEnPantalla] = useState(null);
  const [tostada, setTostada] = useState(null);
  const [promptInstalacion, setPromptInstalacion] = useState(null);

  /* ---------------- Notificaciones ---------------- */

  const alDispararAviso = useCallback(
    (aviso) => {
      if (aviso.soloAbrir) {
        const objetivo = recordatorios.find((r) => r.id === aviso.idRecordatorio);
        if (objetivo) setFicha({ abierta: true, recordatorio: objetivo, lectura: null });
        return;
      }

      setAvisoEnPantalla(aviso);
      if (ajustes.sonido && !aviso.silencioso) sonarAviso();
      if (ajustes.vibracion && aviso.vibrar) vibrar([180, 90, 180]);
    },
    [recordatorios, ajustes.sonido, ajustes.vibracion]
  );

  const { capacidades, estadoWorker, avisos, pedirPermiso, probarNotificacion } = useNotificaciones({
    recordatorios,
    ajustes,
    alDisparar: alDispararAviso,
    alRecibirAcciones: aplicarAccionesNotificacion
  });

  /* ---------------- Tema ---------------- */

  useEffect(() => {
    const raiz = document.documentElement;

    const aplicarTema = () => {
      const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const tema = ajustes.tema === 'auto' ? (prefiereOscuro ? 'oscuro' : 'claro') : ajustes.tema;
      raiz.setAttribute('data-tema', tema);

      // La barra del navegador se tiñe del mismo papel que la aplicación.
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', tema === 'oscuro' ? '#19181a' : '#f6f3ec');
    };

    aplicarTema();
    const consulta = window.matchMedia('(prefers-color-scheme: dark)');
    consulta.addEventListener('change', aplicarTema);
    return () => consulta.removeEventListener('change', aplicarTema);
  }, [ajustes.tema]);

  /* ---------------- Instalación ---------------- */

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
      setFicha({ abierta: true, recordatorio: null, lectura: null });
    }

    const idRecordatorio = parametros.get('recordatorio');
    if (idRecordatorio) {
      const objetivo = recordatorios.find((r) => r.id === idRecordatorio);
      if (objetivo) setFicha({ abierta: true, recordatorio: objetivo, lectura: null });
    }

    if (parametros.toString()) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    // Solo en el primer montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Confirmaciones ---------------- */

  useEffect(() => {
    if (deshacer?.mensaje) setTostada({ mensaje: deshacer.mensaje, conDeshacer: true });
  }, [deshacer]);

  const cerrarTostada = useCallback(() => {
    setTostada(null);
    acciones.descartarDeshacer();
  }, [acciones]);

  /* ---------------- Acciones sobre las filas ---------------- */

  const completar = useCallback(
    (recordatorio) => {
      if (recordatorio.completado) {
        acciones.reabrir(recordatorio.id);
        return;
      }
      acciones.completar(recordatorio.id);
      if (ajustes.sonido) sonarConfirmacion();
      if (ajustes.vibracion) vibrar([25]);
      setAvisoEnPantalla((actual) => (actual?.idRecordatorio === recordatorio.id ? null : actual));
    },
    [acciones, ajustes.sonido, ajustes.vibracion]
  );

  const manejadores = useMemo(
    () => ({
      alCompletar: completar,
      alEditar: (recordatorio) => {
        // El calendario muestra copias de ocurrencias futuras: se busca el real.
        const real = recordatorios.find((r) => r.id === recordatorio.id) || recordatorio;
        setFicha({ abierta: true, recordatorio: real, lectura: null });
      },
      alPosponer: (recordatorio) => setPosposicion({ abierta: true, recordatorio }),
      alAlternarSubtarea: (id, idSubtarea) => acciones.alternarSubtarea(id, idSubtarea)
    }),
    [completar, acciones, recordatorios]
  );

  /* ---------------- Crear y guardar ---------------- */

  const crearDesdeTexto = (lectura) => {
    if (!lectura) return;
    acciones.crear({
      titulo: lectura.titulo,
      fecha: lectura.fecha || aFechaISO(new Date()),
      hora: lectura.hora || ajustes.horaPorDefecto,
      categoria: lectura.categoria || 'personal',
      prioridad: lectura.prioridad || 'normal',
      etiquetas: lectura.etiquetas || [],
      repeticion: lectura.repeticion ? { ...REPETICION_VACIA, ...lectura.repeticion } : undefined
    });
    setTextoCompositor('');
    setTostada({ mensaje: `“${lectura.titulo}” añadido` });
  };

  const guardar = (borrador) => {
    if (borrador.id && recordatorios.some((r) => r.id === borrador.id)) {
      acciones.actualizar(borrador.id, borrador);
      setTostada({ mensaje: 'Guardado' });
    } else {
      acciones.crear(borrador);
      setTostada({ mensaje: 'Añadido' });
    }
    // Lo que venía del compositor ya está guardado: el campo se vacía.
    if (ficha.desdeCompositor) setTextoCompositor('');
    setFicha({ abierta: false, recordatorio: null, lectura: null });
  };

  const eliminar = (recordatorio) => {
    acciones.eliminar(recordatorio.id);
    setFicha({ abierta: false, recordatorio: null, lectura: null });
  };

  const duplicar = (recordatorio) => {
    const { id, creado, actualizado, completado, completadoEn, ...resto } = recordatorio;
    acciones.crear({ ...resto, titulo: `${resto.titulo} (copia)` });
    setFicha({ abierta: false, recordatorio: null, lectura: null });
    setTostada({ mensaje: 'Duplicado' });
  };

  const posponer = (id, minutos) => {
    acciones.posponer(id, minutos);
    setPosposicion({ abierta: false, recordatorio: null });
    setAvisoEnPantalla((actual) => (actual?.idRecordatorio === id ? null : actual));
    setTostada({
      mensaje: `Pospuesto ${minutos < 60 ? `${minutos} min` : `${Math.round(minutos / 60)} h`}`
    });
  };

  /* ---------------- Datos derivados ---------------- */

  const visibles = useMemo(
    () => (busqueda ? buscarRecordatorios(recordatorios, busqueda) : recordatorios),
    [recordatorios, busqueda]
  );

  const tramos = useMemo(() => repartirEnTramos(visibles), [visibles]);

  const activos = recordatorios.filter((r) => !r.archivado && !r.completado);
  const atrasados = activos.filter((r) => estaVencido(r)).length;
  const pendientesHoy = activos.filter((r) => !estaVencido(r) && esHoy(fechaEfectiva(r))).length;
  const hechosHoy = historial.filter((h) => h.dia === aFechaISO(new Date())).length;

  const cuentas = {
    hoy: tramos.hoy.length,
    proximos: tramos.proximos.length,
    hechos: tramos.hechos.length
  };

  const listaActual = tramos[tramo] || [];

  const vacios = {
    hoy: busqueda
      ? { titulo: 'Sin resultados', texto: 'Prueba a buscar otra cosa.' }
      : { titulo: 'Día despejado', texto: 'No queda nada para hoy. Escribe abajo lo próximo que no quieras olvidar.' },
    proximos: busqueda
      ? { titulo: 'Sin resultados', texto: 'Prueba a buscar otra cosa.' }
      : { titulo: 'Nada a la vista', texto: 'No hay nada programado más allá de hoy.' },
    hechos: busqueda
      ? { titulo: 'Sin resultados', texto: 'Prueba a buscar otra cosa.' }
      : { titulo: 'Todavía nada', texto: 'Lo que vayas completando aparecerá aquí.' }
  };

  return (
    <div className="app">
      <div className="lienzo">
        <CabeceraDiario
          tramo={tramo}
          alCambiarTramo={setTramo}
          cuentas={cuentas}
          pendientesHoy={pendientesHoy}
          atrasados={atrasados}
          hechosHoy={hechosHoy}
          modoCalendario={modoCalendario}
          alAlternarCalendario={() => setModoCalendario((v) => !v)}
          busquedaAbierta={busquedaAbierta}
          alAlternarBusqueda={() => {
            setBusquedaAbierta((v) => {
              if (v) setBusqueda('');
              return !v;
            });
          }}
          alAbrirAjustes={() => setAjustesAbiertos(true)}
          avisosActivos={capacidades.permiso === 'granted'}
        />

        {busquedaAbierta ? (
          <div className="buscador">
            <Icono nombre="magnifying-glass" />
            <input
              type="search"
              value={busqueda}
              placeholder="Buscar en la agenda"
              aria-label="Buscar"
              autoFocus
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda ? (
              <button
                type="button"
                className="icono-boton"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar la búsqueda"
              >
                <Icono nombre="xmark" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <main className="cuerpo lienzo">
        {modoCalendario ? (
          <VistaCalendario recordatorios={recordatorios} {...manejadores} />
        ) : (
          <>
            {tramo === 'hechos' ? (
              <PanelHechos historial={historial} recordatorios={recordatorios} />
            ) : null}

            <ListaDiario
              recordatorios={listaActual}
              modo={tramo === 'hoy' ? 'hoy' : tramo === 'proximos' ? 'dias' : 'plano'}
              vacio={<Vacio {...vacios[tramo]} />}
              {...manejadores}
            />
          </>
        )}
      </main>

      <Compositor
        texto={textoCompositor}
        alEscribir={setTextoCompositor}
        mostrarAyuda={recordatorios.length === 0}
        alCrear={crearDesdeTexto}
        alAbrirFicha={(lectura) =>
          setFicha({ abierta: true, recordatorio: null, lectura, desdeCompositor: true })
        }
      />

      <FormularioRecordatorio
        abierto={ficha.abierta}
        recordatorio={ficha.recordatorio}
        lecturaInicial={ficha.lectura}
        ajustes={ajustes}
        alGuardar={guardar}
        alEliminar={eliminar}
        alDuplicar={duplicar}
        alCerrar={() => setFicha({ abierta: false, recordatorio: null, lectura: null })}
      />

      <HojaPosponer
        abierta={posposicion.abierta}
        recordatorio={posposicion.recordatorio}
        alPosponer={posponer}
        alCerrar={() => setPosposicion({ abierta: false, recordatorio: null })}
      />

      <HojaAjustes
        abierta={ajustesAbiertos}
        alCerrar={() => setAjustesAbiertos(false)}
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
