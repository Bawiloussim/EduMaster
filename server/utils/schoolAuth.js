// Shared by courseController/examController/enrollmentController/authController.
// Kept dependency-free (no requires of those controllers) to avoid circular
// requires between them.

// req.user.school comes back populated (protect middleware), so always
// resolve to its _id before comparing against a plain ObjectId field.
const schoolId = (user) => (user.school?._id || user.school)?.toString();

// A logged-in non-superadmin can only ever manage courses in their own school;
// superadmin is excluded on purpose — school/course administration is a
// chef d'établissement responsibility, not the platform superadmin's.
const canManageCourse = (course, user) =>
  course.instructor.toString() === user._id.toString() ||
  (user.role === 'admin' && course.school.toString() === schoolId(user));

// Publishing is reserved to the formateur who owns the course — the chef
// d'établissement (admin) can manage a course in every other way but must not
// be able to publish/unpublish a course they didn't create themselves.
const isCourseOwner = (course, user) => course.instructor.toString() === user._id.toString();

module.exports = { schoolId, canManageCourse, isCourseOwner };
