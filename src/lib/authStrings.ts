// Login/signup copy. The i18n Bundle type is strict and shared by many
// languages, so the auth screen keeps its own dictionary and falls back to
// Croatian for any language that is not translated yet.
export interface AuthStrings {
  tagline: string;
  signUp: string;
  signIn: string;
  continueGuest: string;
  email: string;
  password: string;
  createAccount: string;
  login: string;
  google: string;
  back: string;
  checkEmail: string;
  hintKeys: string;
  errorGeneric: string;
  loading: string;
}

const hr: AuthStrings = {
  tagline: "Pratite serije i filmove\nkoje gledate",
  signUp: "Registracija",
  signIn: "Prijava",
  continueGuest: "Nastavi kao gost",
  email: "E-mail adresa",
  password: "Lozinka",
  createAccount: "Kreiraj račun",
  login: "Prijavi se",
  google: "Nastavi s Google računom",
  back: "Natrag",
  checkEmail: "Provjerite e-mail i potvrdite račun kako biste se prijavili.",
  hintKeys: "Strelice za navigaciju · OK za potvrdu · Back za korak unazad",
  errorGeneric: "Nešto nije u redu. Pokušajte ponovno.",
  loading: "Molimo pričekajte…",
};

const en: AuthStrings = {
  tagline: "Track series & movies\nyou're watching",
  signUp: "Sign up",
  signIn: "Sign in",
  continueGuest: "Continue as guest",
  email: "Email address",
  password: "Password",
  createAccount: "Create account",
  login: "Sign in",
  google: "Continue with Google",
  back: "Back",
  checkEmail: "Check your email and confirm your account to sign in.",
  hintKeys: "Arrows to navigate · OK to confirm · Back to go back",
  errorGeneric: "Something went wrong. Please try again.",
  loading: "Please wait…",
};

const de: AuthStrings = {
  tagline: "Verfolge Serien & Filme,\ndie du schaust",
  signUp: "Registrieren",
  signIn: "Anmelden",
  continueGuest: "Als Gast fortfahren",
  email: "E-Mail-Adresse",
  password: "Passwort",
  createAccount: "Konto erstellen",
  login: "Anmelden",
  google: "Mit Google fortfahren",
  back: "Zurück",
  checkEmail: "Bitte bestätige dein Konto über die E-Mail, um dich anzumelden.",
  hintKeys: "Pfeiltasten zum Navigieren · OK zum Bestätigen · Zurück für einen Schritt zurück",
  errorGeneric: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  loading: "Bitte warten…",
};

const fr: AuthStrings = {
  tagline: "Suivez les séries et films\nque vous regardez",
  signUp: "S'inscrire",
  signIn: "Se connecter",
  continueGuest: "Continuer en invité",
  email: "Adresse e-mail",
  password: "Mot de passe",
  createAccount: "Créer un compte",
  login: "Se connecter",
  google: "Continuer avec Google",
  back: "Retour",
  checkEmail: "Vérifiez votre e-mail et confirmez votre compte pour vous connecter.",
  hintKeys: "Flèches pour naviguer · OK pour confirmer · Retour pour revenir",
  errorGeneric: "Une erreur est survenue. Veuillez réessayer.",
  loading: "Veuillez patienter…",
};

const es: AuthStrings = {
  tagline: "Sigue las series y películas\nque estás viendo",
  signUp: "Registrarse",
  signIn: "Iniciar sesión",
  continueGuest: "Continuar como invitado",
  email: "Correo electrónico",
  password: "Contraseña",
  createAccount: "Crear cuenta",
  login: "Iniciar sesión",
  google: "Continuar con Google",
  back: "Atrás",
  checkEmail: "Revisa tu correo y confirma tu cuenta para iniciar sesión.",
  hintKeys: "Flechas para navegar · OK para confirmar · Atrás para volver",
  errorGeneric: "Algo salió mal. Inténtalo de nuevo.",
  loading: "Espera un momento…",
};

const it: AuthStrings = {
  tagline: "Segui serie e film\nche stai guardando",
  signUp: "Registrati",
  signIn: "Accedi",
  continueGuest: "Continua come ospite",
  email: "Indirizzo e-mail",
  password: "Password",
  createAccount: "Crea account",
  login: "Accedi",
  google: "Continua con Google",
  back: "Indietro",
  checkEmail: "Controlla la tua e-mail e conferma l'account per accedere.",
  hintKeys: "Frecce per navigare · OK per confermare · Indietro per tornare",
  errorGeneric: "Qualcosa è andato storto. Riprova.",
  loading: "Attendere…",
};

const dict: Record<string, AuthStrings> = { hr, en, de, fr, es, it, sr: hr, bs: hr };

export const getAuthStrings = (language: string): AuthStrings =>
  dict[language?.split("-")[0] ?? "hr"] ?? hr;
