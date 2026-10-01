// Password della registrazione appena fatta (FE1-18), per precompilarla nella verifica:
// il backend chiede email + codice + password (progettazione v4, sezione 1).
// Resta SOLO in memoria: mai nell'indirizzo, nel localStorage o nella cronologia del browser.
// Ricaricando la pagina si perde, e la schermata di verifica la chiede di nuovo.

let inAttesa: { email: string; password: string } | null = null

export function ricordaPassword(email: string, password: string) {
  inAttesa = { email: email.trim().toLowerCase(), password }
}

/** La password, solo se e' della stessa email */
export function passwordRicordata(email: string): string {
  return inAttesa && inAttesa.email === email.trim().toLowerCase() ? inAttesa.password : ''
}

export function dimenticaPassword() {
  inAttesa = null
}

// Ora dell'ultimo invio del codice, per email (anche questa solo in memoria): il backend
// accetta un nuovo invio solo dopo 60 secondi (429 TROPPE_RICHIESTE).
const ultimiInvii = new Map<string, number>()

export function segnaInvioCodice(email: string, quando = Date.now()) {
  ultimiInvii.set(email.trim().toLowerCase(), quando)
}

/** Ora (ms) dell'ultimo invio a questa email in questa scheda, oppure null */
export function ultimoInvioCodice(email: string): number | null {
  return ultimiInvii.get(email.trim().toLowerCase()) ?? null
}
