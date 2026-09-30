package it.epicode.nosey.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Attiva i metodi @Scheduled (es. la pulizia dei token scaduti in TokenService).
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
