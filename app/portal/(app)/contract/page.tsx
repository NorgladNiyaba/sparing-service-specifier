"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ecssIncludedAgencyNotices,
  ecssAdditionalAgencyNoticeFee,
  formatCurrency,
  getStateName,
} from "@/lib/pricing";
import type { Client } from "@/lib/supabase/types";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function paymentScheduleLabel(schedule: string) {
  if (schedule === "monthly-1st") return "Monthly — billed on the 1st";
  if (schedule === "monthly-16th") return "Monthly — billed on the 16th";
  return "Semi-monthly — billed on the 1st & 16th";
}

const ohssIncluded = [
  "Scheduled advisory sessions with your dedicated Sparing advisor",
  "On-site or virtual operational and compliance support",
  "Strategic financial planning and reporting guidance",
  "Full-service back-office coordination",
  "Custom deliverables and project-based engagements",
];

const icssIncluded = [
  "Good standing and compliance support",
  "Federal and state agency notice management",
  "QuickBooks setup and basic account organisation",
  "Limited payroll support and payroll tax guidance",
  "Expense classification and receipt tracking",
];

const ecssIncluded = [
  "Revenue-based monthly support that scales with the business",
  "Agency notice management — 2 notices included per month",
  "Payroll coordination and worker onboarding guidance",
  "Accounting organisation, expense tracking, and tax account support",
  "Compliance and advisory help for a growing operation",
];

