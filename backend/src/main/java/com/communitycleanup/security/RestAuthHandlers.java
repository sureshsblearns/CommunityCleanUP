package com.communitycleanup.security;

import com.communitycleanup.dto.common.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** JSON 401/403 responses in the standard API envelope instead of Spring's default HTML/empty bodies. */
@Component
@RequiredArgsConstructor
public class RestAuthHandlers {

    private final ObjectMapper objectMapper;

    public AuthenticationEntryPoint entryPoint() {
        return (request, response, ex) -> {
            Object detail = request.getAttribute(JwtAuthenticationFilter.AUTH_ERROR_ATTRIBUTE);
            write(response, HttpServletResponse.SC_UNAUTHORIZED,
                    detail != null ? detail.toString() : "Authentication is required to access this resource");
        };
    }

    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, ex) -> write(response, HttpServletResponse.SC_FORBIDDEN,
                "You do not have permission to perform this action");
    }

    private void write(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), ApiResponse.error(message));
    }
}
