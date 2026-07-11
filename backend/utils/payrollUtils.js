const { startOfDay, endOfDay } = require('./timeUtils');

// Fraction of a day's pay deducted per late arrival (configurable)
const getLateDeductionFraction = () => Number(process.env.LATE_DEDUCTION_FRACTION || 0.1);

// Inclusive count of Mon–Fri days between two dates
const countWeekdays = (from, to) => {
  let count = 0;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const day = cursor.getDay(); // 0 = Sunday, 6 = Saturday
    if (day !== 0 && day !== 6) count += 1;
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

// Count weekday overlap between a leave request's [startDate, endDate] and
// the payroll period [periodFrom, periodTo]
const overlappingWeekdays = (leaveStart, leaveEnd, periodFrom, periodTo) => {
  const start = new Date(Math.max(new Date(leaveStart).getTime(), new Date(periodFrom).getTime()));
  const end = new Date(Math.min(new Date(leaveEnd).getTime(), new Date(periodTo).getTime()));
  if (start > end) return 0;
  return countWeekdays(start, end);
};

/**
 * Computes a full payslip breakdown for one employee for one month.
 * @param {Object} params
 * @param {Object} params.user - the employee (needs baseSalary, overtimeRate, currency)
 * @param {Array} params.attendanceRecords - attendance docs within the period
 * @param {Array} params.approvedLeaves - approved leave requests overlapping the period
 * @param {Date} params.from - period start
 * @param {Date} params.to - period end
 */
const computePayslip = ({ user, attendanceRecords, approvedLeaves, from, to }) => {
  const workingDays = countWeekdays(from, to);

  const presentDays = attendanceRecords.filter((r) => r.clockIn).length;
  const lateDays = attendanceRecords.filter((r) => r.isLate).length;
  const overtimeMinutes = attendanceRecords.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0);
  const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;

  const paidLeaveDays = approvedLeaves
    .filter((l) => l.leaveType !== 'unpaid')
    .reduce((sum, l) => sum + overlappingWeekdays(l.startDate, l.endDate, from, to), 0);

  const absentDays = Math.max(0, workingDays - presentDays - paidLeaveDays);

  const baseSalary = user.baseSalary || 0;
  const perDayRate = workingDays > 0 ? baseSalary / workingDays : 0;

  const absentDeduction = Math.round(absentDays * perDayRate * 100) / 100;
  const lateDeduction = Math.round(lateDays * perDayRate * getLateDeductionFraction() * 100) / 100;
  const overtimePay = Math.round(overtimeHours * (user.overtimeRate || 0) * 100) / 100;

  const netPay = Math.round((baseSalary + overtimePay - absentDeduction - lateDeduction) * 100) / 100;

  return {
    workingDays,
    presentDays,
    lateDays,
    absentDays,
    paidLeaveDays,
    overtimeHours,
    overtimePay,
    absentDeduction,
    lateDeduction,
    baseSalary,
    overtimeRate: user.overtimeRate || 0,
    netPay: Math.max(0, netPay),
  };
};

module.exports = {
  countWeekdays,
  resolveMonthRange,
  overlappingWeekdays,
  computePayslip,
};
