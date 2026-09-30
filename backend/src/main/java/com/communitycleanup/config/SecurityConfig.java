package com.communitycleanup.config;

import com.communitycleanup.security.JwtAuthenticationFilter;
import com.communitycleanup.security.RestAuthHandlers;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RestAuthHandlers restAuthHandlers;
    private final AppProperties appProperties;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(restAuthHandlers.entryPoint())
                        .accessDeniedHandler(restAuthHandlers.accessDeniedHandler()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login",
                                "/api/auth/forgot-password", "/api/auth/reset-password").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html",
                                "/actuator/health", "/actuator/info", "/uploads/**", "/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/participants", "/api/events/my-registrations").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events", "/api/events/*", "/api/events/*/feedback",
                                "/api/gallery", "/api/gallery/*", "/api/public/**", "/api/badges/catalog",
                                "/api/certificates/verify/*").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // Organiser-only operations are rejected before request bodies are even validated.
                        .requestMatchers(HttpMethod.POST, "/api/events", "/api/events/*/photos", "/api/gallery",
                                "/api/gallery/from-event/*").hasAnyRole("NGO", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/events/*").hasAnyRole("NGO", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/events/*", "/api/gallery/*").hasAnyRole("NGO", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/events/*/status",
                                "/api/events/*/participants/*/attendance").hasAnyRole("NGO", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/gallery/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/gallery/*/approval", "/api/users/*/status").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /** Prevent Spring Boot from also registering the JWT filter as a plain servlet filter. */
    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(JwtAuthenticationFilter filter) {
        FilterRegistrationBean<JwtAuthenticationFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = appProperties.cors().originList();
        if (origins.stream().anyMatch(o -> o.contains("*"))) {
            config.setAllowedOriginPatterns(origins);
        } else {
            config.setAllowedOrigins(origins);
        }
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        config.setExposedHeaders(List.of("Content-Disposition"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService userDetailsService, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(encoder);
        return provider::authenticate;
    }
}
