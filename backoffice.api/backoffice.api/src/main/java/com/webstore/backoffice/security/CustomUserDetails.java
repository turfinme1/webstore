package com.webstore.backoffice.security;

import com.webstore.backoffice.models.AdminSession;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;

public class CustomUserDetails implements UserDetails {

    private final AdminSession session;

    public CustomUserDetails(AdminSession session) {
        this.session = session;
    }

    // Here, you map your session's admin_user_id or related fields to authorities.
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Example: if session contains an admin_user_id, grant ROLE_ADMIN.
        // Otherwise, grant ROLE_USER.
        if (session.getAdminUser() != null) {
            return java.util.Collections.singleton(() -> "ROLE_ADMIN");
        } else {
            return java.util.Collections.singleton(() -> "ROLE_USER");
        }
    }

    @Override
    public String getPassword() {
        return null; // Not applicable here
    }

    @Override
    public String getUsername() {
        // You can return the session hash or the admin user's email/name if available.
        return session.getSessionHash().toString();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    @Override
    public boolean isEnabled() {
        return true;
    }
}