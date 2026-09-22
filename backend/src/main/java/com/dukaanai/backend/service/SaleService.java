package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.SaleDtos.*;
import com.dukaanai.backend.entity.*;
import com.dukaanai.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final ShopRepository shopRepository;
    private final PaymentRepository paymentRepository;
    private final KhataTransactionRepository khataTransactionRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    @Transactional
    public SaleResponse createSale(String shopId, CreateSaleRequest req) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found: " + shopId));

        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new IllegalArgumentException("Items list cannot be empty");
        }

        // 1. Resolve or Create Customer
        String custName = req.getCustomerName().trim();
        Customer customer = customerRepository.findByShopIdAndNameIgnoreCase(shopId, custName)
                .orElseGet(() -> {
                    Customer newCust = Customer.builder()
                            .shop(shop)
                            .name(custName)
                            .phone(req.getCustomerPhone())
                            .balance(BigDecimal.ZERO)
                            .build();
                    return customerRepository.save(newCust);
                });

        // 2. Authoritative Price & Inventory Validation
        BigDecimal calculatedTotal = BigDecimal.ZERO;
        List<SaleItem> saleItems = new ArrayList<>();

        for (SaleItemRequest itemReq : req.getItems()) {
            String pName = itemReq.getProductName().trim();
            BigDecimal qty = itemReq.getQuantity();

            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Invalid quantity for product '" + pName + "': " + qty);
            }

            // Find product by ID or Name
            Product product = null;
            if (itemReq.getProductId() != null && !itemReq.getProductId().isEmpty()) {
                product = productRepository.findById(itemReq.getProductId())
                        .filter(p -> p.getShop().getId().equals(shopId))
                        .orElse(null);
            }
            if (product == null) {
                product = productRepository.findByShopIdAndNameIgnoreCase(shopId, pName).orElse(null);
            }

            BigDecimal unitPrice;
            String unit = itemReq.getUnit() != null ? itemReq.getUnit() : "kg";

            if (product != null) {
                // Verify non-negative stock
                if (product.getQuantity().compareTo(qty) < 0) {
                    throw new IllegalArgumentException("Insufficient inventory for '" + pName
                            + "'. Requested: " + qty + " " + unit + ", Available: " + product.getQuantity() + " " + unit);
                }

                unitPrice = itemReq.getUnitPrice() != null && itemReq.getUnitPrice().compareTo(BigDecimal.ZERO) > 0
                        ? itemReq.getUnitPrice()
                        : product.getPrice();
                unit = product.getUnit();

                // Deduct stock
                BigDecimal newQty = product.getQuantity().subtract(qty);
                product.setQuantity(newQty);
                productRepository.save(product);

                // Inventory audit transaction
                InventoryTransaction invTx = InventoryTransaction.builder()
                        .shop(shop)
                        .product(product)
                        .type("OUT")
                        .quantity(qty)
                        .quantityAfter(newQty)
                        .reason("Sale to " + customer.getName())
                        .build();
                inventoryTransactionRepository.save(invTx);

            } else {
                // Ad-hoc item not yet cataloged
                unitPrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : BigDecimal.ZERO;
            }

            BigDecimal lineTotal = unitPrice.multiply(qty);
            calculatedTotal = calculatedTotal.add(lineTotal);

            SaleItem saleItem = SaleItem.builder()
                    .product(product)
                    .productName(product != null ? product.getName() : pName)
                    .quantity(qty)
                    .unit(unit)
                    .unitPrice(unitPrice)
                    .totalPrice(lineTotal)
                    .build();
            saleItems.add(saleItem);
        }

        // 3. Authoritative Received & Outstanding Calculation
        BigDecimal received = req.getReceivedAmount() != null ? req.getReceivedAmount() : BigDecimal.ZERO;
        if (received.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Received amount cannot be negative");
        }

        BigDecimal outstanding = calculatedTotal.subtract(received);
        if (outstanding.compareTo(BigDecimal.ZERO) < 0) {
            outstanding = BigDecimal.ZERO;
        }

        String status = "PAID";
        if (outstanding.compareTo(BigDecimal.ZERO) > 0) {
            status = received.compareTo(BigDecimal.ZERO) > 0 ? "PARTIAL" : "CREDIT";
        }

        // 4. Save Sale
        Sale sale = Sale.builder()
                .shop(shop)
                .customer(customer)
                .customerName(customer.getName())
                .totalAmount(calculatedTotal)
                .receivedAmount(received)
                .outstandingAmount(outstanding)
                .paymentMode(req.getPaymentMode() != null ? req.getPaymentMode().toUpperCase() : "CASH")
                .status(status)
                .rawInput(req.getRawInput())
                .build();

        for (SaleItem item : saleItems) {
            sale.addItem(item);
        }

        Sale savedSale = saleRepository.save(sale);

        // 5. Update Khata Balance if credit
        if (outstanding.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal newBalance = customer.getBalance().add(outstanding);
            customer.setBalance(newBalance);
            customerRepository.save(customer);

            KhataTransaction khataTx = KhataTransaction.builder()
                    .shop(shop)
                    .customer(customer)
                    .type("SALE")
                    .amount(outstanding)
                    .balanceAfter(newBalance)
                    .note("Credit from Sale #" + savedSale.getId().substring(0, 8))
                    .build();
            khataTransactionRepository.save(khataTx);
        }

        // 6. Record Payment if received > 0
        if (received.compareTo(BigDecimal.ZERO) > 0) {
            Payment payment = Payment.builder()
                    .shop(shop)
                    .customer(customer)
                    .customerName(customer.getName())
                    .sale(savedSale)
                    .amount(received)
                    .paymentMode(sale.getPaymentMode())
                    .note("Payment for Sale #" + savedSale.getId().substring(0, 8))
                    .build();
            paymentRepository.save(payment);
        }

        log.info("Sale created: shopId={}, saleId={}, total={}, received={}, outstanding={}",
                shopId, savedSale.getId(), calculatedTotal, received, outstanding);

        return mapToResponse(savedSale);
    }

    public List<SaleResponse> getSales(String shopId, String dateFilter, String customerFilter) {
        return getSales(shopId, dateFilter, customerFilter, null);
    }

    public List<SaleResponse> getSales(String shopId, String dateFilter, String customerFilter, String statusFilter) {
        List<Sale> list;

        if ("today".equalsIgnoreCase(dateFilter)) {
            LocalDateTime start = LocalDate.now().atStartOfDay();
            LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
            list = saleRepository.findByShopIdAndCreatedAtBetweenOrderByCreatedAtDesc(shopId, start, end);
        } else if (customerFilter != null && !customerFilter.trim().isEmpty()) {
            list = saleRepository.findByShopIdAndCustomerNameContainingIgnoreCaseOrderByCreatedAtDesc(shopId, customerFilter.trim());
        } else {
            list = saleRepository.findByShopIdOrderByCreatedAtDesc(shopId);
        }

        if (statusFilter != null && !statusFilter.trim().isEmpty() && !"ALL".equalsIgnoreCase(statusFilter)) {
            list = list.stream()
                    .filter(s -> statusFilter.equalsIgnoreCase(s.getStatus()))
                    .collect(Collectors.toList());
        }

        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public SaleResponse getSaleById(String shopId, String saleId) {
        Sale sale = saleRepository.findById(saleId)
                .filter(s -> s.getShop().getId().equals(shopId))
                .orElseThrow(() -> new IllegalArgumentException("Sale not found or access denied"));
        return mapToResponse(sale);
    }

    public SaleSummaryDto getSummary(String shopId) {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        BigDecimal totalToday = saleRepository.sumTotalSalesSince(shopId, startOfToday);
        BigDecimal receivedToday = saleRepository.sumReceivedSalesSince(shopId, startOfToday);
        long countToday = saleRepository.countSalesSince(shopId, startOfToday);
        BigDecimal creditToday = totalToday.subtract(receivedToday);

        return SaleSummaryDto.builder()
                .totalSales(totalToday)
                .receivedSales(receivedToday)
                .creditSales(creditToday.compareTo(BigDecimal.ZERO) > 0 ? creditToday : BigDecimal.ZERO)
                .transactionCount(countToday)
                .build();
    }

    private SaleResponse mapToResponse(Sale s) {
        List<SaleItemDto> itemDtos = s.getItems().stream()
                .map(i -> SaleItemDto.builder()
                        .id(i.getId())
                        .productId(i.getProduct() != null ? i.getProduct().getId() : null)
                        .productName(i.getProductName())
                        .quantity(i.getQuantity())
                        .unit(i.getUnit())
                        .unitPrice(i.getUnitPrice())
                        .totalPrice(i.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        return SaleResponse.builder()
                .id(s.getId())
                .shopId(s.getShop().getId())
                .customerId(s.getCustomer() != null ? s.getCustomer().getId() : null)
                .customerName(s.getCustomerName())
                .totalAmount(s.getTotalAmount())
                .receivedAmount(s.getReceivedAmount())
                .outstandingAmount(s.getOutstandingAmount())
                .paymentMode(s.getPaymentMode())
                .status(s.getStatus())
                .rawInput(s.getRawInput())
                .items(itemDtos)
                .createdAt(s.getCreatedAt())
                .build();
    }
}
