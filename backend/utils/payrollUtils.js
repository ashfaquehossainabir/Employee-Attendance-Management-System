const { startOfDay, endOfDay } = require('./timeUtils');

// Fraction of a day's pay deducted per late arrival (configurable)
const getLateDeductionFraction = () => Number(process.env.LATE_DEDUCTION_FRACTION || 0.1);

// Inclusive count of working days between two dates, given a set of
// weekend day-of-week numbers (0 = Sunday ... 6 = Saturday). Defaults to
// the standard Sat/Sun weekend if none is supplied.
const countWorkingDays = (from, to, weekendDays = [0, 6]) => {
  if (!from || !to || from > to) return 0;

  const weekendSet = new Set(weekendDays);
  let count = 0;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    if (!weekendSet.has(cursor.getDay())) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

// Resolve the [from, to] range (UTC day-normalized) for a given year/month (1-12)
const resolveMonthRange = (year, month) => {
  const from = startOfDay(new Date(year, month - 1, 1));
  const to = endOfDay(new Date(year, month, 0)); // day 0 of next month = last day of this month
  return { from, to };
};

// Count working-day overlap between a leave request's [startDate, endDate]
// and the payroll period [periodFrom, periodTo]
const overlappingWorkingDays = (leaveStart, leaveEnd, periodFrom, periodTo, weekendDays) => {
  const start = new Date(Math.max(new Date(leaveStart).getTime(), new Date(periodFrom).getTime()));
  const end = new Date(Math.min(new Date(leaveEnd).getTime(), new Date(periodTo).getTime()));
  if (start > end) return 0;
  return countWorkingDays(start, end, weekendDays);
};

/**
 * Computes a full payslip breakdown for one employee for one month.
 * Automatically prorates the period if the employee joined partway through
 * the month (working days before their joining date don't count against
 * them, and their earned salary is scaled to the days actually employed).
 *
 * @param {Object} params
 * @param {Object} params.user - the employee (needs baseSalary, overtimeRate,
 *   weekendDays, joiningDate, currency)
 * @param {Array} params.attendanceRecords - attendance docs within the period
 * @param {Array} params.approvedLeaves - approved leave requests overlapping the period
 * @param {Date} params.from - period start
 * @param {Date} params.to - period end
 */
const computePayslip = ({ user, attendanceRecords, approvedLeaves, from, to }) => {
  const weekendDays = Array.isArray(user.weekendDays) && user.weekendDays.length ? user.weekendDays : [0, 6];

  // Full calendar-month working days — used to derive the standard per-day rate,
  // so salary isn't inflated just because someone joined mid-month.
  const monthWorkingDays = countWorkingDays(from, to, weekendDays);

  // Effective range this employee was actually employed for within the period
  const joiningDate = user.joiningDate ? startOfDay(new Date(user.joiningDate)) : null;
  const employedFrom = joiningDate && joiningDate > from ? joiningDate : from;
  const joinedAfterPeriod = joiningDate && joiningDate > to;

  const employedWorkingDays = joinedAfterPeriod ? 0 : countWorkingDays(employedFrom, to, weekendDays);

  const presentDays = attendanceRecords.filter((r) => r.clockIn).length;
  const lateDays = attendanceRecords.filter((r) => r.isLate).length;
  const overtimeMinutes = attendanceRecords.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0);
  const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;

  const paidLeaveDays = approvedLeaves
    .filter((l) => l.leaveType !== 'unpaid')
    .reduce(
      (sum, l) => sum + overlappingWorkingDays(l.startDate, l.endDate, employedFrom, to, weekendDays),
      0
    );

  const absentDays = Math.max(0, employedWorkingDays - presentDays - paidLeaveDays);

  const baseSalary = user.baseSalary || 0;
  // Per-day rate is based on the full month, so a mid-month joiner's daily
  // rate matches everyone else's — only the number of days they're paid for changes.
  const perDayRate = monthWorkingDays > 0 ? baseSalary / monthWorkingDays : 0;

  // Prorated earned salary: full month's pay if employed the whole period,
  // scaled down to the days actually on payroll otherwise.
  const earnedSalary = Math.round(perDayRate * employedWorkingDays * 100) / 100;

  const absentDeduction = Math.round(absentDays * perDayRate * 100) / 100;
  const lateDeduction = Math.round(lateDays * perDayRate * getLateDeductionFraction() * 100) / 100;
  const overtimePay = Math.round(overtimeHours * (user.overtimeRate || 0) * 100) / 100;

  const netPay = Math.round((earnedSalary + overtimePay - absentDeduction - lateDeduction) * 100) / 100;

  return {
    workingDays: employedWorkingDays,
    presentDays,
    lateDays,
    absentDays,
    paidLeaveDays,
    overtimeHours,
    overtimePay,
    absentDeduction,
    lateDeduction,
    baseSalary,
    earnedSalary,
    overtimeRate: user.overtimeRate || 0,
    weekendDays,
    prorated: employedWorkingDays < monthWorkingDays,
    netPay: Math.max(0, netPay),
  };
};

module.exports = {
  countWorkingDays,
  resolveMonthRange,
  overlappingWorkingDays,
  computePayslip,
};
