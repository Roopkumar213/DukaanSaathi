package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.CustomerDtos.CustomerDto;
import com.dukaanai.backend.dto.ProductDtos.ProductDto;
import com.dukaanai.backend.dto.SaleDtos.SaleSummaryDto;
import com.dukaanai.backend.entity.Shop;
import com.dukaanai.backend.repository.ShopRepository;
import com.dukaanai.backend.service.VoiceBusinessTools.ToolExecutionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
public class ZeroDataBehaviorTest {

    @Autowired
    private VoiceBusinessTools voiceBusinessTools;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private CustomerKhataService customerKhataService;

    @Autowired
    private SaleService saleService;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private com.dukaanai.backend.repository.UserRepository userRepository;

    private Shop freshShop;

    @BeforeEach
    void setUp() {
        com.dukaanai.backend.entity.User owner = userRepository.save(com.dukaanai.backend.entity.User.builder()
                .email("fresh-owner-" + System.currentTimeMillis() + "@test.local")
                .password("hashedPassword")
                .fullName("Fresh Merchant")
                .build());

        // Create an empty fresh shop with zero records
        freshShop = shopRepository.save(Shop.builder()
                .name("New Empty Kirana Shop")
                .owner(owner)
                .address("Vijayawada, Andhra Pradesh")
                .build());
    }

    @Test
    @DisplayName("Fresh shop starts with zero products, zero customers, zero sales")
    void testFreshShopZeroData() {
        List<ProductDto> products = inventoryService.getProducts(freshShop.getId());
        assertTrue(products.isEmpty(), "Fresh shop must have exactly 0 products");

        List<CustomerDto> customers = customerKhataService.getCustomers(freshShop.getId(), false);
        assertTrue(customers.isEmpty(), "Fresh shop must have exactly 0 customers");

        SaleSummaryDto sales = saleService.getSummary(freshShop.getId());
        assertEquals(0, sales.getTransactionCount(), "Fresh shop must have 0 transactions");
        assertEquals(BigDecimal.ZERO, sales.getTotalSales(), "Fresh shop must have ₹0 total sales");
        assertEquals(BigDecimal.ZERO, sales.getCreditSales(), "Fresh shop must have ₹0 outstanding credit");
    }

    @Test
    @DisplayName("Voice query on empty inventory returns PRODUCT_NOT_FOUND without inventing items")
    void testEmptyShopProductQuery() {
        ToolExecutionResult result = voiceBusinessTools.checkInventoryAndPrice(freshShop.getId(), "Rice");
        assertFalse(result.isSuccess(), "Cannot find Rice in fresh empty shop");
        assertEquals("PRODUCT_NOT_FOUND", result.getErrorCode());
        assertTrue(result.getMessage().contains("not found in your inventory"));
    }

    @Test
    @DisplayName("Voice query on empty customers returns CUSTOMER_NOT_FOUND without inventing debts")
    void testEmptyShopCustomerQuery() {
        ToolExecutionResult result = voiceBusinessTools.searchCustomerAndLedger(freshShop.getId(), "Ramesh");
        assertFalse(result.isSuccess(), "Cannot find Ramesh in fresh empty shop");
        assertEquals("CUSTOMER_NOT_FOUND", result.getErrorCode());
        assertTrue(result.getMessage().contains("No customer named 'Ramesh' was found"));
    }
}
