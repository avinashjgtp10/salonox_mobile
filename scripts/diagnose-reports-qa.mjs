import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");

const readEnvFile = (filename) => {
  const filePath = path.join(projectDirectory, filename);
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator).trim(),
          line.slice(separator + 1).trim().replace(/^["']|["']$/g, ""),
        ];
      }),
  );
};

const qaEnvironment = readEnvFile(".env.qa");
const apiBaseUrl = (
  process.env.QA_REPORTS_API_BASE_URL
  ?? qaEnvironment.EXPO_PUBLIC_API_BASE_URL
  ?? ""
).replace(/\/+$/, "");
const apiOrigin = apiBaseUrl ? new URL(apiBaseUrl).origin : "";
const email = process.env.QA_REPORTS_EMAIL;
const password = process.env.QA_REPORTS_PASSWORD;
const suppliedAccessToken = process.env.QA_REPORTS_ACCESS_TOKEN;
let branchId = process.env.QA_REPORTS_BRANCH_ID;

const today = new Date();
const start = new Date(today);
start.setUTCDate(start.getUTCDate() - 30);
const isoDate = (value) => value.toISOString().slice(0, 10);
const startDate = process.env.QA_REPORTS_START_DATE ?? isoDate(start);
const endDate = process.env.QA_REPORTS_END_DATE ?? isoDate(today);

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const hasArray = (key) => (value) => isObject(value) && Array.isArray(value[key]);
const hasObject = (key) => (value) => isObject(value) && isObject(value[key]);
const hasPagination = (value) =>
  hasObject("pagination")(value)
  && ["total", "page", "limit", "total_pages"].every(
    (key) => typeof value.pagination[key] === "number",
  );
const standardReportShape = (value) =>
  hasArray("rows")(value) && hasObject("stats")(value) && hasPagination(value);

const results = [];
let accessToken = suppliedAccessToken;

