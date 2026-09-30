-- Tipi enumerati
CREATE TYPE stato_utente        AS ENUM ('ATTIVO', 'SOSPESO', 'ANONIMIZZATO');
CREATE TYPE scopo_codice        AS ENUM ('VERIFICA_EMAIL', 'RESET_PASSWORD');
CREATE TYPE stato_evento        AS ENUM ('PROGRAMMATO', 'ANNULLATO');
CREATE TYPE tipo_poi            AS ENUM ('INGRESSO', 'USCITA', 'EMERGENZA');
CREATE TYPE stato_amicizia      AS ENUM ('PENDENTE', 'ACCETTATA', 'RIFIUTATA', 'RIMOSSA', 'RITIRATA');
CREATE TYPE tipo_notif_evento   AS ENUM ('MODIFICA', 'MANUALE', 'ISCRIZIONE', 'ANNULLAMENTO', 'MODERAZIONE');
CREATE TYPE tipo_notif_amicizia AS ENUM ('RICHIESTA', 'ACCETTATA');

-- Utenti
CREATE TABLE ruolo (
    id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome     varchar(20) NOT NULL,
    livello  int         NOT NULL,
    CONSTRAINT uq_ruolo_nome    UNIQUE (nome),
    CONSTRAINT uq_ruolo_livello UNIQUE (livello)
);
INSERT INTO ruolo (nome, livello) VALUES ('USER', 1), ('ADMIN', 2), ('SUPERADMIN', 3);

CREATE TABLE utente (
    id                          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    ruolo_id                    uuid         NOT NULL REFERENCES ruolo (id),
    email                       varchar(255) NOT NULL,            -- sempre minuscola
    password_hash               varchar(100) NOT NULL,
    nome                        varchar(100) NOT NULL,
    cognome                     varchar(100) NOT NULL,
    indirizzo                   varchar(255),
    data_nascita                date,                             -- NULL solo dopo l'anonimizzazione
    immagine_profilo_url        text,
    immagine_profilo_public_id  varchar(255),
    verificato                  boolean      NOT NULL DEFAULT false,
    stato                       stato_utente NOT NULL DEFAULT 'ATTIVO',
    codice                      varchar(6),
    codice_scopo                scopo_codice,
    codice_inviato_il           timestamptz,
    codice_tentativi            int          NOT NULL DEFAULT 0,
    invii_codice                int          NOT NULL DEFAULT 0,
    invii_codice_dal            timestamptz,
    creato_il                   timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_utente_email    UNIQUE (email),
    CONSTRAINT ck_utente_codice   CHECK ((codice IS NULL) = (codice_scopo IS NULL)),
    CONSTRAINT ck_utente_immagine CHECK ((immagine_profilo_url IS NULL) = (immagine_profilo_public_id IS NULL))
);
CREATE INDEX ix_utente_ruolo ON utente (ruolo_id);

CREATE TABLE token_jwt (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    utente_id  uuid        NOT NULL REFERENCES utente (id),
    jti        uuid        NOT NULL,
    scadenza   timestamptz NOT NULL,
    revocato   boolean     NOT NULL DEFAULT false,
    creato_il  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_token_jti UNIQUE (jti)
);
CREATE INDEX ix_token_utente   ON token_jwt (utente_id);
CREATE INDEX ix_token_scadenza ON token_jwt (scadenza);   -- pulizia dei token scaduti

-- Eventi
CREATE TABLE evento (
    id                   uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
    proprietario_id      uuid             NOT NULL REFERENCES utente (id),
    titolo               varchar(150)     NOT NULL,
    descrizione          varchar(5000),
    data_evento          timestamptz      NOT NULL,
    data_fine            timestamptz      NOT NULL,
    lat                  double precision NOT NULL,
    lng                  double precision NOT NULL,
    stato                stato_evento     NOT NULL DEFAULT 'PROGRAMMATO',
    motivo_annullamento  varchar(500),
    creato_il            timestamptz      NOT NULL DEFAULT now(),
    CONSTRAINT ck_evento_date CHECK (data_fine > data_evento),
    CONSTRAINT ck_evento_lat  CHECK (lat BETWEEN -90 AND 90),
    CONSTRAINT ck_evento_lng  CHECK (lng BETWEEN -180 AND 180)
);
CREATE INDEX ix_evento_proprietario ON evento (proprietario_id);
CREATE INDEX ix_evento_mappa        ON evento (stato, data_fine);

