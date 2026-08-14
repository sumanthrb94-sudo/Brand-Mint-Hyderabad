#!/usr/bin/env python3
"""
Builds the E2E journey report from the screenshots Playwright actually captured.

Every image in this PDF is a real capture of the running application taken
during `npx playwright test`. Nothing here is a mockup: if a screenshot is
missing, the page for it says so rather than substituting anything.

Usage:  python3 e2e/build-report.py [output.pdf]
"""

import os
import sys
from datetime import datetime

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import Paragraph, Table, TableStyle

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "screenshots")
GREEN = colors.HexColor("#0d8855")
INK = colors.HexColor("#12362a")
MUTED = colors.HexColor("#66807a")

# name -> (title, what this proves)
STEPS = [
    ("01-public-home-desktop", "The public site", "The marketing site a visitor lands on. Renders with its hero, service tiers and a working route into the studio."),
    ("02-public-home-mobile", "The public site on a phone", "390 x 844. Asserted not to scroll sideways: horizontal overflow is 0px."),
    ("03-sign-in-accounts", "Sign in", "The account chooser. Google's own chooser cannot run headlessly, so the simulation presents the same set of studio accounts; the role each one gets is still decided by the server's admin allowlist."),
    ("04-ceo-dashboard", "The CEO dashboard", "Signed in as sumanthbolla97@gmail.com. All four metric tiles carry live figures computed by dashboard.overview — the revenue tile is asserted not to be a placeholder."),
    ("05-lead-inbox", "Lead inbox", "The three public project requests, submitted through the real inquiries.submit procedure. Green Basket is the first of them."),
    ("06-project-pipeline", "Project pipeline", "All four stages. Every card is a real link to /projects/:id — asserted by reading the href, which is the fix for cards that used to be inert divs."),
    ("07-invoices-dashboard", "Invoices on the dashboard", "Each row carries its invoice number and amount. Asserted to contain no NaN, which is the regression guard for the earlier Rs.NaN rendering."),
    ("08-project-detail", "The Green Basket project", "Rs.95,000, self-funded. The published Growth Store tier is Rs.2,00,000, so a negotiated Rs.95,000 build is a personal-pricing project — the mode whose final price the CEO can adjust."),
    ("09-sop-checklist", "The standard operating procedure", "The SOP attached to this project, grouped by stage, with required steps marked and a done/total counter per stage."),
    ("10-checklist-item-ticked", "Ticking a step", "A real mutation. The test toggles the box, reloads the page, and asserts the new state survived — proving it reached the server rather than only local component state."),
    ("11-sop-gate-blocks-stage-change", "The SOP refuses the move", "Client review still has required steps open, so the move to Complete is refused and the outstanding items are named. The project is asserted not to have moved."),
    ("12-stage-moved-with-override", "The override", "The CEO can move anyway. The override is recorded as an admin notification rather than happening silently."),
    ("13-deliverables-and-invoice", "Deliverables and billing", "Rs.95,000 + Rs.5,000 gateway + Rs.7,500 dashboard = Rs.1,07,500, plus 18% GST = Rs.1,26,850. Computed by calculateInvoiceTotals, not typed into the test."),
    ("14-operations-projects", "Operations — projects", "Project creation, the record list, and the personal-pricing final-price control."),
    ("15-operations-documents", "Operations — documents", "Contract, NDA and SOW records with signature status and PDF upload."),
    ("16-operations-invoices", "Operations — invoices", "Invoice issuing with the project price pre-filled, and the issued-invoice list."),
    ("17-mobile-drawer-open", "The phone drawer", "The desktop sidebar is display:none below 1024px. This drawer is the only route to /operations and /deliverables on a phone; without it those pages were unreachable."),
    ("18-mobile-operations", "Operations, reached from the phone", "Navigated by tapping Invoices in the drawer. This is the page that used to be unreachable on mobile."),
    ("19-mobile-pipeline", "The pipeline on a phone", "One stage at a time with a count per stage, instead of four 185px columns clipping every card mid-word."),
    ("20-mobile-project-detail", "The project on a phone", "The full SOP, stepper and billing, with horizontal overflow asserted at 0px."),
    ("21-tablet-dashboard", "The dashboard on a tablet", "768 x 1024, the awkward width between the drawer and the sidebar."),
    ("22-client-portal", "The client portal", "Signed in as rajesh@greenbasket.com. Asserted to contain this client's project and to contain neither Urban Thread nor Saffron & Co — data isolation, checked rather than assumed."),
    ("23-client-invoice", "The invoice, client side", "The same Rs.1,26,850 the CEO issued, with its invoice number."),
    ("24-client-refused-admin", "A client is refused Agency OS", "Visiting /admin with a client account. AdminGuard refuses it and offers the portal instead."),
    ("25-no-client-record", "An account with no client record", "A signed-in Google account with no onboarding record is told so plainly rather than shown an empty portal."),
    ("26-mobile-client-portal", "The portal on a phone", "Horizontal overflow asserted at 0px. This is the check that caught the header not wrapping — 13px of overflow, since fixed."),
    ("27-deliverables", "Deliverables", "The last of the four admin routes walked while watching for uncaught errors and failed same-origin requests."),
    ("28-keyboard-focus", "Keyboard navigation", "Tab from a cold load reaches a real control, with a visible focus ring."),
]


