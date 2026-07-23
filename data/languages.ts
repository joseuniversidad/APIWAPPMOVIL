export type LearnStep = {
  title: string;
  description: string;
  code?: string;
};

export type CourseLink = {
  title: string;
  platform: string;
  url: string;
};

export type CodeExample = {
  description: string;
  code: string;
};

export type ProgrammingLanguage = {
  id: string;
  name: string;
  tagline: string;
  color: string;
  year: number;
  founders: string[];
  paradigm: string;
  history: string;
  keyFeatures: string[];
  curiosity: string;
  variablesExample: CodeExample;
  conditionalsExample: CodeExample;
  loopsExample: CodeExample;
  useCases: string[];
  steps: LearnStep[];
  courses: CourseLink[];
};

export const LANGUAGES: ProgrammingLanguage[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    tagline: 'El idioma de la Web',
    color: '#F0DB4F',
    year: 1995,
    founders: ['Brendan Eich'],
    paradigm: 'Multiparadigma: orientado a objetos, funcional y basado en eventos',
    history:
      'En 1995, Netscape necesitaba un lenguaje de scripting para sus navegadores y le encargó la tarea a Brendan Eich, quien lo diseñó en tan solo 10 días. Al principio se llamó Mocha, luego LiveScript, y finalmente JavaScript por motivos de marketing, aprovechando la popularidad de Java. Hoy es el lenguaje más usado del planeta y corre en prácticamente todos los navegadores.',
    keyFeatures: [
      'Tipado dinámico y flexible',
      'Se ejecuta en el navegador y en el servidor (Node.js)',
      'Programación asíncrona con Promises y async/await',
      'El ecosistema de paquetes más grande del mundo (npm)',
    ],
    curiosity:
      'A pesar de compartir parte del nombre, JavaScript no tiene ninguna relación técnica con Java. El nombre fue una decisión de marketing de Netscape para aprovechar la popularidad de Java en 1995.',
    variablesExample: {
      description: 'Usa let para variables que pueden cambiar y const para valores que no cambian.',
      code: 'let edad = 18;\nconst nombre = "Ana";\nlet activo = true;',
    },
    conditionalsExample: {
      description: 'if/else evalúa una condición y ejecuta un bloque u otro según el resultado.',
      code: 'let edad = 18;\n\nif (edad >= 18) {\n  console.log("Eres mayor de edad");\n} else {\n  console.log("Eres menor de edad");\n}',
    },
    loopsExample: {
      description: 'El bucle for repite un bloque de código un número determinado de veces.',
      code: 'for (let i = 0; i < 5; i++) {\n  console.log("Vuelta número " + i);\n}',
    },
    useCases: [
      'Desarrollo web frontend',
      'Aplicaciones móviles con React Native',
      'Servidores con Node.js',
      'Videojuegos en el navegador',
    ],
    steps: [
      {
        title: 'Prepara tu entorno',
        description: 'Instala Node.js desde nodejs.org para poder ejecutar JavaScript fuera del navegador.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.js en cualquier carpeta de tu computadora.',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Declara una variable y muestra un saludo en la consola.',
        code: 'let nombre = "Mundo";\nconsole.log("¡Hola, " + nombre + "!");',
      },
      {
        title: 'Ejecútalo',
        description: 'Abre una terminal en esa carpeta y escribe el siguiente comando. Verás el mensaje al instante.',
        code: 'node hola.js',
      },
    ],
    courses: [
      { title: 'Documentación oficial', platform: 'MDN Web Docs', url: 'https://developer.mozilla.org/es/docs/Web/JavaScript' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'python',
    name: 'Python',
    tagline: 'Simplicidad y legibilidad ante todo',
    color: '#3776AB',
    year: 1991,
    founders: ['Guido van Rossum'],
    paradigm: 'Multiparadigma: imperativo, orientado a objetos y funcional',
    history:
      'Guido van Rossum comenzó a desarrollar Python a finales de 1989 como un proyecto personal para las fiestas navideñas, y lo lanzó oficialmente en 1991. Le puso ese nombre en honor al grupo de comedia británico Monty Python, no a la serpiente. Su filosofía prioriza la legibilidad del código, resumida en un texto conocido como el "Zen de Python".',
    keyFeatures: [
      'Sintaxis clara que se lee casi como inglés',
      'Tipado dinámico con tipado opcional (type hints)',
      'Enorme cantidad de librerías para ciencia de datos e IA',
      'Multiplataforma: Windows, macOS y Linux',
    ],
    curiosity:
      'Guido van Rossum fue reconocido por la comunidad Python como el "Dictador Benevolente Vitalicio" (BDFL), un título honorífico que tuvo hasta que renunció a él en 2018.',
    variablesExample: {
      description: 'En Python no se declara el tipo: simplemente asignas un valor a un nombre.',
      code: 'edad = 18\nnombre = "Ana"\nactivo = True',
    },
    conditionalsExample: {
      description: 'Los bloques en Python se definen con indentación, no con llaves.',
      code: 'edad = 18\n\nif edad >= 18:\n    print("Eres mayor de edad")\nelse:\n    print("Eres menor de edad")',
    },
    loopsExample: {
      description: 'for junto con range() repite un bloque un número determinado de veces.',
      code: 'for i in range(5):\n    print(f"Vuelta número {i}")',
    },
    useCases: [
      'Ciencia de datos e inteligencia artificial',
      'Automatización y scripts',
      'Desarrollo web con Django o Flask',
      'Educación para quienes empiezan a programar',
    ],
    steps: [
      {
        title: 'Instala Python',
        description: 'Descarga Python desde python.org e instálalo en tu computadora.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.py',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Guarda un nombre en una variable e imprímelo con un saludo.',
        code: 'nombre = "Mundo"\nprint(f"¡Hola, {nombre}!")',
      },
      {
        title: 'Ejecútalo',
        description: 'En la terminal, dentro de la carpeta del archivo, escribe el siguiente comando.',
        code: 'python hola.py',
      },
    ],
    courses: [
      { title: 'Tutorial oficial', platform: 'python.org', url: 'https://docs.python.org/es/3/tutorial/' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'java',
    name: 'Java',
    tagline: 'Escribe una vez, ejecuta en cualquier lugar',
    color: '#EA2D2E',
    year: 1995,
    founders: ['James Gosling'],
    paradigm: 'Orientado a objetos',
    history:
      'James Gosling y su equipo en Sun Microsystems crearon Java a mediados de los años 90 con la promesa de "escribe una vez, ejecuta en cualquier lugar", gracias a la máquina virtual de Java (JVM). Originalmente se llamó Oak, en honor a un árbol que Gosling veía desde su oficina, pero se renombró a Java. Se convirtió en el lenguaje base de Android y de miles de sistemas empresariales.',
    keyFeatures: [
      'Se ejecuta sobre la máquina virtual de Java (JVM)',
      'Tipado estático y fuertemente orientado a objetos',
      'Recolector de basura automático',
      'Compatibilidad hacia atrás muy sólida entre versiones',
    ],
    curiosity:
      'El café es el motivo del nombre y del logo: el equipo se inspiró en las tazas de café que tomaban durante las reuniones de diseño del lenguaje.',
    variablesExample: {
      description: 'En Java toda variable debe declarar explícitamente su tipo.',
      code: 'int edad = 18;\nString nombre = "Ana";\nboolean activo = true;',
    },
    conditionalsExample: {
      description: 'if/else evalúa una condición booleana entre paréntesis.',
      code: 'int edad = 18;\n\nif (edad >= 18) {\n  System.out.println("Eres mayor de edad");\n} else {\n  System.out.println("Eres menor de edad");\n}',
    },
    loopsExample: {
      description: 'El bucle for clásico repite un bloque un número determinado de veces.',
      code: 'for (int i = 0; i < 5; i++) {\n  System.out.println("Vuelta número " + i);\n}',
    },
    useCases: [
      'Aplicaciones Android',
      'Sistemas empresariales',
      'Backend de grandes plataformas',
      'Software académico',
    ],
    steps: [
      {
        title: 'Instala el JDK',
        description: 'Descarga e instala el Java Development Kit (JDK) en tu computadora.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado Hola.java (con mayúscula inicial, igual que la clase).',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Toda la lógica va dentro de una clase con un método main.',
        code: 'public class Hola {\n  public static void main(String[] args) {\n    String nombre = "Mundo";\n    System.out.println("¡Hola, " + nombre + "!");\n  }\n}',
      },
      {
        title: 'Compila y ejecuta',
        description: 'Compila el archivo y luego ejecuta la clase generada.',
        code: 'javac Hola.java\njava Hola',
      },
    ],
    courses: [
      { title: 'Aprende Java', platform: 'dev.java (Oracle)', url: 'https://dev.java/learn/' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'cpp',
    name: 'C++',
    tagline: 'Un paso más allá de C',
    color: '#00599C',
    year: 1985,
    founders: ['Bjarne Stroustrup'],
    paradigm: 'Multiparadigma: procedural, orientado a objetos y genérico',
    history:
      'Bjarne Stroustrup comenzó en 1979 a mejorar el lenguaje C agregándole clases, por lo que al inicio lo llamó "C with Classes". En 1983 fue renombrado C++, un juego de palabras con el operador de incremento "++" de C, indicando que era un paso más allá de C. Hoy impulsa videojuegos, sistemas operativos y software que exige el máximo rendimiento.',
    keyFeatures: [
      'Control de memoria manual y de bajo nivel',
      'Programación orientada a objetos y genérica (plantillas)',
      'Compatible casi al 100% con el lenguaje C',
      'Rendimiento cercano al del hardware',
    ],
    curiosity:
      'Motores de videojuegos como Unreal Engine están escritos en C++ precisamente por el control tan fino que da sobre la memoria y el rendimiento.',
    variablesExample: {
      description: 'En C++ toda variable declara su tipo explícitamente.',
      code: 'int edad = 18;\nstd::string nombre = "Ana";\nbool activo = true;',
    },
    conditionalsExample: {
      description: 'if/else evalúa una condición entre paréntesis, igual que en C.',
      code: 'int edad = 18;\n\nif (edad >= 18) {\n  cout << "Eres mayor de edad" << endl;\n} else {\n  cout << "Eres menor de edad" << endl;\n}',
    },
    loopsExample: {
      description: 'El bucle for clásico repite un bloque un número determinado de veces.',
      code: 'for (int i = 0; i < 5; i++) {\n  cout << "Vuelta número " << i << endl;\n}',
    },
    useCases: [
      'Videojuegos y motores gráficos',
      'Sistemas operativos',
      'Software de alto rendimiento',
      'Sistemas embebidos',
    ],
    steps: [
      {
        title: 'Instala un compilador',
        description: 'Instala g++ (por ejemplo, a través de MinGW en Windows) para poder compilar C++.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.cpp',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Incluye la librería de entrada/salida y usa cout para imprimir en pantalla.',
        code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  string nombre = "Mundo";\n  cout << "¡Hola, " << nombre << "!" << endl;\n  return 0;\n}',
      },
      {
        title: 'Compila y ejecuta',
        description: 'Compila el archivo para generar un ejecutable y luego corre ese ejecutable.',
        code: 'g++ hola.cpp -o hola\n./hola',
      },
    ],
    courses: [
      { title: 'Tutorial interactivo', platform: 'cplusplus.com', url: 'https://cplusplus.com/doc/tutorial/' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'csharp',
    name: 'C#',
    tagline: 'La potencia de C++ con sintaxis simple',
    color: '#68217A',
    year: 2000,
    founders: ['Anders Hejlsberg'],
    paradigm: 'Orientado a objetos',
    history:
      'Anders Hejlsberg, quien antes había creado Turbo Pascal y Delphi, lideró el diseño de C# en Microsoft a finales de los años 90 como pieza central de la nueva plataforma .NET. Se presentó oficialmente en el año 2000. Combina la potencia de C++ con una sintaxis más simple, y hoy es el lenguaje principal para crear videojuegos con el motor Unity.',
    keyFeatures: [
      'Tipado estático con inferencia de tipos',
      'Recolector de basura automático',
      'Integración total con el ecosistema .NET',
      'Soporte de primer nivel en el motor de videojuegos Unity',
    ],
    curiosity:
      'El símbolo "#" en el nombre representa cuatro signos de "+" acomodados en cuadrícula, sugiriendo que C# es una mejora incremental sobre C++.',
    variablesExample: {
      description: 'En C# toda variable declara su tipo, aunque también existe var para inferirlo.',
      code: 'int edad = 18;\nstring nombre = "Ana";\nbool activo = true;',
    },
    conditionalsExample: {
      description: 'if/else evalúa una condición booleana entre paréntesis.',
      code: 'int edad = 18;\n\nif (edad >= 18) {\n  Console.WriteLine("Eres mayor de edad");\n} else {\n  Console.WriteLine("Eres menor de edad");\n}',
    },
    loopsExample: {
      description: 'El bucle for clásico repite un bloque un número determinado de veces.',
      code: 'for (int i = 0; i < 5; i++) {\n  Console.WriteLine("Vuelta número " + i);\n}',
    },
    useCases: [
      'Videojuegos con Unity',
      'Aplicaciones de escritorio Windows',
      'Backend con ASP.NET',
      'Aplicaciones empresariales',
    ],
    steps: [
      {
        title: 'Instala el SDK de .NET',
        description: 'Descarga e instala el .NET SDK desde el sitio oficial de Microsoft.',
      },
      {
        title: 'Crea un proyecto',
        description: 'Usa la terminal para generar un proyecto de consola nuevo.',
        code: 'dotnet new console -o HolaMundo',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Abre Program.cs y reemplaza su contenido con lo siguiente.',
        code: 'string nombre = "Mundo";\nConsole.WriteLine($"¡Hola, {nombre}!");',
      },
      {
        title: 'Ejecútalo',
        description: 'Dentro de la carpeta del proyecto, corre el siguiente comando.',
        code: 'dotnet run',
      },
    ],
    courses: [
      { title: 'Tour por C#', platform: 'Microsoft Learn', url: 'https://learn.microsoft.com/es-es/dotnet/csharp/' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'php',
    name: 'PHP',
    tagline: 'El motor silencioso de la Web',
    color: '#777BB4',
    year: 1994,
    founders: ['Rasmus Lerdorf'],
    paradigm: 'Multiparadigma: procedural y orientado a objetos',
    history:
      'Rasmus Lerdorf creó PHP en 1994 como un conjunto de scripts en C para llevar el conteo de visitas de su página personal; de hecho, PHP significaba originalmente "Personal Home Page". Con el tiempo se transformó en un lenguaje completo para la web, y hoy su acrónimo recursivo es "PHP: Hypertext Preprocessor". Sitios como Facebook y Wikipedia nacieron sobre PHP.',
    keyFeatures: [
      'Diseñado específicamente para la web',
      'Se integra directamente dentro del HTML',
      'Enorme comunidad y hosting disponible en casi cualquier proveedor',
      'Base de gestores de contenido como WordPress',
    ],
    curiosity:
      'Una gran parte de todos los sitios web cuyo lenguaje de servidor se puede identificar están construidos con PHP, principalmente gracias a WordPress.',
    variablesExample: {
      description: 'Las variables en PHP siempre empiezan con el símbolo $.',
      code: '$edad = 18;\n$nombre = "Ana";\n$activo = true;',
    },
    conditionalsExample: {
      description: 'if/else funciona igual que en C, evaluando una condición entre paréntesis.',
      code: '$edad = 18;\n\nif ($edad >= 18) {\n    echo "Eres mayor de edad";\n} else {\n    echo "Eres menor de edad";\n}',
    },
    loopsExample: {
      description: 'El bucle for clásico repite un bloque un número determinado de veces.',
      code: 'for ($i = 0; $i < 5; $i++) {\n    echo "Vuelta número " . $i;\n}',
    },
    useCases: [
      'Desarrollo web backend',
      'Sistemas de gestión de contenido como WordPress',
      'Comercio electrónico',
      'APIs web',
    ],
    steps: [
      {
        title: 'Instala PHP',
        description: 'Instala PHP directamente o usa un entorno como Laragon o XAMPP.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.php',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'El código PHP va entre las etiquetas <?php y ?>.',
        code: '<?php\n$nombre = "Mundo";\necho "¡Hola, " . $nombre . "!";\n?>',
      },
      {
        title: 'Ejecútalo',
        description: 'Corre el archivo con el servidor embebido de PHP desde la terminal.',
        code: 'php hola.php',
      },
    ],
    courses: [
      { title: 'Tutorial oficial', platform: 'php.net', url: 'https://www.php.net/manual/es/tutorial.php' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    tagline: 'Moderno, seguro y hecho para Android',
    color: '#7F52FF',
    year: 2011,
    founders: ['JetBrains (liderado por Andrey Breslav)'],
    paradigm: 'Multiparadigma: orientado a objetos y funcional',
    history:
      'El equipo de JetBrains presentó Kotlin en 2011, liderado por Andrey Breslav, buscando un lenguaje más moderno y seguro que Java pero compatible con la JVM. Le pusieron el nombre en honor a la isla de Kotlin, cerca de San Petersburgo, siguiendo la tradición de nombrar lenguajes JetBrains como islas rusas. En 2017, Google lo convirtió en lenguaje oficial para desarrollar apps de Android.',
    keyFeatures: [
      'Interoperabilidad total con Java',
      'Sintaxis concisa que reduce el código repetitivo (boilerplate)',
      'Seguridad frente a valores nulos (null safety) integrada al lenguaje',
      'Lenguaje oficial de Android desde 2019',
    ],
    curiosity:
      'JetBrains, la empresa detrás de Kotlin, también crea IntelliJ IDEA, el IDE en el que está basado Android Studio.',
    variablesExample: {
      description: 'Usa var para variables que cambian y val para valores que no cambian.',
      code: 'var edad = 18\nval nombre = "Ana"\nvar activo = true',
    },
    conditionalsExample: {
      description: 'if/else en Kotlin puede usarse como sentencia o como expresión que devuelve un valor.',
      code: 'val edad = 18\n\nif (edad >= 18) {\n    println("Eres mayor de edad")\n} else {\n    println("Eres menor de edad")\n}',
    },
    loopsExample: {
      description: 'for in recorre un rango de valores de forma directa.',
      code: 'for (i in 0 until 5) {\n    println("Vuelta número $i")\n}',
    },
    useCases: [
      'Aplicaciones Android nativas',
      'Backend con Kotlin y Spring',
      'Aplicaciones multiplataforma (KMP)',
      'Scripting',
    ],
    steps: [
      {
        title: 'Instala Kotlin',
        description: 'Instala el compilador de Kotlin o usa Android Studio, que ya lo incluye.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado Hola.kt',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'El punto de entrada es una función main.',
        code: 'fun main() {\n    val nombre = "Mundo"\n    println("¡Hola, $nombre!")\n}',
      },
      {
        title: 'Compila y ejecuta',
        description: 'Compila el archivo a un .jar ejecutable y luego corre ese .jar.',
        code: 'kotlinc Hola.kt -include-runtime -d hola.jar\njava -jar hola.jar',
      },
    ],
    courses: [
      { title: 'Primeros pasos', platform: 'kotlinlang.org', url: 'https://kotlinlang.org/docs/getting-started.html' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'swift',
    name: 'Swift',
    tagline: 'Rápido, seguro y pensado para Apple',
    color: '#F05138',
    year: 2014,
    founders: ['Chris Lattner (Apple)'],
    paradigm: 'Multiparadigma: orientado a objetos, protocolos y funcional',
    history:
      'Chris Lattner comenzó a diseñar Swift en Apple en 2010, de forma casi secreta durante varios años, con la meta de reemplazar a Objective-C. Se presentó al público en la conferencia WWDC de 2014 y sorprendió a toda la comunidad de desarrolladores. Fue creado para ser más seguro, rápido y fácil de leer que su predecesor.',
    keyFeatures: [
      'Seguridad de tipos y manejo seguro de valores nulos (optionals)',
      'Muy rápido gracias al compilador LLVM',
      'Sintaxis moderna y concisa',
      'Código abierto desde 2015',
    ],
    curiosity:
      'Aunque nació para reemplazar a Objective-C, Apple diseñó Swift para poder convivir con código Objective-C dentro del mismo proyecto durante la transición.',
    variablesExample: {
      description: 'Usa var para variables que cambian y let para valores que no cambian.',
      code: 'var edad = 18\nlet nombre = "Ana"\nvar activo = true',
    },
    conditionalsExample: {
      description: 'if/else en Swift no necesita paréntesis alrededor de la condición.',
      code: 'let edad = 18\n\nif edad >= 18 {\n    print("Eres mayor de edad")\n} else {\n    print("Eres menor de edad")\n}',
    },
    loopsExample: {
      description: 'for-in recorre un rango de valores con el operador ..<.',
      code: 'for i in 0..<5 {\n    print("Vuelta número \\(i)")\n}',
    },
    useCases: [
      'Aplicaciones para iPhone y iPad',
      'Aplicaciones para Mac',
      'Aplicaciones para Apple Watch',
      'Software para visionOS',
    ],
    steps: [
      {
        title: 'Instala Xcode',
        description: 'Instala Xcode desde la Mac App Store (requiere una computadora Mac).',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.swift',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Swift permite interpolar variables directamente dentro de los textos.',
        code: 'let nombre = "Mundo"\nprint("¡Hola, \\(nombre)!")',
      },
      {
        title: 'Ejecútalo',
        description: 'Desde la terminal, ejecuta el archivo directamente con el intérprete de Swift.',
        code: 'swift hola.swift',
      },
    ],
    courses: [
      { title: 'Swift Book', platform: 'swift.org', url: 'https://docs.swift.org/swift-book/' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'go',
    name: 'Go',
    tagline: 'Simplicidad y concurrencia a gran escala',
    color: '#00ADD8',
    year: 2009,
    founders: ['Robert Griesemer', 'Rob Pike', 'Ken Thompson'],
    paradigm: 'Procedural y concurrente',
    history:
      'En 2007, tres ingenieros de Google —Robert Griesemer, Rob Pike y Ken Thompson, este último cocreador de Unix— se cansaron de la lentitud para compilar proyectos gigantes en C++ y diseñaron Go como respuesta. Se hizo público en 2009 y destaca por su simplicidad y su manejo nativo de la concurrencia mediante las llamadas "goroutines". Hoy es el lenguaje detrás de herramientas como Docker y Kubernetes.',
    keyFeatures: [
      'Concurrencia sencilla con goroutines y channels',
      'Compila a binarios únicos sin dependencias externas',
      'Sintaxis minimalista a propósito',
      'Recolector de basura con pausas muy cortas',
    ],
    curiosity:
      'Go también es conocido como "Golang" simplemente porque el dominio go.org ya estaba ocupado cuando se buscó una dirección web para el proyecto.',
    variablesExample: {
      description: 'El operador := declara e infiere el tipo de la variable en un solo paso.',
      code: 'edad := 18\nnombre := "Ana"\nactivo := true',
    },
    conditionalsExample: {
      description: 'if/else en Go no necesita paréntesis alrededor de la condición.',
      code: 'edad := 18\n\nif edad >= 18 {\n    fmt.Println("Eres mayor de edad")\n} else {\n    fmt.Println("Eres menor de edad")\n}',
    },
    loopsExample: {
      description: 'Go solo tiene un tipo de bucle: for, que puede usarse de varias formas.',
      code: 'for i := 0; i < 5; i++ {\n    fmt.Println("Vuelta número", i)\n}',
    },
    useCases: [
      'Infraestructura en la nube',
      'Microservicios',
      'Herramientas de línea de comandos',
      'Sistemas concurrentes',
    ],
    steps: [
      {
        title: 'Instala Go',
        description: 'Descarga Go desde go.dev e instálalo en tu computadora.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.go',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Todo programa en Go pertenece a un paquete, generalmente "main".',
        code: 'package main\n\nimport "fmt"\n\nfunc main() {\n    nombre := "Mundo"\n    fmt.Println("¡Hola, " + nombre + "!")\n}',
      },
      {
        title: 'Ejecútalo',
        description: 'Corre el archivo directamente con el comando "go run".',
        code: 'go run hola.go',
      },
    ],
    courses: [
      { title: 'A Tour of Go', platform: 'go.dev', url: 'https://go.dev/tour/welcome/1' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'ruby',
    name: 'Ruby',
    tagline: 'Diseñado para la felicidad del programador',
    color: '#CC342D',
    year: 1995,
    founders: ['Yukihiro "Matz" Matsumoto'],
    paradigm: 'Orientado a objetos',
    history:
      'El programador japonés Yukihiro Matsumoto, conocido como "Matz", creó Ruby en 1995 buscando un lenguaje que priorizara la felicidad de quien programa por encima de todo. Mezcló ideas de Perl, Smalltalk y Lisp para lograr una sintaxis elegante y natural. Se hizo mundialmente famoso gracias al framework Ruby on Rails, que revolucionó la velocidad del desarrollo web.',
    keyFeatures: [
      'Todo en Ruby es un objeto, incluso los números',
      'Sintaxis expresiva pensada para la felicidad del programador',
      'Metaprogramación muy potente',
      'Gestor de paquetes propio: RubyGems',
    ],
    curiosity:
      'La filosofía de Ruby se resume en el "principio de menor sorpresa": el lenguaje debe comportarse como el programador espera, sin sorpresas raras.',
    variablesExample: {
      description: 'En Ruby no se declara el tipo: simplemente asignas un valor a un nombre.',
      code: 'edad = 18\nnombre = "Ana"\nactivo = true',
    },
    conditionalsExample: {
      description: 'Los bloques if/else en Ruby se cierran con la palabra end.',
      code: 'edad = 18\n\nif edad >= 18\n  puts "Eres mayor de edad"\nelse\n  puts "Eres menor de edad"\nend',
    },
    loopsExample: {
      description: 'times es una forma muy natural de repetir un bloque en Ruby.',
      code: '5.times do |i|\n  puts "Vuelta número #{i}"\nend',
    },
    useCases: [
      'Desarrollo web con Ruby on Rails',
      'Prototipado rápido',
      'Automatización de tareas',
      'Scripts de administración de sistemas',
    ],
    steps: [
      {
        title: 'Instala Ruby',
        description: 'Descarga e instala Ruby desde su sitio oficial.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.rb',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Ruby permite interpolar variables dentro de los textos con #{}.',
        code: 'nombre = "Mundo"\nputs "¡Hola, #{nombre}!"',
      },
      {
        title: 'Ejecútalo',
        description: 'Corre el archivo directamente con el intérprete de Ruby.',
        code: 'ruby hola.rb',
      },
    ],
    courses: [
      { title: 'Guía rápida', platform: 'ruby-lang.org', url: 'https://www.ruby-lang.org/es/documentation/quickstart/' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    tagline: 'JavaScript con superpoderes de tipado',
    color: '#3178C6',
    year: 2012,
    founders: ['Anders Hejlsberg (Microsoft)'],
    paradigm: 'Multiparadigma: orientado a objetos y funcional, con tipado estático opcional',
    history:
      'Microsoft presentó TypeScript en 2012 bajo la dirección de Anders Hejlsberg, el mismo creador de C#. Su idea era simple pero poderosa: agregar tipos estáticos opcionales a JavaScript para detectar errores antes de ejecutar el código, sin perder compatibilidad con el JavaScript ya existente. Hoy es el estándar de facto para proyectos grandes en frameworks como Angular, y muy popular en React y Node.js.',
    keyFeatures: [
      'Tipado estático opcional sobre JavaScript',
      'Detecta errores antes de ejecutar el código',
      'Autocompletado e inteligencia de código muy superior en los editores',
      'Compatible con cualquier código JavaScript existente',
    ],
    curiosity:
      'TypeScript no se ejecuta directamente: siempre se "transpila" (convierte) a JavaScript normal antes de correr en el navegador o en Node.js.',
    variablesExample: {
      description: 'Igual que en JavaScript, pero puedes anotar el tipo explícitamente.',
      code: 'let edad: number = 18;\nconst nombre: string = "Ana";\nlet activo: boolean = true;',
    },
    conditionalsExample: {
      description: 'if/else funciona igual que en JavaScript, con el beneficio del chequeo de tipos.',
      code: 'let edad: number = 18;\n\nif (edad >= 18) {\n  console.log("Eres mayor de edad");\n} else {\n  console.log("Eres menor de edad");\n}',
    },
    loopsExample: {
      description: 'El bucle for repite un bloque de código un número determinado de veces.',
      code: 'for (let i = 0; i < 5; i++) {\n  console.log(`Vuelta número ${i}`);\n}',
    },
    useCases: [
      'Aplicaciones web a gran escala',
      'Frameworks como Angular y Next.js',
      'Backend con Node.js más seguro',
      'Librerías compartidas entre equipos',
    ],
    steps: [
      {
        title: 'Instala TypeScript',
        description: 'Con Node.js instalado, agrega TypeScript de forma global desde la terminal.',
        code: 'npm install -g typescript',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.ts',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Declara el tipo de la variable de forma explícita.',
        code: 'let nombre: string = "Mundo";\nconsole.log(`¡Hola, ${nombre}!`);',
      },
      {
        title: 'Compila y ejecuta',
        description: 'TypeScript se traduce a JavaScript antes de ejecutarse con Node.',
        code: 'tsc hola.ts\nnode hola.js',
      },
    ],
    courses: [
      { title: 'Documentación oficial', platform: 'typescriptlang.org', url: 'https://www.typescriptlang.org/docs/' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'rust',
    name: 'Rust',
    tagline: 'Velocidad de C con seguridad de memoria',
    color: '#DE7C42',
    year: 2010,
    founders: ['Graydon Hoare'],
    paradigm: 'Multiparadigma: concurrente, funcional y orientado a objetos',
    history:
      'Graydon Hoare comenzó Rust como un proyecto personal en 2006, y Mozilla lo adoptó como proyecto oficial en 2009 para construir un motor de navegador más seguro. Su primera versión estable llegó en 2015. Su gran innovación es el "borrow checker", un sistema que garantiza seguridad de memoria sin necesidad de un recolector de basura, y por eso lo eligen empresas como Discord, Dropbox y hasta el kernel de Linux.',
    keyFeatures: [
      'Seguridad de memoria garantizada en tiempo de compilación',
      'Sin recolector de basura, pero sin fugas de memoria',
      'Rendimiento comparable a C y C++',
      'Manejo de errores explícito (Result y Option)',
    ],
    curiosity:
      'Rust ha sido votado como "el lenguaje más amado" en la encuesta anual de desarrolladores de Stack Overflow durante varios años consecutivos.',
    variablesExample: {
      description: 'Las variables son inmutables por defecto; usa mut para permitir que cambien.',
      code: 'let edad = 18;\nlet nombre = "Ana";\nlet mut activo = true;',
    },
    conditionalsExample: {
      description: 'if/else en Rust no necesita paréntesis alrededor de la condición.',
      code: 'let edad = 18;\n\nif edad >= 18 {\n    println!("Eres mayor de edad");\n} else {\n    println!("Eres menor de edad");\n}',
    },
    loopsExample: {
      description: 'for recorre un rango de valores de forma segura.',
      code: 'for i in 0..5 {\n    println!("Vuelta número {}", i);\n}',
    },
    useCases: [
      'Sistemas y herramientas de línea de comandos',
      'Motores de videojuegos',
      'Programación de sistemas embebidos',
      'Componentes críticos de rendimiento en apps grandes',
    ],
    steps: [
      {
        title: 'Instala Rust',
        description: 'Instala el toolchain de Rust usando rustup, el instalador oficial (rustup.rs).',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.rs',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'El punto de entrada de todo programa en Rust es la función main.',
        code: 'fn main() {\n    let nombre = "Mundo";\n    println!("¡Hola, {}!", nombre);\n}',
      },
      {
        title: 'Compila y ejecuta',
        description: 'Compila el archivo para generar un binario y luego ejecútalo.',
        code: 'rustc hola.rs\n./hola',
      },
    ],
    courses: [
      { title: 'El libro de Rust', platform: 'doc.rust-lang.org', url: 'https://doc.rust-lang.org/book/' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'dart',
    name: 'Dart',
    tagline: 'El lenguaje detrás de Flutter',
    color: '#0175C2',
    year: 2011,
    founders: ['Lars Bak', 'Kasper Lund (Google)'],
    paradigm: 'Multiparadigma: orientado a objetos y funcional',
    history:
      'Google presentó Dart en 2011 con la idea original de ofrecer una alternativa a JavaScript para el navegador. Esa apuesta inicial no despegó, pero el lenguaje encontró su verdadero propósito en 2017 al convertirse en el motor de Flutter, el framework de Google para crear apps multiplataforma. Hoy Dart vive prácticamente unido a Flutter.',
    keyFeatures: [
      'Compila a código nativo (ARM, x64) o a JavaScript',
      '"Hot reload": ves los cambios de tu app al instante',
      'Tipado sólido y seguro',
      'Diseñado desde el inicio para interfaces de usuario',
    ],
    curiosity:
      'El nombre "Dart" no es un acrónimo: sus creadores buscaban un nombre corto, memorable y fácil de pronunciar en cualquier idioma.',
    variablesExample: {
      description: 'Dart tiene tipado sólido, aunque también permite inferencia con var.',
      code: 'int edad = 18;\nString nombre = "Ana";\nbool activo = true;',
    },
    conditionalsExample: {
      description: 'if/else funciona de forma muy similar a Java o JavaScript.',
      code: 'int edad = 18;\n\nif (edad >= 18) {\n  print("Eres mayor de edad");\n} else {\n  print("Eres menor de edad");\n}',
    },
    loopsExample: {
      description: 'El bucle for clásico repite un bloque un número determinado de veces.',
      code: 'for (int i = 0; i < 5; i++) {\n  print("Vuelta número $i");\n}',
    },
    useCases: [
      'Aplicaciones móviles con Flutter',
      'Aplicaciones de escritorio multiplataforma',
      'Aplicaciones web con Flutter Web',
      'Scripts del lado del servidor',
    ],
    steps: [
      {
        title: 'Instala el SDK de Dart',
        description: 'Instala el SDK de Dart, o instala Flutter, que ya lo incluye.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.dart',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'El punto de entrada de todo programa en Dart es la función main.',
        code: 'void main() {\n  String nombre = "Mundo";\n  print("¡Hola, $nombre!");\n}',
      },
      {
        title: 'Ejecútalo',
        description: 'Corre el archivo directamente con el comando dart.',
        code: 'dart run hola.dart',
      },
    ],
    courses: [
      { title: 'Guías oficiales', platform: 'dart.dev', url: 'https://dart.dev/guides' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'c',
    name: 'C',
    tagline: 'El padre de casi todos los lenguajes modernos',
    color: '#A8B9CC',
    year: 1972,
    founders: ['Dennis Ritchie'],
    paradigm: 'Procedural',
    history:
      'Dennis Ritchie creó C en los Laboratorios Bell en 1972 para reescribir el sistema operativo Unix, que hasta entonces estaba en ensamblador. Su combinación de control de bajo nivel con una sintaxis relativamente simple lo convirtió en la base de la que nacieron C++, Java, C#, JavaScript y muchos otros lenguajes. Más de 50 años después, sigue siendo esencial para sistemas operativos y software embebido.',
    keyFeatures: [
      'Acceso directo a la memoria mediante punteros',
      'Compila a código máquina muy eficiente',
      'Sin recolector de basura: el programador administra la memoria',
      'Estándar ISO que se sigue actualizando',
    ],
    curiosity:
      'El sistema operativo Unix, y por extensión Linux, están escritos casi por completo en C, lo que demuestra su vigencia más de 50 años después de su creación.',
    variablesExample: {
      description: 'En C toda variable declara explícitamente su tipo y ocupa memoria fija.',
      code: 'int edad = 18;\nchar nombre[] = "Ana";\nint activo = 1; // C clásico no tiene un tipo booleano nativo',
    },
    conditionalsExample: {
      description: 'if/else evalúa una expresión entre paréntesis; en C, 0 es falso y cualquier otro valor es verdadero.',
      code: 'int edad = 18;\n\nif (edad >= 18) {\n    printf("Eres mayor de edad\\n");\n} else {\n    printf("Eres menor de edad\\n");\n}',
    },
    loopsExample: {
      description: 'El bucle for clásico repite un bloque un número determinado de veces.',
      code: 'for (int i = 0; i < 5; i++) {\n    printf("Vuelta número %d\\n", i);\n}',
    },
    useCases: [
      'Sistemas operativos',
      'Controladores de hardware (drivers)',
      'Sistemas embebidos y microcontroladores',
      'Bases del resto de lenguajes modernos',
    ],
    steps: [
      {
        title: 'Instala un compilador',
        description: 'Instala gcc para poder compilar programas en C.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.c',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Incluye la librería estándar de entrada/salida y usa printf.',
        code: '#include <stdio.h>\n\nint main() {\n    char *nombre = "Mundo";\n    printf("¡Hola, %s!\\n", nombre);\n    return 0;\n}',
      },
      {
        title: 'Compila y ejecuta',
        description: 'Compila el archivo para generar un ejecutable y luego corre ese ejecutable.',
        code: 'gcc hola.c -o hola\n./hola',
      },
    ],
    courses: [
      { title: 'Referencia oficial', platform: 'cppreference.com', url: 'https://en.cppreference.com/w/c' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'perl',
    name: 'Perl',
    tagline: 'La navaja suiza de la programación',
    color: '#39457E',
    year: 1987,
    founders: ['Larry Wall'],
    paradigm: 'Multiparadigma: procedural y orientado a objetos',
    history:
      'El lingüista y programador Larry Wall creó Perl en 1987 mientras trabajaba como administrador de sistemas, buscando una herramienta más potente que las disponibles para procesar texto y generar reportes. Su manejo de expresiones regulares integrado en el propio lenguaje lo hizo extremadamente popular en los años 90 para scripts de administración y las primeras páginas web dinámicas (CGI).',
    keyFeatures: [
      'Expresiones regulares integradas en la sintaxis del lenguaje',
      'Muy flexible: hay "más de una forma de hacerlo" (TMTOWTDI)',
      'Ideal para procesar archivos de texto grandes',
      'CPAN: un repositorio de módulos con décadas de antigüedad',
    ],
    curiosity:
      'Larry Wall, su creador, también es lingüista, lo que explica por qué Perl toma tantas ideas prestadas de los idiomas humanos naturales.',
    variablesExample: {
      description: 'Las variables en Perl se declaran con my y llevan un símbolo según su tipo ($ para escalares).',
      code: 'my $edad = 18;\nmy $nombre = "Ana";\nmy $activo = 1;',
    },
    conditionalsExample: {
      description: 'if/else evalúa una condición entre paréntesis, similar a C.',
      code: 'my $edad = 18;\n\nif ($edad >= 18) {\n    print "Eres mayor de edad\\n";\n} else {\n    print "Eres menor de edad\\n";\n}',
    },
    loopsExample: {
      description: 'El bucle for clásico repite un bloque un número determinado de veces.',
      code: 'for (my $i = 0; $i < 5; $i++) {\n    print "Vuelta número $i\\n";\n}',
    },
    useCases: [
      'Procesamiento y manipulación de texto',
      'Administración de sistemas',
      'Scripts CGI para la web',
      'Bioinformática',
    ],
    steps: [
      {
        title: 'Instala Perl',
        description: 'Perl ya viene instalado en la mayoría de sistemas Linux y macOS.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.pl',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Perl permite interpolar variables directamente dentro de los textos.',
        code: 'my $nombre = "Mundo";\nprint "¡Hola, $nombre!\\n";',
      },
      {
        title: 'Ejecútalo',
        description: 'Corre el archivo directamente con el intérprete de Perl.',
        code: 'perl hola.pl',
      },
    ],
    courses: [
      { title: 'learn.perl.org', platform: 'Perl Foundation', url: 'https://learn.perl.org/' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'scala',
    name: 'Scala',
    tagline: 'Programación orientada a objetos y funcional en la JVM',
    color: '#DC322F',
    year: 2004,
    founders: ['Martin Odersky'],
    paradigm: 'Multiparadigma: orientado a objetos y funcional',
    history:
      'El profesor Martin Odersky diseñó Scala, cuyo nombre significa "scalable language" (lenguaje escalable), y lo publicó en 2004 buscando unir lo mejor de la programación orientada a objetos con la programación funcional sobre la máquina virtual de Java. Empresas como Twitter y LinkedIn lo adoptaron para manejar sistemas de altísima concurrencia, y de él nació después el famoso framework Apache Spark.',
    keyFeatures: [
      'Combina programación orientada a objetos y funcional',
      'Compatible al 100% con librerías de Java',
      'Sistema de tipos muy expresivo',
      'Motor de Apache Spark para big data',
    ],
    curiosity:
      'El nombre Scala viene de "scalable language" (lenguaje escalable), porque fue diseñado para crecer con las necesidades de sus usuarios, desde scripts pequeños hasta sistemas enormes.',
    variablesExample: {
      description: 'Usa var para variables que cambian y val para valores que no cambian (lo más común).',
      code: 'var edad = 18\nval nombre = "Ana"\nvar activo = true',
    },
    conditionalsExample: {
      description: 'if/else en Scala también puede usarse como una expresión que devuelve un valor.',
      code: 'val edad = 18\n\nif (edad >= 18) {\n  println("Eres mayor de edad")\n} else {\n  println("Eres menor de edad")\n}',
    },
    loopsExample: {
      description: 'Un for con un rango recorre una secuencia de valores.',
      code: 'for (i <- 0 until 5) {\n  println(s"Vuelta número $i")\n}',
    },
    useCases: [
      'Procesamiento de grandes volúmenes de datos (Apache Spark)',
      'Sistemas concurrentes y distribuidos',
      'Backend empresarial sobre la JVM',
      'Streaming de datos en tiempo real',
    ],
    steps: [
      {
        title: 'Instala Scala',
        description: 'Instala el JDK y luego Scala (o usa sbt, su herramienta de construcción).',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.scala',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Con las versiones modernas de Scala, un método marcado con @main es tu punto de entrada.',
        code: '@main def hola(): Unit = {\n  val nombre = "Mundo"\n  println(s"¡Hola, $nombre!")\n}',
      },
      {
        title: 'Ejecútalo',
        description: 'Scala puede compilar y ejecutar el script en un solo paso.',
        code: 'scala hola.scala',
      },
    ],
    courses: [
      { title: 'Documentación oficial', platform: 'docs.scala-lang.org', url: 'https://docs.scala-lang.org/' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'lua',
    name: 'Lua',
    tagline: 'Pequeño, veloz y perfecto para incrustar',
    color: '#000080',
    year: 1993,
    founders: ['Roberto Ierusalimschy', 'Waldemar Celes', 'Luiz Henrique de Figueiredo'],
    paradigm: 'Multiparadigma: procedural y orientado a objetos (basado en prototipos)',
    history:
      'Un equipo de investigadores brasileños de la Pontificia Universidad Católica de Río de Janeiro creó Lua en 1993, buscando un lenguaje ligero y fácil de incrustar dentro de otras aplicaciones escritas en C. Su nombre significa "luna" en portugués. Gracias a su tamaño mínimo y velocidad, hoy es el lenguaje de scripting favorito de la industria de los videojuegos, usado en World of Warcraft y Roblox.',
    keyFeatures: [
      'Intérprete extremadamente pequeño y rápido',
      'Fácil de incrustar dentro de aplicaciones en C/C++',
      'Solo tiene una estructura de datos: la tabla',
      'Consume muy poca memoria',
    ],
    curiosity:
      'Los addons y modificaciones de World of Warcraft se escriben en Lua, lo que lo convirtió en uno de los lenguajes de scripting más usados en la industria de los videojuegos.',
    variablesExample: {
      description: 'local declara una variable visible solo dentro de su bloque.',
      code: 'local edad = 18\nlocal nombre = "Ana"\nlocal activo = true',
    },
    conditionalsExample: {
      description: 'Los bloques if/else en Lua se cierran con la palabra end.',
      code: 'local edad = 18\n\nif edad >= 18 then\n  print("Eres mayor de edad")\nelse\n  print("Eres menor de edad")\nend',
    },
    loopsExample: {
      description: 'El bucle for numérico recorre un rango de valores.',
      code: 'for i = 0, 4 do\n  print("Vuelta número " .. i)\nend',
    },
    useCases: [
      'Scripting dentro de videojuegos',
      'Modificaciones y addons (World of Warcraft, Roblox)',
      'Sistemas embebidos',
      'Configuración de aplicaciones (como Neovim)',
    ],
    steps: [
      {
        title: 'Instala Lua',
        description: 'Descarga e instala el intérprete de Lua desde lua.org.',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.lua',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Concatena texto usando el operador de puntos ..',
        code: 'local nombre = "Mundo"\nprint("¡Hola, " .. nombre .. "!")',
      },
      {
        title: 'Ejecútalo',
        description: 'Corre el archivo directamente con el intérprete de Lua.',
        code: 'lua hola.lua',
      },
    ],
    courses: [
      { title: 'Manual de referencia', platform: 'lua.org', url: 'https://www.lua.org/manual/5.4/' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
  {
    id: 'elixir',
    name: 'Elixir',
    tagline: 'Programación funcional para sistemas que nunca caen',
    color: '#4B275F',
    year: 2011,
    founders: ['José Valim'],
    paradigm: 'Funcional y concurrente',
    history:
      'El programador brasileño José Valim, quien trabajaba en el equipo de Ruby on Rails, creó Elixir en 2011 buscando resolver los problemas de escalabilidad y concurrencia de Ruby. Construyó el lenguaje sobre la máquina virtual de Erlang (BEAM), heredando su legendaria capacidad para crear sistemas distribuidos tolerantes a fallos. Discord y Pinterest usan Elixir para soportar millones de conexiones simultáneas.',
    keyFeatures: [
      'Construido sobre la máquina virtual de Erlang (BEAM)',
      'Tolerancia a fallos: los procesos se reinician solos si fallan',
      'Concurrencia masiva con procesos muy ligeros',
      'Framework web Phoenix para tiempo real',
    ],
    curiosity:
      'Discord usa Elixir para manejar millones de conexiones de voz y chat simultáneas gracias a la legendaria estabilidad de la máquina virtual de Erlang.',
    variablesExample: {
      description: 'En Elixir los datos son inmutables: "reasignar" en realidad crea un nuevo valor.',
      code: 'edad = 18\nnombre = "Ana"\nactivo = true',
    },
    conditionalsExample: {
      description: 'Los bloques if/else en Elixir se cierran con la palabra end.',
      code: 'edad = 18\n\nif edad >= 18 do\n  IO.puts("Eres mayor de edad")\nelse\n  IO.puts("Eres menor de edad")\nend',
    },
    loopsExample: {
      description: 'Elixir no tiene bucles tradicionales: usa funciones como Enum.each sobre un rango.',
      code: 'Enum.each(0..4, fn i ->\n  IO.puts("Vuelta número #{i}")\nend)',
    },
    useCases: [
      'Sistemas de mensajería en tiempo real',
      'APIs de alta concurrencia',
      'Aplicaciones distribuidas y tolerantes a fallos',
      'Internet de las cosas (IoT)',
    ],
    steps: [
      {
        title: 'Instala Elixir',
        description: 'Instala Elixir siguiendo la guía oficial (incluye la máquina virtual de Erlang).',
      },
      {
        title: 'Crea tu archivo',
        description: 'Crea un archivo llamado hola.exs',
      },
      {
        title: 'Escribe tu primer programa',
        description: 'Elixir permite interpolar variables dentro de los textos con #{}.',
        code: 'nombre = "Mundo"\nIO.puts("¡Hola, #{nombre}!")',
      },
      {
        title: 'Ejecútalo',
        description: 'Los scripts de Elixir (.exs) se ejecutan directamente, sin compilar por separado.',
        code: 'elixir hola.exs',
      },
    ],
    courses: [
      { title: 'Guía oficial', platform: 'elixir-lang.org', url: 'https://elixir-lang.org/getting-started/introduction.html' },
      { title: 'Cursos gratuitos', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    ],
  },
];

export function getLanguageById(id: string | undefined): ProgrammingLanguage | undefined {
  return LANGUAGES.find((lang) => lang.id === id);
}
