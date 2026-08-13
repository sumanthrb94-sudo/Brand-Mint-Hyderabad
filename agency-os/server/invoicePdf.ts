import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type PdfInvoice = {
  invoiceNumber: string;
  companyName: string;
  issueDate: Date;
  dueDate: Date;
  items: { description: string; quantity: number; unitAmountPaise: number; totalAmountPaise: number }[];
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
};

function formatMoney(paise: number) {
  return `INR ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function generateInvoicePdf(invoice: PdfInvoice) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.06, 0.24, 0.18);
  const mint = rgb(0.05, 0.58, 0.34);
  const muted = rgb(0.35, 0.44, 0.40);
  let y = 780;

  page.drawText("BRAND MINT STUDIOS", { x: 48, y, size: 18, font: bold, color: dark });
  page.drawText("INVOICE", { x: 48, y: y - 25, size: 9, font: bold, color: mint });
  page.drawText(invoice.invoiceNumber, { x: 420, y: y - 2, size: 10, font: bold, color: dark });
  page.drawText(`Issued ${invoice.issueDate.toLocaleDateString("en-IN")}`, { x: 420, y: y - 18, size: 8, font: regular, color: muted });
  page.drawText(`Due ${invoice.dueDate.toLocaleDateString("en-IN")}`, { x: 420, y: y - 32, size: 8, font: regular, color: muted });

  y -= 96;
  page.drawText("BILL TO", { x: 48, y, size: 8, font: bold, color: mint });
  page.drawText(invoice.companyName, { x: 48, y: y - 18, size: 12, font: bold, color: dark });
  y -= 78;
  page.drawLine({ start: { x: 48, y }, end: { x: 547, y }, thickness: 1, color: rgb(0.84, 0.90, 0.87) });
  y -= 22;
  page.drawText("DESCRIPTION", { x: 48, y, size: 8, font: bold, color: muted });
  page.drawText("QTY", { x: 378, y, size: 8, font: bold, color: muted });
  page.drawText("AMOUNT", { x: 454, y, size: 8, font: bold, color: muted });
  y -= 16;
  page.drawLine({ start: { x: 48, y }, end: { x: 547, y }, thickness: 1, color: rgb(0.84, 0.90, 0.87) });
  y -= 22;

  for (const item of invoice.items) {
    page.drawText(item.description.slice(0, 54), { x: 48, y, size: 9, font: regular, color: dark });
    page.drawText(String(item.quantity), { x: 380, y, size: 9, font: regular, color: dark });
    page.drawText(formatMoney(item.totalAmountPaise), { x: 454, y, size: 9, font: regular, color: dark });
    y -= 25;
  }

  y -= 6;
  page.drawLine({ start: { x: 320, y }, end: { x: 547, y }, thickness: 1, color: rgb(0.84, 0.90, 0.87) });
  y -= 22;
  const drawTotal = (label: string, value: string, weight = regular, color = dark) => {
    page.drawText(label, { x: 372, y, size: 9, font: weight, color });
    page.drawText(value, { x: 454, y, size: 9, font: weight, color });
    y -= 20;
  };
  drawTotal("Subtotal", formatMoney(invoice.subtotalPaise));
  drawTotal("GST", formatMoney(invoice.gstPaise));
  page.drawLine({ start: { x: 320, y: y + 6 }, end: { x: 547, y: y + 6 }, thickness: 1, color: dark });
  drawTotal("TOTAL", formatMoney(invoice.totalPaise), bold, dark);
  page.drawText("Brand Mint Studios", { x: 48, y: 54, size: 8, font: regular, color: muted });
  return pdf.save();
}
