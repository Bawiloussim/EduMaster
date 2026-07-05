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

function Layout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function HomeRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/catalog" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'instructor') return <Navigate to="/instructor" replace />;
  return <Navigate to="/student" replace />;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Public with Navbar */}
        <Route path="/catalog" element={<Layout><Catalog /></Layout>} />
        <Route path="/courses/:id" element={<Layout><CourseDetail /></Layout>} />
        <Route path="/certificates/verify/:hash" element={<Layout><CertificateVerify /></Layout>} />

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

        {/* Protected — All roles */}
        <Route element={<ProtectedRoute />}>
          <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
          <Route path="/profile" element={<Layout><StudentDashboard /></Layout>} />
        </Route>

        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </Suspense>
  );
}
