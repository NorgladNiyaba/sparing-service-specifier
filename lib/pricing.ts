export const ecssBaseRate = 200;
export const ecssIncludedRevenue = 100_000;
export const ecssRevenueStep = 50_000;
export const ecssIncrementAmount = 75;
export const ecssMaximumIncrements = 24;
export const ecssMonthlyPriceCap = 2_000;
export const ecssIncludedAgencyNotices = 2;
export const ecssAdditionalAgencyNoticeFee = 100;
export const icssRevenueLimit = 300_000;
export const icssEmployeeLimit = 4;

export type ServiceTrack = "icss" | "ecss";
export type BusinessType = "independent-contractor" | "startup" | "full-business";

export type PricingInputs = {
  businessType: BusinessType;
  stateCode: string;
  city: string;
  employeeCount: number;
  annualRevenue: number;
};

export type RevenuePricingBreakdown = {
  incrementCount: number;
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

export function calculateRecommendation(inputs: PricingInputs): Recommendation {
  const businessType = inputs.businessType;
  const annualRevenue = normalizeWholeNumber(inputs.annualRevenue);
  const employeeCount = normalizeWholeNumber(inputs.employeeCount);
  const revenueBreakdown = calculateRevenuePricing(annualRevenue);
  const employeeBand = getEmployeeBand(employeeCount);
  const locationPrice = getLocationAdjustment(inputs.stateCode, inputs.city);
  const serviceTrack = getServiceTrack(businessType, employeeCount, annualRevenue);
  const monthlyPrice =
    revenueBreakdown.monthlyPrice + employeeBand.adjustment + locationPrice;

  if (serviceTrack === "icss") {
    const isIndependent = businessType === "independent-contractor";

    return {
      serviceTrack,
      publicPlanName: isIndependent ? "Independent Support" : "Startup Support",
      audienceLabel: isIndependent
        ? "Best for independent contractors and owner-led businesses."
        : "Best for early startups with smaller teams.",
      monthlyPrice,
      revenuePrice: revenueBreakdown.monthlyPrice,
      employeePrice: employeeBand.adjustment,
      locationPrice,
      tierLabel: revenueBreakdown.tierLabel,
      included: [
        "Good standing and compliance support",
        "Federal and state notice management",
        "QuickBooks setup and account organization",
        "Limited payroll and payroll tax support",
        "Expense classification and receipt tracking",
      ],
      summary: isIndependent
        ? "Your answers point to the smaller-scope support track built for owner-led operations."
        : "Your answers point to the startup support track built for smaller teams still setting up their back office.",
    };
  }

  return {
    serviceTrack,
    publicPlanName: "Growth Support",
    audienceLabel: "Best for businesses with a growing team or broader admin needs.",
    monthlyPrice,
    revenuePrice: revenueBreakdown.monthlyPrice,
    employeePrice: employeeBand.adjustment,
    locationPrice,
    tierLabel: revenueBreakdown.tierLabel,
    included: [
      "Revenue-based monthly support that scales with the business",
      "Agency notice management with 2 notices included each month",
      "Payroll coordination and worker onboarding guidance",
      "Accounting organization, expense tracking, and tax account support",
      "Compliance and advisory help for a growing operation",
    ],
    summary:
      "Your answers point to the broader ongoing support track for companies with more team and operating complexity.",
  };
}

export function calculateRevenuePricing(annualRevenue: number): RevenuePricingBreakdown {
  const safeRevenue = normalizeWholeNumber(annualRevenue);
  const rawIncrementCount =
    safeRevenue <= ecssIncludedRevenue
      ? 0
      : Math.ceil((safeRevenue - ecssIncludedRevenue) / ecssRevenueStep);
  const incrementCount = Math.min(rawIncrementCount, ecssMaximumIncrements);
  const monthlyPrice = Math.min(
    ecssBaseRate + incrementCount * ecssIncrementAmount,
    ecssMonthlyPriceCap,
  );

  return {
    incrementCount,
    monthlyPrice,
    tierLabel: getRevenueTierLabel(safeRevenue, incrementCount),
  };
}

export function getServiceTrack(
  businessType: BusinessType,
  employeeCount: number,
  annualRevenue: number,
): ServiceTrack {
  if (businessType === "full-business") {
    return "ecss";
  }

  return employeeCount <= icssEmployeeLimit && annualRevenue <= icssRevenueLimit
    ? "icss"
    : "ecss";
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

function getRevenueTierLabel(annualRevenue: number, incrementCount: number) {
  if (annualRevenue <= ecssIncludedRevenue) {
    return "Up to $100,000";
  }

  if (annualRevenue > 1_300_000) {
    return "Above $1,300,000";
  }

  const lowerBound = ecssIncludedRevenue + (incrementCount - 1) * ecssRevenueStep + 1;
  const upperBound = ecssIncludedRevenue + incrementCount * ecssRevenueStep;

  return `${formatCurrency(lowerBound)} - ${formatCurrency(upperBound)}`;
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
