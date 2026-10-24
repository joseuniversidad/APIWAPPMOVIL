// Rutas de aprendizaje: lenguajes en el orden recomendado para una meta.
// Un lenguaje cuenta como hecho al completar su tutorial o sacar 60% o más en su quiz.
export type LearningPath = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  languages: string[];
};

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'web',
    emoji: '🌐',
    title: 'Quiero hacer páginas web',
    description: 'El navegador, sus tipos y el servidor.',
    languages: ['javascript', 'typescript', 'php'],
  },
  {
    id: 'moviles',
    emoji: '📱',
    title: 'Apps móviles',
    description: 'Multiplataforma con Flutter y nativo en Android e iOS.',
    languages: ['dart', 'kotlin', 'swift'],
  },
  {
    id: 'datos',
    emoji: '📊',
    title: 'Datos e inteligencia artificial',
    description: 'Análisis de datos y procesamiento a gran escala.',
    languages: ['python', 'scala'],
  },
  {
    id: 'sistemas',
    emoji: '⚙️',
    title: 'Sistemas y alto rendimiento',
    description: 'Cerca del hardware, con control de la memoria.',
    languages: ['c', 'cpp', 'rust'],
  },
  {
    id: 'juegos',
    emoji: '🎮',
    title: 'Videojuegos',
    description: 'Unity, motores gráficos y scripts de juego.',
    languages: ['csharp', 'cpp', 'lua'],
  },
  {
    id: 'backend',
    emoji: '🗄️',
    title: 'Servidores (backend)',
    description: 'APIs y servicios que aguantan mucho tráfico.',
    languages: ['go', 'java', 'elixir'],
  },
];

export const PASSING_PERCENT = 60;