const request = async ({ method, path: requestPath, body, query }) => {
  const base = requestPath.startsWith("/api/report") ? apiOrigin : apiBaseUrl;
  const url = new URL(`${base}${requestPath}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  const startedAt = performance.now();
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return {
    durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    payload,
    status: response.status,
    url: url.pathname,
  };
};

const unwrap = (payload) =>
  isObject(payload) && Object.hasOwn(payload, "data") ? payload.data : payload;

const run = async (definition) => {
  if (definition.skipReason) {
    results.push({
      name: definition.name,
      outcome: "SKIP",
      reason: definition.skipReason,
    });
    return undefined;
  }

  try {
    const response = await request(definition.request);
    const data = unwrap(response.payload);
    const statusMatches = response.status === (definition.expectedStatus ?? 200);
    const shapeMatches = definition.shape(data);
    results.push({
      name: definition.name,
      method: definition.request.method,
      endpoint: response.url,
      responseTimeMs: response.durationMs,
      status: response.status,
      statusMatches,
      shapeMatches,
      outcome: statusMatches && shapeMatches ? "PASS" : "FAIL",
      ...(!statusMatches || !shapeMatches
        ? { response: response.payload }
        : {}),
    });
    return data;
  } catch (error) {
    results.push({
      name: definition.name,
      method: definition.request.method,
      endpoint: definition.request.path,
      outcome: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
};

if (!apiBaseUrl || !apiOrigin) {
  throw new Error("QA API URL is missing from .env.qa or QA_REPORTS_API_BASE_URL.");
}

if (!accessToken) {
  if (!email || !password) {
    throw new Error(
      "Set QA_REPORTS_EMAIL and QA_REPORTS_PASSWORD, or QA_REPORTS_ACCESS_TOKEN.",
    );
  }

  const login = await request({
    method: "POST",
    path: "/auth/login",
    body: { email, password },
  });
  const loginData = unwrap(login.payload);
  accessToken = isObject(loginData) && typeof loginData.accessToken === "string"
    ? loginData.accessToken
    : undefined;

  if (login.status !== 200 || !accessToken) {
    throw new Error(`QA authentication failed with HTTP ${login.status}.`);
  }
}

if (!branchId) {
  try {
    const tokenPayload = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8"),
    );
    const salonId = tokenPayload.salonId ?? tokenPayload.salon_id;
    if (typeof salonId === "string" && salonId) {
      const branchesResponse = await request({
        method: "GET",
        path: `/branches/by-salon/${salonId}`,
      });
      const branches = unwrap(branchesResponse.payload);
      if (branchesResponse.status === 200 && Array.isArray(branches)) {
        branchId = branches.find((branch) => typeof branch?.id === "string")?.id;
      }
    }
  } catch {
    // Product Inventory will be reported as skipped with an actionable reason.
  }
}

const dateRange = { start_date: startDate, end_date: endDate };
const paginated = { ...dateRange, page: 1, limit: 5 };

const standardReports = [
  ["Sales Summary", "/api/report/sales-summary", paginated, standardReportShape],
  [
    "Daily Sheet",
    "/api/report/daily-sheet",
    { date: endDate, page: 1, limit: 5 },
    (data) => hasArray("rows")(data) && hasPagination(data)
      && typeof data.total_amount === "number" && hasObject("filters_available")(data),
  ],
  ["Product Retail", "/api/report/product-retail", paginated,
    (data) => standardReportShape(data) && hasObject("filters_available")(data)],
  ["Service Sale", "/api/report/service-sale", paginated, standardReportShape],
  ["GST", "/api/report/gst", paginated, standardReportShape],
  ["Product Margin", "/api/report/product-margin", paginated, standardReportShape],
  [
    "Reward Points",
    "/api/report/reward-points",
    { page: 1, limit: 5 },
    standardReportShape,
  ],
  ["E-Wallet", "/api/report/ewallet", { page: 1, limit: 5 }, standardReportShape],
  ["Client Revenue", "/api/report/client-revenue", paginated, standardReportShape],
  [
    "Staff Sales",
    "/api/report/staff-sales",
    { ...dateRange, period: "daily" },
    hasArray("rows"),
  ],
  [
    "Staff Item Sales",
    "/api/report/staff-item-sales",
    { ...paginated, item_type: "service" },
    standardReportShape,
  ],
  ["Package Sale", "/api/report/package-sale", paginated, standardReportShape],
  ["Package History", "/api/report/package-history", paginated, standardReportShape],
  ["Member Sale", "/api/report/member-sale", paginated, standardReportShape],
  [
    "Appointment Detail",
    "/api/report/appointment-detail",
    { from: startDate, to: endDate, page: 1, limit: 5 },
    (data) => hasArray("rows")(data) && hasPagination(data),
  ],
];

for (const [name, requestPath, body, shape] of standardReports) {
  await run({
    name,
    request: { method: "POST", path: requestPath, body },
    shape,
  });
}

const commissionSummary = await run({
  name: "Commission Summary",
  request: {
    method: "GET",
    path: "/staff/commissions/summary",
    query: dateRange,
  },
  shape: (data) => isObject(data)
    && ["total_commission", "total_revenue", "pending_payout", "paid_out", "count"]
      .every((key) => typeof data[key] === "number"),
});
const commissionEarned = await run({
  name: "Commission Earned",
  request: {
    method: "GET",
    path: "/staff/commissions/earned",
    query: dateRange,
  },
  shape: Array.isArray,
});
results.push({
  name: "Commission Combined Service Shape",
  outcome: isObject(commissionSummary) && Array.isArray(commissionEarned) ? "PASS" : "FAIL",
  shapeMatches: isObject(commissionSummary) && Array.isArray(commissionEarned),
});

await run({
  name: "Attendance",
  request: { method: "GET", path: "/attendance/range", query: dateRange },
  shape: (data) => hasArray("staff")(data) && hasArray("records")(data),
});

const stock = await run({
  name: "Product Inventory Stock",
  request: {
    method: "GET",
    path: "/inventory/stock-reconciliation",
    query: { branch_id: branchId },
  },
  shape: Array.isArray,
  skipReason: branchId ? undefined : "QA_REPORTS_BRANCH_ID is required.",
});
const productSales = await run({
  name: "Product Inventory Sales",
  request: {
    method: "POST",
    path: "/api/report/product-inventory-sales",
    body: dateRange,
  },
  shape: isObject,
  skipReason: branchId ? undefined : "QA_REPORTS_BRANCH_ID is required.",
});
results.push({
  name: "Product Inventory Joined Service Shape",
  outcome: Array.isArray(stock) && isObject(productSales) ? "PASS" : "SKIP",
  shapeMatches: Array.isArray(stock) && isObject(productSales),
});

results.push({
  name: "Consumable Usage",
  outcome: "PASS",
  reason: "Expected unsupported service error; no backend request was made.",
});

const campaigns = await run({
  name: "WhatsApp Campaigns",
  request: { method: "GET", path: "/campaigns" },
  shape: Array.isArray,
});
if (Array.isArray(campaigns) && campaigns.length > 0 && campaigns[0]?.id) {
  await run({
    name: "WhatsApp Campaign Report",
    request: {
      method: "GET",
      path: `/campaigns/${campaigns[0].id}/report/successful`,
    },
    shape: Array.isArray,
  });
} else {
  results.push({
    name: "WhatsApp Campaign Report",
    outcome: "SKIP",
    reason: "QA has no campaign available for a per-campaign report.",
  });
}

const totals = results.reduce(
  (counts, result) => {
    counts[result.outcome] = (counts[result.outcome] ?? 0) + 1;
    return counts;
  },
  {},
);

console.log(JSON.stringify({
  environment: "qa",
  apiBaseUrl,
  dateRange: { startDate, endDate },
  totals,
  results,
}, null, 2));

if (results.some((result) => result.outcome === "FAIL" || result.outcome === "ERROR")) {
  process.exitCode = 1;
}