def draw_wrapped(c, text, x, y, width, style):
    para = Paragraph(text, style)
    _, height = para.wrap(width, 400)
    para.drawOn(c, x, y - height)
    return height


def cover(c, shot_count, results):
    c.setPageSize(letter)
    w, h = letter
    c.setFillColor(INK)
    c.rect(0, h - 3.1 * inch, w, 3.1 * inch, fill=1, stroke=0)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(0.9 * inch, h - 1.5 * inch, "Brand Mint Agency OS")
    c.setFont("Helvetica", 17)
    c.drawString(0.9 * inch, h - 1.95 * inch, "End-to-end journey, captured from the running app")
    c.setFillColor(colors.HexColor("#9cf7c5"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(0.9 * inch, h - 2.45 * inch, "Green Basket  ·  Rs.95,000 e-commerce redesign")

    styles = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=styles["Normal"], fontSize=10.5, leading=16, textColor=INK)

    y = h - 3.7 * inch
    y -= draw_wrapped(
        c,
        "Every screenshot in this report was taken by Playwright driving the real application: the production React "
        "client, the production tRPC routers, the real SOP gating, the real pricing and invoice arithmetic and the real "
        "PDF generator. Only Firestore and Cloud Storage are replaced — by in-memory doubles seeded at boot through "
        "those same routers — because this container holds no service-account credentials.",
        0.9 * inch, y, w - 1.8 * inch, body,
    ) + 14

    y -= draw_wrapped(
        c,
        "<b>Reproduce it:</b> <font face='Courier'>SIMULATION_MODE=1 npx playwright test</font>",
        0.9 * inch, y, w - 1.8 * inch, body,
    ) + 20

    rows = [["Result", "Value"]] + results
    table = Table(rows, colWidths=[3.1 * inch, 3.6 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#cfe0d8")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f8f4")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    _, th = table.wrap(w - 1.8 * inch, 400)
    table.drawOn(c, 0.9 * inch, y - th)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(0.9 * inch, 0.75 * inch, f"{shot_count} screenshots  ·  generated {datetime.now():%d %B %Y, %H:%M}")
    c.showPage()


def findings_page(c, findings):
    c.setPageSize(letter)
    w, h = letter
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 19)
    c.drawString(0.9 * inch, h - 1.0 * inch, "Defects this run found, and their fixes")

    rows = [["Where", "What was wrong", "Fix"]] + findings
    table = Table(rows, colWidths=[1.55 * inch, 3.0 * inch, 2.35 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.2),
        ("LEADING", (0, 0), (-1, -1), 11),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#cfe0d8")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f8f4")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    _, th = table.wrap(w - 1.8 * inch, 600)
    table.drawOn(c, 0.9 * inch, h - 1.35 * inch - th)
    c.showPage()


def shot_page(c, index, name, title, caption):
    path = os.path.join(SHOTS, f"{name}.png")
    styles = getSampleStyleSheet()
    cap_style = ParagraphStyle("cap", parent=styles["Normal"], fontSize=9.5, leading=14, textColor=MUTED)

    if not os.path.exists(path):
        c.setPageSize(letter)
        w, h = letter
        c.setFillColor(colors.HexColor("#b3261e"))
        c.setFont("Helvetica-Bold", 15)
        c.drawString(0.9 * inch, h - 1.1 * inch, f"{index:02d}. {title}")
        c.setFont("Helvetica", 10)
        c.drawString(0.9 * inch, h - 1.5 * inch, "No screenshot: this step did not run to completion.")
        c.showPage()
        return

    with Image.open(path) as img:
        iw, ih = img.size

    # Landscape for wide captures, portrait for tall ones, so each uses the page.
    page = landscape(letter) if iw >= ih else letter
    c.setPageSize(page)
    w, h = page

    margin = 0.6 * inch
    header_h = 0.95 * inch
    caption_para = Paragraph(caption, cap_style)
    _, cap_h = caption_para.wrap(w - 2 * margin, 300)
    avail_w = w - 2 * margin
    avail_h = h - header_h - cap_h - margin - 0.28 * inch

    scale = min(avail_w / iw, avail_h / ih)
    dw, dh = iw * scale, ih * scale
    x = (w - dw) / 2
    y = h - header_h - dh

    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(margin, h - 0.62 * inch, f"{index:02d}. {title}")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawRightString(w - margin, h - 0.62 * inch, f"{iw} x {ih} px")

    c.drawImage(path, x, y, width=dw, height=dh, preserveAspectRatio=True, anchor="n")
    c.setStrokeColor(colors.HexColor("#cfe0d8"))
    c.setLineWidth(0.7)
    c.rect(x, y, dw, dh, fill=0, stroke=1)

    caption_para.drawOn(c, margin, y - cap_h - 0.16 * inch)
    c.showPage()


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "Brand-Mint-E2E-Journey-Screenshots.pdf")
    present = [s for s in STEPS if os.path.exists(os.path.join(SHOTS, f"{s[0]}.png"))]

    results = [
        ["Screenshots captured", f"{len(present)} of {len(STEPS)}"],
        ["Headline scenario", "Green Basket — Rs.95,000, invoiced at Rs.1,26,850"],
        ["Viewports exercised", "390 x 844, 768 x 1024, 1440 x 900"],
        ["Accounts exercised", "1 CEO, 2 clients, 1 account with no record"],
        ["Seeded by", "the app's own tRPC procedures"],
    ]

    findings = [
        ["server/_core/vite.ts", "The dev server spread vite.config.ts, which exports a function. It resolved to {} — so no root, no aliases, no plugins, and /src/main.tsx was served as HTML. The app never mounted in development.", "Call the config function before spreading it."],
        ["server/_core/vite.ts", "The entry module was cache-busted with ?v=<nanoid>. ?v= is reserved for Vite's dependency optimizer and breaks resolution of a source file.", "Use ?t=<timestamp>, Vite's own convention for source modules."],
        ["vite.config.ts", "With analytics unconfigured, index.html shipped a literal %VITE_ANALYTICS_ENDPOINT% script tag, so every page load requested a malformed URL and logged a failure.", "Drop the tag when the variable is unset."],
        ["vite.config.ts", "A script tag was injected for /__manus__/debug-collector.js, which nothing serves. The SPA fallback returned index.html and the browser threw SyntaxError: Unexpected token '<' on every dev page load.", "Only inject it when the asset exists."],
        ["client/src/pages/ClientPortal.tsx", "The portal header did not wrap, overflowing a 390px viewport by 13px and scrolling the page sideways.", "Allow the header row to wrap."],
    ]

    c = pdfcanvas.Canvas(out, pagesize=letter)
    c.setTitle("Brand Mint Agency OS — E2E Journey Screenshots")
    cover(c, len(present), results)
    findings_page(c, findings)
    for i, (name, title, caption) in enumerate(STEPS, start=1):
        shot_page(c, i, name, title, caption)
    c.save()
    print(f"Wrote {out} ({len(present)}/{len(STEPS)} screenshots embedded)")


if __name__ == "__main__":
    main()
