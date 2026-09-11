/**
 * POST /api/wa-worker-log?k=<secret>
 *
 * The autosend worker runs on the Evolution VM, which isn't reachable from a
 * browser or from anywhere the studio normally works — so its container logs
 * could only be read by SSH-ing in and copying them out by hand. This gives
 * the worker somewhere to report to that IS readable remotely: whatever it
 * posts here lands in Vercel's runtime logs alongside everything else.
 *
 * Guarded by the same shared secret as wa-hook. It only logs — no Firestore
 * write, no side effects — so a leaked secret buys nothing but log noise.
 */
import { readJson } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const secret = process.env.WA_HOOK_SECRET;
  if (!secret || req.query?.k !== secret) return res.status(401).json({ error: "no" });

  const body = await readJson(req);
  // Bounded: the worker is the only intended caller, but nothing here should
  // be able to flood the log stream.
  console.log("[wa-worker]", JSON.stringify(body).slice(0, 2000));

  return res.status(200).json({ ok: true });
}