function OhssBody({ client }: { client: Client }) {
  const agreementDate = formatDate(client.signed_at);
  const companyName = client.company_name || client.full_name;
  const billingAddress = client.billing_address?.trim() || "[Client Address]";
  const signerName = client.full_name.trim() || "[Authorised Signatory]";
  const signerTitle = client.signer_title?.trim() || "[Title]";
  const scheduleStr = paymentScheduleLabel(client.payment_schedule);

  return (
    <div className="space-y-5 text-[0.82rem] leading-[1.7]" style={{ color: "#4b5563" }}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "#171717" }}>
        Office Hours Subscription Service Agreement
      </p>

      <p>
        This Service Agreement ("<strong>Agreement</strong>") is entered into and made effective as of{" "}
        <strong style={{ color: "#171717" }}>{agreementDate}</strong> (the "<strong>Effective Date</strong>"),
        by and between <strong>SPARING CONSULTING INC.</strong>, a corporation with its principal place of business
        located at 7230 Lee Deforest Dr Suite 202, Columbia, MD 21046 (the "<strong>Company</strong>"), and{" "}
        <strong style={{ color: "#171717" }}>{companyName}</strong>, with its official address at{" "}
        <strong style={{ color: "#171717" }}>{billingAddress}</strong>{" "}
        (the "<strong>Client</strong>"), represented by{" "}
        <strong style={{ color: "#171717" }}>{signerName}</strong>,{" "}
        <strong style={{ color: "#171717" }}>{signerTitle}</strong>.
      </p>
      <p>
        For purposes of this Agreement, the Company and the Client may be referred to individually as a "Party" or
        collectively as the "Parties."
      </p>
      <p>
        NOW, THEREFORE, in consideration of the mutual promises, covenants, and agreements set forth herein, the
        Parties agree to the following terms and conditions.
      </p>

      <p className="font-semibold" style={{ color: "#171717" }}>Terms and Conditions</p>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>1. Introduction</p>
        <p className="mt-1">
          Sparing Consulting Inc. (the "Company") has established in this Agreement the fundamental terms and
          conditions of business (the "Terms"), which, together with the Proposal (collectively referred to as "this
          Agreement"), shall govern all work undertaken for the Client in connection with this engagement.
        </p>
        <p className="mt-1">
          In the event of any conflict between the Terms and the Proposal, the provisions of the Proposal shall take
          precedence.
        </p>
        <p className="mt-1">
          For the purposes of these Terms, the term "Company" shall encompass its partners, employees,
          subcontractors, advisers, and any affiliated or related entities.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>2. Duration</p>
        <p className="mt-1">
          The term of this Agreement shall be the calendar year, automatically renewing on January 1 of the
          subsequent year. Upon renewal, the pricing may be subject to adjustments as outlined in the Pricing
          Section. Either party may amend or terminate the implied terms of this Agreement exclusively by January 31
          of the new calendar year or within thirty (30) days following the execution of a new Agreement.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>3. Information</p>
        <p className="mt-1">
          The quality of services provided by Sparing Consulting Inc. is contingent upon the Client's full and
          timely cooperation, including the provision of clear and accurate instructions. Sparing Consulting Inc.
          shall rely on the accuracy and completeness of all information provided by the Client or on their behalf.
          Unless expressly agreed upon as part of this engagement, Sparing Consulting Inc. will not independently
          verify such information.
        </p>
        <p className="mt-1">
          The Client retains full responsibility for any use of, or reliance on, the advice, recommendations, or
          other deliverables provided by Sparing Consulting Inc. in connection with the delivery of its services.
        </p>
        <p className="mt-1">
          The Client further agrees that if, after providing information to Sparing Consulting Inc., any event or
          circumstance occurs that renders such information inaccurate, misleading, or incomplete, the Client shall
          promptly notify Sparing Consulting Inc. of such changes.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>4. Delays</p>
        <p className="mt-1">
          The Client agrees that Sparing Consulting Inc. shall not be held liable for any failure or delay in the
          performance of its obligations under this engagement caused by circumstances beyond its reasonable control,
          including but not limited to the actions or omissions of third parties.
        </p>
        <p className="mt-1">
          Sparing Consulting Inc. reserves the right to adjust its fees to account for any additional costs incurred
          because of such delays. In the event the delay is substantial, the Client retains the right to terminate
          this Agreement in accordance with its terms.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>5. Resources</p>
        <p className="mt-1">
          To ensure the highest quality of service delivery, Sparing Consulting Inc. may require access to the
          Client's files, records, information technology systems, premises, personnel, and any additional resources
          necessary for the timely approval, development, and sign-off of all project plans, specifications,
          accounts, and deliverables. The Client agrees to provide Sparing Consulting Inc. with reasonable access to
          these resources at no additional cost.
        </p>
        <p className="mt-1">
          The Client further agrees to respond to all inquiries from Sparing Consulting Inc. within five (5)
          business days. Failure to respond to more than three (3) separate inquiries, each of which will include up
          to three (3) consecutive attempts by Sparing Consulting Inc., may result in the termination of this
          Agreement by Sparing Consulting Inc. at the Client's expense.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>6. Disbursements</p>
        <p className="mt-1">
          In addition to the fees payable to Sparing Consulting Inc., the Client agrees to reimburse the Company for
          reasonable expenses incurred in the provision of services. Such expenses may include, but are not limited
          to, copying/printing costs, telephone charges, and travel expenses. However, any work related to tax
          credit applications will be excluded, as the Client will only be obligated to pay a percentage of the
          credit upon successful approval. Details of all applicable disbursements will be itemized and included in
          Sparing Consulting Inc.'s monthly invoices.
        </p>
        <p className="mt-1">
          Additionally, if Sparing Consulting Inc. is required to produce documents, respond to audit requests,
          prepare applications, or attend court proceedings related to this engagement and to which Sparing
          Consulting Inc. is not a party, the Client agrees to compensate the Company at its standard billing rates
          for such services.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>7. Estimates</p>
        <p className="mt-1">
          Sparing Consulting Inc. may provide the Client with an estimate of anticipated fees and costs for
          additional services to be rendered. The Client acknowledges that the final fees and costs may differ from
          the initial estimate due to modifications in the scope or nature of the engagement, or the emergence of
          unforeseen circumstances. Sparing Consulting Inc. shall endeavor to notify the Client of any material
          changes or increases in costs at the earliest practicable opportunity.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>8. Pricing</p>
        <p className="mt-1 font-medium" style={{ color: "#171717" }}>8.1 Revenue-Based Subscription Fee</p>
        <p className="mt-1">
          The Client agrees to pay a semi-monthly subscription fee to Sparing Consulting Inc., based on the
          Client's cumulative gross revenue generated during the term of this Agreement, in accordance with the
          tiered pricing schedule set out in the Proposal. The applicable subscription fee for this engagement is{" "}
          <strong style={{ color: "#171717" }}>{formatCurrency(client.monthly_price / 2)}</strong>{" "}
          per installment ({" "}
          <strong style={{ color: "#171717" }}>{formatCurrency(client.monthly_price)}</strong> per
          month), billed on the schedule selected:{" "}
          <strong style={{ color: "#171717" }}>{scheduleStr}</strong>.
        </p>
        <p className="mt-1 font-medium" style={{ color: "#171717" }}>8.2 Tier Advancement and Lock-In</p>
        <p className="mt-1">
          Once the Client surpasses a revenue threshold, the corresponding subscription fee will take effect in the
          following billing cycle. Fees will not decrease, even if the Client's revenue declines in subsequent
          months. Monthly fees may only increase as the Client progresses to higher revenue tiers.
        </p>
        <p className="mt-1 font-medium" style={{ color: "#171717" }}>8.3 Annual Continuity</p>
        <p className="mt-1">
          At the beginning of each new calendar year, the Client's cumulative revenue total does not reset.
          Subscription pricing shall continue based on the last tier reached and will adjust only when the Client
          enters a higher revenue band.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>9. Fees &amp; Schedules</p>
        <p className="mt-1 font-medium" style={{ color: "#171717" }}>9.1 Payment Frequency</p>
        <p className="mt-1">
          Subscription fees shall be collected in two equal installments, billed on the 1st and 16th of each
          calendar month. Each installment shall represent the total amount owed under the semi-monthly
          subscription fee based on the Client's current revenue tier.
        </p>
        <p className="mt-1 font-medium" style={{ color: "#171717" }}>9.2 Initial Payment Terms</p>
        <p className="mt-1">
          For Clients with year-to-date gross revenue of $500,000.00 or less at the start of this Agreement, a
          prepayment of $1,083.33 shall be collected upon execution and credited toward the subscription fee once it
          becomes due. For Clients with YTD revenue exceeding $500,000.00, the first month's subscription fee shall
          be charged in full at the time of signing. For Clients who exceeded $500,000.00 in gross revenue in the
          previous calendar year, a retroactive bookkeeping fee of $125.00 per prior month shall be charged for
          each month of the current calendar year that has passed prior to execution, invoiced and paid in full upon
          signing.
        </p>
        <p className="mt-1 font-medium" style={{ color: "#171717" }}>9.3 Automatic Payment Authorization</p>
        <p className="mt-1">
          The Client authorizes Sparing Consulting Inc. to automatically debit the designated payment method on file
          for all subscription fees due under this Agreement. Charges will be made on the 1st and 16th of each
          month, in accordance with the Client's current pricing tier. This authorization shall remain in effect for
          the duration of the Agreement unless revoked in writing with at least ten (10) business days' notice prior
          to a scheduled debit.
        </p>
        <p className="mt-1 font-medium" style={{ color: "#171717" }}>9.4 Late or Failed Payments</p>
        <p className="mt-1">
          If a scheduled payment is declined, returned, or otherwise unsuccessful, the Client shall be notified and
          must update payment details within five (5) business days. A late fee of $50 or 1.5% of the outstanding
          balance, whichever is greater, may apply. Sparing Consulting Inc. reserves the right to suspend services
          for nonpayment until the account is brought current.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>10. Intellectual Property</p>
        <p className="mt-1">
          Sparing Consulting Inc. shall not acquire any ownership rights over the information provided by the
          Client. Upon full payment of all amounts owed, and subject to the provisions below, the Client
          irrevocably grants Sparing Consulting Inc. a perpetual, royalty-free, worldwide license to use, copy,
          modify, adapt, and exploit the deliverables, provided such use does not disclose the Client's
          confidential information.
        </p>
        <p className="mt-1">
          The processes, know-how, ideas, concepts, and techniques utilized or developed by Sparing Consulting Inc.
          while providing services to the Client are proprietary and confidential to Sparing Consulting Inc., which
          retains sole and exclusive rights to such intellectual property, including all tools, enhancements,
          improvements, working papers, and internal documents created or utilized during this engagement.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>11. Software and Tool Management Policy</p>
        <p className="mt-1">
          Sparing Consulting Inc. will provide, at no additional cost to the Client, software related to file
          management, including a secure client portal. For all other software or tools required to deliver
          services, the Client will be billed directly by the respective third-party vendor.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li><strong>Accounting Tools:</strong> Sparing Consulting Inc. will act as primary administrator. The Client is responsible for all vendor fees. Upon termination and full payment, administrator privileges will be returned to the Client.</li>
          <li><strong>Payroll Tools:</strong> Sparing Consulting Inc. will act as a user. The Client shall remain responsible for all fees and charges imposed by the vendor.</li>
          <li><strong>Human Resource Tools:</strong> Sparing may act as administrator or user depending on the Client's needs. The Client bears all vendor fees. Upon termination, Sparing will relinquish access immediately.</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>12. Arbitration</p>
        <p className="mt-1">
          In the event of any dispute arising out of or in connection with this Agreement, such dispute shall be
          resolved through arbitration conducted by a single arbitrator appointed by mutual agreement of the
          Parties. The seat of arbitration shall be established in the State of Maryland. The decision of the
          arbitrator shall be final, binding, and enforceable on both Parties in accordance with applicable law.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>13. Termination</p>
        <ul className="mt-1 list-inside list-disc space-y-1">
          <li><strong>Initial Term:</strong> The initial term of this Agreement shall be the calendar year in which the Agreement is accepted by both Parties.</li>
          <li><strong>Termination for Material Breach or Bankruptcy:</strong> Either Party may terminate this Agreement immediately in the event of a material breach or bankruptcy. The Client agrees to pay all fees and disbursements incurred up to the date of termination.</li>
          <li><strong>Termination Without Cause:</strong> If the Client ceases to use Sparing Consulting Inc.'s services for any reason other than material breach or bankruptcy, the Client agrees to pay the remaining fees due under the Agreement for the duration of the Term. Termination fees apply only if termination occurs after January 31st of any calendar year or more than 30 days after signing a new Agreement.</li>
          <li><strong>Termination Without Penalty:</strong> The Client may terminate without penalty within 30 days of signing a new Agreement or prior to January 31st in the event of service renewal.</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>14. Indemnity</p>
        <p className="mt-1">
          Sparing Consulting Inc. agrees to indemnify, defend, and hold harmless the Client from and against all
          damages, losses, liabilities, costs, and expenses, including reasonable legal fees, incurred as a direct
          result of any act or omission by Sparing. Similarly, the Client agrees to indemnify, defend, and hold
          harmless Sparing from and against all damages, losses, liabilities, costs, and expenses arising out of or
          resulting from any act or omission on the part of the Client.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>15. Confidentiality</p>
        <p className="mt-1">
          The Parties acknowledge that, during their relationship, they may share or gain access to information or
          documentation that is confidential or unpublished in nature. The Parties mutually commit to maintaining
          the confidentiality of all such information obtained during the term of this Agreement. No confidential
          information shall be disclosed to any third party without the prior written consent of the other Party.
          This obligation of confidentiality shall remain in effect both during and after the termination or
          conclusion of this Agreement.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>16. Miscellaneous</p>
        <ul className="mt-1 list-inside list-disc space-y-1">
          <li><strong>Governing Law:</strong> This Agreement shall be governed by and construed with the jurisdiction laws of the State of Maryland.</li>
          <li><strong>Notice:</strong> Any notice required by this Agreement shall be in writing and given by personal delivery, certified mail, or any such delivery service provided.</li>
          <li><strong>Modifications:</strong> The terms herein shall not be reformed, modified, or changed without the prior written consent of the parties. Billing rates and billable hours will only be assessed for modifications at the end of the contractual period (December 31st).</li>
          <li><strong>Force Majeure:</strong> Neither Party shall be liable for any failure in performance of any obligation under this Agreement due to causes beyond that Party's reasonable control, including pandemic, fire, strike, act or order of public authority, and other acts of God.</li>
          <li><strong>Severability:</strong> If any provision is held to be invalid, illegal, or unenforceable, such invalidity will not affect any other provisions, and all other provisions will remain in full force and effect.</li>
          <li><strong>Entirety:</strong> This Agreement sets forth and represents the entire agreement between both parties. Any changes must be in writing and signed by both parties.</li>
        </ul>
      </div>
    </div>
  );
}

