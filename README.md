# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Configurar Supabase (MiApp54)

Ejecuta los archivos de `supabase/` en **SQL Editor → Run**, en este orden:

1. `schema-y-datos.sql`, `quiz-scores.sql`, `ai-chat.sql`, `realtime.sql`
2. `agregar-lenguaje.sql`
3. `comunidad.sql` (favoritos, apodos y ranking del quiz)
4. `cuentas.sql` (nombre de cada cuenta, roles, usuarios, editar y borrar lenguajes)
5. `superusuario.sql` (antes, sigue los dos pasos que explica al inicio del archivo)
6. `clases-retos-avisos.sql` (modo profesor, materiales, retos semanales y avisos)
7. `admin-extra.sql` (anuncio fijado, lenguaje destacado, bienvenida, frameworks, preguntas del quiz y suspender cuentas)

Lo que consume el compañero no cambia: su usuario sigue entrando y `languages` y `frameworks`
conservan sus columnas y su política de lectura.

### Registro (Authentication → Sign In / Providers en el panel de Supabase)

- **Confirm email:** desactivado. Así la cuenta entra al instante, sin correos de confirmación.
- **Allow new users to sign up** y **Allow anonymous sign-ins:** activados (el catálogo se lee antes de iniciar sesión).

El registro pide nombre, correo (basta con que tenga @) y contraseña de al menos 8 caracteres.

### Roles

- **Estudiante:** cualquiera que se registra.
- **Profesor:** lo nombra el superusuario en *Admin → Usuarios*. Crea clases, ve el progreso de sus alumnos,
  sube videos, enlaces y notas, y publica retos.
- **Superusuario:** regístrate en la app con tu correo, pon ese correo en `superusuario.sql` y ejecútalo.
  Ve la pestaña *Admin* (reportes, usuarios y contenido), y agrega, edita y borra lenguajes.
  Los cambios llegan al instante a todos (Realtime) y se envía un aviso.

### Avisos con la app cerrada

Las notificaciones push usan el servicio de Expo y la extensión `pg_net` (la activa `clases-retos-avisos.sql`).
Solo llegan a una app instalada o a un *development build*; en Expo Go los avisos llegan por Realtime con la app abierta.

**Quiz generado con IA:** vuelve a desplegar la Edge Function con el código de
`supabase/functions/asistente-ia` (la app la llama `swift-worker`).

**Practicar código:** usa la API pública de [Piston](https://github.com/engineer-man/piston). Si deja de responder,
levanta tu propio Piston y pon su URL en `EXPO_PUBLIC_CODE_RUNNER_URL` dentro de `.env`.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
