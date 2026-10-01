import { useState, type FormEvent } from 'react'
import { Button, DateTimeField, TextField, useAvviso } from '@/components/ui'
import { useModificaProfiloMutation } from '@/features/utenti/apiUtenti'
import { leggiErrore } from '@/lib/errori'
import { LIMITI_UTENTI, type UtenteResponse } from '@/types/api'
import {
  modificheProfilo,
  ORDINE_PROFILO,
  validaProfilo,
  valoriProfilo,
  type ErroriProfilo,
  type ValoriProfilo,
} from './validaProfilo'

// Dati personali del profilo (FE2-07) → ModificaProfilo (PATCH /api/users/me).
// Campi come nella schermata Stitch "Registrazione Account": nome e cognome affiancati con il
// contatore, data di nascita e indirizzo sulla stessa riga. L'email si vede ma non si cambia.
// Si mandano solo i campi cambiati: senza modifiche "Salva" resta spento. La risposta aggiorna
// la sessione (apiUtenti), quindi barra e menu si allineano subito e i dati restano dopo un refresh.
// Chi lo usa passa key con i valori salvati: se il profilo cambia altrove, il form riparte da li'.

const focusSu = (campo: keyof ValoriProfilo) => document.getElementById(`prof-${campo}`)?.focus()

export function FormDatiPersonali({ utente }: { utente: UtenteResponse }) {
  const [modificaProfilo, { isLoading }] = useModificaProfiloMutation()
  const avviso = useAvviso()
  const salvati = valoriProfilo(utente)
  const [v, setV] = useState<ValoriProfilo>(salvati)
  const [errori, setErrori] = useState<ErroriProfilo>({})

  const modifiche = modificheProfilo(v, salvati)
  const cambiato = Object.keys(modifiche).length > 0

  const cambia = (campo: keyof ValoriProfilo, valore: string) => {
    setV((attuali) => ({ ...attuali, [campo]: valore }))
    setErrori((e) => ({ ...e, [campo]: undefined }))
  }

  function annulla() {
    setV(salvati)
    setErrori({})
  }

  async function invia(e: FormEvent) {
    e.preventDefault()
    const trovati = validaProfilo(v, salvati)
    setErrori(trovati)
    const primo = ORDINE_PROFILO.find((c) => trovati[c])
    if (primo) return focusSu(primo)
    if (!cambiato) return

    try {
      await modificaProfilo(modifiche).unwrap()
      avviso.successo('Profilo aggiornato', 'Le modifiche sono state salvate.')
    } catch (err) {
      const letto = leggiErrore(err)
      if (letto.codice === 'VALIDAZIONE' && Object.keys(letto.campi).length) {
        // I nomi dei campi del backend sono gli stessi del form
        const dalServer: ErroriProfilo = {}
        for (const c of ORDINE_PROFILO) if (letto.campi[c]) dalServer[c] = letto.campi[c]
        setErrori(dalServer)
        const primoServer = ORDINE_PROFILO.find((c) => dalServer[c])
        if (primoServer) return focusSu(primoServer)
      }
      avviso.erroreApi(err)
    }
  }

  return (
    <form onSubmit={invia} noValidate className="flex flex-col gap-space-md">
      <div className="grid gap-space-md sm:grid-cols-2">
        <TextField
          etichetta="Nome"
          obbligatorio
          autoComplete="given-name"
          maxLength={LIMITI_UTENTI.nome}
          contatore
          value={v.nome}
          onChange={(e) => cambia('nome', e.target.value)}
          id="prof-nome"
          errore={errori.nome}
          placeholder="es. Valerio"
        />
        <TextField
          etichetta="Cognome"
          obbligatorio
          autoComplete="family-name"
          maxLength={LIMITI_UTENTI.cognome}
          contatore
          value={v.cognome}
          onChange={(e) => cambia('cognome', e.target.value)}
          id="prof-cognome"
          errore={errori.cognome}
          placeholder="es. Rossi"
        />
      </div>

      <TextField
        etichetta="Indirizzo email"
        type="email"
        icona="mail"
        value={utente.email}
        readOnly
        disabled
        aiuto="L’email dell’account non si può cambiare."
      />

      <div className="grid gap-space-md sm:grid-cols-12">
        <DateTimeField
          className="sm:col-span-5"
          etichetta="Data di nascita"
          obbligatorio={Boolean(salvati.dataNascita)}
          soloData
          max={new Date()}
          autoComplete="bday"
          value={v.dataNascita}
          onChange={(e) => cambia('dataNascita', e.target.value)}
          id="prof-dataNascita"
          errore={errori.dataNascita}
        />
        <TextField
          className="sm:col-span-7"
          etichetta="Indirizzo (facoltativo)"
          icona="location_on"
          autoComplete="street-address"
          maxLength={LIMITI_UTENTI.indirizzo}
          contatore
          value={v.indirizzo}
          onChange={(e) => cambia('indirizzo', e.target.value)}
          id="prof-indirizzo"
          errore={errori.indirizzo}
          placeholder="es. Via Tortona 14, Milano"
          aiuto="Lascialo vuoto per toglierlo dal profilo."
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-space-sm pt-space-sm">
        <Button type="button" variant="ghost" onClick={annulla} disabled={!cambiato || isLoading}>
          Annulla
        </Button>
        <Button type="submit" variant="gradient" icona="save" inCorso={isLoading} disabled={!cambiato}>
          Salva modifiche
        </Button>
      </div>
    </form>
  )
}