function EcssIcssBody({ client }: { client: Client }) {
  const isIcss = client.service_track === "ICSS";
  const trackName = isIcss ? "Independent Contractor" : "Emerging Company";
  const agreementDate = formatDate(client.signed_at);
  const companyName = client.company_name || client.full_name;
  const signerName = client.full_name.trim() || "[Authorised Signatory]";
  const signerTitle = client.signer_title?.trim() || "[Title]";
  const isSemiMonthly = client.payment_schedule === "semi-monthly";
  const scheduleStr = paymentScheduleLabel(client.payment_schedule);
  const stateName = getStateName(client.state || "");
  const included = isIcss ? icssIncluded : ecssIncluded;

  return (
    <div className="space-y-5 text-[0.82rem] leading-[1.7]" style={{ color: "#4b5563" }}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "#171717" }}>
        {trackName} Subscription Service Agreement
      </p>

      <p>
        This {trackName} Subscription Service Agreement ("<strong>Agreement</strong>") is entered into as of{" "}
        <strong style={{ color: "#171717" }}>{agreementDate}</strong> between{" "}
        <strong>Sparing Consulting Inc.</strong>, a corporation with its principal place of business at 7230 Lee
        Deforest Dr Suite 202, Columbia, MD 21046 ("<strong>Company</strong>"), and{" "}
        <strong style={{ color: "#171717" }}>{companyName}</strong>, represented by{" "}
        <strong style={{ color: "#171717" }}>{signerName}</strong>,{" "}
        <strong style={{ color: "#171717" }}>{signerTitle}</strong> ("<strong>Client</strong>").
      </p>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>1. Services</p>
        <p className="mt-1">Sparing Consulting will provide the following ongoing support services under this Agreement:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {included.map((item) => <li key={item}>{item}</li>)}
        </ul>
        {!isIcss && (
          <p className="mt-2">
            Agency notice management includes {ecssIncludedAgencyNotices} government or regulatory notices per
            calendar month. Additional notices are billed at {formatCurrency(ecssAdditionalAgencyNoticeFee)} each.
          </p>
        )}
        <p className="mt-2">
          The scope of services may be adjusted by mutual written agreement. Services not enumerated above may be
          quoted separately.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>2. Duration</p>
        <p className="mt-1">
          The term of this Agreement shall be the calendar year, automatically renewing on January 1 of the
          subsequent year. Upon renewal, the pricing may be subject to adjustments. Either party may amend or
          terminate this Agreement exclusively by January 31 of the new calendar year or within thirty (30) days
          following the execution of a new Agreement.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>3. Payment Terms</p>
        <p className="mt-1">
          Client agrees to pay{" "}
          {isSemiMonthly ? (
            <>
              <strong style={{ color: "#171717" }}>{formatCurrency(client.monthly_price / 2)}/installment</strong>{" "}
              (<strong style={{ color: "#171717" }}>{formatCurrency(client.monthly_price)}/month</strong>)
            </>
          ) : (
            <strong style={{ color: "#171717" }}>{formatCurrency(client.monthly_price)}/month</strong>
          )},
          {" "}billed on the schedule selected: <strong style={{ color: "#171717" }}>{scheduleStr}</strong>.
          Invoices are due upon receipt. The Client authorises Sparing Consulting Inc. to automatically debit the
          designated payment method on file. This authorisation shall remain in effect for the duration of the
          Agreement unless revoked in writing with at least ten (10) business days' notice prior to a scheduled
          debit. A late fee of $50 or 1.5% of the outstanding balance, whichever is greater, may apply for overdue
          payments. Sparing reserves the right to suspend services for accounts 30 or more days past due. All fees
          are non-refundable except as otherwise required by applicable law.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>4. Termination</p>
        <p className="mt-1">
          Either party may terminate this Agreement with 30 days prior written notice. The Client may terminate
          without penalty within 30 days of signing or prior to January 31st in the event of service renewal. If
          termination occurs after January 31st, the Client agrees to pay Sparing Consulting Inc. the remaining
          fees due under the Agreement for the duration of the term. Sparing may terminate immediately upon material
          breach by Client.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>5. Client Responsibilities</p>
        <p className="mt-1">
          Client agrees to: (a) provide accurate and complete information as reasonably requested by Sparing;
          (b) respond to Sparing communications within five (5) business days; (c) maintain organised records and
          provide timely access to relevant documents, accounts, and credentials; and (d) promptly notify Sparing
          of any material changes to business operations, ownership, or structure. Failure to respond to more than
          three (3) separate inquiries may result in termination at the Client's expense.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>6. Confidentiality</p>
        <p className="mt-1">
          Each party agrees to hold in confidence all non-public, proprietary, or sensitive information disclosed
          by the other party in connection with this Agreement, and to use such information solely for purposes of
          performing obligations hereunder. This obligation survives termination of the Agreement.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>7. Limitation of Liability</p>
        <p className="mt-1">
          Sparing's aggregate liability to Client shall not exceed the total fees paid by Client in the 90-day
          period immediately preceding the event giving rise to the claim. In no event shall Sparing be liable for
          any indirect, incidental, special, punitive, or consequential damages. Each party agrees to indemnify,
          defend, and hold harmless the other from damages arising from their own acts or omissions.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>8. Intellectual Property</p>
        <p className="mt-1">
          All proprietary tools, templates, methodologies, workflows, and processes developed by Sparing remain its
          sole and exclusive property. Deliverables prepared specifically for Client are licensed for internal
          business use on a non-exclusive basis. Sparing shall not acquire ownership rights over information
          provided by the Client.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>9. Governing Law and Dispute Resolution</p>
        <p className="mt-1">
          This Agreement shall be governed by the laws of the State of{" "}
          <strong style={{ color: "#171717" }}>{stateName || "Maryland"}</strong>. The seat of arbitration shall
          be established in the State of Maryland. Any dispute shall first be subject to good-faith negotiation,
          and if unresolved within 30 days, shall be submitted to binding arbitration under a single arbitrator
          appointed by mutual agreement of the parties. The arbitrator's decision shall be final and binding on
          both parties.
        </p>
      </div>

      <div>
        <p className="font-semibold" style={{ color: "#171717" }}>10. Miscellaneous</p>
        <p className="mt-1">
          This Agreement constitutes the entire agreement between the parties and supersedes all prior discussions
          and agreements. Any modification must be made in writing and signed by authorised representatives of both
          parties. If any provision is held unenforceable, the remaining provisions continue in full force. Neither
          party shall be liable for any failure in performance due to causes beyond their reasonable control,
          including pandemic, fire, strike, or acts of God.
        </p>
      </div>
    </div>
  );
}

