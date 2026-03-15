package com.barmi.testsupport;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class Json {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private Json() {}

    public static String stringify(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }
}
