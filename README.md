# Práctica 04: Jardín botánico en crecimiento

## Descripción

Esta práctica toma como base el jardín botánico interactivo de la Práctica 03 y conserva las seis especies modeladas con geometrías primitivas: girasol ornamental, helecho, cactus, planta tropical, rosa y lavanda. Se conserva la plataforma circular, las macetas, la iluminación, OrbitControls, los controles de hojas y la ficha informativa. La ampliación añade crecimiento por etapas, viento ajustable y shaders personalizados GLSL.

La simulación es educativa y visual; no pretende predecir el crecimiento biológico real de las especies.

## Estructura

```text
practica-04-crecimiento/
├── index.html
├── style.css
├── main.js
├── shaders/
│   ├── wind.vert
│   └── wind.frag
├── assets/
│   └── README.txt
├── captura.png        # Guardar aquí una captura real del visor funcionando
└── README.md
```

## Cómo ejecutar desde Git Bash

1. Descomprime `practica-04-crecimiento.zip`.
2. Abre Git Bash dentro de esa carpeta.
3. Inicia un servidor local:

   ```bash
   python -m http.server 8000
   ```

   Si `python` no está disponible, prueba `py -m http.server 8000`.
4. Abre `http://localhost:8000` en Chrome o Firefox.
5. Mantén la terminal abierta mientras uses el simulador. Para detenerlo, regresa a Git Bash y presiona `Ctrl + C`.

No abras `index.html` mediante doble clic: los shaders se cargan con `fetch`, por lo que la página debe servirse mediante HTTP. Three.js y OrbitControls provienen de un CDN, así que necesitas conexión a internet.

## Controles

- **Pausar/Reanudar animación:** detiene o continúa el reloj del crecimiento y el movimiento del viento.
- **Reiniciar crecimiento:** devuelve el tiempo a cero para repetir la simulación.
- **Cambiar color de hojas:** alterna entre varios tonos verdes.
- **Reiniciar cámara:** devuelve la cámara a la vista inicial.
- **Mostrar/Ocultar hojas:** cambia la visibilidad del follaje.
- **Velocidad de crecimiento:** ajusta el multiplicador del tiempo de desarrollo.
- **Intensidad del viento:** modifica el balanceo de la vegetación y el desplazamiento de vértices GLSL.
- **Intensidad de luz:** permite ajustar la luz direccional.
- **Clic sobre una parte visible:** muestra su nombre, especie, geometría, altura aproximada, función y porcentaje de crecimiento. Macetas y sustrato son piezas estáticas y no muestran crecimiento.
- **OrbitControls:** arrastra para rotar y usa la rueda para acercar o alejar la escena.

## Funcionamiento técnico

### Bucle de animación

`requestAnimationFrame(animate)` solicita el siguiente fotograma. En cada iteración se calcula el tiempo transcurrido (`delta`) y, si la simulación no está pausada, se incrementa el reloj de crecimiento según el valor del slider. Después se actualizan el progreso de las piezas, el viento, los uniformes del shader y el render de la escena.

### Crecimiento progresivo

Cada pieza vegetal tiene un tiempo de inicio y una duración. El progreso se calcula a partir del tiempo de simulación y se suaviza con una curva cúbica `ease-out`. Los cilindros que representan tallos y ramas escalan a lo largo de su eje y su centro se mueve proporcionalmente para mantener el extremo de origen anclado. Hojas, espinas, pétalos y centros florales escalan desde cero. Las seis especies empiezan con pequeños desfases para dar sensación de desarrollo gradual.

### Jerarquías

Cada planta está dentro de un `THREE.Group` raíz, con un grupo separado para las partes vegetales. Los pétalos y el centro pertenecen a un grupo floral. El viento aplica rotaciones a grupos de vegetación y pivotes de ramas, por lo que las transformaciones se propagan a sus hijos.

### Viento y shaders GLSL

El tallo, las ramas y las flores se balancean con funciones `Math.sin` y `Math.cos`. Las hojas usan un `THREE.ShaderMaterial` con dos archivos:

- `shaders/wind.vert`: mueve los vértices con una onda sinusoidal controlada por el tiempo, la fase de cada hoja y la intensidad del viento.
- `shaders/wind.frag`: mezcla tonos verdes según la altura local, aplica sombreado sencillo y añade una línea que representa la nervadura central de la hoja.

