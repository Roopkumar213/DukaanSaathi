package com.dukaanai.backend.controller;

import com.dukaanai.backend.dto.SaleDtos.*;
import com.dukaanai.backend.security.UserPrincipal;
import com.dukaanai.backend.service.SaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;

    @PostMapping
    public ResponseEntity<SaleResponse> createSale(@AuthenticationPrincipal UserPrincipal principal,
                                                  @Valid @RequestBody CreateSaleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(saleService.createSale(principal.getShopId(), req));
    }

    @GetMapping
    public ResponseEntity<List<SaleResponse>> getSales(@AuthenticationPrincipal UserPrincipal principal,
                                                       @RequestParam(required = false) String date,
                                                       @RequestParam(required = false) String customer,
                                                       @RequestParam(required = false) String status) {
        return ResponseEntity.ok(saleService.getSales(principal.getShopId(), date, customer, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SaleResponse> getSaleById(@AuthenticationPrincipal UserPrincipal principal,
                                                   @PathVariable String id) {
        return ResponseEntity.ok(saleService.getSaleById(principal.getShopId(), id));
    }

    @GetMapping("/summary")
    public ResponseEntity<SaleSummaryDto> getSummary(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(saleService.getSummary(principal.getShopId()));
    }
}
