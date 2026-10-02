# Report di sicurezza — NoseY

**Data:** 2 ottobre 2026
**Ambito:** valutazione delle vulnerabilità **SQL injection (SQLi)** e **Cross-Site Scripting (XSS)**
**Metodologia:** revisione di sicurezza *white-box* (analisi del codice sorgente di frontend e backend)
**Oggetto:** repository NoseY — frontend (`fe/`, React + Vite + TypeScript) e backend (`be/`, Spring Boot + JPA/Hibernate + PostgreSQL)

> **Aggiornamento (2 ottobre 2026).** La **Parte II** in fondo al documento aggiunge la *verifica
> dinamica* — gli stessi payload inviati davvero a un'istanza in esecuzione, come raccomandato qui
> sotto — e due classi d'attacco ulteriori: **CSRF** e **attacchi all'autenticazione**.

> **Nota sul metodo.** La valutazione è stata condotta leggendo il codice sorgente (analisi statica),
> non inviando payload d'attacco a un server in esecuzione (analisi dinamica). Per un progetto di
> queste dimensioni l'analisi statica è conclusiva sui due temi trattati, perché SQLi e XSS si
> prevengono o si introducono proprio nel modo in cui il codice costruisce le query e mostra i
> contenuti. Un test dinamico (es. con OWASP ZAP o sqlmap su un'istanza locale) resta consigliato
> come verifica complementare: vista l'implementazione, ci si attende esito negativo.

---

## 1. Sintesi

| Vulnerabilità | Esito | Gravità residua |
|---|---|---|
| SQL injection | **Non presente** | Nessuna |
| Cross-Site Scripting (XSS) | **Non presente** | Nessuna |

Entrambe le classi di attacco **fallirebbero**. Il codice adotta in modo sistematico le difese
corrette: query parametrizzate per il database, escape automatico dei contenuti nell'interfaccia.
Non sono stati rilevati interventi necessari; vengono indicati solo alcuni rafforzamenti facoltativi
(sezione 4).

---

## 2. SQL injection

### 2.1 Cosa è stato verificato

Tutti i punti in cui un dato fornito dall'utente raggiunge il database: autenticazione, ricerca
utenti del pannello admin, e ogni query dei repository (comprese quelle native).

### 2.2 Risultati

Il backend **non costruisce mai query concatenando l'input dell'utente**. I valori viaggiano
separati dal testo SQL tramite parametri, quindi un apice (`'`), un commento (`--`) o una parola
chiave SQL restano **dati**, non diventano comandi.

| Punto | Implementazione | Rischio |
|---|---|---|
| Login (`UtenteRepository.findByEmail`) | `@Query` con parametro nominato `:email` | Nessuno |
| Ricerca utenti admin (`?search=`) | Criteria API (`cb.like`) con parametro legato | Nessuno |
| Tutte le altre `@Query` (JPQL) | solo parametri nominati (`:id`, `:chatId`, …) | Nessuno |
| 2 query native SQL (messaggi, notifiche chat) | parametri nominati, nessuna concatenazione | Nessuno |

**Dettaglio positivo.** La ricerca utenti applica anche una funzione `escapeLike()` che tratta i
caratteri `%` e `_` come testo normale. Non è una difesa anti-SQLi (quella è già garantita dai
parametri), ma evita che l'utente usi i caratteri jolly del `LIKE`: è una rifinitura corretta.

### 2.3 Esempi di payload che fallirebbero

Inseriti nel campo email del login, verrebbero trattati come una normale credenziale errata:

```
' OR '1'='1
admin@nosey.it' --
x' UNION SELECT NULL--
x'; DROP TABLE utente;--
x' OR pg_sleep(3)--
```

---

## 3. Cross-Site Scripting (XSS)

### 3.1 Cosa è stato verificato

Tutti i punti in cui un contenuto fornito dall'utente viene mostrato: testi liberi (titoli e
descrizioni degli eventi, messaggi di chat, nomi, notifiche), URL di immagini e link, ed email HTML.

### 3.2 Risultati

