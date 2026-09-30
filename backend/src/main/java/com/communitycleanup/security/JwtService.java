package com.communitycleanup.security;

import com.communitycleanup.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Date;

@Slf4j
@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32;

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(AppProperties properties, Environment environment) {
        this.expirationMs = properties.jwt().expirationMs();
        this.key = resolveKey(properties.jwt().secret(), environment);
    }

    private static SecretKey resolveKey(String secret, Environment environment) {
        if (secret == null || secret.isBlank()) {
            if (environment.acceptsProfiles(Profiles.of("prod"))) {
                throw new IllegalStateException("JWT_SECRET must be set in production");
            }
            log.warn("JWT_SECRET is not set; using a random development key. Tokens will not survive restarts.");
            byte[] random = new byte[48];
            new SecureRandom().nextBytes(random);
            return Keys.hmacShaKeyFor(random);
        }
        byte[] bytes;
        try {
            bytes = Decoders.BASE64.decode(secret);
        } catch (RuntimeException notBase64) {
            bytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (bytes.length < MIN_SECRET_BYTES) {
            bytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes long");
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    public String generateToken(UserPrincipal principal) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(principal.getId()))
                .claim("email", principal.getEmail())
                .claim("role", principal.getRole().name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    /**
     * Parses and validates a token. Throws {@link io.jsonwebtoken.ExpiredJwtException} for expired tokens and
     * {@link io.jsonwebtoken.JwtException} for any other invalid token.
     */
    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    public long getExpirationMs() {
        return expirationMs;
    }
}
