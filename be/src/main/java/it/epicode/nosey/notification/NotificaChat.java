package it.epicode.nosey.notification;

import it.epicode.nosey.chat.Chat;
import it.epicode.nosey.user.Utente;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifica_chat",
		uniqueConstraints = @UniqueConstraint(name = "uq_notifica_chat", columnNames = {"destinatario_id", "chat_id"}))
@Getter
@Setter
public class NotificaChat {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "destinatario_id", nullable = false)
	private Utente destinatario;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "chat_id", nullable = false)
	private Chat chat;

	@Column(nullable = false)
	private boolean letta = false;

	@Column(name = "aggiornata_il", nullable = false)
	private Instant aggiornataIl;
}
