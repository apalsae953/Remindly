# Recuerda

Agenda de recordatorios para el móvil. Se instala como aplicación (PWA),
funciona sin conexión, guarda todo en el propio dispositivo y avisa con
notificaciones del sistema.

## Puesta en marcha

```bash
npm install
```

```bash
npm run dev
```

El servidor arranca con `--host`, así que en la consola aparece también una
dirección del tipo `http://192.168.1.x:5173`. Esa es la que hay que abrir desde
el móvil para probarla en el teléfono estando en la misma red wifi.

Para generar la versión de producción:

```bash
npm run build
```

## Cómo está pensada

**Una sola pantalla.** No hay barra de pestañas. Arriba la fecha y tres tramos
(Hoy, Próximos, Hechos); en medio la agenda; abajo una barra donde se escribe.
Buscar, calendario y ajustes son tres iconos en la cabecera. Todo lo demás
ocurre en hojas que se superponen, así que nunca se pierde el sitio.

**Escribir es la forma principal de crear.** En vez de un botón flotante que
abre un formulario, hay una barra fija abajo: escribes *"Pagar el alquiler cada
mes urgente"* y, mientras escribes, la aplicación enseña en una línea lo que ha
entendido (fecha, hora, repetición, prioridad, categoría).

Desde ahí salen **dos caminos, los dos siempre a la vista**: la flecha lo añade
al momento, y **Configurar** abre la ficha con el nombre ya puesto para elegir
cuándo, cada cuánto y lo demás antes de añadirlo. Si se cancela, lo escrito
sigue en la barra. Con la barra vacía, Configurar abre una ficha en blanco.

**Editar pone "Editar".** Cada línea de la agenda lleva sus acciones escritas
debajo — *Editar* y *Posponer* — en vez de confiar en que alguien adivine que
tocando el título se abre la ficha (que también).

**Lo atrasado no se esconde.** Si algo venció ayer y sigue sin hacerse, aparece
en "Hoy", en su propio bloque, con una barra terracota al margen. Es el único
sitio donde la aplicación usa color.

## Diseño

Dirección editorial, como una agenda de papel: fondo de papel cálido, tinta
casi negra, un único acento terracota reservado para lo que vence ahora, y un
verde salvia apagado para lo hecho. Sin degradados, sin sombras de color, sin
tarjetas. La jerarquía la llevan la tipografía (Fraunces para las fechas, Inter
para la interfaz) y las líneas de un píxel entre filas.

Todos los valores viven en [`src/estilos/tokens.css`](src/estilos/tokens.css),
en OKLCH. El tema oscuro es tinta cálida, nunca negro puro.

## Instalación en el móvil

Las notificaciones son mucho más fiables con la aplicación instalada:

- **Android (Chrome)**: menú de tres puntos, "Añadir a pantalla de inicio" o
  "Instalar aplicación". También aparece un botón de instalar dentro de Ajustes.
- **iPhone (Safari)**: botón Compartir, "Añadir a pantalla de inicio". En iOS es
  **obligatorio** instalarla: Safari no permite notificaciones web fuera de la
  pantalla de inicio. Después hay que abrirla desde el icono y aceptar el aviso.

Importante: para que el navegador permita el service worker y las
notificaciones, la aplicación debe servirse por **HTTPS** (o desde `localhost`).
Si la subes a un hosting, asegúrate de que tenga certificado.

## Cómo llegan los avisos

No hay servidor ni cuenta: todo ocurre en el dispositivo. La aplicación combina
cuatro estrategias y usa la mejor que soporte cada navegador. En Ajustes se ve
cuáles están disponibles en ese móvil concreto:

1. **Notification Triggers**: el sistema operativo se queda con el aviso
   programado y lo lanza a la hora exacta aunque el navegador esté cerrado. Es
   lo ideal, pero no todos los navegadores lo implementan.
2. **Temporizadores del service worker**: mientras el worker siga vivo.
3. **Repesca al abrir**: si un aviso venció con el móvil apagado, salta en
   cuanto la aplicación o el worker despiertan (hasta 12 horas después).
4. **Revisión periódica en segundo plano**: red de seguridad en Android con la
   aplicación instalada.

Con la aplicación abierta el aviso salta siempre, además de mostrarse un banner
dentro de la propia pantalla.

Desde la notificación se puede marcar como **Hecho** o **Posponer** sin abrir la
aplicación; la acción se aplica en cuanto se vuelve a abrir.

## Qué se puede hacer

**Crear**

- Escribiendo una frase normal. Se reconocen fecha (*mañana*, *el lunes*, *el
  15 de marzo*, *en 3 días*), hora (*a las 9*, *a las 18:30*), repetición
  (*cada día*, *cada martes*, *cada mes*, *cada 3 días*), repeticiones de
  varias tomas (*3 veces al día*, que admite *a las 10* para recolocarlas),
  franjas (*cada 2 horas de 8 a 22*), prioridad (*urgente*, *importante*),
  etiquetas (`#casa`) y la categoría.
