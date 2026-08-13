export function BrandMark({ compact = false }: { compact?: boolean }) {
  if (!compact) {
    return <img src="/manus-storage/brand-mint-primary-dark_cba2a556.svg" alt="Brand Mint" className="h-7 w-auto" />;
  }
  return (
    <div className="flex items-center gap-2.5" aria-label="Brand Mint Studios">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#a8ffcf] text-[13px] font-extrabold tracking-[-0.14em] text-[#073428] shadow-[0_2px_10px_rgba(42,238,156,0.28)]">
        M
      </span>
    </div>
  );
}
