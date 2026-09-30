package it.epicode.nosey.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Legge il token dall'header Authorization. Token assente o non valido: NON risponde 401,
 * prosegue senza autenticazione (progettazione v4, sezione 14). Il 401 lo da'
 * l'AuthenticationEntryPoint, e solo sugli endpoint protetti: cosi' un token vecchio
 * rimasto nel frontend non blocca le pagine pubbliche.
 *
 * Non e' un @Component: Spring Boot lo registrerebbe anche come filtro servlet, e girerebbe due volte.
 */
public class JwtFilter extends OncePerRequestFilter {

	private static final String PREFISSO = "Bearer ";

	private final TokenService tokenService;

	public JwtFilter(TokenService tokenService) {
		this.tokenService = tokenService;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String header = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (header != null && header.startsWith(PREFISSO)) {
			tokenService.verifica(header.substring(PREFISSO.length()).strip())
					.ifPresent(utente -> SecurityContextHolder.getContext().setAuthentication(
							UsernamePasswordAuthenticationToken.authenticated(
									utente, null, List.of(new SimpleGrantedAuthority("ROLE_" + utente.ruolo())))));
		}
		chain.doFilter(request, response);
	}
}
