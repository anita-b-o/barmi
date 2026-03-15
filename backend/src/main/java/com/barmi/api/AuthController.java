package com.barmi.api;

import com.barmi.app.auth.AuthService;
import com.barmi.app.security.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    public record LoginRequest(
            @NotBlank String email,
            @NotBlank String password
    ) {}

    public record RefreshRequest(
            @NotBlank String refreshToken
    ) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        AuthService.AuthTokens tokens = authService.login(request.email(), request.password());
        return ResponseEntity.ok(tokens);
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshRequest request) {
        AuthService.AuthTokens tokens = authService.refresh(request.refreshToken());
        return ResponseEntity.ok(tokens);
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        AuthenticatedUser principal = auth != null && auth.getPrincipal() instanceof AuthenticatedUser
                ? (AuthenticatedUser) auth.getPrincipal()
                : null;
        return ResponseEntity.ok(authService.me(principal));
    }
}
