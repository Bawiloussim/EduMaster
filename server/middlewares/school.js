// Forces every school-scoped query to the caller's own school, mirroring the
// existing classe/serie forced-filter pattern in courseController.list.
// SuperAdmin sees everything (empty filter); everyone else is pinned to req.user.school.
// req.user.school comes back populated (protect middleware) — always store the
// plain _id here so downstream `.create()`/`.find()` calls don't depend on
// Mongoose's implicit document->ObjectId cast.
const attachSchoolFilter = (req, res, next) => {
  req.schoolFilter = req.user.role === 'superadmin' ? {} : { school: req.user.school?._id };
  next();
};

module.exports = { attachSchoolFilter };
