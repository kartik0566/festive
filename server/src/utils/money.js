export const toAmount = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
};

export const calculateTotals = ({ items = [], taxRate = 18, discount = 0 }) => {
  const normalizedItems = items.map((item) => {
    const quantity = toAmount(item.quantity || 1);
    const unitPrice = toAmount(item.unitPrice);
    return {
      name: item.name,
      description: item.description || "",
      quantity,
      unitPrice,
      total: quantity * unitPrice
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = toAmount(discount);
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = taxableAmount * (toAmount(taxRate) / 100);
  const total = taxableAmount + taxAmount;

  return {
    items: normalizedItems,
    subtotal,
    discount: discountAmount,
    taxRate: toAmount(taxRate),
    taxAmount,
    total
  };
};

