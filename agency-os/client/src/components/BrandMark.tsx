type BrandMarkProps = {
  compact?: boolean;
};

/**
 * Brand Mint's production-safe vector mark.  It is rendered inline rather
 * than linked from a Manus-only asset path, so it is available on Vercel,
 * local development, and every branch preview without an external request.
 */
export function BrandMark({ compact = false }: BrandMarkProps) {
  if (compact) {
    return (
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label="Brand Mint Studios"
        className="h-8 w-8 shrink-0"
      >
        <circle cx="32" cy="32" r="31" fill="#9DFFC3" />
        <path
          d="M16 44V20h6.8L32 33.1 41.2 20H48v24h-5.6V29.2L32 42.4h-.2L21.6 29.2V44H16Z"
          fill="#113F32"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 500 80"
      role="img"
      aria-label="Brand Mint Studios, Hyderabad"
      className="h-9 w-auto max-w-[245px] shrink-0"
    >
      <circle cx="40" cy="40" r="38" fill="#9DFFC3" />
      <path
        d="M20 55V25h8.5L40 42.1 51.5 25H60v30h-7V36.6L40.4 52.4h-.8L27 36.6V55h-7Z"
        fill="#113F32"
      />
      <text
        x="96"
        y="40"
        fill="#113F32"
        fontFamily="'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="28"
        fontWeight="700"
        letterSpacing="2.25"
      >
        BRAND MINT
      </text>
      <line x1="98" y1="55" x2="294" y2="55" stroke="#B8C7BC" strokeWidth="1.5" />
      <text
        x="309"
        y="60"
        fill="#657469"
        fontFamily="'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="13"
        fontWeight="700"
        letterSpacing="2.5"
      >
        HYDERABAD
      </text>
    </svg>
  );
}
