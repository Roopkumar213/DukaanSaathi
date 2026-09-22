package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.ProductDtos.*;
import com.dukaanai.backend.entity.InventoryTransaction;
import com.dukaanai.backend.entity.Product;
import com.dukaanai.backend.entity.Shop;
import com.dukaanai.backend.repository.InventoryTransactionRepository;
import com.dukaanai.backend.repository.ProductRepository;
import com.dukaanai.backend.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    public List<ProductDto> getProducts(String shopId) {
        return productRepository.findByShopIdOrderByNameAsc(shopId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<ProductDto> getLowStock(String shopId) {
        return productRepository.findLowStockProducts(shopId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<ProductDto> searchProducts(String shopId, String query) {
        if (query == null || query.trim().isEmpty()) {
            return getProducts(shopId);
        }
        return productRepository.findByShopIdAndNameContainingIgnoreCase(shopId, query.trim()).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductDto createProduct(String shopId, ProductRequest req) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found: " + shopId));

        Product product = productRepository.findByShopIdAndNameIgnoreCase(shopId, req.getName())
                .orElse(null);

        if (product != null) {
            // Update existing stock
            product.setQuantity(product.getQuantity().add(req.getQuantity()));
            product.setPrice(req.getPrice());
            product.setCategory(req.getCategory());
            product.setUnit(req.getUnit());
            if (req.getMinStock() != null) {
                product.setMinStock(req.getMinStock());
            }
        } else {
            product = Product.builder()
                    .shop(shop)
                    .name(req.getName().trim())
                    .category(req.getCategory())
                    .quantity(req.getQuantity())
                    .unit(req.getUnit())
                    .price(req.getPrice())
                    .minStock(req.getMinStock() != null ? req.getMinStock() : new BigDecimal("5.00"))
                    .build();
        }

        Product saved = productRepository.save(product);

        // Record stock transaction
        InventoryTransaction tx = InventoryTransaction.builder()
                .shop(shop)
                .product(saved)
                .type("IN")
                .quantity(req.getQuantity())
                .quantityAfter(saved.getQuantity())
                .reason("Initial / Inward Stock")
                .build();
        inventoryTransactionRepository.save(tx);

        return mapToDto(saved);
    }

    @Transactional
    public ProductDto updateProduct(String shopId, String productId, ProductRequest req) {
        Product product = productRepository.findById(productId)
                .filter(p -> p.getShop().getId().equals(shopId))
                .orElseThrow(() -> new IllegalArgumentException("Product not found or access denied"));

        product.setName(req.getName().trim());
        product.setCategory(req.getCategory());
        product.setPrice(req.getPrice());
        product.setUnit(req.getUnit());
        if (req.getMinStock() != null) {
            product.setMinStock(req.getMinStock());
        }

        return mapToDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto adjustStock(String shopId, String productId, StockAdjustmentRequest req) {
        Product product = productRepository.findById(productId)
                .filter(p -> p.getShop().getId().equals(shopId))
                .orElseThrow(() -> new IllegalArgumentException("Product not found or access denied"));

        BigDecimal delta = req.getQuantityDelta();
        BigDecimal newQty;

        if ("OUT".equalsIgnoreCase(req.getType())) {
            if (product.getQuantity().compareTo(delta) < 0) {
                throw new IllegalArgumentException("Cannot reduce stock below 0. Available: " + product.getQuantity());
            }
            newQty = product.getQuantity().subtract(delta);
        } else {
            newQty = product.getQuantity().add(delta);
        }

        product.setQuantity(newQty);
        Product saved = productRepository.save(product);

        InventoryTransaction tx = InventoryTransaction.builder()
                .shop(product.getShop())
                .product(saved)
                .type(req.getType().toUpperCase())
                .quantity(delta)
                .quantityAfter(newQty)
                .reason(req.getReason() != null ? req.getReason() : "Manual Adjustment")
                .build();
        inventoryTransactionRepository.save(tx);

        return mapToDto(saved);
    }

    public ProductDto getProductById(String shopId, String productId) {
        Product product = productRepository.findById(productId)
                .filter(p -> p.getShop().getId().equals(shopId))
                .orElseThrow(() -> new IllegalArgumentException("Product not found or access denied"));
        return mapToDto(product);
    }

    @Transactional
    public void deleteProduct(String shopId, String productId) {
        Product product = productRepository.findById(productId)
                .filter(p -> p.getShop().getId().equals(shopId))
                .orElseThrow(() -> new IllegalArgumentException("Product not found or access denied"));
        productRepository.delete(product);
    }

    private ProductDto mapToDto(Product p) {
        String status = "AVAILABLE";
        if (p.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            status = "OUT_OF_STOCK";
        } else if (p.getQuantity().compareTo(p.getMinStock()) <= 0) {
            status = "LOW_STOCK";
        }

        return ProductDto.builder()
                .id(p.getId())
                .name(p.getName())
                .category(p.getCategory())
                .quantity(p.getQuantity())
                .unit(p.getUnit())
                .price(p.getPrice())
                .minStock(p.getMinStock())
                .status(status)
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
