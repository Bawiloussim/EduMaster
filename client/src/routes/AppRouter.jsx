import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Spinner from '../components/ui/Spinner';
import ProtectedRoute from '../components/shared/ProtectedRoute';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import InstructorLayout from '../components/layout/InstructorLayout';

const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('../pages/auth/VerifyEmail'));

const Catalog = lazy(() => import('../pages/catalog/Catalog'));
const CourseDetail = lazy(() => import('../pages/catalog/CourseDetail'));
const CoursePlayer = lazy(() => import('../pages/course/CoursePlayer'));

const ExamStart = lazy(() => import('../pages/exam/ExamStart'));
const ExamSession = lazy(() => import('../pages/exam/ExamSession'));
const ExamResult = lazy(() => import('../pages/exam/ExamResult'));

const ChooseClass = lazy(() => import('../pages/auth/ChooseClass'));
const StudentDashboard = lazy(() => import('../pages/dashboard/student/StudentDashboard'));
const InstructorDashboard = lazy(() => import('../pages/dashboard/instructor/InstructorDashboard'));
const AdminDashboard = lazy(() => import('../pages/dashboard/admin/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('../pages/dashboard/superadmin/SuperAdminDashboard'));

const CertificateVerify = lazy(() => import('../pages/certificates/CertificateVerify'));
const Notifications = lazy(() => import('../pages/Notifications'));

const EditCourse = lazy(() => import('../pages/dashboard/instructor/EditCourse'));
const Grading = lazy(() => import('../pages/dashboard/instructor/Grading'));
const Home = lazy(() => import('../pages/Home'));
const Landing = lazy(() => import('../pages/Landing'));

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

/* Root: always the landing page, for visitors and logged-in users alike */
function RootRoute() {
  return <Landing />;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}>
      <Routes>
        {/* Public — no Navbar */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Public — certificate verification only */}
        <Route path="/certificates/verify/:hash" element={<Layout><CertificateVerify /></Layout>} />

        {/* Protected — all logged-in users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Layout><Home /></Layout>} />
          <Route path="/catalog" element={<Layout><Catalog /></Layout>} />
          <Route path="/courses/:id" element={<Layout><CourseDetail /></Layout>} />
          <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
          <Route path="/profile" element={<Layout><StudentDashboard /></Layout>} />
        </Route>

        {/* Protected — Student (own sidebar layout, no global Navbar) */}
        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route path="/choose-class" element={<ChooseClass />} />
          <Route path="/courses/:id/learn" element={<CoursePlayer />} />
          <Route path="/exams/:examId" element={<Layout><ExamStart /></Layout>} />
          <Route path="/exams/:examId/session/:attemptId" element={<ExamSession />} />
          <Route path="/exams/:examId/result/:attemptId" element={<Layout><ExamResult /></Layout>} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/certificates" element={<StudentDashboard />} />
        </Route>

        {/* Protected — Instructor (own sidebar layout, no global Navbar) */}
        <Route element={<ProtectedRoute roles={['instructor', 'admin']} />}>
          <Route path="/instructor" element={<InstructorLayout><InstructorDashboard /></InstructorLayout>} />
          <Route path="/instructor/courses/:id/edit" element={<InstructorLayout><EditCourse /></InstructorLayout>} />
          <Route path="/instructor/grading" element={<InstructorLayout><Grading /></InstructorLayout>} />
        </Route>

        {/* Protected — Admin / chef d'établissement (own sidebar layout, no global Navbar) */}
        <Route element={<ProtectedRoute roles={['admin', 'superadmin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Protected — SuperAdmin (own sidebar layout, no global Navbar) */}
        <Route element={<ProtectedRoute roles={['superadmin']} />}>
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
