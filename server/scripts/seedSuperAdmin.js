require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

async function run() {
  const { SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;
  if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    console.error('SUPERADMIN_EMAIL et SUPERADMIN_PASSWORD doivent être définis dans .env');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: SUPERADMIN_EMAIL.toLowerCase() });
  if (existing) {
    existing.role = 'superadmin';
    existing.password = SUPERADMIN_PASSWORD;
    await existing.save();
    console.log(`Compte existant promu superadmin : ${existing.email}`);
  } else {
    const user = await User.create({
      name: SUPERADMIN_NAME || 'Super Administrateur',
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD,
      role: 'superadmin',
    });
    console.log(`Compte superadmin créé : ${user.email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Erreur lors du seed du superadmin :', err);
  process.exit(1);
});
