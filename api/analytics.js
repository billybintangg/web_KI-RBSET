const { BetaAnalyticsDataClient } = require("@google-analytics/data");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const required = ["GA_PROPERTY_ID", "GA_CLIENT_EMAIL", "GA_PRIVATE_KEY_BASE64"];
  if (required.some((key) => !process.env[key]?.trim())) {
    return res.status(503).json({ error: "Analytics is not configured", code: "ANALYTICS_NOT_CONFIGURED" });
  }
  try {
    const privateKey = Buffer.from(process.env.GA_PRIVATE_KEY_BASE64, "base64").toString("utf8");
    const client = new BetaAnalyticsDataClient({ credentials: {
      client_email: process.env.GA_CLIENT_EMAIL,
      private_key: privateKey,
    } });
    const base = {
      property: `properties/${process.env.GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: "2026-01-01", endDate: "today" }],
      metrics: [{ name: "totalUsers" }],
    };
    // Query the overall total separately: one user can appear in multiple countries.
    const [[report], [summary]] = await Promise.all([
      client.runReport({ ...base,
        dimensions: [{ name: "country" }, { name: "countryId" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 1000,
      }),
      client.runReport(base),
    ]);
    const countries = (report.rows || []).map((row) => ({
      name: row.dimensionValues?.[0]?.value || "Unknown",
      code: row.dimensionValues?.[1]?.value || "",
      users: Number(row.metricValues?.[0]?.value || 0),
    }));
    const totalUsers = Number(summary.rows?.[0]?.metricValues?.[0]?.value || 0);
    const countrySum = countries.reduce((sum, country) => sum + country.users, 0);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({
      totalUsers,
      totalCountries: countries.filter((country) => /^[A-Z]{2}$/.test(country.code) && country.users > 0).length,
      countries: countries.map((country) => ({ ...country,
        percentage: countrySum ? Number((country.users / countrySum * 100).toFixed(2)) : 0,
      })),
    });
  } catch (error) {
    // Do not log credentials or raw upstream request details.
    console.error("Analytics request failed", { code: error.code || "UNKNOWN" });
    return res.status(502).json({ error: "Failed to retrieve analytics data", code: "ANALYTICS_UNAVAILABLE" });
  }
};
