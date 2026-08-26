/**
 * Agenda completa con filtros.
 *
 * Aquí se ve todo lo que hay guardado y se puede acotar por categoría,
 * prioridad o etiqueta, además de cambiar el criterio de ordenación.
 */

import { useMemo, useState } from 'react';
import Icono from './Icono.jsx';
import ListaRecordatorios, { EstadoVacio } from './ListaRecordatorios.jsx';
import { CATEGORIAS, ORDENACIONES, PRIORIDADES } from '../utilidades/constantes.js';
import {
  etiquetasUsadas,
  filtrarRecordatorios,
  ordenarRecordatorios
} from '../utilidades/modelo.js';

export function VistaAgenda({
  recordatorios,
  busqueda,
  ajustes,
  alActualizarAjustes,
  alLimpiarCompletados,
  ...manejadores
}) {
  const [categorias, setCategorias] = useState([]);
  const [prioridades, setPrioridades] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [soloRepetitivos, setSoloRepetitivos] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);

  const etiquetasDisponibles = useMemo(() => etiquetasUsadas(recordatorios), [recordatorios]);

  // Actualización funcional para que marcar varios filtros seguidos no pierda
  // los anteriores si React aún no ha repintado.
  const alternar = (asignar, valor) => {
    asignar((previa) =>
      previa.includes(valor) ? previa.filter((v) => v !== valor) : [...previa, valor]
    );
  };

  const visibles = useMemo(() => {
    const filtrados = filtrarRecordatorios(recordatorios, {
      texto: busqueda,
      categorias,
      prioridades,
      etiquetas,
      soloRepetitivos,
      mostrarCompletados: ajustes.mostrarCompletados
    });
    return ordenarRecordatorios(filtrados, ajustes.ordenacion);
  }, [
    recordatorios,
    busqueda,
    categorias,
    prioridades,
    etiquetas,
    soloRepetitivos,
    ajustes.mostrarCompletados,
    ajustes.ordenacion
  ]);

  const completados = recordatorios.filter((r) => r.completado).length;
  const hayFiltros = categorias.length || prioridades.length || etiquetas.length || soloRepetitivos;

  return (
    <>
      {/* Barra de control: contador, filtros y ordenación */}
      <div className="seccion" style={{ marginTop: 16 }}>
        <div className="seccion-titulo">
          <h2>
            <Icono nombre="list-check" />
            {visibles.length} {visibles.length === 1 ? 'recordatorio' : 'recordatorios'}
          </h2>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`boton-icono ${hayFiltros || panelAbierto ? 'activo' : ''}`}
              onClick={() => setPanelAbierto((v) => !v)}
              aria-label="Filtros"
              title="Filtros"
            >
              <Icono nombre="filter" />
            </button>
          </div>
        </div>

        <div className="tiras-filtro">
          {ORDENACIONES.map((orden) => (
            <button
              key={orden.id}
              type="button"
              className={`pastilla ${ajustes.ordenacion === orden.id ? 'activa' : ''}`}
              onClick={() => alActualizarAjustes({ ordenacion: orden.id })}
            >
              <Icono nombre={orden.icono} />
              {orden.nombre}
            </button>
          ))}

          <button
            type="button"
            className={`pastilla ${ajustes.mostrarCompletados ? 'activa' : ''}`}
            onClick={() => alActualizarAjustes({ mostrarCompletados: !ajustes.mostrarCompletados })}
          >
            <Icono nombre={ajustes.mostrarCompletados ? 'eye' : 'eye-slash'} />
            Completados
          </button>
        </div>

        {panelAbierto ? (
          <div className="lista-ajustes" style={{ marginTop: 10, padding: 14 }}>
            <div className="campo" style={{ marginBottom: 14 }}>
              <div className="campo-etiqueta">
                <Icono nombre="layer-group" />
                Categorías
              </div>
              <div className="tiras-filtro" style={{ margin: 0, padding: 0, flexWrap: 'wrap' }}>
                {CATEGORIAS.map((categoria) => (
                  <button
                    key={categoria.id}
                    type="button"
                    className={`pastilla ${categorias.includes(categoria.id) ? 'activa' : ''}`}
                    onClick={() => alternar(setCategorias, categoria.id)}
                  >
                    <Icono nombre={categoria.icono} />
                    {categoria.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div className="campo" style={{ marginBottom: 14 }}>
              <div className="campo-etiqueta">
                <Icono nombre="flag" />
                Prioridad
              </div>
              <div className="tiras-filtro" style={{ margin: 0, padding: 0 }}>
                {PRIORIDADES.map((prioridad) => (
                  <button
                    key={prioridad.id}
                    type="button"
                    className={`pastilla ${prioridades.includes(prioridad.id) ? 'activa' : ''}`}
                    onClick={() => alternar(setPrioridades, prioridad.id)}
                  >
                    <Icono nombre={prioridad.icono} />
                    {prioridad.nombre}
                  </button>
                ))}
              </div>
            </div>

            {etiquetasDisponibles.length ? (
              <div className="campo" style={{ marginBottom: 14 }}>
                <div className="campo-etiqueta">
                  <Icono nombre="tag" />
                  Etiquetas
                </div>
                <div className="tiras-filtro" style={{ margin: 0, padding: 0, flexWrap: 'wrap' }}>
                  {etiquetasDisponibles.map((etiqueta) => (
                    <button
                      key={etiqueta.nombre}
                      type="button"
                      className={`pastilla ${etiquetas.includes(etiqueta.nombre) ? 'activa' : ''}`}
                      onClick={() => alternar(setEtiquetas, etiqueta.nombre)}
                    >
                      #{etiqueta.nombre}
                      <span className="cuenta">{etiqueta.veces}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="interruptor-fila">
              <div className="interruptor-texto">
                <div className="titulo">
                  <Icono nombre="repeat" />
                  Solo los que se repiten
                </div>
              </div>
              <button
                type="button"
                className={`interruptor ${soloRepetitivos ? 'activo' : ''}`}
                onClick={() => setSoloRepetitivos((v) => !v)}
                aria-label="Solo los que se repiten"
              />
            </div>

            {hayFiltros ? (
              <button
                type="button"
                className="boton secundario ancho"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setCategorias([]);
                  setPrioridades([]);
                  setEtiquetas([]);
                  setSoloRepetitivos(false);
                }}
              >
                <Icono nombre="arrow-rotate-left" />
                Quitar filtros
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="seccion">
        <ListaRecordatorios
          recordatorios={visibles}
          agrupar={ajustes.agruparPorDia}
          vacio={
            <EstadoVacio
              icono={busqueda || hayFiltros ? 'magnifying-glass' : 'inbox'}
              titulo={busqueda || hayFiltros ? 'Sin resultados' : 'Agenda vacía'}
              texto={
                busqueda || hayFiltros
                  ? 'Prueba a quitar algún filtro o a buscar otra cosa.'
                  : 'Crea tu primer recordatorio con el botón de abajo.'
              }
            />
          }
          {...manejadores}
        />
      </div>

      {completados > 0 && ajustes.mostrarCompletados ? (
        <button
          type="button"
          className="boton secundario ancho"
          style={{ marginTop: 8 }}
          onClick={alLimpiarCompletados}
        >
          <Icono nombre="box-archive" />
          Borrar los {completados} completados
        </button>
      ) : null}
    </>
  );
}

export default VistaAgenda;
