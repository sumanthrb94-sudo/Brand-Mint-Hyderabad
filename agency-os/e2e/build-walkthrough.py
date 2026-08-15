#!/usr/bin/env python3
"""
Builds the side-by-side walkthrough: one client, both sides of every step.

Pairs each step's `-admin.png` and `-client.png` into a single image and lays it
out as a guide to the agency process. Both halves of every pair were captured at
the same moment, from two browsers held open at once.

Usage:  python3 e2e/build-walkthrough.py
"""

import os
import sys

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import Paragraph, Table, TableStyle

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "walkthrough")
PAIRS = os.path.join(SHOTS, "pairs")

GREEN = colors.HexColor("#0d8855")
INK = colors.HexColor("#12362a")
MUTED = colors.HexColor("#66807a")
GAP = 40           # white gutter between the two halves, in source pixels
HALF_WIDTH = 1440  # both browsers ran at this width

# (file prefix, title, what the CEO did, what the client saw)
STEPS = [
    ("step-01-empty", "An empty studio",
     "Reset all has been clicked and confirmed, then the client records cleared too. No projects, no invoices, no clients.",
     "Signed out. There is nothing to see and nothing to sign in to yet."),
    ("step-02-enquiry-filled", "The client writes in",
     "Nothing to do yet — the request has not been sent.",
     "Filling in the enquiry form on the public site. Name, business, email and what they need."),
    ("step-03-request-received", "The request arrives",
     "It appears in the Lead inbox on the dashboard, with the contact details and the full request. This is a lead, not yet a client.",
     "A confirmation. Their part is done until they hear back."),
    ("step-04-onboarding-contact", "Onboarding, step 1 of 4",
     "The CEO opens Add a client and records the contact. This is the step that converts a lead into a client record.",
     "Still just the confirmation — onboarding happens on the studio's side."),
    ("step-05-onboarding-tier", "Onboarding, step 2 — the tier",
     "Growth Store at Rs.2,00,000, with an extra design revision round added. The tier sets the project's price.",
     "Unchanged."),
    ("step-06-onboarding-legal", "Onboarding, step 4 — acceptance",
     "All four policy documents must be accepted. Complete review stays disabled until the box is ticked — this is a gate, not a formality.",
     "Unchanged. The acceptance recorded here is what will later permit portal access."),
    ("step-07-onboarding-complete", "The client exists",
     "Confirmation, and the CEO is offered Back to Agency OS. Behind this: a client record, a contact, four legal acceptances, and a discovery project with its checklist already attached.",
     "Still nothing — they have not signed in yet."),
    ("step-08-client-first-sign-in", "The client signs in",
     "The dashboard now shows one active engagement in Discovery.",
     "Their project, its stage, and the price. Access was granted by the email matching the contact record, with all four acceptances present."),
    ("step-09-sop-at-start", "The checklist, untouched",
     "The project opens with the studio's standard operating procedure attached: four stages, required steps marked. Nothing is ticked yet.",
     "The client sees the stage, not the checklist. The procedure is the studio's business."),
    ("step-10-discovery-worked", "Discovery is worked through",
     "Every required discovery step ticked — agreement stored, advance invoice, kickoff call, client access received.",
     "Unchanged. Internal progress is not narrated to the client."),
    ("step-11-stage-in-progress", "The stage moves",
     "In progress. The move was only permitted because discovery's required steps were done; otherwise it is refused and the outstanding items named.",
     "The status changes. This is the first thing the client sees from all that work."),
    ("step-12-deliverables-added", "The plan becomes visible",
     "Three deliverables added against the project.",
     "The client can now see what is actually being built for them, by name."),
    ("step-13-agreement-awaiting-signature", "The agreement goes out",
     "A contract record is created and moved to awaiting signature.",
     "It appears in their documents list as needing action."),
    ("step-14-agreement-signed", "And comes back signed",
     "Marked signed on the studio's side.",
     "The status updates to signed."),
    ("step-15-invoice-form", "Preparing the invoice",
     "Choosing the client and project pre-fills the line item and the amount from the project's current price, so the invoice cannot drift from the record.",
     "Nothing yet — the invoice has not been issued."),
    ("step-16-invoice-issued", "The invoice is issued",
     "Rs.2,00,000 plus 18% GST = Rs.2,36,000, with a numbered invoice and a PDF generated and stored.",
     "The invoice appears with its number and total, and the PDF is available to download."),
    ("step-17-invoice-paid", "Payment is recorded",
     "Marked paid. This is also what promotes the client from lead to active and moves the revenue figure.",
     "The invoice reads as paid."),
    ("step-18-project-complete", "The work is completed",
     "Client review and then Complete, each gated on its required steps. Anything outstanding was overridden deliberately, and that override is recorded as a notification.",
     "The project shows as complete."),
    ("step-19-final-dashboard", "Where it ends",
     "One active client, no open projects, the revenue recorded. The whole cycle, from a stranger's message to a paid and finished job.",
     "Their finished project and their paid invoice."),
]


