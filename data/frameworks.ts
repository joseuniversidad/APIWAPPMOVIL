export type Framework = {
  id: string;
  name: string;
  languageId: string;
  tagline: string;
  description: string;
  year: number;
  creator: string;
  color: string;
  keyFeatures: string[];
  curiosity: string;
  useCases: string[];
  docsUrl: string;
};

export const FRAMEWORKS: Framework[] = [
  {
    id: 'laravel',
    name: 'Laravel',
    languageId: 'php',
    tagline: 'El framework web más popular de PHP',
    description:
      'Laravel es un framework para crear aplicaciones y APIs web con PHP, conocido por su sintaxis elegante y expresiva. Incluye herramientas listas para usar como un ORM (Eloquent), sistema de rutas, autenticación y migraciones de base de datos, lo que permite construir aplicaciones robustas mucho más rápido que con PHP puro.',
    year: 2011,
    creator: 'Taylor Otwell',
    color: '#FF2D20',
    keyFeatures: [
      'ORM Eloquent para trabajar con la base de datos como objetos',
      'Sistema de migraciones para versionar la base de datos',
      'Blade: su propio motor de plantillas',
      'Artisan: una potente herramienta de línea de comandos',
    ],
    curiosity:
      'Taylor Otwell creó Laravel porque sentía que otros frameworks de PHP de la época no incluían funciones modernas como autenticación integrada.',
    useCases: ['Aplicaciones web', 'APIs REST', 'Comercio electrónico', 'Sistemas de gestión de contenido'],
    docsUrl: 'https://laravel.com/docs',
  },
  {
    id: 'django',
    name: 'Django',
    languageId: 'python',
    tagline: 'Un framework web "con las baterías incluidas"',
    description:
      'Django es un framework web de alto nivel para Python que sigue la filosofía de "baterías incluidas": trae de fábrica un ORM, panel de administración automático, sistema de autenticación y protección contra vulnerabilidades comunes. Fue creado en la redacción de un periódico para publicar noticias a toda velocidad, y hoy es la base de plataformas como Instagram y Spotify.',
    year: 2005,
    creator: 'Adrian Holovaty y Simon Willison',
    color: '#092E20',
    keyFeatures: [
      'Panel de administración generado automáticamente',
      'ORM propio para trabajar con la base de datos sin escribir SQL',
      'Seguridad integrada contra ataques comunes (CSRF, inyección SQL)',
      'Sigue el principio "no te repitas" (DRY)',
    ],
    curiosity:
      'Django lleva el nombre del guitarrista de jazz belga Django Reinhardt, uno de los músicos favoritos de uno de sus creadores.',
    useCases: ['Aplicaciones web robustas', 'APIs con Django REST Framework', 'Plataformas de contenido', 'Paneles administrativos'],
    docsUrl: 'https://docs.djangoproject.com/',
  },
  {
    id: 'flask',
    name: 'Flask',
    languageId: 'python',
    tagline: 'Un microframework minimalista para Python',
    description:
      'Flask es un microframework para Python que da solo lo esencial para crear una aplicación web: rutas y manejo de peticiones. A diferencia de Django, no impone una estructura fija, por lo que es ideal para quienes quieren elegir sus propias herramientas y mantener el proyecto ligero.',
    year: 2010,
    creator: 'Armin Ronacher',
    color: '#000000',
    keyFeatures: [
      'Núcleo minimalista, extensible con paquetes opcionales',
      'No impone una estructura de carpetas fija',
      'Ideal para aprender cómo funciona un framework web por dentro',
      'Basado en las librerías Werkzeug y Jinja2',
    ],
    curiosity:
      'Flask empezó como una broma del Día de los Inocentes en 2010, antes de convertirse en uno de los frameworks de Python más usados del mundo.',
    useCases: ['APIs REST pequeñas', 'Prototipos rápidos', 'Microservicios', 'Proyectos educativos'],
    docsUrl: 'https://flask.palletsprojects.com/',
  },
  {
    id: 'react',
    name: 'React',
    languageId: 'javascript',
    tagline: 'La biblioteca de interfaces más usada del mundo',
    description:
      'React es una biblioteca de JavaScript para construir interfaces de usuario a partir de piezas reutilizables llamadas componentes. Introdujo el concepto de DOM virtual para actualizar la pantalla de forma eficiente y cambió la manera en que se construyen aplicaciones web modernas. Es también la base de React Native, con el que está hecha esta misma app.',
    year: 2013,
    creator: 'Jordan Walke (Facebook)',
    color: '#61DAFB',
    keyFeatures: [
      'DOM virtual para actualizar la pantalla de forma eficiente',
      'Arquitectura basada en componentes reutilizables',
      'Hooks para manejar estado y efectos secundarios',
      'Enorme ecosistema de librerías compatibles',
    ],
    curiosity:
      'React se usó primero internamente en el feed de noticias de Facebook en 2011, y no se liberó como código abierto hasta 2013.',
    useCases: ['Interfaces web interactivas', 'Aplicaciones de una sola página (SPA)', 'Dashboards', 'Bases para React Native'],
    docsUrl: 'https://react.dev/',
  },
  {
    id: 'angular',
    name: 'Angular',
    languageId: 'typescript',
    tagline: 'Un framework completo para aplicaciones empresariales',
    description:
      'Angular es un framework mantenido por Google, escrito en TypeScript, que ofrece todo lo necesario para construir aplicaciones grandes: enrutamiento, inyección de dependencias, formularios y herramientas de línea de comandos propias. Es la evolución completa de AngularJS (2010), reescrita desde cero en 2016.',
    year: 2016,
    creator: 'Google',
    color: '#DD0031',
    keyFeatures: [
      'Inyección de dependencias integrada',
      'CLI oficial para generar y mantener proyectos',
      'TypeScript de forma nativa en todo el framework',
      'Enrutador y formularios reactivos incluidos',
    ],
    curiosity:
      'Angular (2+) fue una reescritura completa desde cero de AngularJS, tan distinta que en la práctica se consideran dos frameworks diferentes.',
    useCases: ['Aplicaciones empresariales grandes', 'Paneles administrativos complejos', 'Aplicaciones con equipos numerosos'],
    docsUrl: 'https://angular.dev/',
  },
  {
    id: 'vue',
    name: 'Vue.js',
    languageId: 'javascript',
    tagline: 'Un framework progresivo, fácil de adoptar poco a poco',
    description:
      'Vue.js es un framework para construir interfaces de usuario que se puede integrar en un proyecto de forma gradual, desde una sola página hasta una aplicación completa. Evan You lo creó tras trabajar con Angular en Google, buscando quedarse con lo mejor de ese framework pero con una curva de aprendizaje mucho más suave.',
    year: 2014,
    creator: 'Evan You',
    color: '#42B883',
    keyFeatures: [
      'Curva de aprendizaje suave, ideal para principiantes',
      'Reactividad automática de los datos',
      'Se puede adoptar poco a poco en un proyecto existente',
      'Documentación oficial considerada una de las mejores del ecosistema web',
    ],
    curiosity:
      'Evan You creó Vue tomando lo que más le gustaba de Angular tras trabajar en Google, pero eliminando lo que consideraba innecesariamente complejo.',
    useCases: ['Interfaces interactivas', 'Aplicaciones de una sola página (SPA)', 'Integración gradual en sitios existentes'],
    docsUrl: 'https://vuejs.org/guide/introduction.html',
  },
  {
    id: 'express',
    name: 'Express',
    languageId: 'javascript',
    tagline: 'El framework backend minimalista de Node.js',
    description:
      'Express es un framework minimalista para crear servidores y APIs con Node.js. Ofrece un sistema simple de rutas y middlewares sin imponer una estructura estricta, lo que lo convirtió durante años en el estándar de facto para el backend en JavaScript.',
    year: 2010,
    creator: 'TJ Holowaychuk',
    color: '#000000',
    keyFeatures: [
      'Sistema de rutas y middlewares muy simple',
      'Base de muchos otros frameworks de Node.js',
      'Extremadamente ligero y rápido de configurar',
      'Compatible con cualquier base de datos',
    ],
    curiosity:
      'Express es tan influyente que forma parte de los acrónimos "MEAN" y "MERN", dos de los stacks más populares para desarrollo web con JavaScript.',
    useCases: ['APIs REST', 'Servidores backend', 'Microservicios en Node.js'],
    docsUrl: 'https://expressjs.com/',
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    languageId: 'javascript',
    tagline: 'React con renderizado en el servidor y mucho más',
    description:
      'Next.js es un framework construido sobre React que añade renderizado en el servidor, generación de sitios estáticos, rutas basadas en archivos y optimización automática de imágenes. Simplifica muchas decisiones difíciles de configurar a mano en un proyecto de React puro.',
    year: 2016,
    creator: 'Vercel (Guillermo Rauch)',
    color: '#000000',
    keyFeatures: [
      'Renderizado en el servidor (SSR) y generación estática (SSG)',
      'Sistema de rutas basado en archivos y carpetas',
      'Optimización automática de imágenes y fuentes',
      'API Routes para crear backend dentro del mismo proyecto',
    ],
    curiosity:
      'Empresas como TikTok, Twitch y Notion usan Next.js para sus sitios web de cara al público gracias a su velocidad de carga.',
    useCases: ['Sitios renderizados en el servidor', 'Tiendas en línea', 'Blogs y sitios de marketing', 'Aplicaciones full-stack'],
    docsUrl: 'https://nextjs.org/docs',
  },
  {
    id: 'spring',
    name: 'Spring',
    languageId: 'java',
    tagline: 'El framework empresarial más usado en Java',
    description:
      'Spring es un framework para Java que simplifica el desarrollo de aplicaciones empresariales mediante la inyección de dependencias y una enorme cantidad de módulos (Spring Boot, Spring Security, etc.). Es la columna vertebral de miles de sistemas bancarios y corporativos en todo el mundo.',
    year: 2003,
    creator: 'Rod Johnson',
    color: '#6DB33F',
    keyFeatures: [
      'Inyección de dependencias como pilar central',
      'Spring Boot elimina casi toda la configuración manual',
      'Módulos para seguridad, datos y microservicios',
      'Décadas de estabilidad en entornos empresariales',
    ],
    curiosity:
      'Spring nació como una reacción de Rod Johnson contra la complejidad excesiva de Enterprise JavaBeans (EJB), el estándar empresarial de Java de esa época.',
    useCases: ['Sistemas bancarios y financieros', 'Aplicaciones empresariales', 'Microservicios en Java'],
    docsUrl: 'https://spring.io/projects/spring-framework',
  },
  {
    id: 'rails',
    name: 'Ruby on Rails',
    languageId: 'ruby',
    tagline: 'El framework que popularizó el desarrollo web ultra rápido',
    description:
      'Ruby on Rails es un framework web para Ruby que popularizó la idea de "convención sobre configuración": si sigues sus convenciones, puedes construir una aplicación funcional en muy poco tiempo. Su llegada en 2004 cambió la forma en que la industria pensaba la velocidad de desarrollo web.',
    year: 2004,
    creator: 'David Heinemeier Hansson (DHH)',
    color: '#CC0000',
    keyFeatures: [
      'Convención sobre configuración: menos decisiones, más productividad',
      'ActiveRecord para trabajar con la base de datos como objetos',
      'Generadores de código (scaffolding) para prototipar rápido',
      'Comunidad muy orientada a buenas prácticas',
    ],
    curiosity:
      'Basecamp, la empresa de David Heinemeier Hansson, construyó Rails como una extracción del código que ya usaban internamente para su propio producto.',
    useCases: ['Aplicaciones web para startups', 'Prototipos y MVPs', 'Plataformas de comercio electrónico'],
    docsUrl: 'https://guides.rubyonrails.org/',
  },
  {
    id: 'aspnet',
    name: 'ASP.NET Core',
    languageId: 'csharp',
    tagline: 'El framework web moderno de Microsoft',
    description:
      'ASP.NET Core es el framework de Microsoft para construir aplicaciones y APIs web con C#, rediseñado para ser multiplataforma (Windows, Linux y macOS) y de alto rendimiento. Es una pieza clave del ecosistema .NET para el desarrollo empresarial en la nube.',
    year: 2016,
    creator: 'Microsoft',
    color: '#512BD4',
    keyFeatures: [
      'Multiplataforma: corre en Windows, Linux y macOS',
      'Alto rendimiento, uno de los frameworks web más rápidos que existen',
      'Inyección de dependencias integrada de fábrica',
      'Compatible con Blazor para crear interfaces web con C#',
    ],
    curiosity:
      'ASP.NET Core fue una reescritura total de Microsoft para dejar de depender exclusivamente de Windows, algo impensable en las primeras versiones de .NET.',
    useCases: ['Aplicaciones empresariales', 'APIs web', 'Aplicaciones en la nube con Azure'],
    docsUrl: 'https://learn.microsoft.com/aspnet/core',
  },
  {
    id: 'flutter',
    name: 'Flutter',
    languageId: 'dart',
    tagline: 'Una sola base de código para móvil, web y escritorio',
    description:
      'Flutter es el framework de Google para crear aplicaciones nativas de iOS, Android, web y escritorio desde una única base de código en Dart. Dibuja cada píxel de su propia interfaz en lugar de usar los componentes nativos del sistema, lo que le da un control visual y de rendimiento muy preciso.',
    year: 2017,
    creator: 'Google',
    color: '#02569B',
    keyFeatures: [
      'Dibuja su propia interfaz en lugar de usar componentes nativos',
      '"Hot reload" para ver cambios de diseño al instante',
      'Un solo código para iOS, Android, web y escritorio',
      'Widgets personalizables hasta el último detalle',
    ],
    curiosity:
      'Flutter usa el motor gráfico Skia, el mismo que dibuja los píxeles de Google Chrome y Android, lo que explica su rendimiento visual tan fluido.',
    useCases: ['Apps móviles multiplataforma', 'Aplicaciones de escritorio', 'Prototipos con interfaces muy personalizadas'],
    docsUrl: 'https://docs.flutter.dev/',
  },
  {
    id: 'react-native',
    name: 'React Native',
    languageId: 'javascript',
    tagline: 'Apps móviles nativas usando React',
    description:
      'React Native permite construir aplicaciones móviles nativas para iOS y Android usando React y JavaScript, compartiendo una sola base de código entre ambas plataformas. Esta misma aplicación que estás usando está hecha con React Native y Expo.',
    year: 2015,
    creator: 'Facebook (Meta)',
    color: '#61DAFB',
    keyFeatures: [
      'Comparte una sola base de código entre iOS y Android',
      'Usa componentes nativos reales (no WebView)',
      'Compatible con Expo para simplificar la configuración',
      'Enorme reutilización de conocimiento con React',
    ],
    curiosity:
      'Aplicaciones muy conocidas como Instagram y Discord usan (o han usado) React Native en partes de su interfaz.',
    useCases: ['Apps para iOS y Android', 'Prototipos móviles rápidos', 'Aplicaciones multiplataforma con Expo'],
    docsUrl: 'https://reactnative.dev/docs/getting-started',
  },
  {
    id: 'symfony',
    name: 'Symfony',
    languageId: 'php',
    tagline: 'Componentes reutilizables para PHP profesional',
    description:
      'Symfony es un conjunto de componentes PHP reutilizables y un framework web robusto pensado para aplicaciones grandes y de larga duración. Es especialmente relevante porque varios de sus componentes son la base sobre la que está construido Laravel.',
    year: 2005,
    creator: 'Fabien Potencier (SensioLabs)',
    color: '#000000',
    keyFeatures: [
      'Componentes que se pueden usar de forma independiente',
      'Muy configurable para proyectos de larga duración',
      'Sigue de cerca los estándares PSR de PHP',
      'Base de otros proyectos como Laravel y Drupal',
    ],
    curiosity:
      'Varios componentes internos de Laravel, como el manejo de rutas y de consola, están construidos directamente sobre componentes de Symfony.',
    useCases: ['Aplicaciones empresariales complejas', 'Sistemas de larga duración', 'Componentes reutilizables para otros frameworks'],
    docsUrl: 'https://symfony.com/doc/current/index.html',
  },
  {
    id: 'gin',
    name: 'Gin',
    languageId: 'go',
    tagline: 'Un framework web ligero y veloz para Go',
    description:
      'Gin es un framework minimalista para construir APIs web en Go, apreciado por su altísimo rendimiento y su API sencilla basada en middlewares. Es una de las opciones más populares cuando se necesita velocidad extrema en el backend.',
    year: 2014,
    creator: 'Manu Martínez-Almeida',
    color: '#00ADD8',
    keyFeatures: [
      'Hasta 40 veces más rápido que otros routers de Go según sus benchmarks',
      'API minimalista basada en middlewares',
      'Validación de datos de entrada integrada',
      'Muy popular para microservicios en contenedores',
    ],
    curiosity:
      'El nombre "Gin" (ginebra) sigue la tradición de Go de usar nombres cortos y sencillos, jugando con la idea de un framework tan "ligero" como la bebida.',
    useCases: ['APIs REST de alto rendimiento', 'Microservicios en Go'],
    docsUrl: 'https://gin-gonic.com/docs/',
  },
  {
    id: 'vapor',
    name: 'Vapor',
    languageId: 'swift',
    tagline: 'Servidores y APIs escritos en Swift',
    description:
      'Vapor es un framework que permite usar Swift, el lenguaje de las apps de Apple, también en el backend. Con Vapor, un mismo equipo puede compartir lógica y tipos entre la app de iOS y el servidor que la alimenta.',
    year: 2016,
    creator: 'Tanner Nelson y la comunidad Vapor',
    color: '#0D0D0D',
    keyFeatures: [
      'Basado en SwiftNIO, la librería de red asíncrona de Apple',
      'Comparte modelos de datos con apps iOS escritas en Swift',
      'ORM propio llamado Fluent',
      'Comunidad activa dentro del ecosistema Swift',
    ],
    curiosity:
      'Vapor permite que un mismo desarrollador escriba tanto la app de iOS como el servidor que la alimenta, sin cambiar de lenguaje de programación.',
    useCases: ['APIs backend para apps de Apple', 'Servidores web en Swift'],
    docsUrl: 'https://docs.vapor.codes/',
  },
  {
    id: 'rocket',
    name: 'Rocket',
    languageId: 'rust',
    tagline: 'Un framework web seguro y fácil de usar para Rust',
    description:
      'Rocket es un framework web para Rust enfocado en la seguridad de tipos, la velocidad y una experiencia de desarrollo agradable, algo poco común en el mundo de Rust. Aprovecha el sistema de tipos del lenguaje para prevenir errores comunes en tiempo de compilación.',
    year: 2016,
    creator: 'Sergio Benitez',
    color: '#D33847',
    keyFeatures: [
      'Verificación de tipos en tiempo de compilación para las rutas',
      'Manejo de errores explícito heredado de Rust',
      'Enfocado en la experiencia de desarrollo (developer experience)',
      'Guardas de solicitud (request guards) para validar peticiones',
    ],
    curiosity:
      'Rocket popularizó dentro de la comunidad Rust la idea de que un framework web podía ser tan seguro como el propio lenguaje, sin sacrificar comodidad.',
    useCases: ['APIs web seguras', 'Backends de alto rendimiento'],
    docsUrl: 'https://rocket.rs/guide/v0.5/',
  },
];

export function getFrameworkById(id: string | undefined): Framework | undefined {
  return FRAMEWORKS.find((framework) => framework.id === id);
}

export function getFrameworksByLanguage(languageId: string): Framework[] {
  return FRAMEWORKS.filter((framework) => framework.languageId === languageId);
}
