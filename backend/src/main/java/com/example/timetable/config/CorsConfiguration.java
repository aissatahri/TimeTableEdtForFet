package com.example.timetable.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfiguration {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        org.springframework.web.cors.CorsConfiguration config = new org.springframework.web.cors.CorsConfiguration();
        
        config.setAllowCredentials(true);
        // Read allowed origins from environment variable CORS_ORIGINS (comma-separated)
        String corsEnv = System.getenv("CORS_ORIGINS");
        if (corsEnv == null || corsEnv.isBlank()) {
            corsEnv = "http://localhost:4200";
        }
        String[] origins = corsEnv.split("\\s*,\\s*");
        for (String o : origins) {
            // Use origin patterns for wildcard or railway subdomains, otherwise add exact origin
            if (o.contains("*") || (o.startsWith("https://") && o.contains(".railway.app"))) {
                config.addAllowedOriginPattern(o);
            } else {
                config.addAllowedOrigin(o);
            }
        }
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        config.setMaxAge(3600L);
        
        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
}