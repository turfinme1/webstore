package com.webstore.backoffice.security.configurations;

import com.webstore.backoffice.crud.models.AdminSession;
import com.webstore.backoffice.security.services.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

public class CustomSessionAuthenticationFilter extends OncePerRequestFilter {

    private final AuthService authService;
    private final String sessionCookieName;

    public CustomSessionAuthenticationFilter(AuthService authService, String sessionCookieName) {
        this.authService = authService;
        this.sessionCookieName = sessionCookieName;
    }


    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        // Get session hash from cookie
        UUID sessionHash = extractSessionHashFromCookie(request.getCookies());
        if (sessionHash != null) {
            // Validate the session and load the session record (which contains user details)
//            Optional<AdminSession> sessionOpt = authService.getValidSession(sessionHash);
//            if (sessionOpt.isPresent()) {
//                AdminSession session = sessionOpt.get();
//                // Create a CustomUserDetails instance that implements UserDetails.
//                CustomUserDetails userDetails = new CustomUserDetails(session);
//                // Create an Authentication object (set credentials to null because we're not using password auth here)
//                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
//                        userDetails, null, userDetails.getAuthorities());
//                // Set the authentication in the context
//                SecurityContextHolder.getContext().setAuthentication(auth);
//            }
        } else {
//            Optional<AdminSession> newSessionOptional = authService.createSession();
//            AdminSession newSession = newSessionOptional.get();
//            UUID newSessionHash = newSession.getSessionHash();
//
//            Cookie sessionCookie = new Cookie(sessionCookieName, newSessionHash.toString());
//            sessionCookie.setHttpOnly(true);
//            sessionCookie.setPath("/");
//            response.addCookie(sessionCookie);
        }
        // Continue filter chain
        filterChain.doFilter(request, response);
    }

    private UUID extractSessionHashFromCookie(Cookie[] cookies) {
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (sessionCookieName.equals(cookie.getName())) {
                return UUID.fromString(cookie.getValue());
            }
        }
        return null;
    }
}
