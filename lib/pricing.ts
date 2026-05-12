export const ecssIncludedAgencyNotices = 2;
export const ecssAdditionalAgencyNoticeFee = 100;
export const icssBaseRate = 150; // starting non-zero ICSS monthly rate
export const ecssBaseRate = 200; // starting non-zero ECSS monthly rate
export const icssRevenueLimit = 300_000;
export const icssEmployeeLimit = 4;
export const ohssRevenueThreshold = 500_000;

export type ServiceTrack = "icss" | "ecss" | "ohss";
export type BusinessType = "independent-contractor" | "startup" | "smb";

export type PricingInputs = {
  businessType: BusinessType;
  stateCode: string;
  city: string;
  employeeCount: number;
  annualRevenue: number;
};

export type IcssRevenuePricing = {
  monthlyPrice: number;
  tierLabel: string;
};

export type Recommendation = {
  serviceTrack: ServiceTrack;
  publicPlanName: string;
  audienceLabel: string;
  monthlyPrice: number;
  revenuePrice: number;
  employeePrice: number;
  locationPrice: number;
  tierLabel: string;
  included: string[];
  summary: string;
};

type EmployeeBand = {
  label: string;
  min: number;
  max: number;
  adjustment: number;
};

const employeeBands: EmployeeBand[] = [
  { label: "Just the owner", min: 0, max: 1, adjustment: 0 },
  { label: "Small team", min: 2, max: 4, adjustment: 40 },
  { label: "Growing team", min: 5, max: 9, adjustment: 90 },
  { label: "Larger team", min: 10, max: 19, adjustment: 180 },
  { label: "Established team", min: 20, max: 34, adjustment: 320 },
  { label: "Scaled team", min: 35, max: 74, adjustment: 540 },
  { label: "Enterprise team", min: 75, max: Number.POSITIVE_INFINITY, adjustment: 850 },
];

const stateAdjustments: Record<string, number> = {
  CA: 125,
  NY: 125,
  NJ: 80,
  IL: 80,
  WA: 80,
  DC: 70,
  MA: 55,
  MD: 40,
  FL: 35,
  GA: 35,
  TX: 35,
  VA: 35,
};

const majorCityKeywords = [
  "new york",
  "brooklyn",
  "los angeles",
  "san francisco",
  "san jose",
  "oakland",
  "washington",
  "chicago",
  "seattle",
  "boston",
  "miami",
  "atlanta",
  "austin",
  "dallas",
  "houston",
];

// ── ICSS tiers ────────────────────────────────────────────────────────────────

type IcssTier = { maxRevenue: number; monthlyPrice: number; label: string };

const icssTiers: IcssTier[] = [
  { maxRevenue: 50_000,  monthlyPrice: 0,   label: "Up to $50,000" },
  { maxRevenue: 100_000, monthlyPrice: 150, label: "$50,001 – $100,000" },
  { maxRevenue: 150_000, monthlyPrice: 200, label: "$100,001 – $150,000" },
  { maxRevenue: 200_000, monthlyPrice: 250, label: "$150,001 – $200,000" },
  { maxRevenue: 250_000, monthlyPrice: 300, label: "$200,001 – $250,000" },
  { maxRevenue: 300_000, monthlyPrice: 350, label: "$250,001 – $300,000" },
];

// ── ECSS tiers ────────────────────────────────────────────────────────────────
// Fees from the semi-monthly column, used as the monthly rate per client instruction.

type EcssTier = { maxRevenue: number; monthlyPrice: number; label: string };

const ecssTiers: EcssTier[] = [
  { maxRevenue: 50_000,  monthlyPrice: 0,   label: "Up to $50,000" },
  { maxRevenue: 100_000, monthlyPrice: 200, label: "$50,001 – $100,000" },
  { maxRevenue: 150_000, monthlyPrice: 275, label: "$100,001 – $150,000" },
  { maxRevenue: 200_000, monthlyPrice: 350, label: "$150,001 – $200,000" },
  { maxRevenue: 250_000, monthlyPrice: 425, label: "$200,001 – $250,000" },
  { maxRevenue: 300_000, monthlyPrice: 500, label: "$250,001 – $300,000" },
  { maxRevenue: 350_000, monthlyPrice: 575, label: "$300,001 – $350,000" },
  { maxRevenue: 400_000, monthlyPrice: 650, label: "$350,001 – $400,000" },
  { maxRevenue: 450_000, monthlyPrice: 725, label: "$400,001 – $450,000" },
  { maxRevenue: 500_000, monthlyPrice: 800, label: "$450,001 – $500,000" },
];

// ── OHSS tiers ────────────────────────────────────────────────────────────────

type OhssTier = { maxRevenue: number; monthlyPrice: number; label: string };

