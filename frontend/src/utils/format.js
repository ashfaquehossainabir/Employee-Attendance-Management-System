export const formatMinutesLabel = (totalMinutes = 0) => {
  const h = Math.floor((totalMinutes || 0) / 60);
  const m = (totalMinutes || 0) % 60;
  return `${h}h ${m}m`;
};
