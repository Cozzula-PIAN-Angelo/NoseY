package it.epicode.nosey.notification;

import it.epicode.nosey.event.Evento;
import it.epicode.nosey.friendship.Amicizia;
import it.epicode.nosey.ticket.PartecipanteRepository;
import it.epicode.nosey.user.Utente;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificheServiceImpl implements NotificheService {

	private final NotificaEventoRepository notificaEventoRepository;
	private final NotificaAmiciziaRepository notificaAmiciziaRepository;
	private final PartecipanteRepository partecipanteRepository;
	private final ApplicationEventPublisher eventi;
	private final Clock clock;

	@Override
	@Transactional
	public void notificaModifica(Evento evento, Set<ParteEvento> parti) {
		if (parti.isEmpty()) {
			return;
		}
		// Ordine fisso dell'enum, non quello del Set ricevuto.
		String elenco = parti.stream()
				.sorted()
				.map(ParteEvento::etichetta)
				.collect(Collectors.joining(", "));
		accorpa(evento, partecipanteRepository.trovaUtentiPerEvento(evento.getId()), TipoNotificaEvento.MODIFICA,
				"L'evento «" + evento.getTitolo() + "» è cambiato: " + elenco,
				"L'evento «" + evento.getTitolo() + "» è cambiato più volte: aprilo per vedere i dettagli");
	}

	@Override
	@Transactional
	public void notificaIscrizione(Evento evento) {
		// La count fa il flush del Partecipante appena salvato: il numero lo comprende gia'.
		String partecipanti = partecipanti(partecipanteRepository.countByEventoId(evento.getId()));
		accorpa(evento, List.of(evento.getProprietario()), TipoNotificaEvento.ISCRIZIONE,
				"Nuova iscrizione a «" + evento.getTitolo() + "»: ora " + partecipanti,
				"Nuove iscrizioni a «" + evento.getTitolo() + "»: ora " + partecipanti);
	}

	@Override
	@Transactional
	public int notificaManuale(Evento evento, String testo) {
		List<Utente> destinatari = partecipanteRepository.trovaUtentiPerEvento(evento.getId());
		crea(evento, destinatari, TipoNotificaEvento.MANUALE, testo.strip());
		return destinatari.size();
	}

	@Override
	@Transactional
	public void notificaAnnullamento(Evento evento) {
		crea(evento, partecipanteRepository.trovaUtentiPerEvento(evento.getId()), TipoNotificaEvento.ANNULLAMENTO,
				"L'evento «" + evento.getTitolo() + "» è stato annullato" + motivo(evento));
	}

	@Override
	@Transactional
	public void notificaFotoRimossa(Evento evento) {
		crea(evento, List.of(evento.getProprietario()), TipoNotificaEvento.MODERAZIONE,
				"Una foto del tuo evento «" + evento.getTitolo() + "» è stata rimossa dalla moderazione");
	}

	@Override
	@Transactional
	public void notificaAnnullataDaModerazione(Evento evento) {
		crea(evento, List.of(evento.getProprietario()), TipoNotificaEvento.MODERAZIONE,
				"Il tuo evento «" + evento.getTitolo() + "» è stato annullato dalla moderazione" + motivo(evento));
	}

	@Override
	@Transactional
	public void notificaRichiestaAmicizia(Amicizia amicizia) {
		creaAmicizia(amicizia, amicizia.getRicevente(), TipoNotificaAmicizia.RICHIESTA);
	}

	@Override
	@Transactional
	public void notificaAmiciziaAccettata(Amicizia amicizia) {
		creaAmicizia(amicizia, amicizia.getRichiedente(), TipoNotificaAmicizia.ACCETTATA);
	}

	/**
	 * Accorpamento (sezione 10, D10): a chi ha gia' una notifica dello stesso tipo NON letta per
	 * questo evento si aggiornano testo e creataIl di quella (stesso id); agli altri se ne crea una.
	 * Niente lock qui: chi chiama legge gia' l'evento con PESSIMISTIC_WRITE (sezione 0, Concorrenza).
	 */
	private void accorpa(Evento evento, List<Utente> destinatari, TipoNotificaEvento tipo,
			String testoNuova, String testoAccorpata) {
		Map<UUID, NotificaEvento> nonLette = notificaEventoRepository
				.findByEventoIdAndTipoAndLettaFalse(evento.getId(), tipo).stream()
				.collect(Collectors.toMap(n -> n.getDestinatario().getId(), Function.identity(),
						(a, b) -> a.getCreataIl().isAfter(b.getCreataIl()) ? a : b));
		Instant adesso = clock.instant();
		List<NotificaEvento> daSalvare = new ArrayList<>();
		for (Utente destinatario : destinatari) {
			NotificaEvento esistente = nonLette.get(destinatario.getId());
			if (esistente != null) {
				esistente.setTesto(testoAccorpata);
				esistente.setCreataIl(adesso);
				daSalvare.add(esistente);
			} else {
				daSalvare.add(nuova(evento, destinatario, tipo, testoNuova, adesso));
			}
		}
		pubblica(notificaEventoRepository.saveAll(daSalvare));
	}

	private void crea(Evento evento, List<Utente> destinatari, TipoNotificaEvento tipo, String testo) {
		Instant adesso = clock.instant();
		List<NotificaEvento> nuove = destinatari.stream()
				.map(destinatario -> nuova(evento, destinatario, tipo, testo, adesso))
				.toList();
		pubblica(notificaEventoRepository.saveAll(nuove));
	}

	private NotificaEvento nuova(Evento evento, Utente destinatario, TipoNotificaEvento tipo, String testo,
			Instant adesso) {
		NotificaEvento notifica = new NotificaEvento();
		notifica.setDestinatario(destinatario);
		notifica.setEvento(evento);
		notifica.setTipo(tipo);
		notifica.setTesto(testo);
		notifica.setCreataIl(adesso);
		return notifica;
	}

	private void pubblica(List<NotificaEvento> notifiche) {
		notifiche.forEach(n -> eventi.publishEvent(
				new NotificaLiveEvent(n.getDestinatario().getId(), NotificaResponse.da(n))));
	}

	private void creaAmicizia(Amicizia amicizia, Utente destinatario, TipoNotificaAmicizia tipo) {
		NotificaAmicizia notifica = new NotificaAmicizia();
		notifica.setDestinatario(destinatario);
		notifica.setAmicizia(amicizia);
		notifica.setTipo(tipo);
		notifica.setCreataIl(clock.instant());
		notifica = notificaAmiciziaRepository.save(notifica);
		// Il DTO si costruisce qui, dentro la transazione: dopo il commit i nomi non sarebbero leggibili.
		eventi.publishEvent(new NotificaLiveEvent(destinatario.getId(), NotificaResponse.da(notifica)));
	}

	private static String motivo(Evento evento) {
		String motivo = evento.getMotivoAnnullamento();
		return motivo == null || motivo.isBlank() ? "" : ": " + motivo.strip();
	}

	private static String partecipanti(long numero) {
		return numero == 1 ? "1 partecipante" : numero + " partecipanti";
	}
}
