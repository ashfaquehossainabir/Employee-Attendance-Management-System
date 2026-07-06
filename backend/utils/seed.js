// Run with: npm run seed
// Creates a default admin account if none exists yet.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const run = async () => {
  await connectDB();

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log(`Admin already exists: ${existingAdmin.email}`);
    process.exit(0);
  }

  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@company.com',
    password: 'Admin@123',
    department: 'Management',
    role: 'admin',
  });

  console.log('Admin account created:');
  console.log(`  Email:    ${admin.email}`);
  console.log('  Password: Admin@123');
  console.log('Please log in and change this password immediately.');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
