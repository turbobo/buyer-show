package com.buyershow.common.security;

import com.buyershow.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtils {

    private SecurityUtils() {}

    public static User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }

    public static Long getCurrentUserId() {
        User user = getCurrentUser();
        return user != null ? user.getId() : null;
    }

    public static boolean isAdmin() {
        User user = getCurrentUser();
        return user != null && user.getRole() == 1;
    }

    public static boolean isLoggedIn() {
        return getCurrentUser() != null;
    }
}
