// Catalogo dei codici d'errore del backend (enum CodiceErrore, progettazione v4 sezione 0).
// Il frontend decide in base al CODICE, mai al testo di "messaggio": qui ogni codice ha
// il suo titolo e il suo messaggio per l'utente.
// Se il backend aggiunge un codice, va aggiunto anche qui: TypeScript segnala quelli mancanti.

export const CODICI_ERRORE = [
  // Generali
  'VALIDAZIONE',
  'RICHIESTA_VUOTA',
  'FILE_NON_VALIDO',
  'CATEGORIA_NON_VALIDA',
  'NON_AUTENTICATO',
  'ACCESSO_NEGATO',
  'NON_TROVATO',
  'CONFLITTO',
  'TROPPE_RICHIESTE',
  'ERRORE_INTERNO',
  'SERVIZIO_ESTERNO',
  // Auth
  'EMAIL_GIA_REGISTRATA',
  'GIA_VERIFICATO',
  'CODICE_NON_VALIDO',
  'CODICE_SCADUTO',
  'PASSWORD_ERRATA',
  'CREDENZIALI_ERRATE',
  'EMAIL_NON_VERIFICATA',
  'ACCOUNT_SOSPESO',
  // Utente
  'PASSWORD_UGUALE',
  'ULTIMO_SUPERADMIN',
  // Eventi
  'NON_PROPRIETARIO',
  'EVENTO_CONCLUSO',
  'EVENTO_ANNULLATO',
  'EVENTO_GIA_INIZIATO',
  'DATA_NON_FUTURA',
  'DATE_NON_VALIDE',
  'POI_FUORI_RAGGIO',
  'DESCRIZIONE_MANCANTE',
  // Foto e POI
  'LIMITE_FOTO',
  'COPERTINA_NON_VALIDA',
  'LIMITE_POI',
  'POI_TROPPO_LONTANO',
  // Artisti
  'ARTISTA_GIA_ASSOCIATO',
  'ARTISTA_NON_ATTIVO',
  'ARTISTA_NOME_GIA_USATO',
  'ARTISTA_IN_USO',
  // Partecipanti
  'PROPRIETARIO_NON_ISCRIVIBILE',
  'GIA_ISCRITTO',
  'NESSUN_TICKET',
  // Amicizie
  'RICHIESTA_A_SE_STESSO',
  'UTENTE_NON_ATTIVO',
  'RICHIESTA_GIA_INVIATA',
  'RICHIESTA_GIA_RICEVUTA',
  'GIA_AMICI',
  'AMICIZIA_NON_DISPONIBILE',
  'NON_RICEVENTE',
  'NON_RICHIEDENTE',
  'NON_IN_ATTESA',
  'NON_AMICI',
  // Chat (gli ultimi due arrivano solo sul WebSocket)
  'NON_MEMBRO',
  'CHAT_SOLA_LETTURA',
  'TOKEN_NON_VALIDO',
  // Admin
  'RUOLO_INSUFFICIENTE',
  'STATO_NON_AMMESSO',
  'UTENTE_ANONIMIZZATO',
  'RUOLO_NON_AMMESSO',
  'UTENTE_NON_VERIFICATO',
] as const

export type CodiceErrore = (typeof CODICI_ERRORE)[number]

export type TestoErrore = { titolo: string; messaggio: string }

