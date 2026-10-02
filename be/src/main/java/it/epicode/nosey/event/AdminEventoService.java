package it.epicode.nosey.event;

import it.epicode.nosey.common.ApplicazioneException;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.notification.NotificheService;
import it.epicode.nosey.user.AdminUtenteService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

/**
 * RimuoviFotoModerazione, AnnullaEventoModerazione (progettazione v4, sezione 12): solo ADMIN.
 * Il percorso /api/admin/events/** e' gia' protetto da SecurityConfig; la regola D16 (ruolo
 * inferiore, mai su se stessi) e' in AdminUtenteService.verificaRuoloInferiore, condivisa con
 * la moderazione degli utenti.
 */
@Service
@RequiredArgsConstructor
public class AdminEventoService {

	private final EventoRepository eventoRepository;
	private final FotoEventoRepository fotoEventoRepository;
	private final FotoService fotoService;
	private final NotificheService notificheService;
	private final AdminUtenteService adminUtenteService;
	private final Clock clock;

	// Vale anche su eventi conclusi o annullati: niente controllaScrivibile qui.
	@Transactional
	public void rimuoviFoto(UUID eventoId, UUID fotoId, UUID adminId) {
		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		adminUtenteService.verificaRuoloInferiore(adminId, evento.getProprietario());
		FotoEvento foto = fotoEventoRepository.findByIdAndEventoId(fotoId, eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Foto non trovata"));

		fotoService.eliminaFoto(evento, foto);
		notificheService.notificaFotoRimossa(evento);
	}

	@Transactional
	public void annulla(UUID eventoId, String motivo, UUID adminId) {
		Evento evento = eventoRepository.findConLockById(eventoId)
				.orElseThrow(() -> new ApplicazioneException(CodiceErrore.NON_TROVATO, "Evento non trovato"));
		adminUtenteService.verificaRuoloInferiore(adminId, evento.getProprietario());
		StatoEvento.controllaScrivibile(evento, clock.instant());

		evento.setStato(StatoEventoDb.ANNULLATO);
		evento.setMotivoAnnullamento(motivo.strip());
		notificheService.notificaAnnullataDaModerazione(evento);
		notificheService.notificaAnnullamento(evento);
	}
}
