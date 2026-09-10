#!/usr/bin/env node
/**
 * Lead Scraper — bulk import prospects into Firestore
 *
 * Usage:
 *   node scripts/scrape-leads.js --file leads.csv --dry-run
 *   node scripts/scrape-leads.js --file leads.csv --import
 *
 * CSV format: name,phone,email,service
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../firebase/config.json"), "utf8")
);

const FIRESTORE_API = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const API_KEY = firebaseConfig.apiKey;

// Parse arguments
const args = process.argv.slice(2);
const fileArg = args.find((a) => a.startsWith("--file="))?.split("=")[1];
const isDryRun = args.includes("--dry-run");
const isImport = args.includes("--import");

if (!fileArg) {
  console.error("Usage: node scrape-leads.js --file=leads.csv [--dry-run|--import]");
  process.exit(1);
}

const filePath = path.resolve(fileArg);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const str = (v, max) => ({ stringValue: String(v ?? "").trim().slice(0, max) });
const randomId = (n = 20) => {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
};

async function scrapeLeads() {
  console.log(`📄 Reading ${filePath}...`);

  const csvContent = fs.readFileSync(filePath, "utf8");
  const lines = csvContent.split("\n").filter((l) => l.trim());
  const [header, ...rows] = lines;

  const cols = header.split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = cols.indexOf("name");
  const phoneIdx = cols.indexOf("phone");
  const emailIdx = cols.indexOf("email");
  const serviceIdx = cols.indexOf("service");

  if (nameIdx === -1 || phoneIdx === -1) {
    console.error("CSV must have 'name' and 'phone' columns");
    process.exit(1);
  }

  const leads = rows
    .map((row) => {
      const cells = row.split(",").map((c) => c.trim());
      return {
        name: cells[nameIdx] || "",
        phone: cells[phoneIdx] || "",
        email: cells[emailIdx] || "",
        service: cells[serviceIdx] || "",
      };
    })
    .filter((l) => l.name && l.phone);

  console.log(`\n✓ Loaded ${leads.length} leads from CSV`);

  if (isDryRun) {
    console.log("\n📋 Preview (dry run):\n");
    leads.slice(0, 5).forEach((l, i) => {
      console.log(`${i + 1}. ${l.name} | ${l.phone} | ${l.email} | ${l.service}`);
    });
    if (leads.length > 5) console.log(`... and ${leads.length - 5} more`);
    console.log(
      `\nRun with --import to save ${leads.length} leads to Firestore\n`
    );
    return;
  }

  if (!isImport) {
    console.log("\nUse --import to save, or --dry-run to preview\n");
    return;
  }

  console.log("\n🚀 Importing to Firestore...\n");

  let imported = 0;
  let failed = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const docId = randomId();
    const createdAt = new Date().toISOString();

    const body = JSON.stringify({
      writes: [
        {
          update: {
            name: `${FIRESTORE_API}/importedLeads/${docId}`,
            fields: {
              name: str(lead.name, 80),
              phone: str(lead.phone, 20),
              email: str(lead.email, 320),
              service: str(lead.service, 60),
              status: str("new", 20),
              source: str("csv-import", 60),
              createdAt: str(createdAt, 40),
            },
          },
        },
      ],
    });

    try {
      const response = await fetch(`${FIRESTORE_API}:commit?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (response.ok) {
        imported++;
        if ((i + 1) % 10 === 0) {
          console.log(`  ✓ ${i + 1}/${leads.length} imported`);
        }
      } else {
        failed++;
        const err = await response.text();
        console.error(`  ✗ ${lead.name}: ${err.slice(0, 100)}`);
      }
    } catch (e) {
      failed++;
      console.error(`  ✗ ${lead.name}: ${e.message}`);
    }
  }

  console.log(`\n✅ Done! ${imported} imported, ${failed} failed`);
  console.log(
    `\nView imported leads in Admin → Form Leads (filter: Imported Prospects)\n`
  );
}

scrapeLeads().catch(console.error);