const ohssTiers: OhssTier[] = [
  { maxRevenue: 1_000_000,  monthlyPrice: 2_167,  label: "$500,001 – $1,000,000" },
  { maxRevenue: 1_500_000,  monthlyPrice: 3_250,  label: "$1,000,001 – $1,500,000" },
  { maxRevenue: 2_000_000,  monthlyPrice: 4_333,  label: "$1,500,001 – $2,000,000" },
  { maxRevenue: 2_500_000,  monthlyPrice: 5_417,  label: "$2,000,001 – $2,500,000" },
  { maxRevenue: 3_000_000,  monthlyPrice: 6_500,  label: "$2,500,001 – $3,000,000" },
  { maxRevenue: 4_000_000,  monthlyPrice: 8_667,  label: "$3,000,001 – $4,000,000" },
  { maxRevenue: 5_000_000,  monthlyPrice: 10_833, label: "$4,000,001 – $5,000,000" },
  { maxRevenue: 6_000_000,  monthlyPrice: 13_000, label: "$5,000,001 – $6,000,000" },
  { maxRevenue: 7_000_000,  monthlyPrice: 15_167, label: "$6,000,001 – $7,000,000" },
  { maxRevenue: 8_000_000,  monthlyPrice: 17_333, label: "$7,000,001 – $8,000,000" },
  { maxRevenue: 10_000_000, monthlyPrice: 19_500, label: "$8,000,001 – $10,000,000" },
];

// ── Pricing calculations ──────────────────────────────────────────────────────

export function calculateIcssRevenuePricing(annualRevenue: number): IcssRevenuePricing {
  const safeRevenue = normalizeWholeNumber(annualRevenue);
  const tier = icssTiers.find((t) => safeRevenue <= t.maxRevenue);
  if (tier) return { monthlyPrice: tier.monthlyPrice, tierLabel: tier.label };

  // Extrapolate above $300K: +$50/mo per $50K band (same step rate as the table)
  const lastTier = icssTiers[icssTiers.length - 1];
  const extraBands = Math.ceil((safeRevenue - lastTier.maxRevenue) / 50_000);
  const monthlyPrice = lastTier.monthlyPrice + extraBands * 50;
  const bandStart = lastTier.maxRevenue + (extraBands - 1) * 50_000;
  const bandEnd = lastTier.maxRevenue + extraBands * 50_000;
  return {
    monthlyPrice,
    tierLabel: `${formatCurrency(bandStart + 1)} – ${formatCurrency(bandEnd)}`,
  };
}

export function calculateEcssRevenuePricing(annualRevenue: number): { monthlyPrice: number; tierLabel: string } {
  const safeRevenue = normalizeWholeNumber(annualRevenue);
  const tier = ecssTiers.find((t) => safeRevenue <= t.maxRevenue) ?? ecssTiers[ecssTiers.length - 1];
  return { monthlyPrice: tier.monthlyPrice, tierLabel: tier.label };
}

export function calculateOhssRevenuePricing(annualRevenue: number): { monthlyPrice: number; tierLabel: string } {
  const safeRevenue = normalizeWholeNumber(annualRevenue);
  if (safeRevenue > 10_000_000) return { monthlyPrice: 0, tierLabel: "Above $10,000,000" };
  const tier = ohssTiers.find((t) => safeRevenue <= t.maxRevenue) ?? ohssTiers[ohssTiers.length - 1];
  return { monthlyPrice: tier.monthlyPrice, tierLabel: tier.label };
}

