package it.epicode.nosey.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import it.epicode.nosey.user.Utente;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Emissione, verifica e revoca dei JWT (progettazione v4, sezioni 0 e 14).
 * Ogni token emesso ha una riga in TOKEN_JWT: il jti revocato lo rende inutilizzabile
 * anche prima della scadenza.
 */
@Service
public class TokenService {

	private static final Logger log = LoggerFactory.getLogger(TokenService.class);
	private static final String CLAIM_RUOLO = "ruolo";

	private final TokenJwtRepository tokenJwtRepository;
	private final Clock clock;
	private final SecretKey chiave;
	private final Duration durata;

	public TokenService(TokenJwtRepository tokenJwtRepository, Clock clock,
			@Value("${app.jwt.secret}") String segreto, @Value("${app.jwt.durata}") Duration durata) {
		this.tokenJwtRepository = tokenJwtRepository;
		this.clock = clock;
		// HS256 vuole almeno 32 byte: con un segreto piu' corto l'app non parte (WeakKeyException).
		// L'algoritmo e' fissato in emetti(): senza, jjwt lo sceglierebbe dalla lunghezza del segreto.
		this.chiave = Keys.hmacShaKeyFor(segreto.getBytes(StandardCharsets.UTF_8));
		this.durata = durata;
	}

	@Transactional
	public TokenEmesso emetti(Utente utente) {
		// Nel JWT le date sono in secondi: si tronca qui, cosi' la scadenza salvata coincide.
		Instant adesso = clock.instant().truncatedTo(ChronoUnit.SECONDS);
		Instant scadenza = adesso.plus(durata);
		UUID jti = UUID.randomUUID();

		String token = Jwts.builder()
				.subject(utente.getId().toString())
				.id(jti.toString())
				.claim(CLAIM_RUOLO, utente.getRuolo().getNome())
				.issuedAt(Date.from(adesso))
				.expiration(Date.from(scadenza))
				.signWith(chiave, Jwts.SIG.HS256)
				.compact();

		TokenJwt riga = new TokenJwt();
		riga.setUtente(utente);
		riga.setJti(jti);
		riga.setScadenza(scadenza);
		riga.setCreatoIl(adesso);
		tokenJwtRepository.save(riga);

		return new TokenEmesso(token, scadenza);
	}

	/**
	 * Token valido = firma corretta, non scaduto e jti non revocato. In ogni altro caso
	 * Optional vuoto: chi chiama decide se e' un 401 (JwtFilter non lo decide mai).
	 */
	@Transactional(readOnly = true)
	public Optional<UtenteAutenticato> verifica(String token) {
		try {
			Claims claims = Jwts.parser()
					.verifyWith(chiave)
					.clock(() -> Date.from(clock.instant()))
					.build()
					.parseSignedClaims(token)
					.getPayload();

			UUID jti = UUID.fromString(claims.getId());
			if (!tokenJwtRepository.existsByJtiAndRevocatoFalse(jti)) {
				return Optional.empty();
			}
			return Optional.of(new UtenteAutenticato(
					UUID.fromString(claims.getSubject()),
					claims.get(CLAIM_RUOLO, String.class),
					jti,
					claims.getExpiration().toInstant()));
		} catch (JwtException | IllegalArgumentException e) {
			return Optional.empty();
		}
	}

	@Transactional
	public void revoca(UUID jti) {
		tokenJwtRepository.revocaPerJti(jti);
	}

	@Transactional
	public void revocaTutti(UUID utenteId) {
		tokenJwtRepository.revocaTuttiPerUtente(utenteId);
	}

	/**
	 * Su Render il servizio si sospende quando non riceve traffico: un orario fisso (cron)
	 * potrebbe non capitare mai. fixedDelay gira subito all'avvio e poi ogni 24 ore.
	 */
	@Scheduled(fixedDelay = 24, timeUnit = TimeUnit.HOURS)
	@Transactional
	public void cancellaScaduti() {
		int cancellati = tokenJwtRepository.cancellaScaduti(clock.instant());
		log.info("Pulizia token: {} token scaduti cancellati", cancellati);
	}
}
