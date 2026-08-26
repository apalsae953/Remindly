/**
 * Pantalla principal: lo que toca ahora mismo.
 *
 * Reúne en un solo sitio el resumen del día, la creación rápida por texto, las
 * plantillas y las tres listas que de verdad importan: atrasado, hoy y lo que
 * viene justo después.
 */

import { useMemo, useState } from 'react';
import Icono from './Icono.jsx';
import ListaRecordatorios, { EstadoVacio } from './ListaRecordatorios.jsx';
import { PLANTILLAS } from '../utilidades/constantes.js';
import { interpretarTexto } from '../utilidades/lenguaje.js';
import { capitalizar, esHoy, formatearFechaLarga, inicioDelDia, sumarDias } from '../utilidades/fechas.js';
import { estaVencido, fechaEfectiva, ordenarRecordatorios } from '../utilidades/modelo.js';
import { esRepetitivo } from '../utilidades/repeticion.js';
import { sonarClic } from '../utilidades/sonido.js';

/* ------------------------------------------------------------------ */
/* Creación rápida escribiendo una frase                               */
/* ------------------------------------------------------------------ */

function AnadirRapido({ alCrear, alAbrirCompleto }) {
  const [texto, setTexto] = useState('');
  const interpretado = useMemo(() => (texto.trim().length > 3 ? interpretarTexto(texto) : null), [texto]);

  const enviar = () => {
    const limpio = texto.trim();
    if (!limpio) return;
    alCrear(interpretarTexto(limpio));
    setTexto('');
    sonarClic();
  };

  return (
    <div className="seccion" style={{ marginTop: 18 }}>
      <div className="buscador" style={{ marginTop: 0 }}>
        <Icono nombre="wand-magic-sparkles" />
        <input
          type="text"
          placeholder="Escribe: comprar pan mañana a las 10"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              enviar();
            }
          }}
          aria-label="Añadir recordatorio rápido"
        />
        {texto ? (
          <button type="button" className="accion-mini" onClick={enviar} aria-label="Crear">
            <Icono nombre="plus" />
          </button>
        ) : (
          <button
            type="button"
            className="accion-mini"
            onClick={alAbrirCompleto}
            aria-label="Abrir el formulario completo"
            title="Formulario completo"
          >
            <Icono nombre="sliders" />
          </button>
        )}
      </div>

      {interpretado?.detectado?.length ? (
        <p className="texto-ayuda">
          <Icono nombre="circle-info" /> Se creará “{interpretado.titulo}” con{' '}
          {interpretado.detectado.join(', ')}.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel de resumen del día                                            */
/* ------------------------------------------------------------------ */

function PanelResumen({ pendientesHoy, completadosHoy, atrasados, proximo }) {
  const total = pendientesHoy + completadosHoy;
  const porcentaje = total ? Math.round((completadosHoy / total) * 100) : 0;

  const frase = useMemo(() => {
    if (atrasados > 0) return `Tienes ${atrasados} ${atrasados === 1 ? 'cosa atrasada' : 'cosas atrasadas'}`;
    if (pendientesHoy === 0 && completadosHoy > 0) return 'Todo hecho por hoy. Buen trabajo.';
    if (pendientesHoy === 0) return 'Hoy no tienes nada pendiente';
    if (pendientesHoy === 1) return 'Solo te queda una cosa hoy';
    return `Te quedan ${pendientesHoy} cosas por hacer hoy`;
  }, [atrasados, pendientesHoy, completadosHoy]);

  return (
    <div className="panel-hoy">
      <div className="fecha">{capitalizar(formatearFechaLarga(new Date()))}</div>
      <div className="frase">{frase}</div>

      <div className="panel-metricas">
        <div className="metrica">
          <div className="valor">{pendientesHoy}</div>
          <span className="etiqueta">Pendientes</span>
        </div>
        <div className="metrica">
          <div className="valor">{completadosHoy}</div>
          <span className="etiqueta">Completados</span>
        </div>
        <div className="metrica">
          <div className="valor">{atrasados}</div>
          <span className="etiqueta">Atrasados</span>
        </div>
      </div>

      {total ? (
        <div className="barra-progreso" aria-label={`Progreso del día: ${porcentaje}%`}>
          <span style={{ width: `${porcentaje}%` }} />
        </div>
      ) : null}

      {proximo ? (
        <p style={{ marginTop: 12, fontSize: '0.8rem', opacity: 0.9, position: 'relative', zIndex: 1 }}>
          <Icono nombre="bell" /> Siguiente aviso: {proximo}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vista completa                                                      */
/* ------------------------------------------------------------------ */

export function VistaHoy({
  recordatorios,
  completadosHoy,
  proximoAviso,
  alCrearRapido,
  alUsarPlantilla,
  alAbrirFormulario,
  ...manejadores
}) {
  const activos = recordatorios.filter((r) => !r.archivado && !r.completado);

  const atrasados = useMemo(
    () => ordenarRecordatorios(activos.filter((r) => estaVencido(r)), 'urgencia'),
    [activos]
  );

  const deHoy = useMemo(
    () =>
      ordenarRecordatorios(
        activos.filter((r) => !estaVencido(r) && esHoy(fechaEfectiva(r))),
        'fecha'
      ),
    [activos]
  );

  const proximosDias = useMemo(() => {
    const manana = inicioDelDia(sumarDias(new Date(), 1)).getTime();
    const limite = inicioDelDia(sumarDias(new Date(), 4)).getTime();
    return ordenarRecordatorios(
      activos.filter((r) => {
        const momento = fechaEfectiva(r).getTime();
        return momento >= manana && momento < limite;
      }),
      'fecha'
    );
  }, [activos]);

  const repetitivosActivos = activos.filter((r) => esRepetitivo(r)).length;

  return (
    <>
      <PanelResumen
        pendientesHoy={deHoy.length}
        completadosHoy={completadosHoy}
        atrasados={atrasados.length}
        proximo={proximoAviso}
      />

      <AnadirRapido alCrear={alCrearRapido} alAbrirCompleto={() => alAbrirFormulario()} />

      <div className="seccion" style={{ marginTop: 14 }}>
        <div className="seccion-titulo">
          <h2>
            <Icono nombre="bolt" />
            Plantillas rápidas
          </h2>
        </div>
        <div className="tira-plantillas">
          {PLANTILLAS.map((plantilla) => (
            <button
              key={plantilla.id}
              type="button"
              className="plantilla-chip"
              onClick={() => alUsarPlantilla(plantilla)}
            >
              <Icono nombre={plantilla.icono} />
              <span>{plantilla.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      {atrasados.length ? (
        <section className="seccion">
          <div className="seccion-titulo">
            <h2 style={{ color: 'var(--error)' }}>
              <Icono nombre="triangle-exclamation" style={{ color: 'var(--error)' }} />
              Atrasado
            </h2>
            <span className="contador">{atrasados.length}</span>
          </div>
          <ListaRecordatorios recordatorios={atrasados} agrupar={false} {...manejadores} />
        </section>
      ) : null}

      <section className="seccion">
        <div className="seccion-titulo">
          <h2>
            <Icono nombre="calendar-day" />
            Hoy
          </h2>
          <span className="contador">{deHoy.length}</span>
        </div>

        <ListaRecordatorios
          recordatorios={deHoy}
          agrupar={false}
          mostrarFecha={false}
          vacio={
            <EstadoVacio
              icono={atrasados.length ? 'clipboard-list' : 'circle-check'}
              titulo={atrasados.length ? 'Nada más para hoy' : 'Día despejado'}
              texto={
                repetitivosActivos
                  ? `Tienes ${repetitivosActivos} ${
                      repetitivosActivos === 1 ? 'recordatorio recurrente' : 'recordatorios recurrentes'
                    } en marcha. Aparecerán cuando les toque.`
                  : 'Escribe arriba lo que quieras recordar o usa una plantilla.'
              }
            />
          }
          {...manejadores}
        />
      </section>

      {proximosDias.length ? (
        <section className="seccion">
          <div className="seccion-titulo">
            <h2>
              <Icono nombre="calendar-days" />
              Los próximos días
            </h2>
            <span className="contador">{proximosDias.length}</span>
          </div>
          <ListaRecordatorios recordatorios={proximosDias} agrupar {...manejadores} />
        </section>
      ) : null}
    </>
  );
}

export default VistaHoy;
