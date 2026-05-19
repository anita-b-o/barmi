package com.barmi.api;

import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@Profile({"local", "staging", "test", "integrationtest"})
@ConditionalOnProperty(name = "app.observability.smoke.enabled", havingValue = "true")
@RequestMapping("/api/admin/dev/observability")
public class AdminDevObservabilityController {

    @GetMapping("/error")
    public void raiseControlledError(@RequestParam(defaultValue = "503") int status) {
        HttpStatus httpStatus = HttpStatus.resolve(status);
        if (httpStatus == null || !httpStatus.isError()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "observability_invalid_status");
        }
        throw new ResponseStatusException(httpStatus, "observability_smoke_error");
    }
}
