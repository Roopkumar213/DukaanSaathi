import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#334155] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-[10px] border border-[#E2E8F0] p-8 sm:p-10">
        <div className="mb-6 flex items-center justify-between border-b border-[#F1F5F9] pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Privacy Policy</h1>
            <p className="text-sm text-[#64748B] mt-1">Last Updated: January 1, 2026</p>
          </div>
          <Link
            to="/app"
            className="text-sm font-medium text-[#1E40AF] hover:text-[#1D4ED8] transition-colors"
          >
            &larr; Back to App
          </Link>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">1. Introduction</h2>
            <p>
              DukaanAI is committed to protecting the privacy and security of small retailers and their customer data. This Privacy Policy details the types of information we collect, how it is secured, and how it is processed.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-600">
              <li><strong>Account Information:</strong> Merchant name, email address, phone number, and hashed authentication credentials.</li>
              <li><strong>Store Data:</strong> Shop name, address, business category, and state details.</li>
              <li><strong>Operational Data:</strong> Product catalog, inventory stock levels, unit pricing, customer ledger balances, and payment receipts.</li>
              <li><strong>AI Queries &amp; Audio Input:</strong> Audio transcripts and text entries submitted to the AI assistant solely for parsing intent and structuring transactions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">3. How Your Information Is Used</h2>
            <p>
              Your store data is exclusively used to provide retail ledger functionality, calculate inventory balances, generate sales receipts, and answer shop-specific queries. We do not sell, rent, or monetize your retail transaction data with third parties or advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">4. Multi-Tenant Security &amp; Data Isolation</h2>
            <p>
              Every API request is authenticated using JWT tokens validated against your registered merchant account. Queries and database mutations enforce tenant isolation filters on every transaction. No merchant can access or view another merchant&apos;s products, customer records, or financial statistics.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">5. Data Retention &amp; Deletion</h2>
            <p>
              Your store records are retained as long as your account remains active. You may export or request complete deletion of your shop and associated data at any time by contacting our administrators.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">6. Inquiries</h2>
            <p>
              If you have any questions or concerns regarding our privacy practices, please contact us at <span className="font-mono text-slate-900">privacy@dukaanai.local</span>.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} DukaanAI. All rights reserved.</span>
          <Link to="/terms-of-service" className="hover:text-slate-800 underline">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
