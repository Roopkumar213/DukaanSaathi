# DukaanAI Frontend

A clean, modern React 19 + TypeScript + Vite + Tailwind CSS v4 web application designed for small Indian retailers (kirana stores) to manage billing, inventory, khata credit ledger, payments, and AI-assisted queries.

## Development Commands

```bash
# Install dependencies
npm install

# Start local dev server (default: http://localhost:5173)
npm run dev

# Type check & build for production
npm run build

# Preview production build locally
npm run preview
```

## Architecture & Project Structure

- `src/main.tsx` - Application entrypoint mounting `App.tsx`
- `src/App.tsx` - App layout with Sidebar, Header, SearchOverlay, Toast notifications, and dynamic page routing
- `src/store.tsx` - Centralized React state management (products, customers, khata balances, sales, transactions, activity logs, AI assistant state)
- `src/index.css` - Tailwind CSS v4 styling, custom CSS tokens, typography, and micro-animation keyframes
- `src/components/`
  - `Header.tsx` - Top bar with page title, search shortcut (⌘K), and notification badges
  - `Sidebar.tsx` - Navigation drawer with shop branding, sync status, and section tabs
  - `SearchOverlay.tsx` - Instant global search across products, khata customers, and transactions
  - `Toast.tsx` - Feedback notifications
  - `ui.tsx` - Modular design system (Button, Badge, StatusBadge, KPICard, Card, Modal, Input, Tabs)
- `src/pages/`
  - `Dashboard.tsx` - Overview metrics (Daily revenue, outstanding credit, low stock alerts, quick actions)
  - `Sales.tsx` - New bill creation, item entry, receipt generation, payment recording
  - `SaleDetail.tsx` - Detailed receipt breakdown with share/print actions
  - `Inventory.tsx` - Stock listing, low stock alerts, bulk updates, product addition
  - `Khata.tsx` - Digital ledger for customer credit, debt collection reminders, transaction history
  - `Payments.tsx` - Daily settlement tracking, UPI vs Cash analytics
  - `AIAssistant.tsx` - Shop AI bot answering inventory, outstanding debts, sales metrics, and voice input
  - `Activity.tsx` - Chronological audit log of shop operations
  - `Settings.tsx` - Store profile, currency formatting, preferences