### Raycasting

`THREE.Raycaster` proyecta un rayo desde la cámara hacia la posición del clic. Si intersecta una malla visible, el panel muestra la información asociada al objeto y actualiza el porcentaje de crecimiento durante la animación.

## Respuestas sugeridas para Classroom

Adapta las respuestas a tus propias palabras antes de entregarlas.

### 1. ¿Qué tema representa tu simulador de crecimiento?

Representa un jardín botánico virtual con seis especies: girasol, helecho, cactus, planta tropical, rosa y lavanda. El simulador permite observar el desarrollo de tallos, ramas, hojas y flores, y cómo el viento afecta al movimiento de la vegetación.

### 2. ¿Cómo implementaste el bucle de animación con `requestAnimationFrame`?

Creé una función `animate()` que solicita su siguiente ejecución con `requestAnimationFrame(animate)`. En cada fotograma calculo el tiempo transcurrido, avanzo el reloj de simulación según la velocidad seleccionada, actualizo el crecimiento, calculo el balanceo del viento, actualizo los uniformes del shader y renderizo la escena. El botón de pausa detiene el reloj hasta que la animación se reanuda.

### 3. ¿Cómo animaste el crecimiento de la planta?

Cada pieza tiene un tiempo de inicio y una duración. Los tallos y las ramas escalan a lo largo de su eje y desplazan su centro para conservar la base anclada. Las hojas, espinas y partes florales escalan desde cero y aparecen después de las estructuras iniciales. Utilicé una curva de suavizado para que el crecimiento no sea brusco.

### 4. ¿Cómo simulaste el viento? ¿Usaste shaders o transformaciones simples?

Utilicé ambos métodos. Los grupos de plantas y las flores se balancean con funciones seno y coseno. Además, el shader GLSL de las hojas desplaza sus vértices en función del tiempo y de la intensidad del viento, que se puede modificar con un slider.

### 5. ¿Qué controles agregaste para modificar la simulación?

Agregué botones para pausar o reanudar, reiniciar el crecimiento, cambiar el color de las hojas, ocultarlas o mostrarlas y reiniciar la cámara. También agregué sliders para la velocidad del crecimiento, la intensidad del viento y la iluminación. La selección por clic permite consultar los datos de cada parte visible.

### 6. ¿Cómo gestionaste la jerarquía para que el crecimiento se propague?

Cada especie está organizada en un `THREE.Group` raíz que contiene un grupo para sus partes vegetales. Las flores usan grupos propios para sus pétalos y centro. Las transformaciones de los grupos se transmiten a sus elementos hijos, mientras que el crecimiento de cada malla se controla con su propio tiempo de inicio y duración.

### 7. ¿Qué shader personalizado usaste y qué efecto produce?

Usé dos shaders GLSL. `wind.vert` desplaza los vértices de las hojas mediante ondas sinusoidales para representar el viento. `wind.frag` combina tonos verdes según la altura local, aplica un sombreado sencillo y dibuja una nervadura central estilizada.

### 8. ¿Qué parte del proyecto fue la más difícil?

Una de las partes más difíciles fue coordinar las etapas para que las hojas y las flores no aparecieran antes que las estructuras que las sostienen. También fue necesario mantener anclada la base de los tallos y las ramas al escalarlos y combinar el balanceo de los grupos con el desplazamiento de vértices del shader.

### 9. ¿Cómo podrías mejorar el simulador si lo conectaras después con PHP, FlightPHP y SQLite?

Podría crear una API con FlightPHP para guardar y consultar configuraciones y sesiones. SQLite podría almacenar un catálogo de especies, velocidad de crecimiento, intensidad del viento, color de las hojas, fecha y resultados de cada simulación. PHP permitiría recuperar esas configuraciones y comparar sesiones; el frontend enviaría y recibiría los datos mediante peticiones HTTP.

## Antes de entregar

1. Ejecuta el proyecto y confirma que las seis especies aparecen por etapas.
2. Prueba pausa, reinicio, sliders, cambio de color, mostrar/ocultar hojas y reinicio de cámara.
3. Selecciona varias piezas visibles y confirma que su ficha se actualiza.
4. Guarda una captura real del visor como `captura.png` en la raíz del proyecto.
5. Sube la carpeta a un repositorio público de GitHub y entrega el enlace en Classroom.
