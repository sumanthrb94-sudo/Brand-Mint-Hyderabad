import type { Request, Response } from "express";
import { authenticateFirebaseRequest } from "../../server/firebase";
import { filterRecords, getSignedFileUrl } from "../../server/firebaseRepository";

export default async function fileHandler(req: Request, res: Response) {
  try {
    const user = await authenticateFirebaseRequest(req);
    if (!user) return res.status(401).json({ error: "Authentication is required" });
    const storageKey = Array.isArray(req.query.id) ? req.query.id.join("/") : String(req.query.id ?? "");
    const files = await filterRecords<{ id: number; storageKey: string; clientId: number }>("storedFiles", (file) => file.storageKey === storageKey);
    const file = files[0];
    if (!file) return res.status(404).json({ error: "File not found" });
    if (user.role !== "admin") {
      const contacts = await filterRecords<{ id: number; clientId: number; userId?: string }>("clientContacts", (contact) => contact.userId === user.id && contact.clientId === file.clientId);
      if (!contacts.length) return res.status(403).json({ error: "File access is not permitted" });
    }
    return res.redirect(302, await getSignedFileUrl(file.storageKey));
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unable to retrieve file" });
  }
}
