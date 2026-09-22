package com.dukaanai.backend.controller;

import com.dukaanai.backend.dto.CustomerDtos.*;
import com.dukaanai.backend.security.UserPrincipal;
import com.dukaanai.backend.service.CustomerKhataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final CustomerKhataService customerKhataService;

    @GetMapping
    public ResponseEntity<List<PaymentDto>> getPayments(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(customerKhataService.getPayments(principal.getShopId()));
    }
}
