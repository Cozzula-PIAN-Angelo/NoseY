-- Le immagini si salvano direttamente nel database (bytea), non su Cloudinary
-- (decisione 4, docs/decisioni.md): niente account/API esterna da configurare.

ALTER TABLE utente
    DROP CONSTRAINT ck_utente_immagine,
    DROP COLUMN immagine_profilo_url,
    DROP COLUMN immagine_profilo_public_id,
    ADD COLUMN immagine_profilo              bytea,
    ADD COLUMN immagine_profilo_content_type varchar(100),
    ADD CONSTRAINT ck_utente_immagine
        CHECK ((immagine_profilo IS NULL) = (immagine_profilo_content_type IS NULL));

ALTER TABLE foto_evento
    DROP COLUMN url,
    DROP COLUMN public_id,
    ADD COLUMN contenuto    bytea        NOT NULL,
    ADD COLUMN content_type varchar(100) NOT NULL;

ALTER TABLE artista
    DROP COLUMN immagine_url,
    ADD COLUMN immagine              bytea,
    ADD COLUMN immagine_content_type varchar(100),
    ADD CONSTRAINT ck_artista_immagine
        CHECK ((immagine IS NULL) = (immagine_content_type IS NULL));
