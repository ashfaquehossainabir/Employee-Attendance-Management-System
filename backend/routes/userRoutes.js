const express = require('express');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');
const { handleDbError } = require('../utils/errorHandler');

const router = express.Router();

// @route   GET /api/users
// @desc    Admin: list all users
router.get('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users: users.map((u) => u.toSafeObject()) });
  } catch (err) {
    handleDbError(err, res, 'Failed to fetch users');
  }
});

// @route   POST /api/users
// @desc    Admin: create a new employee (or admin) account directly
router.post('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, department, role, baseSalary, overtimeRate } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      department,
      role: role === 'admin' ? 'admin' : 'employee',
      baseSalary: Math.max(0, Number(baseSalary) || 0),
      overtimeRate: Math.max(0, Number(overtimeRate) || 0),
    });

    res.status(201).json({ user: user.toSafeObject() });
  } catch (err) {
    handleDbError(err, res, 'Failed to create user');
  }
});

// @route   PATCH /api/users/:id
// @desc    Admin: update an employee's department, role, or active status
router.patch('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const { department, role, isActive, name, baseSalary, overtimeRate, currency } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (department !== undefined) user.department = department;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (name !== undefined) user.name = name;
    if (baseSalary !== undefined) user.baseSalary = Math.max(0, Number(baseSalary) || 0);
    if (overtimeRate !== undefined) user.overtimeRate = Math.max(0, Number(overtimeRate) || 0);
    if (currency !== undefined) user.currency = currency;

    await user.save();
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    handleDbError(err, res, 'Failed to update user');
  }
});

// @route   DELETE /api/users/:id
// @desc    Admin: remove an employee account
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User removed' });
  } catch (err) {
    handleDbError(err, res, 'Failed to delete user');
  }
});

module.exports = router;
