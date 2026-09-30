package it.epicode.nosey.common;

import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Limiti di frequenza in memoria (progettazione v4, sezione 0, decisione 6): per ogni limite e
 * ogni chiave (email, id dell'utente o dell'evento) si tengono gli istanti degli eventi dentro
 * la finestra, che scorre. Si azzerano a ogni riavvio: accettabile con una sola istanza.
 *
 * Uso tipico: consuma() al punto del 429 nell'ordine dei controlli. Il login usa invece
 * controlla/registra/azzera, perche' contano solo i tentativi falliti.
 */
@Service
public class LimitiService {

	private final Clock clock;
	private final Map<Limite, Regola> regole = new EnumMap<>(Limite.class);
	private final Map<Limite, Map<String, Deque<Instant>>> registri = new EnumMap<>(Limite.class);

	public LimitiService(Clock clock, Environment environment) {
		this.clock = clock;
		Map<Limite, Regola> lette = Binder.get(environment)
				.bind("app.limiti", Bindable.mapOf(Limite.class, Regola.class))
				.orElse(Map.of());
		// Un limite senza configurazione valida ferma l'avvio, invece di non limitare niente.
		for (Limite limite : Limite.values()) {
			Regola regola = lette.get(limite);
			if (regola == null || regola.massimo() < 1 || regola.finestra() == null
					|| regola.finestra().isNegative() || regola.finestra().isZero()) {
				throw new IllegalStateException("Configurazione mancante o non valida per app.limiti."
						+ limite.name().toLowerCase().replace('_', '-'));
			}
			regole.put(limite, regola);
			registri.put(limite, new ConcurrentHashMap<>());
		}
	}

	/**
	 * Controlla e registra in un solo passo (atomico per chiave): 429 se il limite e' gia' raggiunto.
	 */
	public void consuma(Limite limite, String chiave) {
		Instant adesso = clock.instant();
		Regola regola = regole.get(limite);
		boolean[] superato = {false};
		registri.get(limite).compute(chiave, (k, eventi) -> {
			Deque<Instant> recenti = recenti(eventi, adesso, regola);
			if (recenti.size() >= regola.massimo()) {
				superato[0] = true;
			} else {
				recenti.addLast(adesso);
			}
			return recenti.isEmpty() ? null : recenti;
		});
		if (superato[0]) {
			throw troppeRichieste();
		}
	}

	/**
	 * 429 se il limite e' gia' raggiunto, senza registrare niente.
	 */
	public void controlla(Limite limite, String chiave) {
		Instant adesso = clock.instant();
		Regola regola = regole.get(limite);
		boolean[] superato = {false};
		registri.get(limite).computeIfPresent(chiave, (k, eventi) -> {
			Deque<Instant> recenti = recenti(eventi, adesso, regola);
			superato[0] = recenti.size() >= regola.massimo();
			return recenti.isEmpty() ? null : recenti;
		});
		if (superato[0]) {
			throw troppeRichieste();
		}
	}

	/**
	 * Registra un evento senza controllare il limite (es. un login fallito).
	 */
	public void registra(Limite limite, String chiave) {
		Instant adesso = clock.instant();
		Regola regola = regole.get(limite);
		registri.get(limite).compute(chiave, (k, eventi) -> {
			Deque<Instant> recenti = recenti(eventi, adesso, regola);
			recenti.addLast(adesso);
			// Oltre il massimo non serve ricordare altro: la memoria per chiave resta limitata.
			while (recenti.size() > regola.massimo()) {
				recenti.pollFirst();
			}
			return recenti;
		});
	}

	public void azzera(Limite limite, String chiave) {
		registri.get(limite).remove(chiave);
	}

	/**
	 * Toglie le chiavi senza eventi recenti: senza, la mappa crescerebbe con ogni email provata.
	 */
	@Scheduled(fixedDelay = 10, timeUnit = TimeUnit.MINUTES)
	public void pulisciScaduti() {
		Instant adesso = clock.instant();
		registri.forEach((limite, perChiave) -> {
			Regola regola = regole.get(limite);
			perChiave.keySet().forEach(chiave -> perChiave.computeIfPresent(chiave, (k, eventi) -> {
				Deque<Instant> recenti = recenti(eventi, adesso, regola);
				return recenti.isEmpty() ? null : recenti;
			}));
		});
	}

	/**
	 * Toglie dalla coda gli eventi usciti dalla finestra. Va chiamato solo dentro compute(),
	 * che rende atomiche le operazioni sulla stessa chiave.
	 */
	private static Deque<Instant> recenti(Deque<Instant> eventi, Instant adesso, Regola regola) {
		Deque<Instant> coda = eventi == null ? new ArrayDeque<>() : eventi;
		Instant inizioFinestra = adesso.minus(regola.finestra());
		while (!coda.isEmpty() && !coda.peekFirst().isAfter(inizioFinestra)) {
			coda.pollFirst();
		}
		return coda;
	}

	private static ApplicazioneException troppeRichieste() {
		return new ApplicazioneException(CodiceErrore.TROPPE_RICHIESTE, "Troppe richieste: riprova piu' tardi");
	}

	public record Regola(int massimo, Duration finestra) {
	}
}
