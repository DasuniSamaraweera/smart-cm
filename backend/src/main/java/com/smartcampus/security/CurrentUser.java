package com.smartcampus.security;

import com.smartcampus.model.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {

    public User get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            return (User) auth.getPrincipal();
        }
        return null;
    }

    public Long getId() {
        User user = get();
        return user != null ? user.getId() : null;
    }

    public boolean isAdmin() {
        User user = get();
        return user != null && user.getRole().name().equals("ADMIN");
    }
}
