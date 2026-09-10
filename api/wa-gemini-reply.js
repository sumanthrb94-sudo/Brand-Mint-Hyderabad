/**
 * WhatsApp Auto-Reply via Gemini
 *
 * Receives incoming messages from Evolution API webhook, generates smart
 * replies about Brand Mint services using Gemini API, sends back via Evolution.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EVOLUTION_API = "https://wa.brandmintstudios.in";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

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

      // Log incoming message
      await logMessage(from, name, text, "inbound");

      // Generate reply with Gemini
      const reply = await generateReply(text, name);

      if (!reply) {
        console.log("[wa-gemini] No reply generated");
        return res.status(200).json({ skipped: true });
      }

      // Send reply via Evolution API
      await sendReply(from, reply);

      // Log outgoing reply
      await logMessage(from, name, reply, "outbound", text);

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
      console.error("[gemini] API error:", response.status, response.statusText, err);
      return getSmartFallback(userMessage);
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      getSmartFallback(userMessage);

    return reply.trim();
  } catch (e) {
    console.error("[gemini] Generation failed:", e.message);
    return getSmartFallback(userMessage);
  }
}

function getSmartFallback(userMessage) {
  const msg = userMessage.toLowerCase();

  if (msg.includes("price") || msg.includes("cost") || msg.includes("how much")) {
    return "Our services start at ₹14,999 for a website and ₹49,999+ for an online store. Happy to discuss a custom quote. Visit brandmintstudios.in or call us!";
  }
  if (msg.includes("store") || msg.includes("ecommerce") || msg.includes("shop")) {
    return "We build online stores from ₹49,999 (8 weeks) with payment gateway & inventory. Interested? Let's chat about your store idea!";
  }
  if (msg.includes("website") || msg.includes("site") || msg.includes("web")) {
    return "We create branded websites starting at ₹14,999 (5 weeks). Perfect for startups & professionals. What's your business?";
  }
  if (msg.includes("crm") || msg.includes("whatsapp") || msg.includes("automation")) {
    return "Site + CRM is ₹79,999 (12 weeks) - website + client management + WhatsApp integration. Ideal for service businesses!";
  }

  return "Hi! We build online stores, websites & CRM systems for Indian brands. What can we help you with? Visit brandmintstudios.in 🚀";
}

async function sendReply(toNumber, message) {
  const payload = {
    number: toNumber,
    text: message,
  };

  const headers = { "Content-Type": "application/json" };
  if (EVOLUTION_API_KEY) {
    headers["apiKey"] = EVOLUTION_API_KEY;
  }

  const response = await fetch(`${EVOLUTION_API}/message/sendText/brandmintsupport`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Evolution API error: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

async function logMessage(phone, name, text, direction, inboundText = null) {
  try {
    const firebaseKey = process.env.FIREBASE_API_KEY;
    const projectId = "brandmintstudios-a5eb7";

    if (!firebaseKey) {
      console.log("[wa-gemini] Firebase key not available, skipping log");
      return;
    }

    const docId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payload = {
      fields: {
        phone: { stringValue: phone },
        name: { stringValue: name || "Unknown" },
        text: { stringValue: text.slice(0, 1000) },
        inboundText: inboundText ? { stringValue: inboundText.slice(0, 1000) } : { nullValue: null },
        direction: { stringValue: direction },
        timestamp: { stringValue: new Date().toISOString() },
        source: { stringValue: "gemini_auto_reply" },
      }
    };

    await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/waMessages/${docId}?key=${firebaseKey}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  } catch (e) {
    console.error("[wa-gemini] Failed to log message:", e.message);
  }
}
