const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    leaveType: {
      type: String,
      enum: ['sick', 'casual', 'vacation', 'unpaid', 'other'],
      default: 'casual',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Please provide a reason for the leave request'],
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNote: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

leaveRequestSchema.virtual('days').get(function () {
  const ms = this.endDate - this.startDate;
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
});

leaveRequestSchema.set('toJSON', { virtuals: true });
leaveRequestSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