| Vettore | Situazione |
|---|---|
| `dangerouslySetInnerHTML` | **Mai usato** nel frontend |
| `innerHTML`, `document.write`, `eval`, `new Function` | **Mai usati** |
| Testi liberi (descrizione, messaggi, nomi, notifiche) | resi come `{testo}` in JSX → **escape automatico di React** |
| Link | solo `<Link>` di React Router; nessun `<a href>` con dati utente (niente `javascript:`) |
| Email HTML (backend, template Thymeleaf) | tutti con `th:text` (escape attivo), **nessun `th:utext`** |

Il punto chiave è che **React, per impostazione predefinita, tratta ogni testo come testo e non come
HTML**. Finché non si usa `dangerouslySetInnerHTML` (assente in tutto il progetto), l'XSS è evitato
alla radice. Le email, l'altro punto classico di XSS memorizzato, usano l'escape in ogni template.

### 3.3 Esempi di payload che fallirebbero

Inseriti in un titolo evento, in una descrizione o in un messaggio di chat, verrebbero mostrati come
testo e non eseguiti:

```
<script>alert(document.cookie)</script>
<img src=x onerror=alert(1)>
```

---

## 4. Raccomandazioni (facoltative, difesa in profondità)

Nessun intervento è necessario per correggere una vulnerabilità. Le seguenti note aumentano
ulteriormente la robustezza, come buona pratica:

1. **`urlImmagine()` (frontend, `fe/src/lib/api.ts`).** Oggi un URL che non inizia con `/` viene
   usato così com'è. Non è sfruttabile — questi valori finiscono solo in `<img src>`, dove i browser
   non eseguono `javascript:`, e provengono dal backend, non da testo libero. Per pulizia si
   potrebbe accettare esclusivamente `http(s):`, `data:` e `blob:`. *Priorità: bassa.*

2. **Header `Content-Security-Policy` (backend, `SecurityConfig`).** Una CSP restrittiva impedisce
   l'esecuzione di script non previsti anche nel caso in cui, in futuro, venisse introdotta una
   falla. È la rete di sicurezza consigliata per le applicazioni web. *Priorità: media, come
   miglioramento futuro.*

3. **Test dinamico periodico.** Affiancare all'analisi del codice una scansione automatica
   (OWASP ZAP, sqlmap) su un'istanza locale, soprattutto dopo modifiche agli endpoint.

---

## 5. Conclusione

Alla data della revisione, NoseY risulta **non vulnerabile** a SQL injection e a Cross-Site
Scripting. Le difese adottate — query parametrizzate lato backend ed escape automatico dei contenuti
lato frontend ed email — sono quelle raccomandate dalle linee guida OWASP per queste due classi di
vulnerabilità. Le raccomandazioni della sezione 4 sono rafforzativi facoltativi e non correzioni.

> Valutazione svolta sull'applicazione del team in ambiente locale, a scopo didattico e difensivo.

---
---

# Parte II — Verifica dinamica e attacchi aggiuntivi

**Data:** 2 ottobre 2026
**Ambito:** verifica *dinamica* delle due vulnerabilità della Parte I (SQLi, XSS) più due classi
d'attacco ulteriori: **CSRF** e **attacchi all'autenticazione** (brute force, furto credenziali,
enumerazione utenti).
**Metodologia:** test *black/grey-box* — payload reali inviati a un'istanza in esecuzione: backend su
`localhost:8080` (profilo di sviluppo) e frontend sui dati finti (`VITE_DATI_FINTI=true`).

> **Rapporto con la Parte I.** La Parte I (analisi del codice) concludeva "nessuna vulnerabilità" e
> raccomandava un test dinamico come verifica complementare. Questa Parte II è quel test: conferma sul
> campo i risultati su SQLi e XSS ed estende la valutazione a CSRF e autenticazione. Tutte le prove
> sono state eseguite in locale, sull'applicazione del team, a scopo difensivo.

---

## 6. Sintesi della Parte II

| Attacco | Prova dinamica | Esito |
|---|---|---|
| SQL injection | payload nel login e nella ricerca | **Respinto** — nessuna iniezione |
| Cross-Site Scripting (XSS) | `<script>` / `<img onerror>` in un messaggio di chat | **Respinto** — reso come testo |
| CSRF | `POST /api/events` da un'origine esterna, senza token | **Respinto** — `403` |
| Autenticazione | brute force, lettura hash nel DB, enumerazione | **Respinto** — `429`, BCrypt, risposte identiche |

