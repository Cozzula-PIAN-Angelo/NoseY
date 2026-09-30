package it.epicode.nosey.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TokenJwtRepository extends JpaRepository<TokenJwt, UUID> {
}
