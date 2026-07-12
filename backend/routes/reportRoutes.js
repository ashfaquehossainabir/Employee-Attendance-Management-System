const express = require('express');
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');
const { startOfDay, endOfDay } = require('../utils/timeUtils');

const router = express.Router();

// Converts an array of attendance records (with populated user, if any)
// into CSV text. Keeps it dependency-free since the shape is simple.
const recordsToCsv = (records, includeEmployee) => {
  const headers = [
    'Date',
    ...(includeEmployee ? ['Employee', 'Employee ID'] : []),
    'Status',
    'Clock In',
    'Clock Out',
    'Worked Minutes',
    'Overtime Minutes',
    'Late By Minutes',
  ];

  const escape = (val) => {
    const str = val === null || val === undefined ? '' : String(val);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const rows = records.map((r) => {
    const row = [
      new Date(r.date).toISOString().slice(0, 10),
      ...(includeEmployee ? [r.user?.name || '', r.user?.employeeId || ''] : []),
      r.status,
      r.clockIn ? new Date(r.clockIn).toISOString() : '',
      r.clockOut ? new Date(r.clockOut).toISOString() : '',
      r.workedMinutes || 0,
      r.overtimeMinutes || 0,
      r.lateByMinutes || 0,
    ];
    return row.map(escape).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

// Resolve a date range for a given period ('daily' | 'weekly' | 'monthly')
// anchored on an optional `date` query param (defaults to today).
const resolveRange = (period, dateParam) => {
  const anchor = dateParam ? new Date(dateParam) : new Date();
  let from;
  let to = endOfDay(anchor);

  if (period === 'daily') {
    from = startOfDay(anchor);
  } else if (period === 'weekly') {
    const day = anchor.getDay(); // 0 = Sunday
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() + diffToMonday);
    from = startOfDay(monday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    to = endOfDay(sunday);
  } else {
    // monthly
    from = startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    to = endOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
  }

  return { from, to };
};

const buildSummary = (records) => {
  const summary = {
    totalDays: records.length,
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
    totalWorkedMinutes: 0,
    totalOvertimeMinutes: 0,
    totalLateMinutes: 0,
  };

  records.forEach((r) => {
    if (r.status === 'present') summary.present += 1;
    if (r.status === 'late') summary.late += 1;
    if (r.status === 'absent') summary.absent += 1;
    if (r.status === 'on-leave') summary.onLeave += 1;
    summary.totalWorkedMinutes += r.workedMinutes || 0;
    summary.totalOvertimeMinutes += r.overtimeMinutes || 0;
    summary.totalLateMinutes += r.lateByMinutes || 0;
  });

  return summary;
};

// @route   GET /api/reports/my?period=daily|weekly|monthly&date=YYYY-MM-DD
// @desc    Logged-in employee's own report for a period
router.get('/my', protect, async (req, res) => {
  try {
    const { period = 'daily', date } = req.query;
    const { from, to } = resolveRange(period, date);

    const records = await Attendance.find({
      user: req.user._id,
      date: { $gte: from, $lte: to },
    }).sort({ date: 1 });

    res.json({ period, from, to, records, summary: buildSummary(records) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate report', error: err.message });
  }
});

// @route   GET /api/reports/team?period=&date=&userId=
// @desc    Admin: report across all employees, or a specific employee
router.get('/team', protect, requireRole('admin'), async (req, res) => {
  try {
    const { period = 'daily', date, userId } = req.query;
    const { from, to } = resolveRange(period, date);

    const match = { date: { $gte: from, $lte: to } };
    if (userId) match.user = new mongoose.Types.ObjectId(userId);

    const records = await Attendance.find(match)
      .populate('user', 'name email employeeId department role')
      .sort({ date: -1 });

    // Per-employee breakdown
    const byEmployee = {};
    records.forEach((r) => {
      const key = r.user?._id?.toString() || 'unknown';
      if (!byEmployee[key]) {
        byEmployee[key] = {
          user: r.user,
          summary: buildSummary([]),
        };
      }
      const s = byEmployee[key].summary;
      s.totalDays += 1;
      if (r.status === 'present') s.present += 1;
      if (r.status === 'late') s.late += 1;
      if (r.status === 'absent') s.absent += 1;
      if (r.status === 'on-leave') s.onLeave += 1;
      s.totalWorkedMinutes += r.workedMinutes || 0;
      s.totalOvertimeMinutes += r.overtimeMinutes || 0;
      s.totalLateMinutes += r.lateByMinutes || 0;
    });

    res.json({
      period,
      from,
      to,
      records,
      overallSummary: buildSummary(records),
      byEmployee: Object.values(byEmployee),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate team report', error: err.message });
  }
});

// @route   GET /api/reports/overview
// @desc    Admin dashboard quick stats: who's in today, late count, headcount
router.get('/overview', protect, requireRole('admin'), async (req, res) => {
  try {
    const today = startOfDay();
    const totalEmployees = await User.countDocuments({ role: 'employee', isActive: true });

    const todayRecords = await Attendance.find({ date: today }).populate(
      'user',
      'name email employeeId department'
    );

    const clockedIn = todayRecords.filter((r) => r.clockIn && !r.clockOut).length;
    const clockedOut = todayRecords.filter((r) => r.clockOut).length;
    const lateToday = todayRecords.filter((r) => r.isLate).length;
    const notClockedInYet = Math.max(0, totalEmployees - todayRecords.length);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newHiresThisMonth = await User.countDocuments({
      role: 'employee',
      joiningDate: { $gte: monthStart },
    });

    const recentJoiners = await User.find({ role: 'employee', isActive: true })
      .sort({ joiningDate: -1 })
      .limit(5)
      .select('name employeeId department joiningDate');

    res.json({
      totalEmployees,
      presentToday: todayRecords.length,
      clockedIn,
      clockedOut,
      lateToday,
      notClockedInYet,
      newHiresThisMonth,
      recentJoiners,
      todayRecords,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch overview', error: err.message });
  }
});

// @route   GET /api/reports/my/export?period=&date=
// @desc    Download the logged-in employee's own report as CSV
router.get('/my/export', protect, async (req, res) => {
  try {
    const { period = 'monthly', date } = req.query;
    const { from, to } = resolveRange(period, date);

    const records = await Attendance.find({
      user: req.user._id,
      date: { $gte: from, $lte: to },
    }).sort({ date: 1 });

    const csv = recordsToCsv(records, false);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance-${period}-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Failed to export report', error: err.message });
  }
});

// @route   GET /api/reports/team/export?period=&date=&userId=
// @desc    Admin: download a team (or single-employee) report as CSV
router.get('/team/export', protect, requireRole('admin'), async (req, res) => {
  try {
    const { period = 'monthly', date, userId } = req.query;
    const { from, to } = resolveRange(period, date);

    const match = { date: { $gte: from, $lte: to } };
    if (userId) match.user = new mongoose.Types.ObjectId(userId);

    const records = await Attendance.find(match)
      .populate('user', 'name employeeId')
      .sort({ date: -1 });

    const csv = recordsToCsv(records, true);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="team-attendance-${period}-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Failed to export report', error: err.message });
  }
});

module.exports = router;
