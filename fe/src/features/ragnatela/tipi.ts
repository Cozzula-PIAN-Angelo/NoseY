// Tipi della Modalita' Ragnatela (easter egg, Decisione 25). Solo frontend: niente DTO del backend,
// i dati restano nel localStorage del browser (archivio.ts).
import type { Coordinate } from '@/components/mappa'

export type Categoria =
  | 'INCIDENTE'
  | 'PERSONA_IN_PERICOLO'
  | 'CRIMINE_IN_CORSO'
  | 'INCENDIO'
  | 'ANIMALE_IN_DIFFICOLTA'
  | 'ALTRO'

export type Urgenza = 'BASSA' | 'MEDIA' | 'ALTA'

export type StatoSegnalazione = 'APERTA' | 'IN_ARRIVO' | 'RISOLTA'

export type AutoreMessaggio = 'UTENTE' | 'SPIDERMAN'

/**
 * Messaggio della conversazione. Le risposte di Spider-Man si scrivono gia' all'invio, con il
 * momento in cui devono comparire: cosi' dopo un refresh i tempi riprendono da dove erano.
 */
export type MessaggioRagnatela = {
  id: string
  autore: AutoreMessaggio
  testo: string
  /** Millisecondi (Date.now()) da cui il messaggio e' visibile */
  quando: number
  /** Da quando mostrare "Spider-Man sta scrivendo…" (solo per i suoi messaggi) */
  scriveDa?: number
  /** Stato della segnalazione da quando il messaggio compare */
  nuovoStato?: StatoSegnalazione
}

export type Segnalazione = {
  id: string
  titolo: string
  descrizione: string
  categoria: Categoria
  urgenza: Urgenza
  punto: Coordinate
  /** Millisecondi (Date.now()) dell'invio */
  creata: number
  messaggi: MessaggioRagnatela[]
}

export type NuovaSegnalazione = Pick<Segnalazione, 'titolo' | 'descrizione' | 'categoria' | 'urgenza' | 'punto'>

export const LIMITE_TITOLO = 150
export const LIMITE_DESCRIZIONE = 1000
export const LIMITE_RISPOSTA = 500

// Classi scritte per intero: Tailwind genera solo le classi che trova cosi' nel codice.
export const CATEGORIE: Record<Categoria, { etichetta: string; icona: string }> = {
  INCIDENTE: { etichetta: 'Incidente', icona: 'car_crash' },
  PERSONA_IN_PERICOLO: { etichetta: 'Persona in pericolo', icona: 'sos' },
  CRIMINE_IN_CORSO: { etichetta: 'Crimine in corso', icona: 'local_police' },
  INCENDIO: { etichetta: 'Incendio', icona: 'local_fire_department' },
  ANIMALE_IN_DIFFICOLTA: { etichetta: 'Animale in difficoltà', icona: 'pets' },
  ALTRO: { etichetta: 'Altro', icona: 'help' },
}

/** Barrette accese e colore, come l'indicatore di urgenza di Stitch (3 barrette) */
export const URGENZE: Record<Urgenza, { etichetta: string; barre: number; colore: string }> = {
  BASSA: { etichetta: 'Bassa', barre: 1, colore: 'bg-(--rg-oro)' },
  MEDIA: { etichetta: 'Media', barre: 2, colore: 'bg-(--rg-blu)' },
  ALTA: { etichetta: 'Alta', barre: 3, colore: 'bg-(--rg-rosso)' },
}

/** Stile dello stato: icona + testo (mai solo il colore). I colori del testo sono per le card bianche */
export const STATI: Record<
  StatoSegnalazione,
  { etichetta: string; icona: string; testo: string; sfondo: string; bordo: string; rombo: string }
> = {
  APERTA: {
    etichetta: 'Aperta',
    icona: 'emergency_home',
    testo: 'text-(--rg-rosso)',
    sfondo: 'bg-(--rg-rosso)/12',
    bordo: 'border-(--rg-rosso)',
    rombo: 'bg-(--rg-rosso) shadow-[0_0_15px_var(--rg-rosso)]',
  },
  IN_ARRIVO: {
    etichetta: 'In arrivo',
    icona: 'bolt',
    testo: 'text-(--rg-oro-testo)',
    sfondo: 'bg-(--rg-oro)/15',
    bordo: 'border-(--rg-oro)',
    rombo: 'bg-(--rg-oro) shadow-[0_0_15px_var(--rg-oro)]',
  },
  RISOLTA: {
    etichetta: 'Risolta',
    icona: 'task_alt',
    testo: 'text-(--rg-verde-scuro)',
    sfondo: 'bg-(--rg-verde)/15',
    bordo: 'border-(--rg-verde)',
    rombo: 'bg-(--rg-verde) shadow-[0_0_12px_var(--rg-verde)]',
  },
}
