import { leggiErrore } from '@/lib/errori'
import type { EventoRequest, ModificaEventoRequest } from '@/types/api'
import type { ErroriEvento } from './FormEvento'

// Errori di CreaEvento e ModificaEvento portati sui campi del form (FE1-07, passo 4).
// Ogni codice ha una frase che dice cosa fare; restituisce null per gli errori che non
// riguardano un campo (es. 403, 502): quelli restano un avviso generico.

/** Nomi dei campi del backend → campi del form */
const CAMPO: Record<string, keyof ErroriEvento> = {
  titolo: 'titolo',
  descrizione: 'descrizione',
  dataEvento: 'inizio',
  dataFine: 'fine',
  lat: 'posizione',
  lng: 'posizione',
}

const passata = (istante: string | undefined) => istante !== undefined && new Date(istante).getTime() <= Date.now()

export function erroriSuiCampi(
  errore: unknown,
  inviati: EventoRequest | ModificaEventoRequest,
): ErroriEvento | null {
  const { codice, campi } = leggiErrore(errore)

  switch (codice) {
    case 'DATE_NON_VALIDE':
      return { fine: "La fine deve essere dopo l'inizio." }

    case 'DATA_NON_FUTURA': {
      // Succede se il form resta aperto a lungo: si segna la data inviata che e' gia' passata
      const errori: ErroriEvento = {}
      if (passata(inviati.dataEvento)) errori.inizio = "L'inizio è già passato: scegli una data futura."
      if (passata(inviati.dataFine)) errori.fine = 'La fine è già passata: scegli una data futura.'
      return Object.keys(errori).length ? errori : { inizio: 'Le date devono essere nel futuro.' }
    }

    case 'EVENTO_GIA_INIZIATO':
      return { inizio: "L'evento è già iniziato: l'inizio non si può più cambiare. Puoi ancora spostare la fine." }

    case 'POI_FUORI_RAGGIO':
      return {
        posizione:
          'Qui alcuni punti della mappa interna (ingressi, uscite, emergenza) resterebbero a più di 2 km: spostali o cancellali prima di spostare l’evento.',
      }

    case 'VALIDAZIONE': {
      const errori: ErroriEvento = {}
      for (const [nome, messaggio] of Object.entries(campi)) {
        const campo = CAMPO[nome]
        if (campo && !errori[campo]) errori[campo] = messaggio
      }
      return Object.keys(errori).length ? errori : null
    }

    default:
      return null
  }
}
