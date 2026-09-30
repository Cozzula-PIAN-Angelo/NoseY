package it.epicode.nosey.common;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * "Adesso" si calcola una volta per richiesta da questo Clock iniettato
 * (progettazione v4, sezione 0), cosi' nei test si puo' sostituire con uno fisso.
 */
@Configuration
public class ClockConfig {

	@Bean
	public Clock clock() {
		return Clock.systemUTC();
	}
}
