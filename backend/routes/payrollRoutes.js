const express = require('express');
const Payslip = require('../models/Payslip');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');
const { handleDbError } = require('../utils/errorHandler');
const { resolveMonthRange, computePayslip } = require('../utils/payrollUtils');

const router = express.Router();

const buildPayslipFor = async (user, year, month, generatedById) => {
  const { from, to } = resolveMonthRange(year, month);

  const [attendanceRecords, approvedLeaves] = await Promise.all([
    Attendance.find({ user: user._id, date: { $gte: from, $lte: to } }),
    LeaveRequest.find({
      user: user._id,
      status: 'approved',
      startDate: { $lte: to },
      endDate: { $gte: from },
    }),
  ]);

  const breakdown = computePayslip({ user, attendanceRecords, approvedLeaves, from, to });

  return Payslip.create({
    user: user._id,
    year,
    month,
    currency: user.currency || 'USD',
    generatedBy: generatedById,
    ...breakdown,
  });
};

// @route   POST /api/payroll/generate
// @desc    Admin: generate payslip(s) for a month. Pass userId for a single
//          employee, or omit it to generate for every active employee.
router.post('/generate', protect, requireRole('admin'), async (req, res) => {
  try {
    const { year, month, userId } = req.body;
    const y = Number(year);
    const m = Number(month);

    if (!y || !m || m < 1 || m > 12) {
      return res.status(400).json({ message: 'A valid year and month (1-12) are required' });
    }

    const targets = userId
      ? await User.find({ _id: userId })
      : await User.find({ role: 'employee', isActive: true });

    if (targets.length === 0) {
      return res.status(404).json({ message: 'No matching employees found' });
    }

    const generated = [];
    const skipped = [];

    for (const user of targets) {
      const already = await Payslip.findOne({ user: user._id, year: y, month: m });
      if (already) {
        skipped.push({ user: user.name, reason: 'Payslip already exists for this period' });
        continue;
      }
      const payslip = await buildPayslipFor(user, y, m, req.user._id);
      generated.push(payslip);
    }

    res.status(201).json({
      message: `Generated ${generated.length} payslip(s), skipped ${skipped.length}`,
      generated,
      skipped,
    });
  } catch (err) {
    handleDbError(err, res, 'Failed to generate payroll');
  }
});

// @route   GET /api/payroll/my
// @desc    Employee: view own payslips
router.get('/my', protect, async (req, res) => {
  try {
    const payslips = await Payslip.find({ user: req.user._id }).sort({ year: -1, month: -1 });
    res.json({ payslips });
  } catch (err) {
    handleDbError(err, res, 'Failed to fetch payslips');
  }
});

// @route   GET /api/payroll
// @desc    Admin: list all payslips, optionally filtered by year/month/user/status
router.get('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const { year, month, userId, status } = req.query;
    const query = {};
    if (year) query.year = Number(year);
    if (month) query.month = Number(month);
    if (userId) query.user = userId;
    if (status) query.status = status;

    const payslips = await Payslip.find(query)
      .populate('user', 'name email employeeId department')
      .sort({ year: -1, month: -1, createdAt: -1 });

    res.json({ payslips });
  } catch (err) {
    handleDbError(err, res, 'Failed to fetch payslips');
  }
});

// @route   GET /api/payroll/:id
// @desc    View a single payslip (owner or admin)
router.get('/:id', protect, async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id).populate(
      'user',
      'name email employeeId department'
    );
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });

    const isOwner = payslip.user._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this payslip' });
    }

    res.json({ payslip });
  } catch (err) {
    handleDbError(err, res, 'Failed to fetch payslip');
  }
});

// @route   PATCH /api/payroll/:id
// @desc    Admin: adjust bonus/other deductions/notes on a pending payslip
router.patch('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id);
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
    if (payslip.status === 'paid') {
      return res.status(400).json({ message: 'Paid payslips cannot be edited' });
    }

    const { bonus, otherDeductions, notes } = req.body;
    if (bonus !== undefined) payslip.bonus = Math.max(0, Number(bonus) || 0);
    if (otherDeductions !== undefined) payslip.otherDeductions = Math.max(0, Number(otherDeductions) || 0);
    if (notes !== undefined) payslip.notes = notes;

    payslip.netPay = Math.max(
      0,
      Math.round(
        (payslip.baseSalary +
          payslip.overtimePay +
          payslip.bonus -
          payslip.absentDeduction -
          payslip.lateDeduction -
          payslip.otherDeductions) *
          100
      ) / 100
    );

    await payslip.save();
    await payslip.populate('user', 'name email employeeId department');
    res.json({ payslip });
  } catch (err) {
    handleDbError(err, res, 'Failed to update payslip');
  }
});

// @route   PATCH /api/payroll/:id/mark-paid
// @desc    Admin: mark a payslip as paid (locks further edits)
router.patch('/:id/mark-paid', protect, requireRole('admin'), async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id);
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
    if (payslip.status === 'paid') {
      return res.status(400).json({ message: 'This payslip is already marked as paid' });
    }

    payslip.status = 'paid';
    payslip.paidBy = req.user._id;
    payslip.paidAt = new Date();
    await payslip.save();
    await payslip.populate('user', 'name email employeeId department');

    res.json({ payslip });
  } catch (err) {
    handleDbError(err, res, 'Failed to mark payslip as paid');
  }
});

// @route   DELETE /api/payroll/:id
// @desc    Admin: delete a pending (not yet paid) payslip
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id);
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
    if (payslip.status === 'paid') {
      return res.status(400).json({ message: 'Paid payslips cannot be deleted' });
    }

    await payslip.deleteOne();
    res.json({ message: 'Payslip deleted' });
  } catch (err) {
    handleDbError(err, res, 'Failed to delete payslip');
  }
});

module.exports = router;
