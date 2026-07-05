import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Spinner from '../components/ui/Spinner';
import ProtectedRoute from '../components/shared/ProtectedRoute';
import Navbar from '../components/layout/Navbar';
import { useAuthStore } from '../store/useAuthStore';

const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));

const Catalog = lazy(() => import('../pages/catalog/Catalog'));
const CourseDetail = lazy(() => import('../pages/catalog/CourseDetail'));
const CoursePlayer = lazy(() => import('../pages/course/CoursePlayer'));

const ExamStart = lazy(() => import('../pages/exam/ExamStart'));
const ExamSession = lazy(() => import('../pages/exam/ExamSession'));
const ExamResult = lazy(() => import('../pages/exam/ExamResult'));

const StudentDashboard = lazy(() => import('../pages/dashboard/student/StudentDashboard'));
const InstructorDashboard = lazy(() => import('../pages/dashboard/instructor/InstructorDashboard'));
const AdminDashboard = lazy(() => import('../pages/dashboard/admin/AdminDashboard'));

const CertificateVerify = lazy(() => import('../pages/certificates/CertificateVerify'));
const Notifications = lazy(() => import('../pages/Notifications'));

const EditCourse = lazy(() => import('../pages/dashboard/instructor/EditCourse'));
const Home = lazy(() => import('../pages/Home'));
const Landing = lazy(() => import('../pages/Landing'));

function Layout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

/* Root: landing page for visitors, home for logged-in users */
function RootRoute() {
  const { user } = useAuthStore();
  if (!user) return <Landing />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'instructor') return <Navigate to="/instructor" replace />;
  return <Navigate to="/home" replace />;
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

        {/* Protected — Student */}
        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route path="/courses/:id/learn" element={<CoursePlayer />} />
          <Route path="/exams/:examId" element={<Layout><ExamStart /></Layout>} />
          <Route path="/exams/:examId/session/:attemptId" element={<ExamSession />} />
          <Route path="/exams/:examId/result/:attemptId" element={<Layout><ExamResult /></Layout>} />
          <Route path="/student" element={<Layout><StudentDashboard /></Layout>} />
          <Route path="/student/certificates" element={<Layout><StudentDashboard /></Layout>} />
        </Route>

        {/* Protected — Instructor */}
        <Route element={<ProtectedRoute roles={['instructor', 'admin']} />}>
          <Route path="/instructor" element={<Layout><InstructorDashboard /></Layout>} />
          <Route path="/instructor/courses/:id/edit" element={<Layout><EditCourse /></Layout>} />
        </Route>

        {/* Protected — Admin */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
