export function BrandMark({ compact = false }: { compact?: boolean }) {
  if (!compact) {
    return (
      <img
        src="/manus-storage/brand-mint-primary-lockup-4k_a88c6eec.svg"
        alt="Brand Mint Studios, Hyderabad"
        className="h-9 w-auto max-w-[245px] object-contain object-left"
      />
    );
  }
  return (
    <img
      src="/manus-storage/brand-mint-app-icon-4k_0c6bd0ac.svg"
      alt="Brand Mint Studios"
      className="h-8 w-8 object-contain"
    />
  );
}
