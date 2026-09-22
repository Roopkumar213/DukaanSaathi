package com.dukaanai.backend.security;

import com.dukaanai.backend.entity.Shop;
import com.dukaanai.backend.entity.User;
import com.dukaanai.backend.repository.ShopRepository;
import com.dukaanai.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        Shop shop = shopRepository.findFirstByOwnerId(user.getId()).orElse(null);
        return UserPrincipal.create(user, shop);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));
        Shop shop = shopRepository.findFirstByOwnerId(user.getId()).orElse(null);
        return UserPrincipal.create(user, shop);
    }
}
