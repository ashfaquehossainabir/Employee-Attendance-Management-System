const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'employee'],
      default: 'employee',
    },
    department: {
      type: String,
      default: 'General',
      trim: true,
    },
    employeeId: {
      type: String,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Payroll configuration — set by an admin, used when generating payslips.
    baseSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimeRate: {
      // Amount paid per hour of overtime worked
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    // The date the employee started — used to prorate their first payslip
    // and to stop payroll being generated for periods before they joined.
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    // Which days of the week are this employee's weekend (0 = Sunday ...
    // 6 = Saturday). Defaults to Sat/Sun but lets an admin configure e.g.
    // a Fri/Sat weekend for employees on a different schedule.
    weekendDays: {
      type: [Number],
      default: [0, 6],
      validate: {
        validator: (arr) => arr.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        message: 'weekendDays must contain integers between 0 (Sun) and 6 (Sat)',
      },
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Auto-generate a simple employee ID if not provided.
// Based on the highest existing numeric suffix (not a raw document count),
// so IDs never collide after an employee has been deleted.
userSchema.pre('save', async function (next) {
  if (this.employeeId) return next();
  try {
    const existing = await mongoose
      .model('User')
      .find({ employeeId: { $regex: /^EMP\d+$/ } })
      .select('employeeId')
      .lean();

    const maxNumber = existing.reduce((max, u) => {
      const n = parseInt(u.employeeId.slice(3), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    this.employeeId = `EMP${String(maxNumber + 1).padStart(4, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    department: this.department,
    employeeId: this.employeeId,
    isActive: this.isActive,
    baseSalary: this.baseSalary,
    overtimeRate: this.overtimeRate,
    currency: this.currency,
    joiningDate: this.joiningDate,
    weekendDays: this.weekendDays,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
