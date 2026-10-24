// Ejecuta código en un servidor Piston (https://github.com/engineer-man/piston).
// Por defecto usa la instancia pública; si deja de responder, levanta tu propio Piston
// (por ejemplo con Docker) y pon su URL en EXPO_PUBLIC_CODE_RUNNER_URL.
const RUNNER_URL = (process.env.EXPO_PUBLIC_CODE_RUNNER_URL ?? 'https://emkc.org/api/v2/piston').replace(/\/+$/, '');

// Nombre de cada lenguaje del catálogo en Piston.
const PISTON_LANGUAGES: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  cpp: 'c++',
  c: 'c',
  csharp: 'csharp',
  php: 'php',
  kotlin: 'kotlin',
  swift: 'swift',
  go: 'go',
  ruby: 'ruby',
  rust: 'rust',
  dart: 'dart',
  perl: 'perl',
  scala: 'scala',
  lua: 'lua',
  elixir: 'elixir',
};

export function canRunLanguage(languageId: string): boolean {
  return languageId in PISTON_LANGUAGES;
}

export type RunResult = { output: string; exitCode: number | null; isError: boolean };

export async function runCode(languageId: string, code: string): Promise<RunResult> {
  const language = PISTON_LANGUAGES[languageId];
  if (!language) throw new Error('Este lenguaje todavía no se puede ejecutar desde la app');

  let response: Response;
  try {
    response = await fetch(`${RUNNER_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, version: '*', files: [{ content: code }], run_timeout: 5000 }),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor que ejecuta el código');
  }

  const json = (await response.json().catch(() => null)) as {
    message?: string;
    compile?: { output?: string; code?: number | null };
    run?: { output?: string; code?: number | null };
  } | null;
  if (!response.ok || !json) {
    throw new Error(json?.message ?? `El servidor de ejecución respondió ${response.status}`);
  }

  // Si la compilación falla, se muestra ese error en lugar de la ejecución.
  if (json.compile && json.compile.code) {
    return { output: json.compile.output ?? '', exitCode: json.compile.code, isError: true };
  }
  const exitCode = json.run?.code ?? null;
  return { output: json.run?.output ?? '', exitCode, isError: Boolean(exitCode) };
}

// Programa completo mínimo de cada lenguaje (los ejemplos del catálogo a veces son fragmentos
// que en Java, C#, Go, etc. necesitan ir dentro de main para compilar).
export const HELLO_WORLD: Record<string, string> = {
  javascript: 'console.log("Hola, mundo");',
  typescript: 'const saludo: string = "Hola, mundo";\nconsole.log(saludo);',
  python: 'print("Hola, mundo")',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hola, mundo");\n    }\n}',
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hola, mundo" << std::endl;\n    return 0;\n}',
  c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hola, mundo\\n");\n    return 0;\n}',
  csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hola, mundo");\n    }\n}',
  php: '<?php\necho "Hola, mundo\\n";',
  kotlin: 'fun main() {\n    println("Hola, mundo")\n}',
  swift: 'print("Hola, mundo")',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hola, mundo")\n}',
  ruby: 'puts "Hola, mundo"',
  rust: 'fn main() {\n    println!("Hola, mundo");\n}',
  dart: "void main() {\n  print('Hola, mundo');\n}",
  perl: 'print "Hola, mundo\\n";',
  scala: 'object Main extends App {\n  println("Hola, mundo")\n}',
  lua: 'print("Hola, mundo")',
  elixir: 'IO.puts("Hola, mundo")',
};