export function calculateRecommendation(inputs: PricingInputs): Recommendation {
  const businessType = inputs.businessType;
  const annualRevenue = normalizeWholeNumber(inputs.annualRevenue);
  const employeeCount = normalizeWholeNumber(inputs.employeeCount);
  const employeeBand = getEmployeeBand(employeeCount);
  const locationPrice = getLocationAdjustment(inputs.stateCode, inputs.city);
  const serviceTrack = getServiceTrack(businessType, employeeCount, annualRevenue, inputs.stateCode);

  if (serviceTrack === "ohss") {
    const ohssRevenue = calculateOhssRevenuePricing(annualRevenue);
    const isNegotiated = ohssRevenue.monthlyPrice === 0;
    return {
      serviceTrack,
      publicPlanName: "Office Hours Support",
      audienceLabel: "Best for established businesses needing dedicated, scheduled advisory.",
      monthlyPrice: ohssRevenue.monthlyPrice,
      revenuePrice: ohssRevenue.monthlyPrice,
      employeePrice: 0,
      locationPrice: 0,
      tierLabel: ohssRevenue.tierLabel,
      included: [
        "Scheduled advisory sessions with your dedicated Sparing advisor",
        "On-site or virtual operational and compliance support",
        "Strategic financial planning and reporting guidance",
        "Full-service back-office coordination",
        "Custom deliverables and project-based engagements",
      ],
      summary: isNegotiated
        ? "Your operation is at a scale where we build a fully custom engagement. Pricing is negotiated directly."
        : "Your answers point to the dedicated advisory track for established, complex operations.",
    };
  }

  if (serviceTrack === "icss") {
    const icssRevenue = calculateIcssRevenuePricing(annualRevenue);
    const monthlyPrice = icssRevenue.monthlyPrice + employeeBand.adjustment + locationPrice;

    const publicPlanName =
      businessType === "independent-contractor" ? "Independent Support" :
      businessType === "startup" ? "Startup Support" : "Basic Support";

    const audienceLabel =
      businessType === "independent-contractor"
        ? "Best for independent contractors and owner-led businesses."
        : businessType === "startup"
          ? "Best for early startups with a small team."
          : "Best for small businesses with straightforward operational needs.";

    const summary =
      businessType === "independent-contractor"
        ? "Your answers point to the smaller-scope support track built for owner-led operations."
        : businessType === "startup"
          ? "Your answers point to the startup support track for smaller teams still building their back office."
          : "Your answers point to the basic support track for small businesses with limited complexity.";

    return {
      serviceTrack,
      publicPlanName,
      audienceLabel,
      monthlyPrice,
      revenuePrice: icssRevenue.monthlyPrice,
      employeePrice: employeeBand.adjustment,
      locationPrice,
      tierLabel: icssRevenue.tierLabel,
      included: [
        "Good standing and compliance support",
        "Federal and state agency notice management",
        "QuickBooks setup and basic account organisation",
        "Limited payroll support and payroll tax guidance",
        "Expense classification and receipt tracking",
      ],
      summary,
    };
  }

  // ECSS
  const ecssRevenue = calculateEcssRevenuePricing(annualRevenue);
  const monthlyPrice = ecssRevenue.monthlyPrice + employeeBand.adjustment + locationPrice;

  return {
    serviceTrack,
    publicPlanName: "Growth Support",
    audienceLabel: "Best for businesses with a growing team or broader administrative needs.",
    monthlyPrice,
    revenuePrice: ecssRevenue.monthlyPrice,
    employeePrice: employeeBand.adjustment,
    locationPrice,
    tierLabel: ecssRevenue.tierLabel,
    included: [
      "Revenue-based monthly support that scales with the business",
      "Agency notice management — 2 notices included per month",
      "Payroll coordination and worker onboarding guidance",
      "Accounting organisation, expense tracking, and tax account support",
      "Compliance and advisory help for a growing operation",
    ],
    summary:
      "Your answers point to the broader ongoing support track for companies with more team size and operating complexity.",
  };
}

const dmvStates = new Set(["DC", "MD", "VA"]);

export function getServiceTrack(
  businessType: BusinessType,
  employeeCount: number,
  annualRevenue: number,
  stateCode = "",
): ServiceTrack {
  // Independent contractors are always ICSS regardless of revenue
  if (businessType === "independent-contractor") {
    return "icss";
  }

  // OHSS only available in the DMV (DC, MD, VA)
  if (annualRevenue > ohssRevenueThreshold && dmvStates.has(stateCode)) {
    return "ohss";
  }

  return employeeCount <= icssEmployeeLimit && annualRevenue <= icssRevenueLimit
    ? "icss"
    : "ecss";
}

// Returns the number of advisory units based on revenue tier (1 unit = 2 hrs/week).
// Unit counts with .5 increments match the official pricing table.
export function calculateOhssUnits(annualRevenue: number, _employeeCount: number): number {
  if (annualRevenue > 10_000_000) return 0;
  if (annualRevenue > 8_000_000)  return 9;
  if (annualRevenue > 7_000_000)  return 8;
  if (annualRevenue > 6_000_000)  return 7;
  if (annualRevenue > 5_000_000)  return 6;
  if (annualRevenue > 4_000_000)  return 5;
  if (annualRevenue > 3_000_000)  return 4;
  if (annualRevenue > 2_500_000)  return 3;
  if (annualRevenue > 2_000_000)  return 2.5;
  if (annualRevenue > 1_500_000)  return 2;
  if (annualRevenue > 1_000_000)  return 1.5;
  return 1;
}

export function getEmployeeBand(employeeCount: number) {
  return (
    employeeBands.find(
      (band) => employeeCount >= band.min && employeeCount <= band.max,
    ) ?? employeeBands[0]
  );
}

export function getLocationAdjustment(stateCode: string, city: string) {
  const stateAdjustment = stateAdjustments[stateCode] ?? 0;
  const normalizedCity = city.trim().toLowerCase();
  const cityAdjustment = majorCityKeywords.some((keyword) => normalizedCity.includes(keyword))
    ? 35
    : 0;

  return stateAdjustment + cityAdjustment;
}

function normalizeWholeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function getStateName(code: string) {
  return usStates.find((state) => state.code === code)?.name ?? code;
}

export const usStates = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];
