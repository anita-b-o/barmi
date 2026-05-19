package com.barmi.app.domain;

public enum ErrorCategory {
  API_ERROR_DB_UNAVAILABLE("api_error_db_unavailable"),
  API_ERROR_REDIS_UNAVAILABLE("api_error_redis_unavailable"),
  API_ERROR_VENDOR_TIMEOUT("api_error_vendor_timeout"),
  API_ERROR_INVALID_REQUEST("api_error_invalid_request"),
  API_ERROR_INTERNAL_BUG("api_error_internal_bug"),
  API_ERROR_AUTH_FAILURE("api_error_auth_failure"),
  API_ERROR_CHECKOUT_FAILURE("api_error_checkout_failure"),
  API_ERROR_WEBHOOK_FAILURE("api_error_webhook_failure"),
  RATE_LIMIT_EXCEEDED("rate_limit_exceeded"),
  ;

  private final String value;

  ErrorCategory(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }
}
