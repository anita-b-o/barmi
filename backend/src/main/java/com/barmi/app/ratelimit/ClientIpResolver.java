package com.barmi.app.ratelimit;

import jakarta.servlet.http.HttpServletRequest;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Locale;

class ClientIpResolver {
    private final boolean trustProxyHeaders;

    ClientIpResolver(boolean trustProxyHeaders) {
        this.trustProxyHeaders = trustProxyHeaders;
    }

    String resolve(HttpServletRequest request) {
        if (trustProxyHeaders) {
            String forwardedFor = firstValidForwardedFor(request.getHeader("X-Forwarded-For"));
            if (forwardedFor != null) {
                return forwardedFor;
            }
            String realIp = singleValidIp(request.getHeader("X-Real-IP"));
            if (realIp != null) {
                return realIp;
            }
            String forwarded = firstValidForwardedHeaderIp(request.getHeader("Forwarded"));
            if (forwarded != null) {
                return forwarded;
            }
        }
        return normalizeFallback(request.getRemoteAddr());
    }

    private String firstValidForwardedFor(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String[] items = value.split(",");
        String first = null;
        for (String item : items) {
            String normalized = normalizeIpLiteral(item);
            if (normalized == null) {
                return null;
            }
            if (first == null) {
                first = normalized;
            }
        }
        return first;
    }

    private String singleValidIp(String value) {
        if (value == null || value.isBlank() || value.contains(",")) {
            return null;
        }
        return normalizeIpLiteral(value);
    }

    private String firstValidForwardedHeaderIp(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String[] entries = value.split(",");
        String first = null;
        for (String entry : entries) {
            String candidate = forwardedForValue(entry);
            String normalized = normalizeIpLiteral(candidate);
            if (normalized == null) {
                return null;
            }
            if (first == null) {
                first = normalized;
            }
        }
        return first;
    }

    private String forwardedForValue(String entry) {
        if (entry == null || entry.isBlank()) {
            return null;
        }
        String[] parts = entry.split(";");
        for (String part : parts) {
            String trimmed = part.trim();
            int separator = trimmed.indexOf('=');
            if (separator <= 0) {
                continue;
            }
            String name = trimmed.substring(0, separator).trim();
            if (!"for".equalsIgnoreCase(name)) {
                continue;
            }
            return trimmed.substring(separator + 1).trim();
        }
        return null;
    }

    private String normalizeIpLiteral(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String candidate = value.trim();
        if (candidate.startsWith("\"") && candidate.endsWith("\"") && candidate.length() > 1) {
            candidate = candidate.substring(1, candidate.length() - 1).trim();
        }
        if (candidate.startsWith("[") && candidate.contains("]")) {
            candidate = candidate.substring(1, candidate.indexOf(']')).trim();
        } else {
            candidate = stripIpv4Port(candidate);
        }
        if (candidate.isBlank() || candidate.contains("/") || candidate.contains("?") || candidate.contains("#")) {
            return null;
        }
        if (!isStrictIpv4(candidate) && !isIpv6LiteralCandidate(candidate)) {
            return null;
        }
        try {
            InetAddress address = InetAddress.getByName(candidate);
            return address.getHostAddress().toLowerCase(Locale.ROOT);
        } catch (UnknownHostException exception) {
            return null;
        }
    }

    private String stripIpv4Port(String value) {
        int separator = value.lastIndexOf(':');
        if (separator <= 0 || value.indexOf(':') != separator) {
            return value;
        }
        String host = value.substring(0, separator);
        String port = value.substring(separator + 1);
        return isStrictIpv4(host) && port.chars().allMatch(Character::isDigit) ? host : value;
    }

    private boolean isStrictIpv4(String value) {
        if (value == null || !value.matches("\\d{1,3}(\\.\\d{1,3}){3}")) {
            return false;
        }
        String[] parts = value.split("\\.");
        for (String part : parts) {
            int octet = Integer.parseInt(part);
            if (octet > 255) {
                return false;
            }
        }
        return true;
    }

    private boolean isIpv6LiteralCandidate(String value) {
        return value != null && value.contains(":") && value.matches("[0-9a-fA-F:.]+");
    }

    private String normalizeFallback(String value) {
        String normalized = normalizeIpLiteral(value);
        return normalized == null ? "unknown" : normalized;
    }
}
