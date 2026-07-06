const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/leaves
// @desc    Employee: submit a new leave request
router.post('/', protect, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Start date, end date and reason are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be before start date' });
    }

    const leave = await LeaveRequest.create({
      user: req.user._id,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
    });

    res.status(201).json({ leave });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit leave request', error: err.message });
  }
});

// @route   GET /api/leaves/my
// @desc    Employee: view own leave requests
router.get('/my', protect, async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ user: req.user._id })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ leaves });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leave requests', error: err.message });
  }
});

// @route   DELETE /api/leaves/:id
// @desc    Employee: cancel a pending leave request they own
router.delete('/:id', protect, async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    const isOwner = leave.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this request' });
    }
    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending requests can be cancelled' });
    }

    leave.status = 'cancelled';
    await leave.save();
    res.json({ leave });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel leave request', error: err.message });
  }
});

// @route   GET /api/leaves
// @desc    Admin: view all leave requests, optionally filtered by status
router.get('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const leaves = await LeaveRequest.find(query)
      .populate('user', 'name email employeeId department')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ leaves });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leave requests', error: err.message });
  }
});

// @route   PATCH /api/leaves/:id
// @desc    Admin: approve or reject a leave request
router.patch('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    leave.status = status;
    leave.reviewNote = reviewNote || '';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    await leave.save();

    res.json({ leave });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update leave request', error: err.message });
  }
});

module.exports = router;
