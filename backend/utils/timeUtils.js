// Helpers for computing late arrivals, overtime, and normalized dates.

const getWorkConfig = () => {
  const [startH, startM] = (process.env.WORK_START_TIME || '09:00')
    .split(':')
    .map(Number);
  const [endH, endM] = (process.env.WORK_END_TIME || '18:00')
    .split(':')
    .map(Number);
  const graceMinutes = Number(process.env.LATE_GRACE_MINUTES || 10);
  const standardWorkHours = Number(process.env.STANDARD_WORK_HOURS || 8);

  return { startH, startM, endH, endM, graceMinutes, standardWorkHours };
};

// Normalize any date to midnight UTC (so a user has exactly one record per day)
const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

// Determine if a clock-in time counts as late, and by how many minutes
const evaluateClockIn = (clockInDate) => {
  const { startH, startM, graceMinutes } = getWorkConfig();
  const expectedStart = new Date(clockInDate);
  expectedStart.setHours(startH, startM, 0, 0);

  const diffMinutes = Math.round((clockInDate - expectedStart) / 60000);
  const isLate = diffMinutes > graceMinutes;

  return {
    isLate,
    lateByMinutes: isLate ? diffMinutes : 0,
  };
};

// Compute worked minutes and overtime once clocked out
const evaluateClockOut = (clockInDate, clockOutDate) => {
  const { standardWorkHours } = getWorkConfig();
  const workedMinutes = Math.max(
    0,
    Math.round((clockOutDate - clockInDate) / 60000)
  );
  const standardMinutes = standardWorkHours * 60;
  const overtimeMinutes = Math.max(0, workedMinutes - standardMinutes);

  return { workedMinutes, overtimeMinutes };
};

const formatMinutes = (totalMinutes = 0) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
};

module.exports = {
  getWorkConfig,
  startOfDay,
  endOfDay,
  evaluateClockIn,
  evaluateClockOut,
  formatMinutes,
};
