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
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