export default function ContractPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (supabase.from("clients").select("*").maybeSingle() as unknown as Promise<{ data: Client | null }>)
      .then(({ data }) => { setClient(data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "#9ca3af" }}>Loading agreement…</p>
      </div>
    );
  }

  if (!client) return null;

  const isOhss = client.service_track === "OHSS";

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div
        className="flex items-center justify-between border-b bg-white px-8 py-4 print:hidden"
        style={{ borderColor: "#ebecef" }}
      >
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Sparing" className="h-7 w-7 shrink-0" />
          <span className="text-sm font-semibold" style={{ color: "#171717" }}>Service Agreement</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/portal/documents"
            className="rounded-full border px-4 py-2 text-xs font-medium transition hover:border-[#d8dbe1]"
            style={{ borderColor: "#ebecef", color: "#70757f" }}
          >
            ← Back to Documents
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-full px-4 py-2 text-xs font-semibold text-white transition hover:opacity-85"
            style={{ background: "#d61b17" }}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Contract body */}
      <div className="mx-auto max-w-3xl px-8 py-12 print:px-6 print:py-8">
        {/* Header */}
        <div className="mb-10 border-b pb-8" style={{ borderColor: "#ebecef" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <img src="/logo.png" alt="Sparing" className="h-8 w-8 shrink-0" />
            <span className="text-sm font-bold tracking-[-0.01em]" style={{ color: "#171717" }}>Sparing Consulting Inc.</span>
          </div>
          <h1 className="text-2xl font-bold tracking-[-0.025em]" style={{ color: "#171717" }}>
            Service Agreement
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
            Signed {formatDate(client.signed_at)} · {client.service_track}
          </p>
        </div>

        {/* Full contract text */}
        {isOhss ? <OhssBody client={client} /> : <EcssIcssBody client={client} />}

        {/* Signatures */}
        <div className="mt-12 border-t pt-10" style={{ borderColor: "#ebecef" }}>
          <p className="mb-6 text-[0.7rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "#9ca3af" }}>
            Signatures
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-xl border p-5" style={{ borderColor: "#ebecef" }}>
              <p className="mb-3 text-[0.67rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>
                Sparing Consulting Inc.
              </p>
              <p
                className="mb-1 text-[1.5rem] leading-none"
                style={{ fontFamily: "'Segoe Script','Apple Chancery','URW Chancery L',cursive", color: "#171717" }}
              >
                Mireille Bakal
              </p>
              <div className="mb-3 h-px w-full" style={{ background: "#d8dbe1" }} />
              <p className="text-xs font-medium" style={{ color: "#171717" }}>Mireille Bakal</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>Authorised Signatory</p>
              <p className="mt-2 text-xs" style={{ color: "#9ca3af" }}>{formatDate(client.signed_at)}</p>
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: "#ebecef" }}>
              <p className="mb-3 text-[0.67rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>
                Client
              </p>
              <p
                className="mb-1 text-[1.5rem] leading-none"
                style={{ fontFamily: "'Segoe Script','Apple Chancery','URW Chancery L',cursive", color: "#171717" }}
              >
                {client.full_name}
              </p>
              <div className="mb-3 h-px w-full" style={{ background: "#d8dbe1" }} />
              <p className="text-xs font-medium" style={{ color: "#171717" }}>{client.full_name}</p>
              {client.signer_title && (
                <p className="text-xs" style={{ color: "#9ca3af" }}>{client.signer_title}</p>
              )}
              {client.company_name && (
                <p className="text-xs" style={{ color: "#9ca3af" }}>{client.company_name}</p>
              )}
              <p className="mt-2 text-xs" style={{ color: "#9ca3af" }}>{formatDate(client.signed_at)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 border-t pt-6 text-center" style={{ borderColor: "#ebecef" }}>
          <p className="text-xs" style={{ color: "#9ca3af" }}>
            Sparing Consulting Inc. · 7230 Lee Deforest Dr Suite 202, Columbia, MD 21046 · hello@sparingconsulting.com
          </p>
        </div>
      </div>
    </>
  );
}
