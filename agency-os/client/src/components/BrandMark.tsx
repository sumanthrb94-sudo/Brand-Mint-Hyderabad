export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" aria-label="Brand Mint Studios">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#a8ffcf] text-[13px] font-extrabold tracking-[-0.14em] text-[#073428] shadow-[0_2px_10px_rgba(42,238,156,0.28)]">
        M
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[13px] font-extrabold tracking-[-0.04em] text-[#102c24]">Brand Mint</span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6c7f78]">Studios</span>
        </span>
      )}
    </div>
  );
}
