/**
 * WhatsApp Auto-Reply via Gemini
 *
 * Receives incoming messages from Evolution API webhook, generates smart
 * replies about Brand Mint services using Gemini API, sends back via Evolution.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EVOLUTION_API = "http://localhost:8080";

const BRAND_MINT_CONTEXT = `You are a helpful customer support assistant for Brand Mint Studios, an online store design agency in India.

Our Services:
1. Static Website — ₹14,999 (5 weeks): Simple branded site, perfect for startups
2. Online Store — ₹49,999+ (8 weeks): Full e-commerce with Shopify, payment gateway, inventory
3. Site + CRM — ₹79,999 (12 weeks): Website + client management system + WhatsApp integration
4. Custom CRM — ₹149,999+ (ongoing): Bespoke solutions for complex workflows
5. Modcon HR — Custom pricing: Human resources management system

Care Plans: ₹9,999/month — ongoing support, updates, training

We work with Indian brands. Typical projects: D2C stores, service websites, internal tools.

When responding:
- Be friendly, professional, brief (max 2-3 sentences)
- If asked about pricing/timelines, give service ranges
- If they're interested, offer a call with our team
- Ask clarifying questions if needed (what's your business, current setup, etc.)
- Never make promises about delivery times or features
- Always include our website: brandmintstudios.in
`;

export default async function handler(req, res) {
  // Handle Evolution API webhook for incoming messages
  if (req.method === "POST") {
    try {
      const { data } = req.body;

      // Extract message details
      const from = data?.from || data?.sender;
      const text = data?.text || data?.body || "";
      const name = data?.name || data?.pushName || "User";

      if (!from || !text) {
        console.log("[wa-gemini] Incomplete message data, skipping");
        return res.status(200).json({ skipped: true });
      }

      console.log(`[wa-gemini] Incoming from ${from} (${name}): ${text.slice(0, 50)}`);

      // Generate reply with Gemini
      const reply = await generateReply(text, name);

      if (!reply) {
        console.log("[wa-gemini] No reply generated");
        return res.status(200).json({ skipped: true });
      }

      // Send reply via Evolution API
      await sendReply(from, reply);

      console.log(`[wa-gemini] Sent reply to ${from}`);
      return res.status(200).json({ sent: true, reply });
    } catch (e) {
      console.error("[wa-gemini] Error:", e.message);
      return res.status(200).json({ error: e.message });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function generateReply(userMessage, userName) {
  try {
    const fullPrompt = `${BRAND_MINT_CONTEXT}\n\nUser (${userName}): ${userMessage}\n\nRespond in a friendly, helpful way. Keep it brief.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 150,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[gemini] API error:", response.status, err);
      return null;
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Thanks for reaching out! Tell me more about your project.";

    return reply.trim();
  } catch (e) {
    console.error("[gemini] Generation failed:", e.message);
    return null;
  }
}

async function sendReply(toNumber, message) {
  const payload = {
    number: toNumber,
    text: message,
  };

  const response = await fetch(`${EVOLUTION_API}/message/sendText/brandmintsupport`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Evolution API error: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}
