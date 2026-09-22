package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.CustomerDtos.*;
import com.dukaanai.backend.entity.Customer;
import com.dukaanai.backend.entity.KhataTransaction;
import com.dukaanai.backend.entity.Payment;
import com.dukaanai.backend.entity.Shop;
import com.dukaanai.backend.repository.CustomerRepository;
import com.dukaanai.backend.repository.KhataTransactionRepository;
import com.dukaanai.backend.repository.PaymentRepository;
import com.dukaanai.backend.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerKhataService {

    private final CustomerRepository customerRepository;
    private final ShopRepository shopRepository;
    private final PaymentRepository paymentRepository;
    private final KhataTransactionRepository khataTransactionRepository;

    public List<CustomerDto> getCustomers(String shopId, boolean hasDebtOnly) {
        List<Customer> list = hasDebtOnly
                ? customerRepository.findByShopIdAndBalanceGreaterThanOrderByBalanceDesc(shopId, BigDecimal.ZERO)
                : customerRepository.findByShopIdOrderByNameAsc(shopId);

        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public CustomerDetailDto getCustomerDetail(String shopId, String customerId) {
        Customer customer = customerRepository.findById(customerId)
                .filter(c -> c.getShop().getId().equals(shopId))
                .orElseThrow(() -> new IllegalArgumentException("Customer not found or access denied"));

        List<KhataTransactionDto> txs = khataTransactionRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(tx -> KhataTransactionDto.builder()
                        .id(tx.getId())
                        .type(tx.getType())
                        .amount(tx.getAmount())
                        .balanceAfter(tx.getBalanceAfter())
                        .note(tx.getNote())
                        .createdAt(tx.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return CustomerDetailDto.builder()
                .id(customer.getId())
                .name(customer.getName())
                .phone(customer.getPhone())
                .balance(customer.getBalance())
                .creditLimit(customer.getCreditLimit())
                .transactions(txs)
                .build();
    }

    @Transactional
    public CustomerDto createCustomer(String shopId, CustomerRequest req) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found: " + shopId));

        Customer existing = customerRepository.findByShopIdAndNameIgnoreCase(shopId, req.getName()).orElse(null);
        if (existing != null) {
            if (req.getPhone() != null && !req.getPhone().isEmpty()) {
                existing.setPhone(req.getPhone());
            }
            return mapToDto(customerRepository.save(existing));
        }

        Customer customer = Customer.builder()
                .shop(shop)
                .name(req.getName().trim())
                .phone(req.getPhone())
                .balance(req.getBalance() != null ? req.getBalance() : BigDecimal.ZERO)
                .creditLimit(req.getCreditLimit() != null ? req.getCreditLimit() : new BigDecimal("5000.00"))
                .build();

        return mapToDto(customerRepository.save(customer));
    }

    @Transactional
    public CustomerDto updateCustomer(String shopId, String customerId, CustomerRequest req) {
        Customer customer = customerRepository.findById(customerId)
                .filter(c -> c.getShop().getId().equals(shopId))
                .orElseThrow(() -> new IllegalArgumentException("Customer not found or access denied"));

        customer.setName(req.getName().trim());
        if (req.getPhone() != null) {
            customer.setPhone(req.getPhone());
        }
        if (req.getCreditLimit() != null) {
            customer.setCreditLimit(req.getCreditLimit());
        }
        return mapToDto(customerRepository.save(customer));
    }

    @Transactional
    public CustomerDto recordPayment(String shopId, String customerId, PaymentRecordRequest req) {
        Customer customer = customerRepository.findById(customerId)
                .filter(c -> c.getShop().getId().equals(shopId))
                .orElseThrow(() -> new IllegalArgumentException("Customer not found or access denied"));

        BigDecimal amount = req.getAmount();
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }

        BigDecimal newBalance = customer.getBalance().subtract(amount);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            newBalance = BigDecimal.ZERO;
        }
        customer.setBalance(newBalance);
        Customer saved = customerRepository.save(customer);

        // Record payment
        Payment payment = Payment.builder()
                .shop(customer.getShop())
                .customer(customer)
                .customerName(customer.getName())
                .amount(amount)
                .paymentMode(req.getPaymentMode() != null ? req.getPaymentMode().toUpperCase() : "CASH")
                .note(req.getNote() != null ? req.getNote() : "Khata repayment")
                .build();
        paymentRepository.save(payment);

        // Record khata transaction
        KhataTransaction tx = KhataTransaction.builder()
                .shop(customer.getShop())
                .customer(customer)
                .type("DEBIT") // DEBIT reduces outstanding balance
                .amount(amount)
                .balanceAfter(newBalance)
                .note(req.getNote() != null ? req.getNote() : "Payment received (" + req.getPaymentMode() + ")")
                .build();
        khataTransactionRepository.save(tx);

        return mapToDto(saved);
    }

    public List<PaymentDto> getPayments(String shopId) {
        return paymentRepository.findByShopIdOrderByCreatedAtDesc(shopId).stream()
                .map(p -> PaymentDto.builder()
                        .id(p.getId())
                        .customerId(p.getCustomer() != null ? p.getCustomer().getId() : null)
                        .customerName(p.getCustomerName())
                        .saleId(p.getSale() != null ? p.getSale().getId() : null)
                        .amount(p.getAmount())
                        .paymentMode(p.getPaymentMode())
                        .note(p.getNote())
                        .createdAt(p.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private CustomerDto mapToDto(Customer c) {
        return CustomerDto.builder()
                .id(c.getId())
                .name(c.getName())
                .phone(c.getPhone())
                .balance(c.getBalance())
                .creditLimit(c.getCreditLimit())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
