const User = require('../models/User');

// Sequential per school and year, e.g. "2026-0001". Re-queries the current max
// each call instead of caching, so it stays correct across concurrent requests
// and across the sequential create-loop used by CSV/Excel import.
async function generateMatricule(schoolId) {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  const last = await User.findOne({ school: schoolId, matricule: new RegExp(`^${prefix}\\d+$`) })
    .sort({ matricule: -1 })
    .select('matricule')
    .lean();

  const nextSeq = last ? parseInt(last.matricule.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

module.exports = { generateMatricule };
