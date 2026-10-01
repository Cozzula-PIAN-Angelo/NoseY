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
