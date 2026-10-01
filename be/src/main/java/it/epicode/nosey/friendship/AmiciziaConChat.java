package it.epicode.nosey.friendship;

import java.util.UUID;

/** Una riga della coppia con l'id della sua chat (null se non c'e'), letti con una sola query. */
public record AmiciziaConChat(Amicizia amicizia, UUID chatId) {
}
