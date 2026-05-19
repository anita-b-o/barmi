package com.barmi.app.security;

import com.barmi.app.config.ObservabilitySupport;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    public static final String AUTH_FAILURE_REASON_ATTRIBUTE = "barmi.auth.failureReason";
    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring("Bearer ".length()).trim();
            JwtService.ParseResult parseResult = jwtService.parseToken(token);
            Claims claims = parseResult.claims();
            if (claims != null) {
                String subject = claims.getSubject();
                String email = claims.get("email", String.class);
                UUID userId = parseUuid(subject);

                if (userId == null || email == null) {
                    recordAuthFailure(request, "invalid_token");
                } else {
                    Optional<User> user = userRepository.findById(userId);
                    if (user.isEmpty()) {
                        recordAuthFailure(request, "user_not_found");
                    } else if (user.get().getStatus() != UserStatus.ACTIVE) {
                        recordAuthFailure(request, "user_inactive");
                    } else {
                        AuthenticatedUser principal = new AuthenticatedUser(userId, email);
                        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                principal,
                                null,
                                List.of()
                        );
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                }
            } else if (parseResult.failureReason() != null) {
                recordAuthFailure(request, parseResult.failureReason().code());
            }
        }
        filterChain.doFilter(request, response);
    }

    private void recordAuthFailure(HttpServletRequest request, String code) {
        request.setAttribute(AUTH_FAILURE_REASON_ATTRIBUTE, code);
        log.warn(
                "auth_failure code={} method={} path={} request_id={}",
                code,
                request.getMethod(),
                request.getRequestURI(),
                ObservabilitySupport.requestId(request)
        );
    }

    private UUID parseUuid(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
