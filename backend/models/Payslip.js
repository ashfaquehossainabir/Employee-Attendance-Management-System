const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      // 1-12
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    currency: {
      type: String,
      default: 'USD',
    },

    // Snapshot of pay configuration at generation time (salary changes later
    // shouldn't silently rewrite historical payslips)
    baseSalary: { type: Number, required: true, default: 0 },
    earnedSalary: { type: Number, required: true, default: 0 },
    overtimeRate: { type: Number, required: true, default: 0 },
    weekendDays: { type: [Number], default: [0, 6] },

    // Snapshot of the employee's joining date, and whether this payslip
    // was prorated because they joined partway through the period
    joiningDate: { type: Date, default: null },
    prorated: { type: Boolean, default: false },

    // Attendance summary the payslip was computed from
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },

    // Computed pay breakdown
    overtimePay: { type: Number, default: 0 },
    absentDeduction: { type: Number, default: 0 },
    lateDeduction: { type: Number, default: 0 },

    // Admin-editable adjustments (while status is 'pending')
    bonus: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    notes: { type: String, default: '', trim: true, maxlength: 500 },

    netPay: { type: Number, required: true, default: 0 },

    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One payslip per employee per calendar month
payslipSchema.index({ user: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);
