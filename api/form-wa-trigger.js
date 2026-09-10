/**
 * POST /api/form-wa-trigger
 *
 * Triggered when a website form is submitted. Sends a personalized WhatsApp
 * message to the form submitter via Evolution API, then stores it in Firestore.
 */
import { firebaseConfig } from "../firebase/config.js";

const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:commit?key=${firebaseConfig.apiKey}`;
const MESSAGES_DOC = `projects/${firebaseConfig.projectId}/databases/(default)/documents/formWaMessages/`;
const EVOLUTION_API = "http://localhost:8080";
const EVO_KEY = process.env.EVO_KEY;

const str = (v, max) => ({ stringValue: String(v ?? "").trim().slice(0, max) });

function randomId(n = 20) {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < n; i++) {
    s += a[Math.floor(Math.random() * a.length)];
  }
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { phone, name, service, leadId } = req.body || {};
  if (!phone) return res.status(400).json({ error: "phone required" });

  // Clean phone number (remove non-digits, add country code if needed)
  const cleanPhone = String(phone).replace(/\D/g, "");
  const fullPhone = cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone;

  // Personalized message
  const message = `Hi ${name || "there"}! 👋 Thanks for your interest in ${service || "Brand Mint Studios"}.

We saw you exploring our ${service || "services"}. Let's chat about how we can help!

📱 Reply here to start a conversation, or check out our full offerings at https://brandmintstudios.in

Looking forward to working with you! 🚀`;

  try {
    // Send via Evolution API
    const evoResponse = await fetch(`${EVOLUTION_API}/message/sendText/brandmintsupport`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVO_KEY },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
      }),
    });

    if (!evoResponse.ok) {
      console.error("[form-wa-trigger] evolution:", evoResponse.status);
    }

    // Store message in Firestore
    const msgId = randomId();
    const fields = {
      leadId: str(leadId, 20),
      phone: str(fullPhone, 20),
      name: str(name, 80),
      service: str(service, 60),
      message: str(message, 2000),
      status: str("sent", 20),
      source: str("form-submission", 60),
      createdAt: str(new Date().toISOString(), 40),
    };

    await fetch(FIRESTORE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [{ update: { name: MESSAGES_DOC + msgId, fields } }],
      }),
    }).catch(e => console.error("[form-wa-trigger] firestore:", e.message));
  } catch (e) {
    console.error("[form-wa-trigger]", e.message);
  }

  return res.status(200).json({ ok: true });
}
