package com.dukaanai.backend.controller;

import com.dukaanai.backend.dto.ProductDtos.*;
import com.dukaanai.backend.security.UserPrincipal;
import com.dukaanai.backend.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<List<ProductDto>> getProducts(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(inventoryService.getProducts(principal.getShopId()));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<ProductDto>> getLowStock(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(inventoryService.getLowStock(principal.getShopId()));
    }

    @PostMapping
    public ResponseEntity<ProductDto> createProduct(@AuthenticationPrincipal UserPrincipal principal,
                                                   @Valid @RequestBody ProductRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventoryService.createProduct(principal.getShopId(), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDto> updateProduct(@AuthenticationPrincipal UserPrincipal principal,
                                                   @PathVariable String id,
                                                   @Valid @RequestBody ProductRequest req) {
        return ResponseEntity.ok(inventoryService.updateProduct(principal.getShopId(), id, req));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> getProductById(@AuthenticationPrincipal UserPrincipal principal,
                                                    @PathVariable String id) {
        return ResponseEntity.ok(inventoryService.getProductById(principal.getShopId(), id));
    }

    @PostMapping("/{id}/adjust-stock")
    public ResponseEntity<ProductDto> adjustStock(@AuthenticationPrincipal UserPrincipal principal,
                                                 @PathVariable String id,
                                                 @Valid @RequestBody StockAdjustmentRequest req) {
        return ResponseEntity.ok(inventoryService.adjustStock(principal.getShopId(), id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@AuthenticationPrincipal UserPrincipal principal,
                                              @PathVariable String id) {
        inventoryService.deleteProduct(principal.getShopId(), id);
        return ResponseEntity.noContent().build();
    }
}
