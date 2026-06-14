package com.barmi.app.ratelimit;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {
    private final byte[] cachedBody;

    CachedBodyHttpServletRequest(HttpServletRequest request, int maxBodyBytes) throws IOException {
        super(request);
        this.cachedBody = readBoundedBody(request, maxBodyBytes);
    }

    byte[] getCachedBody() {
        return cachedBody;
    }

    @Override
    public ServletInputStream getInputStream() {
        ByteArrayInputStream inputStream = new ByteArrayInputStream(cachedBody);
        return new ServletInputStream() {
            @Override
            public int read() {
                return inputStream.read();
            }

            @Override
            public boolean isFinished() {
                return inputStream.available() == 0;
            }

            @Override
            public boolean isReady() {
                return true;
            }

            @Override
            public void setReadListener(ReadListener readListener) {
                // no-op
            }
        };
    }

    @Override
    public BufferedReader getReader() {
        return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
    }

    private byte[] readBoundedBody(HttpServletRequest request, int maxBodyBytes) throws IOException {
        long contentLength = request.getContentLengthLong();
        if (contentLength > maxBodyBytes) {
            throw new BodyTooLargeException(maxBodyBytes);
        }

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = request.getInputStream().read(buffer)) != -1) {
            total += read;
            if (total > maxBodyBytes) {
                throw new BodyTooLargeException(maxBodyBytes);
            }
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    static class BodyTooLargeException extends IOException {
        private final int maxBodyBytes;

        BodyTooLargeException(int maxBodyBytes) {
            super("Request body exceeds " + maxBodyBytes + " bytes");
            this.maxBodyBytes = maxBodyBytes;
        }

        int maxBodyBytes() {
            return maxBodyBytes;
        }
    }
}
