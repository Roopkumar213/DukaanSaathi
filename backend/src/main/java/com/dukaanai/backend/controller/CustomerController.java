package com.dukaanai.backend.controller;

import com.dukaanai.backend.dto.CustomerDtos.*;
import com.dukaanai.backend.security.UserPrincipal;
import com.dukaanai.backend.service.CustomerKhataService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerKhataService customerKhataService;

    @GetMapping
    public ResponseEntity<List<CustomerDto>> getCustomers(@AuthenticationPrincipal UserPrincipal principal,
                                                         @RequestParam(required = false, defaultValue = "false") boolean hasDebt) {
        return ResponseEntity.ok(customerKhataService.getCustomers(principal.getShopId(), hasDebt));
    }

    @PostMapping
    public ResponseEntity<CustomerDto> createCustomer(@AuthenticationPrincipal UserPrincipal principal,
                                                     @Valid @RequestBody CustomerRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customerKhataService.createCustomer(principal.getShopId(), req));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerDetailDto> getCustomerDetail(@AuthenticationPrincipal UserPrincipal principal,
                                                              @PathVariable String id) {
        return ResponseEntity.ok(customerKhataService.getCustomerDetail(principal.getShopId(), id));
    }

    @GetMapping("/{id}/khata")
    public ResponseEntity<CustomerDetailDto> getCustomerKhata(@AuthenticationPrincipal UserPrincipal principal,
                                                             @PathVariable String id) {
        return ResponseEntity.ok(customerKhataService.getCustomerDetail(principal.getShopId(), id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerDto> updateCustomer(@AuthenticationPrincipal UserPrincipal principal,
                                                     @PathVariable String id,
                                                     @Valid @RequestBody CustomerRequest req) {
        return ResponseEntity.ok(customerKhataService.updateCustomer(principal.getShopId(), id, req));
    }
}
