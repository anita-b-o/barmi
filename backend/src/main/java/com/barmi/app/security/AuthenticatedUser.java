package com.barmi.app.security;

import java.util.UUID;

public record AuthenticatedUser(UUID userId, String email) {}