Nessuna vulnerabilità rilevata su nessuna delle quattro classi. Di seguito il dettaglio.

---

## 7. SQL injection — verifica dinamica

**Login.** Payload classici nel campo email, con il server in esecuzione:

| Payload (campo `email`) | Risposta |
|---|---|
| `' OR '1'='1` | `400 VALIDAZIONE` |
| `admin'--` | `400 VALIDAZIONE` |
| `' OR 1=1--` | `400 VALIDAZIONE` |

Il bypass non avviene: il valore viene scartato già dalla validazione del formato email, e comunque
raggiungerebbe il database solo come parametro legato.

**Ricerca artisti (`GET /api/artists?search=`).** I payload sono stati trattati come testo da cercare:

| Payload (`search=`) | Risposta | Risultati |
|---|---|---|
| `rock` | `200` | 0 |
| `' OR '1'='1` | `200` | 0 |
| `'; DROP TABLE utente;--` | `200` | 0 |
| `x' UNION SELECT password_hash FROM utente--` | `200` | 0 |

Dopo i payload `DROP TABLE` e `UNION SELECT`, un controllo diretto sul database ha confermato che la
tabella `utente` era **intatta** e che **nessun hash di password** era trapelato nella risposta.

## 8. Cross-Site Scripting (XSS) — verifica dinamica

Prova dal vivo nella chat (frontend sui dati finti). In un messaggio è stato inviato il payload:

```
<img src=x onerror="window.__xssFired=true"><script>window.__xssFired=true</script>
```

Risultato:

- il messaggio è comparso in chat **come testo**, con i tag visibili e non interpretati;
- la variabile sentinella `window.__xssFired` è rimasta **`false`**: lo script non è partito;
- nel DOM **non** è stato creato alcun tag `<img>` o `<script>` a partire dal payload.

Conferma dinamica di quanto rilevato nella Parte I: React applica l'escape automatico e il contenuto
dell'utente non diventa mai HTML eseguibile.

---

## 9. CSRF (Cross-Site Request Forgery)

### 9.1 Prova

Simulata la richiesta che farebbe un sito malevolo: una scrittura verso l'API con un'origine esterna
e **senza** header `Authorization` (che un altro sito non può aggiungere né leggere dal `localStorage`
di NoseY):

```
POST http://localhost:8080/api/events
Origin: https://sito-malevolo.example
(nessun header Authorization)
```

**Risposta: `403 Forbidden`.** L'evento non è stato creato.

### 9.2 Perché NoseY è immune

| Elemento | In NoseY | Effetto |
|---|---|---|
| Dove sta il token | header `Authorization: Bearer …` | il browser **non** lo allega da solo a una richiesta cross-site |
| Sessione | `STATELESS`, nessun cookie di sessione | non c'è nulla che il browser invii automaticamente |
| `localStorage` | leggibile solo dall'origine di NoseY | un altro dominio non può rubarne il token |

In `SecurityConfig.java` la protezione CSRF di Spring è disattivata (`.csrf(disable)`): **non è una
falla**, perché quella protezione serve solo all'autenticazione basata su cookie/sessione, che qui non
si usa. Il commento nel codice lo dichiara esplicitamente.

### 9.3 Approfondimento: due difese indipendenti, non una sola

Isolando i due elementi della richiesta in 9.1 (header `Origin` esterno + assenza di `Authorization`),
il `403` si scompone in realtà in due controlli separati, ciascuno sufficiente da solo a bloccare
l'attacco:

| Variante della richiesta | Risposta | Chi la blocca |
|---|---|---|
| Con `Origin` esterno (come in 9.1) | **`403`**, corpo testuale `Invalid CORS request` | CORS di Spring, prima ancora del controllo di autenticazione |
| Senza header `Origin` | **`401 NON_AUTENTICATO`** (il JSON di errore standard) | `JwtFilter` / `SecurityConfig`, per assenza di `Authorization` |
| Con un `Cookie` finto al posto di `Authorization` | **`401 NON_AUTENTICATO`** | `JwtFilter` ignora i cookie, legge solo `Authorization` |

