package com.barmi.app.security;

import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
            Claims claims = jwtService.parseToken(token);
            if (claims != null) {
                String subject = claims.getSubject();
                String email = claims.get("email", String.class);
                UUID userId = parseUuid(subject);

                if (userId != null && email != null) {
                    Optional<User> user = userRepository.findById(userId);
                    if (user.isPresent() && user.get().getStatus() == UserStatus.ACTIVE) {
                        AuthenticatedUser principal = new AuthenticatedUser(userId, email);
                        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                principal,
                                null,
                                List.of()
                        );
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                }
            }
        }
        filterChain.doFilter(request, response);
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
