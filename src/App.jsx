import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <ReportForm />;
}

import ReportForm from './pages/employee/ReportForm';
import MyRecords from './pages/employee/MyRecords';
import AnomalyQuery from './pages/manager/AnomalyQuery';
import ExcelExport from './pages/manager/ExcelExport';
import Statistics from './pages/admin/Statistics';
import FlowAnalysis from './pages/admin/FlowAnalysis';
import DailyReport from './pages/admin/DailyReport';
import WeeklyReport from './pages/admin/WeeklyReport';
import MonthlyReport from './pages/admin/MonthlyReport';
import BaseData from './pages/admin/BaseData';
import UserManagement from './pages/admin/UserManagement';
import SystemManagement from './pages/admin/SystemManagement';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/my-records" element={<ProtectedRoute roles={['employee', 'manager', 'superadmin']}><MyRecords /></ProtectedRoute>} />
            <Route path="/anomaly-query" element={<ProtectedRoute roles={['manager', 'superadmin']}><AnomalyQuery /></ProtectedRoute>} />
            <Route path="/export" element={<ProtectedRoute roles={['manager', 'superadmin']}><ExcelExport /></ProtectedRoute>} />
            <Route path="/statistics" element={<ProtectedRoute roles={['superadmin']}><Statistics /></ProtectedRoute>} />
            <Route path="/flow-analysis" element={<ProtectedRoute roles={['superadmin']}><FlowAnalysis /></ProtectedRoute>} />
            <Route path="/daily-report" element={<ProtectedRoute roles={['superadmin']}><DailyReport /></ProtectedRoute>} />
            <Route path="/weekly-report" element={<ProtectedRoute roles={['superadmin']}><WeeklyReport /></ProtectedRoute>} />
            <Route path="/monthly-report" element={<ProtectedRoute roles={['superadmin']}><MonthlyReport /></ProtectedRoute>} />
            <Route path="/base-data" element={<ProtectedRoute roles={['superadmin']}><BaseData /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute roles={['superadmin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/system" element={<ProtectedRoute roles={['superadmin']}><SystemManagement /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