export const TESTI_ERRORE: Record<CodiceErrore, TestoErrore> = {
  // Generali
  VALIDAZIONE: { titolo: 'Dati non validi', messaggio: 'Controlla i campi evidenziati e riprova.' },
  RICHIESTA_VUOTA: { titolo: 'Nessuna modifica', messaggio: 'Modifica almeno un campo prima di salvare.' },
  FILE_NON_VALIDO: {
    titolo: 'File non valido',
    messaggio: 'Scegli un file JPEG, PNG o WEBP che non superi la dimensione massima consentita.',
  },
  CATEGORIA_NON_VALIDA: { titolo: 'Categoria non valida', messaggio: 'La categoria di notifica richiesta non esiste.' },
  NON_AUTENTICATO: { titolo: 'Sessione scaduta', messaggio: 'Accedi di nuovo per continuare.' },
  ACCESSO_NEGATO: { titolo: 'Accesso negato', messaggio: 'Questa sezione è riservata agli amministratori.' },
  NON_TROVATO: { titolo: 'Non trovato', messaggio: 'Quello che cerchi non esiste o è stato rimosso.' },
  CONFLITTO: {
    titolo: 'Operazione non possibile',
    messaggio: 'I dati sono cambiati nel frattempo. Ricarica la pagina e riprova.',
  },
  TROPPE_RICHIESTE: { titolo: 'Troppe richieste', messaggio: 'Hai fatto troppi tentativi. Attendi un po’ e riprova.' },
  ERRORE_INTERNO: { titolo: 'Errore del server', messaggio: 'Si è verificato un problema imprevisto. Riprova tra poco.' },
  // Le immagini stanno nel database (Decisione 4): l'unico servizio esterno e' il provider AI
  SERVIZIO_ESTERNO: {
    titolo: 'Servizio AI non disponibile',
    messaggio: 'Il servizio di intelligenza artificiale non risponde. Riprova tra poco.',
  },

  // Auth
  EMAIL_GIA_REGISTRATA: {
    titolo: 'Email già registrata',
    messaggio: 'Esiste già un account con questa email. Prova ad accedere.',
  },
  GIA_VERIFICATO: { titolo: 'Account già verificato', messaggio: 'Il tuo account è già attivo: puoi accedere.' },
  CODICE_NON_VALIDO: { titolo: 'Codice non valido', messaggio: 'Il codice inserito non è corretto. Controlla l’email e riprova.' },
  CODICE_SCADUTO: {
    titolo: 'Codice scaduto',
    messaggio: 'Il codice è scaduto o hai esaurito i tentativi. Richiedine uno nuovo.',
  },
  PASSWORD_ERRATA: { titolo: 'Password errata', messaggio: 'La password inserita non è corretta.' },
  CREDENZIALI_ERRATE: { titolo: 'Accesso non riuscito', messaggio: 'Email o password non corrette.' },
  EMAIL_NON_VERIFICATA: {
    titolo: 'Email non verificata',
    messaggio: 'Inserisci il codice che ti abbiamo inviato via email per attivare l’account.',
  },
  ACCOUNT_SOSPESO: {
    titolo: 'Account sospeso',
    messaggio: 'Il tuo account è stato sospeso da un amministratore.',
  },

  // Utente
  PASSWORD_UGUALE: { titolo: 'Password uguale', messaggio: 'La nuova password deve essere diversa da quella attuale.' },
  ULTIMO_SUPERADMIN: {
    titolo: 'Operazione non consentita',
    messaggio: 'Sei l’unico superadmin: nomina un altro superadmin prima di eliminare il tuo account.',
  },

  // Eventi
  NON_PROPRIETARIO: { titolo: 'Operazione non consentita', messaggio: 'Solo chi ha creato l’evento può farlo.' },
  EVENTO_CONCLUSO: { titolo: 'Evento concluso', messaggio: 'L’evento è terminato: non si può più modificare.' },
  EVENTO_ANNULLATO: { titolo: 'Evento annullato', messaggio: 'L’evento è stato annullato: non si può più modificare.' },
  EVENTO_GIA_INIZIATO: {
    titolo: 'Evento già iniziato',
    messaggio: 'L’evento è in corso: non si possono cambiare la data d’inizio né annullare l’iscrizione.',
  },
  DATA_NON_FUTURA: { titolo: 'Data non valida', messaggio: 'La data dell’evento deve essere nel futuro.' },
  DATE_NON_VALIDE: { titolo: 'Date non valide', messaggio: 'La fine dell’evento deve essere successiva all’inizio.' },
  POI_FUORI_RAGGIO: {
    titolo: 'Posizione non valida',
    messaggio: 'Spostando l’evento qui alcuni punti di interesse resterebbero a più di 2 km. Spostali prima.',
  },
  DESCRIZIONE_MANCANTE: {
    titolo: 'Descrizione mancante',
    messaggio: 'Scrivi una descrizione prima di chiedere all’AI di migliorarla.',
  },

  // Foto e POI
  LIMITE_FOTO: { titolo: 'Limite di foto raggiunto', messaggio: 'Un evento può avere al massimo 10 foto.' },
  COPERTINA_NON_VALIDA: {
    titolo: 'Copertina non valida',
    messaggio: 'Per cambiare copertina scegli un’altra foto come nuova copertina.',
  },
  LIMITE_POI: { titolo: 'Limite di punti raggiunto', messaggio: 'Un evento può avere al massimo 15 punti di interesse.' },
  POI_TROPPO_LONTANO: {
    titolo: 'Punto troppo lontano',
    messaggio: 'Il punto di interesse deve trovarsi entro 2 km dall’evento.',
  },

  // Artisti
  ARTISTA_GIA_ASSOCIATO: { titolo: 'Artista già presente', messaggio: 'Questo artista è già nella line-up dell’evento.' },
  ARTISTA_NON_ATTIVO: { titolo: 'Artista non disponibile', messaggio: 'Questo artista non è più attivo nel catalogo.' },
  ARTISTA_NOME_GIA_USATO: { titolo: 'Nome già usato', messaggio: 'Esiste già un artista con questo nome.' },
  ARTISTA_IN_USO: {
    titolo: 'Artista in uso',
    messaggio: 'L’artista è associato ad almeno un evento: rimuovilo dagli eventi prima di eliminarlo.',
  },

  // Partecipanti
  PROPRIETARIO_NON_ISCRIVIBILE: {
    titolo: 'Iscrizione non possibile',
    messaggio: 'Non puoi iscriverti a un evento che hai creato tu.',
  },
  GIA_ISCRITTO: { titolo: 'Sei già iscritto', messaggio: 'Trovi il tuo ticket in I Miei Ticket.' },
  NESSUN_TICKET: {
    titolo: 'Serve un ticket',
    messaggio: 'Iscriviti all’evento per vedere i partecipanti e chiedere l’amicizia.',
  },

  // Amicizie
  RICHIESTA_A_SE_STESSO: { titolo: 'Richiesta non valida', messaggio: 'Non puoi chiedere l’amicizia a te stesso.' },
  UTENTE_NON_ATTIVO: { titolo: 'Utente non disponibile', messaggio: 'Questo utente non è più attivo.' },
  RICHIESTA_GIA_INVIATA: {
    titolo: 'Richiesta già inviata',
    messaggio: 'Hai già chiesto l’amicizia a questo utente: attendi la sua risposta.',
  },
  RICHIESTA_GIA_RICEVUTA: {
    titolo: 'Hai già una richiesta',
    messaggio: 'Questo utente ti ha già chiesto l’amicizia: accettala dalle richieste ricevute.',
  },
  GIA_AMICI: { titolo: 'Siete già amici', messaggio: 'Puoi scrivergli direttamente in chat.' },
  AMICIZIA_NON_DISPONIBILE: {
    titolo: 'Amicizia non disponibile',
    messaggio: 'Questo utente ha rimosso l’amicizia: solo lui può riaprirla.',
  },
  NON_RICEVENTE: { titolo: 'Operazione non consentita', messaggio: 'Solo chi ha ricevuto la richiesta può rispondere.' },
  NON_RICHIEDENTE: { titolo: 'Operazione non consentita', messaggio: 'Solo chi ha inviato la richiesta può ritirarla.' },
  NON_IN_ATTESA: { titolo: 'Richiesta già gestita', messaggio: 'Questa richiesta di amicizia non è più in attesa.' },
  NON_AMICI: { titolo: 'Non siete amici', messaggio: 'Non c’è un’amicizia attiva da rimuovere.' },

  // Chat
  NON_MEMBRO: { titolo: 'Chat non disponibile', messaggio: 'Questa chat non ti appartiene.' },
  CHAT_SOLA_LETTURA: {
    titolo: 'Chat in sola lettura',
    messaggio: 'Non puoi più scrivere in questa chat: l’amicizia non è attiva o l’utente non è più attivo.',
  },
  TOKEN_NON_VALIDO: { titolo: 'Connessione scaduta', messaggio: 'La sessione della chat è scaduta: accedi di nuovo.' },

  // Admin
  RUOLO_INSUFFICIENTE: {
    titolo: 'Operazione non consentita',
    messaggio: 'Puoi agire solo su utenti con un ruolo inferiore al tuo, e mai su te stesso.',
  },
  STATO_NON_AMMESSO: { titolo: 'Stato non valido', messaggio: 'Lo stato può essere solo Attivo o Sospeso.' },
  UTENTE_ANONIMIZZATO: {
    titolo: 'Utente anonimizzato',
    messaggio: 'L’account è stato eliminato: non si può più modificare.',
  },
  RUOLO_NON_AMMESSO: { titolo: 'Ruolo non valido', messaggio: 'Il ruolo può essere solo Utente o Admin.' },
  UTENTE_NON_VERIFICATO: {
    titolo: 'Utente non verificato',
    messaggio: 'L’utente deve prima verificare la sua email.',
  },
}

export function isCodiceErrore(valore: unknown): valore is CodiceErrore {
  return typeof valore === 'string' && (CODICI_ERRORE as readonly string[]).includes(valore)
}
