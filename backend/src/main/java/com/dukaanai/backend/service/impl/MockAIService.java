package com.dukaanai.backend.service.impl;

import com.dukaanai.backend.dto.AiDtos.NaturalSaleParseResponse;
import com.dukaanai.backend.dto.AiDtos.ParsedSaleItem;
import com.dukaanai.backend.service.AIService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service("mockAIService")
public class MockAIService implements AIService {

    @Override
    public NaturalSaleParseResponse parseNaturalSale(String text) {
        String lower = text.toLowerCase();
        String customerName = "Walk-in Customer";
        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal amountPaid = BigDecimal.ZERO;
        String paymentMode = "CASH";

        // Known customer names
        String[] sampleCustomers = {"ramesh", "lakshmi", "suresh", "priya", "ganesh", "meena", "raju", "kavya", "mohan", "sunita", "anita", "vijay", "ravi"};
        for (String c : sampleCustomers) {
            if (lower.contains(c)) {
                customerName = Character.toUpperCase(c.charAt(0)) + c.substring(1);
                break;
            }
        }

        // Extract numbers and currencies: e.g. "340 rupees", "rs 340", "₹340", "340"
        Pattern pricePattern = Pattern.compile("(?:rs\\.?|₹)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:rupees|rs|rupiah|rupaye)?");
        Matcher priceMatcher = pricePattern.matcher(lower);
        List<BigDecimal> foundNumbers = new ArrayList<>();
        while (priceMatcher.find()) {
            try {
                String val = priceMatcher.group(1);
                foundNumbers.add(new BigDecimal(val));
            } catch (Exception ignored) {}
        }

        // Known items and quantities
        List<ParsedSaleItem> items = new ArrayList<>();
        String[] productKeywords = {"rice", "chawal", "sugar", "cheeni", "dal", "surf", "surf excel", "oil", "tel", "atta", "wheat", "milk", "tea", "chai", "biscuit", "soap"};

        for (String pk : productKeywords) {
            if (lower.contains(pk)) {
                String prodName = Character.toUpperCase(pk.charAt(0)) + pk.substring(1);
                if (pk.equals("chawal")) prodName = "Rice";
                if (pk.equals("cheeni")) prodName = "Sugar";
                if (pk.equals("tel")) prodName = "Oil";

                // Look for quantity before product name: e.g. "2 kilo", "2 kg", "1 packet", "1 liter", "2 l"
                Pattern qtyPattern = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*(kilo|kg|packet|pack|packets|l|liter|litre|litres|pcs|pieces)?\\s*" + pk);
                Matcher qtyMatcher = qtyPattern.matcher(lower);
                BigDecimal qty = BigDecimal.ONE;
                String unit = "kg";
                if (qtyMatcher.find()) {
                    try {
                        qty = new BigDecimal(qtyMatcher.group(1));
                    } catch (Exception ignored) {}
                    if (qtyMatcher.group(2) != null) {
                        unit = qtyMatcher.group(2);
                        if (unit.startsWith("kilo")) unit = "kg";
                        if (unit.startsWith("lit")) unit = "L";
                        if (unit.startsWith("pack")) unit = "packets";
                    }
                }

                items.add(ParsedSaleItem.builder()
                        .name(prodName)
                        .quantity(qty)
                        .unit(unit)
                        .estimatedPrice(BigDecimal.ZERO)
                        .build());
            }
        }

        // Default item if none detected
        if (items.isEmpty()) {
            items.add(ParsedSaleItem.builder()
                    .name("General Item")
                    .quantity(BigDecimal.ONE)
                    .unit("pcs")
                    .estimatedPrice(BigDecimal.ZERO)
                    .build());
        }

        // Extract total amount & paid amount
        // If query specifies e.g. "340 rupees" and "300 paid"
        Pattern paidPattern = Pattern.compile("(\\d+)\\s*(?:paid|de diya|received|mil gaye)");
        Matcher paidMatcher = paidPattern.matcher(lower);
        if (paidMatcher.find()) {
            amountPaid = new BigDecimal(paidMatcher.group(1));
        }

        // Look for largest number as total amount if not explicitly assigned
        for (BigDecimal n : foundNumbers) {
            if (n.compareTo(new BigDecimal("10")) >= 0 && n.compareTo(totalAmount) > 0) {
                totalAmount = n;
            }
        }

        // Fallback default amount if none found
        if (totalAmount.compareTo(BigDecimal.ZERO) == 0) {
            totalAmount = new BigDecimal("100.00");
        }

        // Payment mode & credit detection
        if (lower.contains("khata") || lower.contains("udhar") || lower.contains("credit") || lower.contains("baki") || lower.contains("baaki")) {
            paymentMode = "KHATA";
            if (amountPaid.compareTo(BigDecimal.ZERO) == 0 && !lower.contains("paid")) {
                amountPaid = BigDecimal.ZERO;
            }
        } else if (lower.contains("upi") || lower.contains("phonepe") || lower.contains("gpay") || lower.contains("paytm")) {
            paymentMode = "UPI";
            if (amountPaid.compareTo(BigDecimal.ZERO) == 0) {
                amountPaid = totalAmount;
            }
        } else {
            // Default cash
            paymentMode = "CASH";
            if (amountPaid.compareTo(BigDecimal.ZERO) == 0 && !lower.contains("credit") && !lower.contains("khata")) {
                amountPaid = totalAmount;
            }
        }

        BigDecimal amountCredit = totalAmount.subtract(amountPaid);
        if (amountCredit.compareTo(BigDecimal.ZERO) < 0) {
            amountCredit = BigDecimal.ZERO;
        }

        return NaturalSaleParseResponse.builder()
                .customerName(customerName)
                .items(items)
                .totalAmount(totalAmount)
                .amountPaid(amountPaid)
                .amountCredit(amountCredit)
                .paymentMode(paymentMode)
                .confidenceScore(0.96)
                .rawText(text)
                .build();
    }

    @Override
    public String askAssistant(String prompt, String systemInstruction) {
        return "DukaanAI Assistant is ready. Ask specific questions about your inventory, sales, customers, or khata balances.";
    }

    @Override
    public String generateGroundedResponse(String question, String intent, String groundedDataJson, String language) {
        // Mock / deterministic response based directly on provided grounded data
        return null;
    }
}
