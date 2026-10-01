// Spostamenti fra pagine che servono anche fuori dai componenti di pagina.
// Finche' non c'e' il router (FE2-01) si cambia pagina con location; poi si usera' navigate().

/**
 * Pagina di login con il ritorno alla pagina di partenza (docs/interfacce.md):
 * /login?redirect=/events/123. Dopo l'accesso la pagina di login (FE2-05) torna li'.
 */
export function vaiAlLogin(ritorno: string = window.location.pathname + window.location.search) {
  window.location.assign(`/login?redirect=${encodeURIComponent(ritorno)}`)
}
