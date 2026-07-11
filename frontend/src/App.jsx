import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Reports from './pages/Reports';
import AdminDashboard from './pages/AdminDashboard';
import ManageEmployees from './pages/ManageEmployees';
import LeaveRequests from './pages/LeaveRequests';
import Notices from './pages/Notices';
import Payroll from './pages/Payroll';

function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Employee routes */}
          <Route
            element={
              <ProtectedRoute role="employee">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<EmployeeDashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/leaves" element={<LeaveRequests />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/notices" element={<Notices />} />
          </Route>

          {/* Admin routes */}
          <Route
            element={
              <ProtectedRoute role="admin">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/employees" element={<ManageEmployees />} />
            <Route path="/admin/leaves" element={<LeaveRequests />} />
            <Route path="/admin/payroll" element={<Payroll />} />
            <Route path="/admin/notices" element={<Notices />} />
          </Route>

          <Route
            path="*"
            element={
              <ProtectedRoute>
                <RoleHome />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
