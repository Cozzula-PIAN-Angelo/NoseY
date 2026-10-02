// Repertorio delle risposte di Spider-Man (Modalita' Ragnatela): ironiche ma rassicuranti.
// Segnaposto sostituiti al momento: {titolo} = titolo della segnalazione, {categoria} = categoria
// in minuscolo. Ogni gruppo ha la sua chiave: l'ultima frase usata per chiave sta nell'archivio,
// cosi' la stessa frase non esce due volte di fila.
import { CATEGORIE, type Categoria, type Urgenza } from './tipi'

/** Prima risposta, quando Spider-Man prende in carico la segnalazione */
const ARRIVO: Record<Categoria, { normale: string[]; alta: string[] }> = {
  INCIDENTE: {
    normale: [
      'Ricevuto! "{titolo}": arrivo con la prossima liana. Nessuno si muova, soprattutto le auto.',
      'Incidente segnalato, ragnatela in carica. Tieniti a distanza di sicurezza: le acrobazie lasciale a me.',
      'Ci sono. Qualche filo per segnalare il traffico e due per rimettere in strada tutti. Due minuti.',
      'Segnalazione ricevuta. Ho già il casco… ah no, io ho la maschera. Comunque arrivo.',
    ],
    alta: [
      'Urgenza alta, ricevuto! Mollo tutto, anche il panino. Arrivo su "{titolo}" adesso.',
      'Sto già oscillando verso di te. Se ci sono feriti non spostarli: alla parte tecnica ci penso io.',
      'Priorità massima. Il mio senso di ragno sta urlando: tieni duro, sono quasi lì.',
    ],
  },
  PERSONA_IN_PERICOLO: {
    normale: [
      'Ricevuto! Di\' a chi è in difficoltà che il suo amichevole Spider-Man di quartiere sta arrivando.',
      '"{titolo}": ci penso io. Resta in vista e, se puoi, rassicura la persona. Lo stai già facendo bene.',
      'Messaggio arrivato forte e chiaro. Ragnatela di sicurezza pronta, arrivo in un lampo.',
      'Niente paura, nessuno resta appeso da solo: quello è il mio lavoro. Sto arrivando.',
    ],
    alta: [
      'Urgenza alta! Sto saltando tra i tetti più veloce che posso. Resta con la persona, arrivo.',
      'Nessun panico: il panico lo faccio io, ma in silenzio. Sto arrivando su "{titolo}".',
      'Priorità massima ricevuta. Non perdere di vista la persona: a prenderla al volo ci penso io.',
    ],
  },
  CRIMINE_IN_CORSO: {
    normale: [
      'Ricevuto! I cattivi di "{titolo}" stanno per scoprire quanto è appiccicosa la giustizia.',
      'Non intervenire, mi raccomando: tu hai fatto la parte importante. Il resto lo lego io.',
      'Segnalazione ricevuta. Preparo un bel pacchetto regalo per la polizia: fiocco di ragnatela incluso.',
      'Arrivo. Se qualcuno scappa, tranquillo: ho una mira eccellente con i fili.',
    ],
    alta: [
      'Urgenza alta! Allontanati e mettiti al sicuro: sto arrivando a velocità ragno.',
      'Ricevuto, priorità massima. Ai cattivi di "{titolo}" restano pochi secondi di libertà.',
      'Il senso di ragno mi ha svegliato prima del tuo messaggio. Sto già scendendo in picchiata.',
    ],
  },
  INCENDIO: {
    normale: [
      'Ricevuto! Allontanati dal fumo: arrivo, e ho già avvisato chi l\'acqua la porta davvero.',
      '"{titolo}": sto arrivando. La mia ragnatela non brucia… credo. Diciamo che la testiamo insieme.',
      'Segnalazione ricevuta. Esci e resta all\'aperto, al resto pensiamo io e i pompieri.',
      'Ci sono. Prometto di non fare battute sul fuoco finché non è spento. Forse.',
    ],
    alta: [
      'Urgenza alta! Stai lontano dal fuoco e chiama i soccorsi veri se non l\'hai già fatto. Io arrivo.',
      'Priorità massima. Sto oscillando controvento per arrivare prima: tieniti al sicuro.',
      'Ricevuto, "{titolo}" ha la precedenza su tutto. Nessuno torni dentro, entro io se serve.',
    ],
  },
  ANIMALE_IN_DIFFICOLTA: {
    normale: [
      'Ricevuto! Arrivo per "{titolo}". Gli animali mi adorano… tranne i gatti, ma ci lavoriamo.',
      'Segnalazione ricevuta. Ho portato una ragnatela extra morbida, apposta.',
      'Ci penso io. Parlagli con calma se puoi: io intanto preparo l\'atterraggio più delicato della mia carriera.',
      'Sto arrivando! Nessun cucciolo resta bloccato nel mio quartiere.',
    ],
    alta: [
      'Urgenza alta! Tieni d\'occhio il nostro amico a quattro zampe, sto arrivando a tutta velocità.',
      'Priorità massima per "{titolo}". Arrivo: niente movimenti bruschi, lo spaventeremmo.',
      'Ricevuto! Lo so, è una questione seria. Sto già saltando tra i tetti.',
    ],
  },
  ALTRO: {
    normale: [
      'Ricevuto! Non so bene cosa sia "{titolo}", ma so che sto arrivando.',
      'Segnalazione registrata. Il mio senso di ragno è perplesso, però è anche curioso. Arrivo.',
      'Ci penso io. Grandi poteri, grandi responsabilità… anche per le cose strane.',
      'Messaggio ricevuto. Tieni duro, il tuo amichevole Spider-Man di quartiere è in viaggio.',
    ],
    alta: [
      'Urgenza alta, ricevuto! Non so cosa troverò, ma sto arrivando di corsa.',
      'Priorità massima per "{titolo}". Resta al sicuro e aspettami lì.',
      'Il senso di ragno dice che è serio. Sto arrivando subito.',
    ],
  },
}

