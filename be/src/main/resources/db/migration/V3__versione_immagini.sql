-- Versione di ogni immagine (decisione 9): parametro v dell'URL ed ETag del GET pubblico.
-- Salvata in una colonna, cosi' per costruire l'URL non serve leggere i byte (che le entita'
-- caricano solo quando servono). Stesso calcolo di VersioneContenuto: primi 16 caratteri dell'MD5.

ALTER TABLE utente
    ADD COLUMN immagine_profilo_versione varchar(16);
UPDATE utente
    SET immagine_profilo_versione = left(md5(immagine_profilo), 16)
    WHERE immagine_profilo IS NOT NULL;
ALTER TABLE utente
    ADD CONSTRAINT ck_utente_immagine_versione
        CHECK ((immagine_profilo IS NULL) = (immagine_profilo_versione IS NULL));

ALTER TABLE foto_evento
    ADD COLUMN versione varchar(16);
UPDATE foto_evento
    SET versione = left(md5(contenuto), 16);
ALTER TABLE foto_evento
    ALTER COLUMN versione SET NOT NULL;

ALTER TABLE artista
    ADD COLUMN immagine_versione varchar(16);
UPDATE artista
    SET immagine_versione = left(md5(immagine), 16)
    WHERE immagine IS NOT NULL;
ALTER TABLE artista
    ADD CONSTRAINT ck_artista_immagine_versione
        CHECK ((immagine IS NULL) = (immagine_versione IS NULL));
