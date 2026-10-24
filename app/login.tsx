import { LandingPage } from '@/components/landing/landing-page';

// Login único de la app: la cuenta (correo y contraseña) decide si eres estudiante, profesor o superusuario.
// El login de la API del compañero sigue aparte, dentro de la pestaña API.
// El formulario vive dentro de una página de presentación con scroll y animaciones,
// que se acomoda a celular, tablet y computadora.
export default function LoginScreen() {
  return <LandingPage />;
}
