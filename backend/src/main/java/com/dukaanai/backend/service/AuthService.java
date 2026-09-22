package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.AuthDtos.*;
import com.dukaanai.backend.entity.Shop;
import com.dukaanai.backend.entity.User;
import com.dukaanai.backend.repository.ShopRepository;
import com.dukaanai.backend.repository.UserRepository;
import com.dukaanai.backend.security.JwtTokenProvider;
import com.dukaanai.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email already registered: " + req.getEmail());
        }

        User user = User.builder()
                .email(req.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName().trim())
                .phone(req.getPhone())
                .role("ROLE_SHOPKEEPER")
                .build();
        user = userRepository.save(user);

        Shop shop = Shop.builder()
                .owner(user)
                .name(req.getShopName().trim())
                .address(req.getShopAddress())
                .phone(req.getPhone())
                .build();
        shop = shopRepository.save(shop);

        UserPrincipal principal = UserPrincipal.create(user, shop);
        String token = tokenProvider.generateToken(principal);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .shopId(shop.getId())
                .shopName(shop.getName())
                .build();
    }

    public AuthResponse login(LoginRequest req) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail().toLowerCase().trim(), req.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = tokenProvider.generateToken(principal);

        return AuthResponse.builder()
                .token(token)
                .userId(principal.getId())
                .email(principal.getEmail())
                .fullName(principal.getFullName())
                .shopId(principal.getShopId())
                .shopName(principal.getShopName())
                .build();
    }

    public UserDto getMe(UserPrincipal principal) {
        return UserDto.builder()
                .id(principal.getId())
                .email(principal.getEmail())
                .fullName(principal.getFullName())
                .shopId(principal.getShopId())
                .shopName(principal.getShopName())
                .build();
    }
}
