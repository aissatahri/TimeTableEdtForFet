package com.example.timetable.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> { /* use CorsConfigurationSource bean */ })
            .csrf(csrf -> csrf.disable())
            .headers(headers ->
                headers.contentSecurityPolicy(csp ->
                    csp.policyDirectives("default-src 'self'; " +
                            "connect-src 'self' http://localhost:8081 http://localhost:4200 ws://localhost:4200; " +
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:4200; " +
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                            "font-src 'self' data: https://fonts.gstatic.com; " +
                            "img-src 'self' data: blob:; " +
                            "base-uri 'self'; frame-ancestors 'self'"))
            )
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:4200",           // Local development
            "https://astonishing-charm-production.up.railway.app",  // Railway frontend
            "http://localhost:8081"            // Local testing
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}