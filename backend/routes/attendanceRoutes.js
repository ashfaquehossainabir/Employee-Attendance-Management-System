const express = require('express');
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/auth');
const {
  startOfDay,
  endOfDay,
  evaluateClockIn,
  evaluateClockOut,
} = require('../utils/timeUtils');

const router = express.Router();

// @route   GET /api/attendance/today
// @desc    Get the logged-in user's attendance record for today
router.get('/today', protect, async (req, res) => {
  try {
    const today = startOfDay();
    const record = await Attendance.findOne({ user: req.user._id, date: today });
    res.json({ record: record || null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch today\'s attendance', error: err.message });
  }
});

// @route   POST /api/attendance/clock-in
router.post('/clock-in', protect, async (req, res) => {
  try {
    const today = startOfDay();
    const now = new Date();

    let record = await Attendance.findOne({ user: req.user._id, date: today });
    if (record && record.clockIn) {
      return res.status(400).json({ message: 'You have already clocked in today' });
    }

    const { isLate, lateByMinutes } = evaluateClockIn(now);

    if (!record) {
      record = new Attendance({ user: req.user._id, date: today });
    }

    record.clockIn = now;
    record.isLate = isLate;
    record.lateByMinutes = lateByMinutes;
    record.status = isLate ? 'late' : 'present';
    await record.save();

    res.json({ message: 'Clocked in successfully', record });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You have already clocked in today' });
    }
    res.status(500).json({ message: 'Clock in failed', error: err.message });
  }
});

// @route   POST /api/attendance/clock-out
router.post('/clock-out', protect, async (req, res) => {
  try {
    const today = startOfDay();
    const now = new Date();

    const record = await Attendance.findOne({ user: req.user._id, date: today });
    if (!record || !record.clockIn) {
      return res.status(400).json({ message: 'You must clock in before clocking out' });
    }
    if (record.clockOut) {
      return res.status(400).json({ message: 'You have already clocked out today' });
    }

    const { workedMinutes, overtimeMinutes } = evaluateClockOut(record.clockIn, now);

    record.clockOut = now;
    record.workedMinutes = workedMinutes;
    record.overtimeMinutes = overtimeMinutes;
    await record.save();

    res.json({ message: 'Clocked out successfully', record });
  } catch (err) {
    res.status(500).json({ message: 'Clock out failed', error: err.message });
  }
});

// @route   GET /api/attendance/history?from=&to=
// @desc    Get the logged-in user's attendance history within a date range
router.get('/history', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = { user: req.user._id };

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = startOfDay(new Date(from));
      if (to) query.date.$lte = endOfDay(new Date(to));
    }

    const records = await Attendance.find(query).sort({ date: -1 });
    res.json({ records });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history', error: err.message });
  }
});

module.exports = router;
