package it.epicode.nosey.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatRepository extends JpaRepository<Chat, UUID> {

	// chatId di AmiciziaResponse: la chat della coppia, anche in sola lettura (sezione 8).
	@Query("select c.id from Chat c where c.amicizia.id = :amiciziaId")
	Optional<UUID> trovaIdPerAmicizia(UUID amiciziaId);

	// chatId delle liste di amicizie: una query per tutta la lista.
	List<Chat> findByAmiciziaIdIn(Collection<UUID> amicizieId);
}