/** Messaggio di chiusura, quando la segnalazione diventa RISOLTA */
const CHIUSURA = [
  'Fatto! "{titolo}" è sistemato. Grazie per avermi avvisato: senza occhi come i tuoi la città è più grande.',
  "Missione compiuta. Ho lasciato qualche filo in giro, ma si scioglie da solo in un'ora. Più o meno.",
  'Tutto risolto. Nessun ferito, nessun danno, solo un po\' di ragnatela da spolverare.',
  'Risolto! Se rivedi qualcosa di strano, sai dove trovarmi: appeso da qualche parte qui intorno.',
  "Caso chiuso ({categoria}). Torno di pattuglia: grazie per l'aiuto, collega di quartiere!",
  'Fatto, e senza strappare il costume. Oggi è una bella giornata.',
]

/** Risposta a un messaggio dell'utente mentre la segnalazione e' ancora aperta */
const REPLICA = [
  'Ricevuto, me lo segno sul polso. Sì, ho un taccuino lì.',
  'Grazie, informazione preziosa. Mi sto avvicinando.',
  'Capito! Continua a tenermi aggiornato, ma resta al sicuro.',
  'Perfetto, così so dove atterrare senza fare figuracce.',
  'Ok! Il senso di ragno conferma: stai facendo la cosa giusta.',
  'Messaggio ricevuto, rispondo con una mano sola: l\'altra mi serve per la liana.',
]

/** Risposta a un messaggio dell'utente quando la segnalazione e' gia' risolta */
const REPLICA_RISOLTA = [
  'Di niente! È per questo che esisto. Beh, anche per la pizza.',
  'Questa è chiusa, ma se serve sono sempre qui intorno.',
  'Grazie a te! Una città si protegge anche segnalando.',
  'Ricevuto. Se succede altro apri una nuova segnalazione: arrivo.',
]

export type GruppoFrasi = { chiave: string; frasi: string[] }

export function frasiArrivo(categoria: Categoria, urgenza: Urgenza): GruppoFrasi {
  const alta = urgenza === 'ALTA'
  return {
    chiave: `arrivo.${categoria}.${alta ? 'alta' : 'normale'}`,
    frasi: alta ? ARRIVO[categoria].alta : ARRIVO[categoria].normale,
  }
}

export const frasiChiusura: GruppoFrasi = { chiave: 'chiusura', frasi: CHIUSURA }
export const frasiReplica: GruppoFrasi = { chiave: 'replica', frasi: REPLICA }
export const frasiReplicaRisolta: GruppoFrasi = { chiave: 'replica.risolta', frasi: REPLICA_RISOLTA }

/**
 * Sceglie una frase a caso dal gruppo, diversa dall'ultima usata, e ne sostituisce i segnaposto.
 * Restituisce anche la frase grezza, da salvare come "ultima" per quel gruppo.
 */
export function scegliFrase(
  gruppo: GruppoFrasi,
  ultima: string | undefined,
  valori: { titolo: string; categoria: Categoria },
  caso: () => number = Math.random,
): { grezza: string; testo: string } {
  const possibili = gruppo.frasi.length > 1 ? gruppo.frasi.filter((f) => f !== ultima) : gruppo.frasi
  const grezza = possibili[Math.floor(caso() * possibili.length)] ?? gruppo.frasi[0]
  const testo = grezza
    .replaceAll('{titolo}', valori.titolo)
    .replaceAll('{categoria}', CATEGORIE[valori.categoria].etichetta.toLowerCase())
  return { grezza, testo }
}
