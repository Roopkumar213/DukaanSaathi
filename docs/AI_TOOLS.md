# DukaanSaathi AI Business Tools

## Overview

The AI model operates exclusively through **controlled backend tools**. Gemini is **strictly prohibited** from generating arbitrary SQL queries or directly altering database tables.

All database mutations flow through authoritative Spring Data JPA services (`SaleService`, `InventoryService`, `CustomerKhataService`).

---

## Tool Catalog

### 1. `search_products(query)`
- **Purpose**: Looks up products in the authenticated merchant's catalog matching a name or synonym.
- **Authoritative Source**: `ProductRepository.findByShopIdAndNameContainingIgnoreCase(...)`
- **Output**: List of matching products with name, price, unit, and available quantity.

### 2. `check_inventory(productName)`
- **Purpose**: Checks the authoritative stock level and unit price of an item.
- **Zero-Data Rule**: If the product does not exist, returns `PRODUCT_NOT_FOUND` ("Rice is not currently available in your inventory"). Never invents stock or prices.

### 3. `search_customer(customerName)`
- **Purpose**: Searches for registered customers and retrieves their outstanding Khata balance.
- **Authoritative Source**: `CustomerRepository.searchCustomers(...)`
- **Output**: Customer name, phone number, and ledger balance.

### 4. `calculate_sale(customerName, items, paymentMode, claimedAmount)`
- **Purpose**: Authoritatively calculates subtotal, total bill, paid amount, and Khata credit.
- **Rules**:
  - Validates that quantity $> 0$.
  - Validates available stock $\ge$ requested quantity. Throws `INSUFFICIENT_STOCK` if stock is low.
  - Multiplies quantity by database unit price.
  - Passes payment details to `PaymentVerificationService`.
  - Generates a `draftId` and stores a pending sale draft awaiting merchant confirmation.
  - Emits an initial audit log record with `PENDING_CONFIRMATION` status.

### 5. `finalize_sale(draftId)`
- **Purpose**: Finalizes an approved sale draft into an atomic ledger transaction.
- **Authoritative Service**: `SaleService.createSale(shopId, createSaleRequest)`
- **Atomic Operations**:
  - Validates merchant authorization.
  - Decrements inventory stock.
  - Creates itemized `SaleItem` records.
  - Creates `Payment` record with verification status.
  - Records customer Khata transaction if credit was used.
  - Updates audit log status to `CONFIRMED`.

### 6. `query_sales(timeframe)`
- **Purpose**: Queries authoritative sales summary for today.
- **Zero-Data Rule**: If 0 sales occurred today, returns "You have no sales recorded today."
