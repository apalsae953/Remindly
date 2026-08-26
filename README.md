# Recuerda

Aplicación de recordatorios pensada para el móvil. Se instala como aplicación
(PWA), funciona sin conexión, guarda todo en el propio dispositivo y avisa con
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
cuatro estrategias y usa la mejor que soporte cada navegador, y en Ajustes se
puede ver cuáles están disponibles:

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

**Crear recordatorios**

- Escribiendo una frase normal: *"Llamar a Ana mañana a las 9 urgente"* o
  *"Pagar el alquiler cada mes"*. Se reconocen fecha, hora, repetición,
  prioridad, etiquetas (`#casa`) y hasta la categoría.
- Con plantillas de un toque: medicación, agua, basura, recibos, gimnasio...
- Con el formulario completo, para afinarlo todo.

**Repeticiones**

Cada X horas, diaria, de lunes a viernes, fines de semana, días concretos de la
semana, mensual (con día del mes fijo), anual y personalizada (cada N días,
semanas, meses o años). Con final abierto, hasta una fecha o tras un número de
veces. Al completar una ocurrencia, la siguiente se programa sola.

**Organización**

Dieciocho categorías con icono y color, cuatro prioridades, etiquetas libres,
subtareas con progreso, notas, enlace, lugar y recordatorios destacados.

**Avisos**

Varios avisos previos por recordatorio (desde 5 minutos hasta una semana antes),
posposición rápida o a una hora concreta, aviso insistente que no se va hasta
atenderlo, aviso silencioso y franja de "no molestar" nocturna.

**Vistas**

- **Hoy**: resumen del día, atrasados, lo de hoy y los próximos tres días.
- **Agenda**: todo, con búsqueda y filtros por categoría, prioridad y etiqueta.
- **Calendario**: mes completo con puntos de color, incluidas las repeticiones
  futuras calculadas al vuelo.
- **Resumen**: pendientes, gráfico de los últimos siete días, puntualidad,
  rachas y reparto por categoría.
- **Ajustes**: notificaciones, diagnóstico, apariencia y copias de seguridad.

**Otros detalles**

Tema claro, oscuro o automático; siete colores principales; deshacer la última
acción; sonido sintetizado y vibración; funciona sin conexión.

## Calendario y Google Calendar

La sincronización en tiempo real con Google Calendar necesitaría OAuth y un
servidor, así que se ha resuelto sin cuentas ni permisos de dos formas que
cubren el mismo caso de uso:

- **Exportar a `.ics`** (Ajustes › Tus datos): genera un calendario estándar con
  las repeticiones (`RRULE`) y los avisos (`VALARM`) ya incluidos. Se importa en
  Google Calendar desde *Configuración › Importar y exportar › Importar*, y
  también vale para Outlook o el calendario del móvil.
- **Añadir a Google Calendar** (en cualquier recordatorio, dentro de "Más
  opciones"): abre el formulario de Google con todos los datos rellenos.

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
  App.jsx                   Reparto de vistas y coordinación general
  contexto/
    ContextoRecordatorios    Estado global (useReducer + localStorage)
  hooks/
    useNotificaciones        Cálculo y programación de los avisos
  componentes/
    Cabecera, NavegacionInferior, TarjetaRecordatorio, ListaRecordatorios,
    HojaModal, FormularioRecordatorio, EditorRepeticion, HojaPosponer,
    Bienvenida, Avisos, VistaHoy, VistaAgenda, VistaCalendario,
    VistaResumen, VistaAjustes, Icono
  utilidades/
    constantes.js            Categorías, prioridades, plantillas, ajustes
    fechas.js                Fechas y formato en español
    repeticion.js            Motor de repeticiones
    lenguaje.js              Interpretación de frases en lenguaje natural
    calendario.js            Generación de .ics, RRULE y enlaces de Google
    modelo.js                Modelo del recordatorio, filtros y orden
    almacenamiento.js        Persistencia local
    sonido.js                Tonos sintetizados y vibración
    iconos.js                Registro de iconos de Font Awesome
  estilos/
    global.css               Estilos y variables de tema
```

Todo el código y los comentarios están en español. Los iconos son de Font
Awesome (paquete gratuito de iconos sólidos).
