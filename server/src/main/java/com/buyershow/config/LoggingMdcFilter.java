package com.buyershow.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

/**
 * Injects MDC context (trace_id, request_id, user_id) into every HTTP request for structured logging.
 * Propagates W3C traceparent header if present, otherwise generates a new trace_id.
 */
@Component
@Order(1)
public class LoggingMdcFilter implements Filter {

    private static final String TRACE_ID = "trace_id";
    private static final String REQUEST_ID = "request_id";
    private static final String USER_ID = "user_id";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        try {
            var httpReq = (HttpServletRequest) request;
            var httpResp = (HttpServletResponse) response;

            // trace_id: prefer W3C traceparent header, fallback to X-Trace-Id, then generate
            String traceId = extractTraceId(httpReq);
            MDC.put(TRACE_ID, traceId);

            // request_id: unique per HTTP request
            MDC.put(REQUEST_ID, UUID.randomUUID().toString().replace("-", "").substring(0, 16));

            // user_id: extract from Spring Security context if authenticated
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getName() != null
                    && !"anonymousUser".equals(auth.getName())) {
                MDC.put(USER_ID, auth.getName());
            }

            // Set trace_id in response header for client-side correlation
            httpResp.setHeader("X-Trace-Id", traceId);
            httpResp.setHeader("X-Request-Id", MDC.get(REQUEST_ID));

            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }

    private String extractTraceId(HttpServletRequest request) {
        // W3C traceparent: 00-<trace-id>-<parent-id>-<flags>
        String traceparent = request.getHeader("traceparent");
        if (traceparent != null && traceparent.length() >= 55) {
            String[] parts = traceparent.split("-");
            if (parts.length >= 2 && parts[1].length() == 32) {
                return parts[1];
            }
        }
        // Fallback: X-Trace-Id header
        String xTraceId = request.getHeader("X-Trace-Id");
        if (xTraceId != null && !xTraceId.isBlank()) {
            return xTraceId;
        }
        // Generate new
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
