import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }
}

/**
 * Loaded on demand rather than in index.html, so a visitor who never pays
 * never fetches Razorpay's script.
 */
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load the payment window")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment window"));
    document.head.appendChild(script);
  });
}

export function InvoicePayButton({ invoiceId, invoiceNumber, onOpened }: { invoiceId: number; invoiceNumber: string; onOpened?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkout = trpc.payments.checkout.useMutation();

  const pay = async () => {
    setError(null);
    setBusy(true);
    try {
      const [order] = await Promise.all([checkout.mutateAsync({ invoiceId }), loadCheckout()]);
      if (!window.Razorpay) throw new Error("Could not load the payment window");

      new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "Brand Mint Studios",
        description: `Invoice ${order.invoiceNumber}`,
        // The invoice is marked paid by the signed webhook, never by this
        // callback — the browser is not a trustworthy source of "it worked".
        handler: () => onOpened?.(),
        modal: { ondismiss: () => setBusy(false) },
      }).open();
      onOpened?.();
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "Payment could not be started");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={() => void pay()} disabled={busy} className="gap-2 rounded-full bg-[#103c2e] text-xs text-white hover:bg-[#0b3024]">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
        {busy ? "Opening" : "Pay now"}
      </Button>
      {error ? <p role="alert" className="max-w-52 text-right text-[11px] leading-4 text-[#a43a2a]">{error}</p> : null}
      <span className="sr-only">Pay invoice {invoiceNumber}</span>
    </div>
  );
}
