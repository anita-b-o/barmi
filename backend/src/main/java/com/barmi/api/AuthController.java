package com.barmi.api;

import com.barmi.app.auth.AuthService;
import com.barmi.app.auth.AuthCookieService;
import com.barmi.app.security.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthCookieService authCookieService;

    public AuthController(
            AuthService authService,
            AuthCookieService authCookieService
    ) {
        this.authService = authService;
        this.authCookieService = authCookieService;
    }

    public record LoginRequest(
            @NotBlank String email,
            @NotBlank String password
    ) {}

    public record AuthResponse(
            String accessToken,
            String tokenType,
            Instant expiresAt
    ) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthService.AuthTokens tokens = authService.login(request.email(), request.password());
        authCookieService.writeRefreshTokenCookie(response, tokens.refreshToken(), tokens.refreshTokenExpiresAt());
        return ResponseEntity.ok(toResponse(tokens));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
            HttpServletRequest httpRequest,
            HttpServletResponse response
    ) {
        String refreshToken = authCookieService.resolveRefreshToken(httpRequest);
        try {
            AuthService.AuthTokens tokens = authService.refresh(refreshToken);
            authCookieService.writeRefreshTokenCookie(response, tokens.refreshToken(), tokens.refreshTokenExpiresAt());
            return ResponseEntity.ok(toResponse(tokens));
        } catch (RuntimeException ex) {
            authCookieService.clearRefreshTokenCookie(response);
            throw ex;
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(authCookieService.resolveRefreshToken(request));
        authCookieService.clearRefreshTokenCookie(response);
        return ResponseEntity.ok().body(java.util.Map.of("ok", true));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        AuthenticatedUser principal = auth != null && auth.getPrincipal() instanceof AuthenticatedUser
                ? (AuthenticatedUser) auth.getPrincipal()
                : null;
        return ResponseEntity.ok(authService.me(principal));
    }

    private AuthResponse toResponse(AuthService.AuthTokens tokens) {
        return new AuthResponse(
                tokens.accessToken(),
                tokens.tokenType(),
                tokens.accessTokenExpiresAt()
        );
    }
}
