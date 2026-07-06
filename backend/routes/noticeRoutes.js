const express = require('express');
const Notice = require('../models/Notice');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/notices
// @desc    Any logged-in user: list notices, pinned first, newest first
router.get('/', protect, async (req, res) => {
  try {
    const notices = await Notice.find()
      .populate('postedBy', 'name role')
      .sort({ pinned: -1, createdAt: -1 });
    res.json({ notices });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notices', error: err.message });
  }
});

// @route   POST /api/notices
// @desc    Admin: create a notice/announcement
router.post('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const { title, message, pinned, priority } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const notice = await Notice.create({
      title,
      message,
      pinned: Boolean(pinned),
      priority: priority || 'normal',
      postedBy: req.user._id,
    });

    const populated = await notice.populate('postedBy', 'name role');
    res.status(201).json({ notice: populated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create notice', error: err.message });
  }
});

// @route   PATCH /api/notices/:id
// @desc    Admin: edit or pin/unpin a notice
router.patch('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const { title, message, pinned, priority } = req.body;
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });

    if (title !== undefined) notice.title = title;
    if (message !== undefined) notice.message = message;
    if (pinned !== undefined) notice.pinned = pinned;
    if (priority !== undefined) notice.priority = priority;

    await notice.save();
    const populated = await notice.populate('postedBy', 'name role');
    res.json({ notice: populated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notice', error: err.message });
  }
});

// @route   DELETE /api/notices/:id
// @desc    Admin: delete a notice
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json({ message: 'Notice deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete notice', error: err.message });
  }
});

module.exports = router;
