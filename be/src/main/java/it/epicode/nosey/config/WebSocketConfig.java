package it.epicode.nosey.config;

import it.epicode.nosey.auth.JwtChannelInterceptor;
import it.epicode.nosey.common.GestoreErroriStomp;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP su WebSocket nativo, senza SockJS (progettazione v4, sezione 11; decisione 11).
 * Il frontend manda SEND su /app/... e riceve sulle code dell'utente /user/queue/...
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	private final String[] origini;
	private final JwtChannelInterceptor jwtChannelInterceptor;
	private final GestoreErroriStomp gestoreErroriStomp;

	public WebSocketConfig(@Value("${app.cors.allowed-origins}") String[] origini,
			JwtChannelInterceptor jwtChannelInterceptor, GestoreErroriStomp gestoreErroriStomp) {
		this.origini = origini;
		this.jwtChannelInterceptor = jwtChannelInterceptor;
		this.gestoreErroriStomp = gestoreErroriStomp;
	}

	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
		// Il CorsConfig di MVC non vale per l'handshake: le origini vanno ripetute qui.
		registry.addEndpoint("/ws").setAllowedOriginPatterns(origini);
		registry.setErrorHandler(gestoreErroriStomp);
	}

	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		registry.enableSimpleBroker("/queue");
		registry.setApplicationDestinationPrefixes("/app");
		registry.setUserDestinationPrefix("/user");
	}

	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {
		registration.interceptors(jwtChannelInterceptor);
	}
}
