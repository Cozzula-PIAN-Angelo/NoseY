package it.epicode.nosey.user;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Le righe (USER, ADMIN, SUPERADMIN) le inserisce la migrazione V1: nessun
 * endpoint le crea o le modifica. Il livello serve alla gerarchia (D16).
 */
@Entity
@Table(name = "ruolo")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Ruolo {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, length = 20)
	private String nome;

	@Column(nullable = false)
	private int livello;
}
