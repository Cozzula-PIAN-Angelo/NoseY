package it.epicode.nosey.auth;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TokenJwtRepository extends JpaRepository<TokenJwt, UUID> {
}
