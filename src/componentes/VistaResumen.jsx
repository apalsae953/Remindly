/**
 * Pantalla de estadísticas.
 *
 * Se calcula todo a partir del historial de completados y del estado actual de
 * los recordatorios; no se guarda ningún dato agregado, así siempre cuadra.
 */

import { useMemo } from 'react';
import Icono from './Icono.jsx';
import { EstadoVacio } from './ListaRecordatorios.jsx';
import { CATEGORIAS, obtenerCategoria } from '../utilidades/constantes.js';
import { aFechaISO, sumarDias } from '../utilidades/fechas.js';
import { estaVencido } from '../utilidades/modelo.js';
import { esRepetitivo } from '../utilidades/repeticion.js';

const ETIQUETAS_DIA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function TarjetaDato({ icono, color, valor, etiqueta }) {
  return (
    <div className="tarjeta-dato">
      <div
        className="icono"
        style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
      >
        <Icono nombre={icono} />
      </div>
      <div className="valor">{valor}</div>
      <div className="etiqueta">{etiqueta}</div>
    </div>
  );
}

export function VistaResumen({ recordatorios, historial }) {
  const activos = recordatorios.filter((r) => !r.archivado);

  /* ---------------- Datos de los últimos siete días ---------------- */

  const ultimaSemana = useMemo(() => {
    const dias = [];
    for (let i = 6; i >= 0; i -= 1) {
      const fecha = sumarDias(new Date(), -i);
      const clave = aFechaISO(fecha);
      const cuenta = historial.filter((h) => h.dia === clave).length;
      // getDay() da 0 para domingo; se reordena para empezar en lunes.
      dias.push({ clave, cuenta, etiqueta: ETIQUETAS_DIA[(fecha.getDay() + 6) % 7] });
    }
    return dias;
  }, [historial]);

  const maximoSemana = Math.max(1, ...ultimaSemana.map((d) => d.cuenta));
  const totalSemana = ultimaSemana.reduce((suma, dia) => suma + dia.cuenta, 0);

  /* ---------------- Métricas generales ---------------- */

  const pendientes = activos.filter((r) => !r.completado).length;
  const atrasados = activos.filter((r) => estaVencido(r)).length;
  const recurrentes = activos.filter((r) => esRepetitivo(r)).length;
  const completadosHoy = historial.filter((h) => h.dia === aFechaISO(new Date())).length;

  const puntualidad = useMemo(() => {
    const recientes = historial.slice(0, 60);
    if (!recientes.length) return null;
    const aTiempo = recientes.filter((h) => h.aTiempo).length;
    return Math.round((aTiempo / recientes.length) * 100);
  }, [historial]);

  const mejorRacha = useMemo(
    () => activos.reduce((maximo, r) => Math.max(maximo, r.racha || 0), 0),
    [activos]
  );

  /* ---------------- Reparto por categoría ---------------- */

  const porCategoria = useMemo(() => {
    const cuenta = new Map();
    activos.filter((r) => !r.completado).forEach((r) => {
      cuenta.set(r.categoria, (cuenta.get(r.categoria) || 0) + 1);
    });

    return CATEGORIAS.map((categoria) => ({
      ...categoria,
      cuenta: cuenta.get(categoria.id) || 0
    }))
      .filter((c) => c.cuenta > 0)
      .sort((a, b) => b.cuenta - a.cuenta);
  }, [activos]);

  const maximoCategoria = Math.max(1, ...porCategoria.map((c) => c.cuenta));

  /* ---------------- Lo más repetido del historial ---------------- */

  const masFrecuentes = useMemo(() => {
    const cuenta = new Map();
    historial.forEach((h) => {
      cuenta.set(h.titulo, (cuenta.get(h.titulo) || 0) + 1);
    });
    return [...cuenta.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([titulo, veces]) => ({ titulo, veces }));
  }, [historial]);

  if (!activos.length && !historial.length) {
    return (
      <EstadoVacio
        icono="chart-simple"
        titulo="Todavía no hay datos"
        texto="En cuanto empieces a completar recordatorios verás aquí tu progreso."
      />
    );
  }

  return (
    <>
      <section className="seccion" style={{ marginTop: 16 }}>
        <div className="seccion-titulo">
          <h2>
            <Icono nombre="chart-simple" />
            De un vistazo
          </h2>
        </div>

        <div className="rejilla-tarjetas">
          <TarjetaDato icono="inbox" color="#6c5ce7" valor={pendientes} etiqueta="Pendientes" />
          <TarjetaDato
            icono="circle-check"
            color="#00c9a7"
            valor={completadosHoy}
            etiqueta="Hechos hoy"
          />
          <TarjetaDato
            icono="triangle-exclamation"
            color="#ff5c6c"
            valor={atrasados}
            etiqueta="Atrasados"
          />
          <TarjetaDato icono="repeat" color="#4aa3f0" valor={recurrentes} etiqueta="Recurrentes" />
        </div>
      </section>

      <section className="seccion">
        <div className="seccion-titulo">
          <h2>
            <Icono nombre="chart-line" />
            Últimos 7 días
          </h2>
          <span className="contador">{totalSemana} completados</span>
        </div>

        <div className="tarjeta-dato">
          <div className="grafico-semana">
            {ultimaSemana.map((dia) => (
              <div className="grafico-columna" key={dia.clave}>
                <div
                  className="grafico-barra"
                  style={{ height: `${(dia.cuenta / maximoSemana) * 100}%` }}
                >
                  {dia.cuenta ? <span>{dia.cuenta}</span> : null}
                </div>
                <span className="grafico-etiqueta">{dia.etiqueta}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {puntualidad !== null || mejorRacha > 0 ? (
        <section className="seccion">
          <div className="seccion-titulo">
            <h2>
              <Icono nombre="bullseye" />
              Constancia
            </h2>
          </div>

          <div className="rejilla-tarjetas" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {puntualidad !== null ? (
              <TarjetaDato
                icono="stopwatch"
                color="#ffb020"
                valor={`${puntualidad}%`}
                etiqueta="Completados a tiempo"
              />
            ) : null}
            {mejorRacha > 0 ? (
              <TarjetaDato
                icono="fire"
                color="#e17055"
                valor={mejorRacha}
                etiqueta="Mejor racha seguida"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {porCategoria.length ? (
        <section className="seccion">
          <div className="seccion-titulo">
            <h2>
              <Icono nombre="layer-group" />
              Pendientes por categoría
            </h2>
          </div>

          <div className="tarjeta-dato">
            {porCategoria.map((categoria) => (
              <div className="barra-categoria" key={categoria.id}>
                <span className="nombre">
                  <Icono nombre={categoria.icono} style={{ color: categoria.color }} />
                  {categoria.nombre}
                </span>
                <span className="pista">
                  <span
                    className="relleno"
                    style={{
                      width: `${(categoria.cuenta / maximoCategoria) * 100}%`,
                      background: categoria.color
                    }}
                  />
                </span>
                <span className="numero">{categoria.cuenta}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {masFrecuentes.length ? (
        <section className="seccion">
          <div className="seccion-titulo">
            <h2>
              <Icono nombre="trophy" />
              Lo que más completas
            </h2>
          </div>

          <div className="tarjeta-dato">
            {masFrecuentes.map((elemento, indice) => (
              <div className="barra-categoria" key={elemento.titulo}>
                <span className="nombre" style={{ width: 26, justifyContent: 'center' }}>
                  {indice + 1}
                </span>
                <span style={{ flex: 1, fontSize: '0.86rem' }}>{elemento.titulo}</span>
                <span className="numero">{elemento.veces}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="seccion">
        <div className="aviso-caja info">
          <span className="icono-caja">
            <Icono nombre="circle-info" />
          </span>
          <span>
            <strong>Todo se calcula en tu dispositivo</strong>
            Estos datos salen de tu propio historial, guardado solo aquí. No se envía nada a
            ningún servidor.
          </span>
        </div>
      </section>
    </>
  );
}

export default VistaResumen;
