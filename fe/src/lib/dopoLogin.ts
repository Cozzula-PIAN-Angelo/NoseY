// Ritorno alla pagina di partenza dopo il login (docs/interfacce.md, FE2-01 passo 4):
// chi apre una rotta *login* senza accesso va a /login?redirect=<pagina richiesta>
// e, appena fatto l'accesso, torna li'. Lo stesso dopo un 401 NON_AUTENTICATO.

/** Indirizzo del login che riporta a `percorso` (pathname + search + hash della pagina) */
export function urlLogin(percorso?: string): string {
  if (!percorso || percorso === '/' || !percorsoSicuro(percorso)) return '/login'
  return `/login?redirect=${encodeURIComponent(percorso)}`
}

/** Dove andare dopo il login: il ?redirect= se e' una pagina dell'app, altrimenti la home */
export function percorsoDopoLogin(parametri: URLSearchParams): string {
  const redirect = parametri.get('redirect')
  return redirect && percorsoSicuro(redirect) ? redirect : '/'
}

// Solo percorsi interni: "//sito.it" o "https://..." porterebbero fuori dall'app (open redirect).
// Niente ritorno alle pagine per ospiti, che rimanderebbero subito altrove.
const PAGINE_OSPITE = ['/login', '/register', '/verify', '/forgot-password']

function percorsoSicuro(percorso: string): boolean {
  if (!percorso.startsWith('/') || percorso.startsWith('//') || percorso.startsWith('/\\')) return false
  const pathname = percorso.split(/[?#]/)[0]
  return !PAGINE_OSPITE.includes(pathname)
}
