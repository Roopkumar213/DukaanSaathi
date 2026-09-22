package com.dukaanai.backend;

import com.dukaanai.backend.dto.AuthDtos.*;
import com.dukaanai.backend.dto.ProductDtos.*;
import com.dukaanai.backend.dto.SaleDtos.*;
import com.dukaanai.backend.dto.CustomerDtos.*;
import com.dukaanai.backend.dto.AiDtos.*;
import com.dukaanai.backend.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class DukaanAiApplicationTests {

    @Autowired
    private AuthService authService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private SaleService saleService;

    @Autowired
    private CustomerKhataService customerKhataService;

    @Autowired
    private AIService aiService;

    @Autowired
    private AiQueryService aiQueryService;

    @Test
    void testCompleteKiranaBusinessFlow() {
        // 1. Register Shopkeeper
        String uniqueEmail = "test_" + System.currentTimeMillis() + "@dukaan.com";
        RegisterRequest regReq = RegisterRequest.builder()
                .email(uniqueEmail)
                .password("password123")
                .fullName("Test Kirana Owner")
                .phone("9999988888")
                .shopName("Test Super Kirana")
                .shopAddress("Market Square")
                .build();

        AuthResponse auth = authService.register(regReq);
        assertNotNull(auth.getToken());
        assertNotNull(auth.getShopId());
        String shopId = auth.getShopId();

        // 2. Add Products: Rice 25 kg @ Rs 60/kg
        ProductDto rice = inventoryService.createProduct(shopId, ProductRequest.builder()
                .name("Rice")
                .category("Grains")
                .quantity(new BigDecimal("25.00"))
                .unit("kg")
                .price(new BigDecimal("60.00"))
                .minStock(new BigDecimal("5.00"))
                .build());
        assertEquals(0, new BigDecimal("25.00").compareTo(rice.getQuantity()));

        // 3. Test AI NLP Parsing: "Ramesh ki 2 kilo rice icha 340 rupees, 300 paid"
        NaturalSaleParseResponse parsed = aiService.parseNaturalSale("Ramesh ki 2 kilo rice icha 340 rupees, 300 paid");
        assertNotNull(parsed);
        assertEquals("Ramesh", parsed.getCustomerName());
        assertTrue(parsed.getItems().size() > 0);
        assertEquals("Rice", parsed.getItems().get(0).getName());
        assertEquals(0, new BigDecimal("2").compareTo(parsed.getItems().get(0).getQuantity()));

        // 4. Create Authoritative Sale:
        // Ramesh buys 2 kg Rice @ 60 = 120 total.
        // Customer pays 100, 20 outstanding on credit.
        CreateSaleRequest saleReq = CreateSaleRequest.builder()
                .customerName("Ramesh")
                .customerPhone("9876543210")
                .items(List.of(
                        SaleItemRequest.builder()
                                .productName("Rice")
                                .quantity(new BigDecimal("2.00"))
                                .unit("kg")
                                .unitPrice(new BigDecimal("60.00"))
                                .build()
                ))
                .receivedAmount(new BigDecimal("100.00"))
                .paymentMode("CASH")
                .rawInput("Ramesh bought 2kg rice for 120, paid 100")
                .build();

        SaleResponse saleRes = saleService.createSale(shopId, saleReq);
        assertEquals(0, new BigDecimal("120.00").compareTo(saleRes.getTotalAmount()));
        assertEquals(0, new BigDecimal("100.00").compareTo(saleRes.getReceivedAmount()));
        assertEquals(0, new BigDecimal("20.00").compareTo(saleRes.getOutstandingAmount()));
        assertEquals("PARTIAL", saleRes.getStatus());

        // 5. Verify Stock was deducted (25 -> 23 kg)
        List<ProductDto> products = inventoryService.getProducts(shopId);
        ProductDto updatedRice = products.stream().filter(p -> p.getName().equalsIgnoreCase("Rice")).findFirst().orElseThrow();
        assertEquals(0, new BigDecimal("23.00").compareTo(updatedRice.getQuantity()));

        // 6. Verify Customer Khata balance (Ramesh owes Rs 20)
        List<CustomerDto> debtors = customerKhataService.getCustomers(shopId, true);
        CustomerDto ramesh = debtors.stream().filter(c -> c.getName().equalsIgnoreCase("Ramesh")).findFirst().orElseThrow();
        assertEquals(0, new BigDecimal("20.00").compareTo(ramesh.getBalance()));

        // 7. Verify Insufficient Stock Check (Attempt to buy 50 kg when only 23 kg available)
        assertThrows(IllegalArgumentException.class, () -> {
            saleService.createSale(shopId, CreateSaleRequest.builder()
                    .customerName("Suresh")
                    .items(List.of(
                            SaleItemRequest.builder()
                                    .productName("Rice")
                                    .quantity(new BigDecimal("50.00"))
                                    .unit("kg")
                                    .unitPrice(new BigDecimal("60.00"))
                                    .build()
                    ))
                    .receivedAmount(new BigDecimal("3000.00"))
                    .build());
        });

        // 8. Record Khata repayment of Rs 20
        CustomerDto clearRamesh = customerKhataService.recordPayment(shopId, ramesh.getId(), PaymentRecordRequest.builder()
                .amount(new BigDecimal("20.00"))
                .paymentMode("UPI")
                .note("Repaid via PhonePe")
                .build());
        assertEquals(0, BigDecimal.ZERO.compareTo(clearRamesh.getBalance()));

        // 9. Verify AI Query Service: "How much rice is left?"
        AiQueryResponse aiStock = aiQueryService.executeQuery(shopId, "How much rice is left?");
        assertNotNull(aiStock.getReply());
        assertTrue(aiStock.getReply().contains("23"));
    }
}
