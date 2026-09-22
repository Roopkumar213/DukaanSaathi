import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#334155] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-[10px] border border-[#E2E8F0] p-8 sm:p-10">
        <div className="mb-6 flex items-center justify-between border-b border-[#F1F5F9] pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Terms of Service</h1>
            <p className="text-sm text-[#64748B] mt-1">Effective Date: January 1, 2026</p>
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
            <h2 className="text-base font-semibold text-slate-900 mb-2">1. Agreement to Terms</h2>
            <p>
              By registering an account, accessing, or using DukaanAI (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use the application.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">2. Business Account &amp; Shop Isolation</h2>
            <p>
              Each account corresponds to an authenticated merchant and designated store identity (&quot;Shop&quot;). You are responsible for maintaining the confidentiality of your login credentials and for all activities conducted under your store.duk DukaanAI enforces strict cryptographic shop-level isolation to ensure your business data is only accessible to authorized principals.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">3. Digital Khata &amp; Authoritative Pricing</h2>
            <p>
              DukaanAI provides tools for recording sales, inventory transactions, customer records, and credit ledgers (&quot;Khata&quot;). All financial totals, inventory deductions, and credit balances are authoritative as calculated and recorded by the backend database service. The application is an administrative ledger and does not provide financial lending or banking guarantees.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">4. AI Assistant &amp; Voice Commands</h2>
            <p>
              The AI assistant provides structured transaction extraction and grounded inventory inquiries. AI-generated transaction drafts require explicit merchant confirmation prior to modifying database records or committing financial entries.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">5. Data Ownership &amp; Integrity</h2>
            <p>
              You retain ownership of all product lists, customer entries, sales records, and ledger data created in your shop. DukaanAI does not fabricate dummy data or alter your historical financial records.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">6. Limitation of Liability</h2>
            <p>
              DukaanAI is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. In no event shall DukaanAI be liable for indirect, incidental, or consequential damages resulting from store operation, pricing disputes, or network outages.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">7. Contact Information</h2>
            <p>
              For legal inquiries or account termination requests, please contact our support team at <span className="font-mono text-slate-900">support@dukaanai.local</span>.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} DukaanAI. All rights reserved.</span>
          <Link to="/privacy-policy" className="hover:text-slate-800 underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