- Con la ficha completa, para afinarlo todo.

**Repeticiones**

Seis frecuencias a la vista, cada una con su explicación y sin nada escondido
detrás de un desplegable: una sola vez, cada día, días concretos de la semana,
cada mes, cada año y cada pocas horas. Todas llevan un contador al lado, así
que *cada 3 días* o *cada 2 semanas* se ponen con dos toques.

Encima de eso, **varias horas al día**. Se añaden las que hagan falta, o se
cogen de un atajo (2, 3, 4 o 6 veces), y se combinan con la frecuencia. De ahí
salen cosas como *cada 2 días a las 8:00 y a las 20:00* o *los lunes, miércoles
y viernes a las 7:30 y a las 19:00*.

La repetición por horas se puede limitar a una franja — *cada 2 horas, de 8:00
a 22:00* — para que no avise de madrugada. La franja puede cruzar la medianoche
si lo que hace falta es justo lo contrario.

Al pie del editor se ven siempre los próximos días con sus horas de verdad. Es
la forma rápida de comprobar que la regla dice lo que se quería decir, sin
guardar y esperar a ver qué pasa.

Con final abierto, hasta una fecha o tras un número de veces. Al completar una
ocurrencia, la siguiente se programa sola; si es la última del día, salta al
siguiente día activo.

**Organizar**

Ocho categorías con su punto de color, tres prioridades, etiquetas libres,
subtareas con progreso, notas, enlace y lugar.

**Avisos**

Varios avisos previos por recordatorio (desde 10 minutos hasta una semana
antes), posposición rápida o a una hora concreta, aviso insistente que no se va
hasta atenderlo, aviso silencioso y franja de "no molestar" nocturna.

**Otros detalles**

Tema claro, oscuro o automático; búsqueda; calendario mensual con las
repeticiones futuras calculadas al vuelo; resumen de los últimos siete días
dentro de "Hechos"; deshacer la última acción; funciona sin conexión.

## Calendario y Google Calendar

La sincronización en tiempo real con Google Calendar necesitaría OAuth y un
servidor, así que se ha resuelto sin cuentas ni permisos de dos formas que
cubren el mismo caso de uso:

- **Exportar a `.ics`** (Ajustes › Tus datos): genera un calendario estándar con
  las repeticiones (`RRULE`) y los avisos (`VALARM`) ya incluidos. Se importa en
  Google Calendar desde *Configuración › Importar y exportar › Importar*, y
  también vale para Outlook o el calendario del móvil.
- **Añadir a Google Calendar** (en cualquier recordatorio, dentro de
  "Detalles"): abre el formulario de Google con todos los datos rellenos.

## Copias de seguridad

Los datos viven solo en este dispositivo. Desde Ajustes se puede exportar todo a
un archivo JSON y restaurarlo en otro móvil. La aplicación pide almacenamiento
persistente al navegador para que no borre los datos al liberar espacio, pero
conviene hacer una copia de vez en cuando.

## Estructura del proyecto

```
public/
  sw.js                     Service worker: caché, avisos y acciones
  manifest.webmanifest      Manifiesto de la PWA
  iconos/                   Iconos de la aplicación
src/
  main.jsx                  Punto de entrada
  App.jsx                   La pantalla única y las hojas
  contexto/
    ContextoRecordatorios    Estado global (useReducer + localStorage)
  hooks/
    useNotificaciones        Cálculo y programación de los avisos
  componentes/
    CabeceraDiario           Fecha, estado del día y los tres tramos
    Compositor               Barra de escribir del pie, con lectura en vivo
    FilaRecordatorio         Una línea de la agenda
    ListaDiario              Lista, con agrupación por día
    PanelHechos              Resumen compacto dentro de "Hechos"
    VistaCalendario          Mes completo
    FormularioRecordatorio   Ficha: qué, cuándo y "Detalles"
    EditorRepeticion         Regla de repetición en versión compacta
    HojaModal                Hoja deslizante reutilizable
    HojaAjustes              Ajustes y diagnóstico de avisos
    HojaPosponer             Posposición rápida
    Bienvenida, Avisos, Icono
  utilidades/
    constantes.js            Categorías, prioridades, atajos, ajustes
    fechas.js                Fechas y formato en español
    repeticion.js            Motor de repeticiones
    lenguaje.js              Interpretación de frases en lenguaje natural
    calendario.js            Generación de .ics, RRULE y enlaces de Google
    modelo.js                Modelo, migraciones, tramos y búsqueda
    almacenamiento.js        Persistencia local
    sonido.js                Tonos sintetizados y vibración
    iconos.js                Registro de iconos de Font Awesome
  estilos/
    tokens.css               Único sitio con valores literales
    global.css               Estilos de la aplicación
```

Todo el código y los comentarios están en español. Los iconos son de Font
Awesome (paquete gratuito de iconos sólidos).
