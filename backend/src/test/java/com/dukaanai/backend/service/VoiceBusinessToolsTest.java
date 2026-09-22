package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.ProductDtos.ProductDto;
import com.dukaanai.backend.dto.ProductDtos.ProductRequest;
import com.dukaanai.backend.dto.SaleDtos.SaleResponse;
import com.dukaanai.backend.entity.Shop;
import com.dukaanai.backend.entity.User;
import com.dukaanai.backend.repository.CustomerRepository;
import com.dukaanai.backend.repository.ProductRepository;
import com.dukaanai.backend.repository.ShopRepository;
import com.dukaanai.backend.repository.UserRepository;
import com.dukaanai.backend.service.VoiceBusinessTools.PendingItem;
import com.dukaanai.backend.service.VoiceBusinessTools.ToolExecutionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
public class VoiceBusinessToolsTest {

    @Autowired
    private VoiceBusinessTools voiceBusinessTools;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CustomerRepository customerRepository;

    private Shop testShop;
    private User testUser;
    private ProductDto riceProduct;

    @BeforeEach
    void setUp() {
        testUser = userRepository.save(User.builder()
                .email("test-owner-" + System.currentTimeMillis() + "@dukaansaathi.test")
                .password("hashedPassword")
                .fullName("Rao Ji")
                .build());

        testShop = shopRepository.save(Shop.builder()
                .name("Saathi Kirana Store")
                .owner(testUser)
                .address("Hyderabad, Telangana")
                .build());

        // Create test fixture: Rice 25 kg @ ₹170/kg
        riceProduct = inventoryService.createProduct(testShop.getId(), ProductRequest.builder()
                .name("Rice")
                .category("Grains")
                .price(new BigDecimal("170.00"))
                .quantity(new BigDecimal("25.00"))
                .unit("kg")
                .minStock(new BigDecimal("5.00"))
                .build());
    }

    @Test
    @DisplayName("Authoritative Bill Calculation: 1 kg Rice @ ₹170 = ₹170")
    void testAuthoritativeBillCalculation() {
        List<Map<String, Object>> items = new ArrayList<>();
        Map<String, Object> riceItem = new HashMap<>();
        riceItem.put("name", "Rice");
        riceItem.put("quantity", 1);
        riceItem.put("unit", "kg");
        items.add(riceItem);

        ToolExecutionResult result = voiceBusinessTools.calculateSale(
                testShop.getId(),
                "Ramesh",
                items,
                "CASH",
                new BigDecimal("170.00"),
                "Ramesh ki 1 kg rice ammanu"
        );

        assertTrue(result.isSuccess(), "Calculation should succeed");
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.getData();
        assertEquals(0, new BigDecimal("170.00").compareTo((BigDecimal) data.get("totalAmount")), "Total amount must be authoritative ₹170.00");
        assertEquals("Ramesh", data.get("customerName"));
        assertNotNull(data.get("draftId"), "Must generate draftId for confirmation");
    }

    @Test
    @DisplayName("Insufficient Stock Prevention: Requesting more than available stock fails safely")
    void testInsufficientStockValidation() {
        List<Map<String, Object>> items = new ArrayList<>();
        Map<String, Object> riceItem = new HashMap<>();
        riceItem.put("name", "Rice");
        riceItem.put("quantity", 30); // only 25 available in stock
        riceItem.put("unit", "kg");
        items.add(riceItem);

        ToolExecutionResult result = voiceBusinessTools.calculateSale(
                testShop.getId(),
                "Ramesh",
                items,
                "CASH",
                null,
                "Ramesh ki 30 kg rice ammanu"
        );

        assertFalse(result.isSuccess(), "Calculation must fail due to insufficient inventory");
        assertEquals("INSUFFICIENT_STOCK", result.getErrorCode());
        assertTrue(result.getMessage().contains("Insufficient stock"));
    }

    @Test
    @DisplayName("Zero Hallucination: Searching non-existent product returns PRODUCT_NOT_FOUND without inventing prices")
    void testUnknownProductZeroHallucination() {
        List<Map<String, Object>> items = new ArrayList<>();
        Map<String, Object> badItem = new HashMap<>();
        badItem.put("name", "NonExistentExoticSpice");
        badItem.put("quantity", 1);
        items.add(badItem);

        ToolExecutionResult result = voiceBusinessTools.calculateSale(
                testShop.getId(),
                "Suresh",
                items,
                "CASH",
                null,
                "Suresh ki 1 packet NonExistentExoticSpice ammanu"
        );

        assertFalse(result.isSuccess());
        assertEquals("PRODUCT_NOT_FOUND", result.getErrorCode());
    }

    @Test
    @DisplayName("Payment Mismatch: Bill ₹340 vs Claimed ₹300 leaves ₹40 in Khata")
    void testPaymentMismatchSplit() {
        List<Map<String, Object>> items = new ArrayList<>();
        Map<String, Object> riceItem = new HashMap<>();
        riceItem.put("name", "Rice");
        riceItem.put("quantity", 2); // 2 kg @ 170 = 340
        riceItem.put("unit", "kg");
        items.add(riceItem);

        ToolExecutionResult result = voiceBusinessTools.calculateSale(
                testShop.getId(),
                "Ramesh",
                items,
                "CASH",
                new BigDecimal("300.00"), // Paid 300 out of 340
                "Ramesh ki 2 kg rice ammanu 300 ichadu"
        );

        assertTrue(result.isSuccess());
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.getData();
        assertEquals(0, new BigDecimal("340.00").compareTo((BigDecimal) data.get("totalAmount")));
        assertEquals(0, new BigDecimal("300.00").compareTo((BigDecimal) data.get("amountPaid")));
        assertEquals(0, new BigDecimal("40.00").compareTo((BigDecimal) data.get("amountCredit")), "Remaining ₹40 must be split to credit");

        // Finalize sale
        String draftId = (String) data.get("draftId");
        ToolExecutionResult finalizeResult = voiceBusinessTools.finalizeSale(testShop.getId(), testUser.getId(), draftId);
        assertTrue(finalizeResult.isSuccess(), "Finalize should succeed");

        // Verify inventory decremented: 25 - 2 = 23 kg
        ProductDto updatedRice = inventoryService.getProductById(testShop.getId(), riceProduct.getId());
        assertEquals(0, new BigDecimal("23.00").compareTo(updatedRice.getQuantity()), "Inventory must be decremented from 25 to 23 kg");
    }
}
