// Sequenza delle risposte di Spider-Man (simulata, niente backend). Funzioni pure: dato l'istante
// "ora" calcolano stato, messaggi visibili e indicatore "sta scrivendo". All'invio si programmano
// tutte le risposte con il loro momento: dopo un refresh basta ricalcolare, e i messaggi gia'
// "dovuti" compaiono subito.
import type { Archivio } from './archivio'
import {
  frasiArrivo,
  frasiChiusura,
  frasiReplica,
  frasiReplicaRisolta,
  scegliFrase,
  type GruppoFrasi,
} from './risposteSpiderMan'
import type { MessaggioRagnatela, NuovaSegnalazione, Segnalazione, StatoSegnalazione } from './tipi'

/** Prima risposta: l'indicatore "sta scrivendo" compare tra 2 e 4 secondi dopo l'invio */
const INIZIO_SCRITTURA_MIN = 2000
const INIZIO_SCRITTURA_MAX = 4000
/** Quanto "scrive" Spider-Man prima che arrivi il messaggio */
const DURATA_SCRITTURA = 1500
/** Messaggio di chiusura (RISOLTA) circa 25 secondi dopo l'invio */
const CHIUSURA_DOPO = 25_000
/** Risposta a un messaggio dell'utente: tra 2 e 4 secondi */
const REPLICA_MIN = 2000
const REPLICA_MAX = 4000

const traMinMax = (min: number, max: number) => min + Math.round(Math.random() * (max - min))

/** Messaggi gia' visibili all'istante "ora", in ordine di arrivo */
export function messaggiVisibili(s: Segnalazione, ora: number): MessaggioRagnatela[] {
  return s.messaggi.filter((m) => m.quando <= ora).sort((a, b) => a.quando - b.quando)
}

/** Stato all'istante "ora": quello dell'ultimo messaggio arrivato che lo cambia */
export function statoAl(s: Segnalazione, ora: number): StatoSegnalazione {
  let stato: StatoSegnalazione = 'APERTA'
  for (const m of messaggiVisibili(s, ora)) if (m.nuovoStato) stato = m.nuovoStato
  return stato
}

/** true se Spider-Man "sta scrivendo" un messaggio che non e' ancora arrivato */
export function staScrivendo(s: Segnalazione, ora: number): boolean {
  return s.messaggi.some((m) => m.autore === 'SPIDERMAN' && m.scriveDa !== undefined && m.scriveDa <= ora && ora < m.quando)
}

/** Prossimo istante in cui cambia qualcosa (inizio scrittura o arrivo di un messaggio), o null */
export function prossimoEvento(segnalazioni: Segnalazione[], ora: number): number | null {
  let prossimo: number | null = null
  for (const s of segnalazioni) {
    for (const m of s.messaggi) {
      for (const t of [m.scriveDa, m.quando]) {
        if (t !== undefined && t > ora && (prossimo === null || t < prossimo)) prossimo = t
      }
    }
  }
  return prossimo
}

/** Risposte di Spider-Man arrivate nell'intervallo (da, a]: servono per gli avvisi a comparsa */
export function risposteArrivateTra(segnalazioni: Segnalazione[], da: number, a: number) {
  return segnalazioni.flatMap((s) =>
    s.messaggi.filter((m) => m.autore === 'SPIDERMAN' && m.quando > da && m.quando <= a).map(() => s),
  )
}

// ---------- Creazione: sceglie le frasi e ricorda l'ultima usata per gruppo ----------

function frase(archivio: Archivio, gruppo: GruppoFrasi, s: Pick<Segnalazione, 'titolo' | 'categoria'>) {
  const { grezza, testo } = scegliFrase(gruppo, archivio.ultimeFrasi[gruppo.chiave], s)
  return { testo, ultimeFrasi: { ...archivio.ultimeFrasi, [gruppo.chiave]: grezza } }
}

/** Nuova segnalazione con le due risposte di Spider-Man gia' programmate (IN ARRIVO, poi RISOLTA) */
export function creaSegnalazione(archivio: Archivio, dati: NuovaSegnalazione, ora: number): { archivio: Archivio; nuova: Segnalazione } {
  const arrivo = frase(archivio, frasiArrivo(dati.categoria, dati.urgenza), dati)
  const chiusura = frase({ ...archivio, ultimeFrasi: arrivo.ultimeFrasi }, frasiChiusura, dati)
  const inizioScrittura = ora + traMinMax(INIZIO_SCRITTURA_MIN, INIZIO_SCRITTURA_MAX)

  const nuova: Segnalazione = {
    ...dati,
    id: crypto.randomUUID(),
    creata: ora,
    messaggi: [
      {
        id: crypto.randomUUID(),
        autore: 'SPIDERMAN',
        testo: arrivo.testo,
        scriveDa: inizioScrittura,
        quando: inizioScrittura + DURATA_SCRITTURA,
        nuovoStato: 'IN_ARRIVO',
      },
      {
        id: crypto.randomUUID(),
        autore: 'SPIDERMAN',
        testo: chiusura.testo,
        scriveDa: ora + CHIUSURA_DOPO - DURATA_SCRITTURA,
        quando: ora + CHIUSURA_DOPO,
        nuovoStato: 'RISOLTA',
      },
    ],
  }
  return {
    nuova,
    archivio: { segnalazioni: [nuova, ...archivio.segnalazioni], ultimeFrasi: chiusura.ultimeFrasi },
  }
}

/** Aggiunge il messaggio dell'utente e la replica di Spider-Man tra 2 e 4 secondi */
export function aggiungiRisposta(archivio: Archivio, id: string, testo: string, ora: number): Archivio {
  const s = archivio.segnalazioni.find((x) => x.id === id)
  if (!s) return archivio
  // Se la chiusura e' gia' arrivata la replica cambia tono (e lo stato resta RISOLTA)
  const gruppo = statoAl(s, ora) === 'RISOLTA' ? frasiReplicaRisolta : frasiReplica
  const replica = frase(archivio, gruppo, s)
  const quando = ora + traMinMax(REPLICA_MIN, REPLICA_MAX)

  const aggiornata: Segnalazione = {
    ...s,
    messaggi: [
      ...s.messaggi,
      { id: crypto.randomUUID(), autore: 'UTENTE', testo, quando: ora },
      {
        id: crypto.randomUUID(),
        autore: 'SPIDERMAN',
        testo: replica.testo,
        scriveDa: Math.max(ora + 600, quando - DURATA_SCRITTURA),
        quando,
      },
    ],
  }
  return {
    segnalazioni: archivio.segnalazioni.map((x) => (x.id === id ? aggiornata : x)),
    ultimeFrasi: replica.ultimeFrasi,
  }
}
