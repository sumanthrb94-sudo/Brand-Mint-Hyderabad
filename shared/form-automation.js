/**
 * Form automation: auto-save partial fills + WhatsApp trigger.
 *
 * When user types in a form, saves draft to Firestore every 5 seconds.
 * When form is submitted, triggers a WhatsApp message via the server.
 * Captures leads even if they abandon the form halfway through.
 */
import { firebaseConfig, isConfigured } from "/firebase/config.js";

const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:commit?key=${firebaseConfig.apiKey}`;
const LEADS_DOC = `projects/${firebaseConfig.projectId}/databases/(default)/documents/formLeads/`;
const WA_TRIGGER = "/api/form-wa-trigger";

function randomId(n = 20) {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += a[b % a.length];
  return s;
}

const str = (v, max) => ({ stringValue: String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max) });
const bool = (v) => ({ booleanValue: !!v });
const ts = () => ({ stringValue: new Date().toISOString() });

export function initFormAutomation(formId, options = {}) {
  const form = document.getElementById(formId);
  if (!form || !isConfigured()) return;

  const {
    autoSaveDelay = 5000,
    onSave = null,
    onSubmit = null,
    whatsappTrigger = true
  } = options;

  let leadId = sessionStorage.getItem(`form-lead-${formId}`) || randomId();
  sessionStorage.setItem(`form-lead-${formId}`, leadId);
  let saveTimeout;

  // Auto-save form data as user types
  form.addEventListener("input", async () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const data = Object.fromEntries(new FormData(form).entries());
      const fields = {
        email: str(data.email || "", 320),
        name: str(data.name || "", 80),
        phone: str(data.phone || "", 20),
        service: str(data.service || "", 60),
        message: str(data.note || data.message || "", 1000),
        when: str(data.when || "", 60),
        status: str("draft", 20),
        source: str("Site — form auto-save", 60),
        updatedAt: ts(),
      };

      try {
        await fetch(FIRESTORE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            writes: [{ update: { name: LEADS_DOC + leadId, fields } }],
          }),
          keepalive: true,
        });
        if (onSave) onSave(data);
      } catch (e) {
        console.error("[form-automation] save error:", e.message);
      }
    }, autoSaveDelay);
  });

  // On submit: mark as complete + trigger WhatsApp
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    // Mark lead as submitted in Firestore
    const fields = {
      email: str(data.email || "", 320),
      name: str(data.name || "", 80),
      phone: str(data.phone || "", 20),
      service: str(data.service || "", 60),
      message: str(data.note || data.message || "", 1000),
      when: str(data.when || "", 60),
      status: str("submitted", 20),
      source: str("Site — form submission", 60),
      submittedAt: ts(),
      leadId: str(leadId, 20),
    };

    try {
      await fetch(FIRESTORE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writes: [{ update: { name: LEADS_DOC + leadId, fields } }],
        }),
        keepalive: true,
      });

      // Trigger WhatsApp message
      if (whatsappTrigger && data.phone) {
        await fetch(WA_TRIGGER, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: data.phone,
            name: data.name || "there",
            service: data.service || "our services",
            leadId,
          }),
          keepalive: true,
        }).catch(e => console.error("[form-automation] WhatsApp trigger error:", e.message));
      }

      if (onSubmit) onSubmit(data);
      form.reset();
      sessionStorage.removeItem(`form-lead-${formId}`);
    } catch (e) {
      console.error("[form-automation] submit error:", e.message);
    }
  });
}
