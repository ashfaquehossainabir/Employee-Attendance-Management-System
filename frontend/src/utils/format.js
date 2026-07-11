export const formatMinutesLabel = (totalMinutes = 0) => {
  const h = Math.floor((totalMinutes || 0) / 60);
  const m = (totalMinutes || 0) % 60;
  return `${h}h ${m}m`;
};

export const formatMoney = (amount, currency = 'USD') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount || 0);
  } catch {
    return `${(amount || 0).toFixed(2)} ${currency}`;
  }
};

export const monthName = (month) =>
  new Date(2000, month - 1, 1).toLocaleDateString([], { month: 'long' });