def compose_pair(prefix):
    """Stitches admin | client into one image. Returns its path, or None."""
    left = os.path.join(SHOTS, f"{prefix}-admin.png")
    right = os.path.join(SHOTS, f"{prefix}-client.png")
    if not (os.path.exists(left) and os.path.exists(right)):
        return None

    os.makedirs(PAIRS, exist_ok=True)
    out = os.path.join(PAIRS, f"{prefix}.png")

    with Image.open(left) as a, Image.open(right) as b:
        a = a.convert("RGB")
        b = b.convert("RGB")
        # Both were captured at the same width; normalise anyway so a changed
        # viewport cannot silently skew one half against the other.
        a = a.resize((HALF_WIDTH, round(a.height * HALF_WIDTH / a.width)), Image.LANCZOS)
        b = b.resize((HALF_WIDTH, round(b.height * HALF_WIDTH / b.width)), Image.LANCZOS)

        height = max(a.height, b.height)
        canvas = Image.new("RGB", (HALF_WIDTH * 2 + GAP, height), "white")
        canvas.paste(a, (0, 0))
        canvas.paste(b, (HALF_WIDTH + GAP, 0))
        canvas.save(out, "PNG", optimize=True)
    return out


def cover(c, count):
    c.setPageSize(landscape(letter))
    w, h = landscape(letter)
    c.setFillColor(INK)
    c.rect(0, h - 2.7 * inch, w, 2.7 * inch, fill=1, stroke=0)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(0.9 * inch, h - 1.35 * inch, "How the agency runs")
    c.setFont("Helvetica", 16)
    c.drawString(0.9 * inch, h - 1.78 * inch, "One client, from first message to paid — both sides of every step")
    c.setFillColor(colors.HexColor("#9cf7c5"))
    c.setFont("Helvetica-Bold", 11.5)
    c.drawString(0.9 * inch, h - 2.22 * inch, "Deccan Bloom  ·  Growth Store, Rs.2,00,000  ·  invoiced at Rs.2,36,000")

    styles = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=styles["Normal"], fontSize=11, leading=16.5, textColor=INK)
    para = Paragraph(
        "Every page shows the same moment twice. <b>On the left is Agency OS</b>, what you see as the studio. "
        "<b>On the right is the client portal</b>, what they see. Two browsers were held open at once and both were "
        "photographed after each move, so the right-hand side is genuinely what the client had in front of them at "
        "that point — not a reconstruction.<br/><br/>"
        "The studio was emptied first, through the Reset all button, so nothing in these pages belongs to any other client.",
        body,
    )
    _, ph = para.wrap(w - 1.8 * inch, 300)
    para.drawOn(c, 0.9 * inch, h - 3.15 * inch - ph)

    rows = [
        ["Stage", "What has to be true"],
        ["Lead", "A request arrives through the public site. Not yet a client."],
        ["Onboarding", "Contact recorded, tier chosen, all four policies accepted."],
        ["Discovery", "Agreement stored, advance paid, kickoff held, access received."],
        ["In progress", "Weekly demo booked, in-scope features built."],
        ["Client review", "QA, mobile, forms tested, content checked, balance invoiced."],
        ["Complete", "Deployed, final payment received, credentials handed over, handover held."],
    ]
    table = Table(rows, colWidths=[1.7 * inch, 6.6 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#cfe0d8")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f8f4")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    _, th = table.wrap(w - 1.8 * inch, 400)
    table.drawOn(c, 0.9 * inch, h - 3.5 * inch - ph - th)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(0.9 * inch, 0.62 * inch, f"{count} steps, each captured on both sides")
    c.showPage()


def step_page(c, index, prefix, title, admin_note, client_note):
    image = compose_pair(prefix)
    page = landscape(letter)
    c.setPageSize(page)
    w, h = page
    margin = 0.55 * inch

    styles = getSampleStyleSheet()
    note = ParagraphStyle("note", parent=styles["Normal"], fontSize=9.2, leading=13, textColor=INK)

    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, h - 0.6 * inch, f"{index:02d}. {title}")

    if not image:
        c.setFillColor(colors.HexColor("#b3261e"))
        c.setFont("Helvetica", 10)
        c.drawString(margin, h - 1.0 * inch, "This step did not produce a pair of screenshots.")
        c.showPage()
        return

    half = (w - 2 * margin - 0.25 * inch) / 2

    # The two explanations sit above their own half of the image.
    left_head, right_head = "YOU — Agency OS", "THEM — Client portal"
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(INK)
    c.drawString(margin, h - 0.92 * inch, left_head)
    c.drawString(margin + half + 0.25 * inch, h - 0.92 * inch, right_head)

    left_para = Paragraph(admin_note, note)
    right_para = Paragraph(client_note, note)
    _, lh = left_para.wrap(half, 200)
    _, rh = right_para.wrap(half, 200)
    note_h = max(lh, rh)
    left_para.drawOn(c, margin, h - 1.06 * inch - lh)
    right_para.drawOn(c, margin + half + 0.25 * inch, h - 1.06 * inch - rh)

    with Image.open(image) as img:
        iw, ih = img.size

    top = h - 1.2 * inch - note_h
    avail_w = w - 2 * margin
    avail_h = top - margin
    scale = min(avail_w / iw, avail_h / ih)
    dw, dh = iw * scale, ih * scale
    x = (w - dw) / 2
    y = top - dh

    c.drawImage(image, x, y, width=dw, height=dh, preserveAspectRatio=True, anchor="n")
    c.setStrokeColor(colors.HexColor("#cfe0d8"))
    c.setLineWidth(0.7)
    # Outline each half so the split between the two views is unmistakable.
    c.rect(x, y, dw / 2 - (GAP * scale) / 2, dh, fill=0, stroke=1)
    c.rect(x + dw / 2 + (GAP * scale) / 2, y, dw / 2 - (GAP * scale) / 2, dh, fill=0, stroke=1)
    c.showPage()


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "Brand-Mint-Agency-Walkthrough.pdf")
    present = [s for s in STEPS if os.path.exists(os.path.join(SHOTS, f"{s[0]}-admin.png"))]

    c = pdfcanvas.Canvas(out, pagesize=landscape(letter))
    c.setTitle("Brand Mint — how the agency runs, both sides")
    cover(c, len(present))
    for i, (prefix, title, admin_note, client_note) in enumerate(STEPS, start=1):
        step_page(c, i, prefix, title, admin_note, client_note)
    c.save()
    print(f"Wrote {out} ({len(present)}/{len(STEPS)} steps paired)")


if __name__ == "__main__":
    main()
