const wholeRupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const preciseRupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Renders as e.g. "₹1,00,000" (or "₹1,00,000.00" with { decimals: true }) so
// currency shows up the same way everywhere instead of some screens using
// "Rs." and others using "₹".
export const formatCurrency = (value: number | null | undefined, options?: { decimals?: boolean }): string => {
  const amount = value ?? 0;
  return options?.decimals ? preciseRupeeFormatter.format(amount) : wholeRupeeFormatter.format(amount);
};
