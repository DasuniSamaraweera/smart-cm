package com.smartcampus.security;

import com.smartcampus.model.User;
import com.smartcampus.model.enums.UserRole;
import com.smartcampus.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String avatarUrl = oAuth2User.getAttribute("picture");

        // Find or create user - first ever user becomes ADMIN
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    UserRole role = userRepository.count() == 0 ? UserRole.ADMIN : UserRole.USER;
                    return userRepository.save(
                            User.builder()
                                    .email(email)
                                    .name(name)
                                    .avatarUrl(avatarUrl)
                                    .role(role)
                                    .build()
                    );
                });

        // Update name and avatar on each login
        user.setName(name);
        user.setAvatarUrl(avatarUrl);
        userRepository.save(user);

        // Generate JWT
        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());

        // Redirect to frontend with token
        String redirectUrl = frontendUrl + "/oauth/callback?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
