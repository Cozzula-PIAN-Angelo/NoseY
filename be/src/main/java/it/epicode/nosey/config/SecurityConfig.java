package it.epicode.nosey.config;

import it.epicode.nosey.auth.JwtFilter;
import it.epicode.nosey.auth.TokenService;
import it.epicode.nosey.common.CodiceErrore;
import it.epicode.nosey.common.ErroreResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;

/**
 * Progettazione v4, sezione 14. Gli endpoint pubblici sono elencati uno per uno:
 * mai pattern generici come GET /api/events/**, renderebbero pubblici anche i partecipanti.
 */
@Configuration
public class SecurityConfig {

	private final JsonMapper jsonMapper;
	private final Clock clock;

	public SecurityConfig(JsonMapper jsonMapper, Clock clock) {
		this.jsonMapper = jsonMapper;
		this.clock = clock;
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http, TokenService tokenService) {
		http
				// Il token viaggia nell'header, non in un cookie: niente CSRF e niente sessione.
				.csrf(AbstractHttpConfigurer::disable)
				.cors(Customizer.withDefaults())
				.sessionManagement(sessione -> sessione.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.httpBasic(AbstractHttpConfigurer::disable)
				.formLogin(AbstractHttpConfigurer::disable)
				.logout(AbstractHttpConfigurer::disable)
				.authorizeHttpRequests(richieste -> richieste
						.requestMatchers(HttpMethod.POST,
								"/api/auth/register", "/api/auth/verify", "/api/auth/resend-code", "/api/auth/login",
								"/api/auth/password/forgot", "/api/auth/password/reset").permitAll()
						.requestMatchers(HttpMethod.GET,
								"/api/events", "/api/events/{id}", "/api/events/{id}/photos", "/api/events/{id}/pois",
								"/api/artists", "/api/artists/{artistaId}",
								// Avatar: un tag img non puo' mandare il token (decisione 9).
								"/api/users/{utenteId}/avatar",
								"/api/stato").permitAll()
						// /ws: l'autenticazione avviene sul CONNECT (sezione 11).
						// /error: altrimenti l'inoltro interno a /error diventa un 401 e il frontend fa logout.
						.requestMatchers("/ws/**", "/error").permitAll()
						.requestMatchers("/api/admin/**").hasRole("ADMIN")
						.requestMatchers("/api/superadmin/**").hasRole("SUPERADMIN")
						.anyRequest().authenticated())
				.exceptionHandling(errori -> errori
						.authenticationEntryPoint((request, response, e) -> scriviErrore(response,
								CodiceErrore.NON_AUTENTICATO, "Token mancante, scaduto o revocato"))
						.accessDeniedHandler((request, response, e) -> scriviErrore(response,
								CodiceErrore.ACCESSO_NEGATO, "Ruolo insufficiente per questa risorsa")))
				.addFilterBefore(new JwtFilter(tokenService), UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}

	/**
	 * Senza gerarchia un SUPERADMIN, che nel token ha solo ROLE_SUPERADMIN, riceverebbe 403
	 * su /api/admin/**. I nomi sono identici a RUOLO.nome.
	 */
	@Bean
	public static RoleHierarchy roleHierarchy() {
		return RoleHierarchyImpl.withDefaultRolePrefix()
				.role("SUPERADMIN").implies("ADMIN")
				.role("ADMIN").implies("USER")
				.build();
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	private void scriviErrore(HttpServletResponse response, CodiceErrore codice, String messaggio) throws IOException {
		response.setStatus(codice.getHttpStatus().value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		jsonMapper.writeValue(response.getOutputStream(), ErroreResponse.di(codice, messaggio, clock.instant()));
	}
}