CREATE TABLE foto_evento (
    id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id    uuid         NOT NULL REFERENCES evento (id),
    url          text         NOT NULL,
    public_id    varchar(255) NOT NULL,
    didascalia   varchar(150),
    copertina    boolean      NOT NULL DEFAULT false,
    caricata_il  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX ix_foto_evento ON foto_evento (evento_id, caricata_il);
CREATE UNIQUE INDEX uq_foto_copertina ON foto_evento (evento_id) WHERE copertina;  -- max una copertina

CREATE TABLE poi (
    id         uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id  uuid             NOT NULL REFERENCES evento (id),
    tipo       tipo_poi         NOT NULL,
    lat        double precision NOT NULL,
    lng        double precision NOT NULL,
    etichetta  varchar(50),
    creato_il  timestamptz      NOT NULL DEFAULT now(),
    CONSTRAINT ck_poi_lat CHECK (lat BETWEEN -90 AND 90),
    CONSTRAINT ck_poi_lng CHECK (lng BETWEEN -180 AND 180)
);
CREATE INDEX ix_poi_evento ON poi (evento_id);

CREATE TABLE artista (
    id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          varchar(100) NOT NULL,
    immagine_url  varchar(500),
    attivo        boolean      NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX uq_artista_nome ON artista (lower(nome));

CREATE TABLE artista_evento (
    evento_id   uuid NOT NULL REFERENCES evento (id),
    artista_id  uuid NOT NULL REFERENCES artista (id),
    CONSTRAINT pk_artista_evento PRIMARY KEY (evento_id, artista_id)
);
CREATE INDEX ix_artista_evento_artista ON artista_evento (artista_id);

CREATE TABLE partecipante (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    utente_id  uuid        NOT NULL REFERENCES utente (id),
    evento_id  uuid        NOT NULL REFERENCES evento (id),
    codice     uuid        NOT NULL,                          -- codice del ticket
    emesso_il  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_partecipante        UNIQUE (utente_id, evento_id),
    CONSTRAINT uq_partecipante_codice UNIQUE (codice)
);
CREATE INDEX ix_partecipante_evento ON partecipante (evento_id);

-- Social
CREATE TABLE amicizia (
    id                    uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    richiedente_id        uuid           NOT NULL REFERENCES utente (id),
    ricevente_id          uuid           NOT NULL REFERENCES utente (id),
    evento_id             uuid           NOT NULL REFERENCES evento (id),
    stato                 stato_amicizia NOT NULL DEFAULT 'PENDENTE',
    chiusa_da             uuid           REFERENCES utente (id),
    richiesta_mascherata  boolean        NOT NULL DEFAULT false,
    creata_il             timestamptz    NOT NULL DEFAULT now(),
    aggiornata_il         timestamptz    NOT NULL DEFAULT now(),
    CONSTRAINT ck_amicizia_diversi    CHECK (richiedente_id <> ricevente_id),
    CONSTRAINT ck_amicizia_chiusa     CHECK ((stato IN ('RIFIUTATA', 'RIMOSSA')) = (chiusa_da IS NOT NULL)),
    CONSTRAINT ck_amicizia_mascherata CHECK (NOT richiesta_mascherata OR stato = 'RIFIUTATA')
);
CREATE UNIQUE INDEX uq_amicizia_coppia
    ON amicizia (LEAST(richiedente_id, ricevente_id), GREATEST(richiedente_id, ricevente_id));
CREATE INDEX ix_amicizia_richiedente ON amicizia (richiedente_id, stato);
CREATE INDEX ix_amicizia_ricevente   ON amicizia (ricevente_id, stato);

CREATE TABLE chat (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    amicizia_id  uuid        NOT NULL REFERENCES amicizia (id),
    creata_il    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_chat_amicizia UNIQUE (amicizia_id)
);

CREATE TABLE messaggio (
    id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id      uuid          NOT NULL REFERENCES chat (id),
    mittente_id  uuid          NOT NULL REFERENCES utente (id),
    testo        varchar(2000) NOT NULL,
    letto        boolean       NOT NULL DEFAULT false,
    inviato_il   timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX ix_messaggio_chat ON messaggio (chat_id, inviato_il DESC, id DESC);

-- Notifiche
CREATE TABLE notifica_evento (
    id               uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
    destinatario_id  uuid              NOT NULL REFERENCES utente (id),
    evento_id        uuid              NOT NULL REFERENCES evento (id),
    tipo             tipo_notif_evento NOT NULL,
    testo            text              NOT NULL,             -- mai nomi di persone
    letta            boolean           NOT NULL DEFAULT false,
    creata_il        timestamptz       NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifica_evento ON notifica_evento (destinatario_id, creata_il DESC);

CREATE TABLE notifica_amicizia (
    id               uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
    destinatario_id  uuid                NOT NULL REFERENCES utente (id),
    amicizia_id      uuid                NOT NULL REFERENCES amicizia (id),
    tipo             tipo_notif_amicizia NOT NULL,
    letta            boolean             NOT NULL DEFAULT false,
    creata_il        timestamptz         NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifica_amicizia ON notifica_amicizia (destinatario_id, creata_il DESC);

CREATE TABLE notifica_chat (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    destinatario_id  uuid        NOT NULL REFERENCES utente (id),
    chat_id          uuid        NOT NULL REFERENCES chat (id),
    letta            boolean     NOT NULL DEFAULT false,
    aggiornata_il    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_notifica_chat UNIQUE (destinatario_id, chat_id)
);
