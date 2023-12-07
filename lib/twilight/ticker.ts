function formatCurrency(input: unknown) {
  const value = Number(input);

  if (isNaN(value)) {
    return "";
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export { formatCurrency };
