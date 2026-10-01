package it.epicode.nosey.chat;

import java.util.UUID;

/** Numero di messaggi dell'altro non letti in una chat, letti per tutta la lista con una query. */
public record NonLettiPerChat(UUID chatId, long numero) {
}
