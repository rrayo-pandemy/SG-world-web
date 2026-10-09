# Hero de construcción

`hero-background.webm` es un bucle ambiental silencioso de 8 segundos, 1280 × 720 y 24 fps. Combina una toma de obra con un plano técnico tenue y recorridos animados para agua, electricidad y cableado. El texto y el edificio 3D interactivo siguen siendo contenido HTML/WebGL del Hero.

`../images/hero-background.jpg` es el póster local y la alternativa estática. La fuente de regeneración se conserva como `../images/hero-background-source.jpg`; la toma procede de [Unsplash](https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=85).

Para volver a generar ambos archivos con Microsoft Edge o Google Chrome instalado:

```sh
node scripts/generate-hero-video.cjs
```

El generador no agrega dependencias npm. También admite otra imagen JPEG como argumento opcional.
