package com.dukaanai.backend.controller;

import com.dukaanai.backend.dto.CustomerDtos.CustomerDto;
import com.dukaanai.backend.dto.CustomerDtos.PaymentRecordRequest;
import com.dukaanai.backend.security.UserPrincipal;
import com.dukaanai.backend.service.CustomerKhataService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/khata")
@RequiredArgsConstructor
public class KhataController {

    private final CustomerKhataService customerKhataService;

    @PostMapping("/customers/{id}/payment")
    public ResponseEntity<CustomerDto> recordPayment(@AuthenticationPrincipal UserPrincipal principal,
                                                    @PathVariable String id,
                                                    @Valid @RequestBody PaymentRecordRequest req) {
        return ResponseEntity.ok(customerKhataService.recordPayment(principal.getShopId(), id, req));
    }
}
