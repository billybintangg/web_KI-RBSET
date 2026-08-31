const { BetaAnalyticsDataClient } = require("@google-analytics/data");

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GA_CLIENT_EMAIL,
    private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

module.exports = async function handler(req, res) {
  try {
    const propertyId = process.env.GA_PROPERTY_ID;

    if (!propertyId) {
      return res.status(500).json({
        error: "GA_PROPERTY_ID is not configured",
      });
    }

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: "2026-01-01",
          endDate: "today",
        },
      ],
      dimensions: [
        {
          name: "country",
        },
        {
          name: "countryId",
        },
      ],
      metrics: [
        {
          name: "activeUsers",
        },
      ],
      orderBys: [
        {
          metric: {
            metricName: "activeUsers",
          },
          desc: true,
        },
      ],
    });

    const countries =
      response.rows?.map((row) => ({
        name: row.dimensionValues?.[0]?.value || "Unknown",
        code: row.dimensionValues?.[1]?.value || "",
        users: Number(row.metricValues?.[0]?.value || 0),
      })) || [];

    const totalUsers = countries.reduce(
      (sum, country) => sum + country.users,
      0
    );

    const countriesWithPercentage = countries.map((country) => ({
      ...country,
      percentage:
        totalUsers > 0
          ? Number(((country.users / totalUsers) * 100).toFixed(2))
          : 0,
    }));

    res.setHeader(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate=86400"
    );

    return res.status(200).json({
      totalUsers,
      totalCountries: countries.length,
      countries: countriesWithPercentage,
    });
  } catch (error) {
    console.error("Google Analytics API error:", error);

    return res.status(500).json({
      error: "Failed to retrieve analytics data",
    });
  }
};