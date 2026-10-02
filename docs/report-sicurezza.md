# Report di sicurezza — NoseY

**Data:** 2 ottobre 2026
**Ambito:** valutazione delle vulnerabilità **SQL injection (SQLi)** e **Cross-Site Scripting (XSS)**
**Metodologia:** revisione di sicurezza *white-box* (analisi del codice sorgente di frontend e backend)
**Oggetto:** repository NoseY — frontend (`fe/`, React + Vite + TypeScript) e backend (`be/`, Spring Boot + JPA/Hibernate + PostgreSQL)

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
