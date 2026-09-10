/**
 * CEO Analysis Report
 *
 * Daily/weekly analysis of marketing pipeline, messaging efficiency, ROI,
 * and actionable recommendations. Triggered via scheduled cron job.
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const analysis = await generateAnalysis();
    await saveAnalysisReport(analysis);

    return res.status(200).json({
      success: true,
      report: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[ceo-analysis] Error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

async function generateAnalysis() {
  const projectId = "brandmintstudios-a5eb7";
  const apiKey = process.env.FIREBASE_API_KEY;

  if (!apiKey) throw new Error("Firebase API key not configured");

  // Fetch data from past 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [messages, forms, leads, campaigns] = await Promise.all([
    fetchCollection("waMessages", apiKey, projectId),
    fetchCollection("formLeads", apiKey, projectId),
    fetchCollection("leads", apiKey, projectId),
    fetchCollection("campaigns", apiKey, projectId),
  ]);

  // Calculate metrics
  const recentMessages = messages.filter((m) => m.timestamp >= sevenDaysAgo);
  const inbound = recentMessages.filter((m) => m.direction === "inbound").length;
  const outbound = recentMessages.filter((m) => m.direction === "outbound").length;
  const responseRate = inbound > 0 ? Math.round((outbound / inbound) * 100) : 0;

  const totalContacts = new Set(messages.map((m) => m.phone)).size;
  const recentContacts = new Set(recentMessages.map((m) => m.phone)).size;

  // Form metrics
  const submitted = forms.filter((f) => f.status === "submitted").length;
  const draft = forms.filter((f) => f.status === "draft").length;
  const formConversionRate = submitted + draft > 0 ? Math.round((submitted / (submitted + draft)) * 100) : 0;

  // Campaign metrics
  const completedCampaigns = campaigns.filter((c) => c.status === "completed");
  const totalCampaignSends = completedCampaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
  const totalCampaignResponses = completedCampaigns.reduce((sum, c) => sum + (c.responseCount || 0), 0);
  const campaignResponseRate = totalCampaignSends > 0 ? Math.round((totalCampaignResponses / totalCampaignSends) * 100) : 0;

  // Lead source analysis
  const leadsBySource = {};
  leads.forEach((l) => {
    const source = l.source || "direct";
    leadsBySource[source] = (leadsBySource[source] || 0) + 1;
  });

  // Cost analysis (estimated)
  const estimatedGeminiCost = (inbound * 0.00075); // Gemini Flash cost per message
  const costPerLead = recentContacts > 0 ? (estimatedGeminiCost / recentContacts).toFixed(4) : 0;

  // Trend analysis
  const weekAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const previousWeekMessages = messages.filter((m) => m.timestamp >= weekAgo && m.timestamp < sevenDaysAgo);
  const previousInbound = previousWeekMessages.filter((m) => m.direction === "inbound").length;
  const inboundGrowth = previousInbound > 0 ? Math.round(((inbound - previousInbound) / previousInbound) * 100) : 0;

  return {
    period: "last_7_days",
    generatedAt: new Date().toISOString(),

    messaging: {
      totalInbound: inbound,
      totalOutbound: outbound,
      responseRate: `${responseRate}%`,
      uniqueContacts: recentContacts,
      totalContacts,
    },

    forms: {
      submitted,
      draft,
      conversionRate: `${formConversionRate}%`,
    },

    campaigns: {
      sent: totalCampaignSends,
      responses: totalCampaignResponses,
      responseRate: `${campaignResponseRate}%`,
      completedCount: completedCampaigns.length,
    },

    sources: leadsBySource,

    costs: {
      estimatedWeeklyGeminiCost: `$${estimatedGeminiCost.toFixed(2)}`,
      costPerLead: `$${costPerLead}`,
      modelUsed: "gemini-1.5-flash",
    },

    trends: {
      inboundGrowth: `${inboundGrowth > 0 ? "+" : ""}${inboundGrowth}%`,
    },

    recommendations: generateRecommendations({
      responseRate,
      formConversionRate,
      campaignResponseRate,
      inboundGrowth,
      recentContacts,
    }),
  };
}

function generateRecommendations(metrics) {
  const recs = [];

  if (metrics.responseRate < 50) {
    recs.push({
      priority: "high",
      area: "Messaging",
      issue: "Low WhatsApp response rate",
      detail: `Response rate is ${metrics.responseRate}%. Target: 60%+`,
      action: "Optimize Gemini prompts for more engaging replies",
    });
  }

  if (metrics.formConversionRate < 60) {
    recs.push({
      priority: "high",
      area: "Forms",
      issue: "High form abandonment",
      detail: `Only ${metrics.formConversionRate}% of form starts are completed`,
      action: "Simplify form or add progress indicator",
    });
  }

  if (metrics.campaignResponseRate < 10) {
    recs.push({
      priority: "medium",
      area: "Campaigns",
      issue: "Low campaign engagement",
      detail: `Campaign response rate is ${metrics.campaignResponseRate}%`,
      action: "Segment campaigns by lead temperature",
    });
  }

  if (metrics.inboundGrowth > 0) {
    recs.push({
      priority: "low",
      area: "Growth",
      issue: "Positive momentum",
      detail: `Inbound messages growing ${metrics.inboundGrowth}% week-over-week`,
      action: "Maintain current messaging strategy",
    });
  }

  if (metrics.recentContacts < 10) {
    recs.push({
      priority: "high",
      area: "Volume",
      issue: "Low contact volume",
      detail: `Only ${metrics.recentContacts} unique contacts this week`,
      action: "Increase form visibility or run paid campaigns",
    });
  }

  return recs;
}

async function fetchCollection(name, apiKey, projectId) {
  try {
    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${name}?pageSize=1000&key=${apiKey}`
    );
    const data = await resp.json();
    return (data.documents || []).map((d) => {
      const fields = d.fields || {};
      const doc = { id: d.name.split("/").pop() };
      for (const [k, v] of Object.entries(fields)) {
        doc[k] = v.stringValue || v.integerValue || v.booleanValue || null;
      }
      return doc;
    });
  } catch (e) {
    console.error(`[ceo-analysis] Failed to fetch ${name}:`, e.message);
    return [];
  }
}

async function saveAnalysisReport(analysis) {
  const apiKey = process.env.FIREBASE_API_KEY;
  const projectId = "brandmintstudios-a5eb7";

  if (!apiKey) return;

  try {
    const docId = `report_${new Date().toISOString().split("T")[0]}`;
    const payload = {
      fields: {
        generatedAt: { stringValue: analysis.generatedAt },
        period: { stringValue: analysis.period },
        data: { stringValue: JSON.stringify(analysis) },
      },
    };

    await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/ceoReports/${docId}?key=${apiKey}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  } catch (e) {
    console.error("[ceo-analysis] Failed to save report:", e.message);
  }
}