Verificato anche che `POST /api/auth/login` non manda mai un header `Set-Cookie`, e che la stessa
identica richiesta **riesce** (`201`, evento creato) con un token vero — a conferma che il blocco non
è un difetto generico dell'endpoint, ma specifico alla richiesta forgiata.

**Materiale di supporto**, nel repository:
- `be/src/test/java/it/epicode/nosey/auth/AttaccoCsrfTest.java` — 5 test automatici (MockMvc, catena
  di filtri reale) che riproducono tutte le varianti della tabella sopra, più il controllo positivo;
- `docs/sicurezza/attacco-csrf-demo.html` — la pagina ostile vera, con un `fetch()` che tenta
  l'attacco dal vivo in un browser; aperta con il backend locale attivo, non ha creato nessun evento
  (verificato interrogando `GET /api/events` subito dopo, non solo leggendo l'esito a schermo);
- `docs/sicurezza/attacco-csrf.md` — narrazione completa del tentativo, incluso il perché il primo
  risultato (CORS, non autenticazione) non era quello atteso all'inizio.

---

## 10. Attacchi all'autenticazione

### 10.1 Brute force / credential stuffing

Inviati 12 tentativi di login consecutivi con password errata sulla stessa email:

| Tentativi | Risposta |
|---|---|
| dal 1° al 10° | `401 CREDENZIALI_ERRATE` |
| dall'11° in poi | `429 TROPPE_RICHIESTE` |

Il limite è definito in `application.yml` (`app.limiti.login-falliti`): **10 tentativi falliti per
email ogni 15 minuti**. Superata la soglia, il `429` scatta anche con la password corretta, rendendo
impraticabile provare molte password in sequenza.

### 10.2 Password salvate nel database

Lettura diretta della colonna `password_hash`: le password sono salvate con **BCrypt** (prefisso
`$2a$10$`, 60 caratteri), non in chiaro. BCrypt è volutamente lento e con *salt*, quindi anche in caso
di furto del database le password non sono ricavabili con un costo ragionevole. Il codice usa
`BCryptPasswordEncoder` (`SecurityConfig.java`) e limita la password a 72 byte, il limite reale di
BCrypt.

### 10.3 Enumerazione utenti

Login con password errata su un'email **inesistente** e su un'email **esistente**: la risposta è
**identica** in entrambi i casi (`401 CREDENZIALI_ERRATE`, messaggio «Email o password errate»), quindi
non si riesce a dedurre quali email siano registrate. Gli stati «email non verificata» e «account
sospeso» vengono rivelati **solo dopo** una password corretta, perciò non sono sfruttabili per
l'enumerazione.

### 10.4 Durata del token

I token JWT **scadono** (24 ore, `JWT_DURATA` in `application.yml` / `render.yaml`): un token rubato
non è valido per sempre. Il logout, inoltre, **revoca** il token lato server.

---

## 11. Nota di trasparenza sul test

Durante la prova di brute force è stata usata un'email *di prova* (`bruteforce-test@example.com`) per
non bloccare account reali. Un singolo tentativo della sezione 10.3 ha usato un'email reale del team,
aggiungendo **1** tentativo fallito al suo contatore (su 10 disponibili): nessun blocco, e il
contatore si azzera dopo 15 minuti o al primo accesso riuscito. Tutte le prove sono state svolte in
locale, sull'applicazione del team, a scopo didattico e difensivo.

---

## 12. Conclusione della Parte II

La verifica dinamica **conferma** i risultati della Parte I su SQL injection e XSS e li **estende** a
CSRF e agli attacchi all'autenticazione: su tutte e quattro le classi NoseY si è comportato come
atteso, respingendo gli attacchi. Le difese in gioco — query parametrizzate, escape automatico di
React, token nell'header anziché nei cookie, BCrypt con *rate limit* e token a scadenza — sono quelle
raccomandate dalle linee guida OWASP. Restano valide le raccomandazioni facoltative della sezione 4
(in particolare l'header `Content-Security-Policy` come difesa in profondità).
