import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { getUser, getRoleLabel, isAdmin } from './utils/api';
import Login from './pages/Login';
import DataEntry from './pages/DataEntry';
import MediaCapture from './pages/MediaCapture';
import Reports from './pages/Reports';
import AdminDashboard from './pages/AdminDashboard';
import ControlPanel from './pages/ControlPanel';
import UserManagement from './pages/UserManagement';
import ReportDetail from './pages/ReportDetail';
import { LayoutDashboard, FileText, Camera, BarChart3, Monitor, Users, LogOut, Menu, X } from 'lucide-react';

function ProtectedRoute({ children, allowedRoles }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/data-entry" />;
  }
  return children;
}

function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const links = [
    { to: '/data-entry', icon: <FileText size={20} />, label: 'Data Entry', roles: ['admin', 'executive_engineer', 'junior_engineer', 'assistant_engineer'] },
    { to: '/media-capture', icon: <Camera size={20} />, label: 'Image / Video', roles: ['admin', 'executive_engineer', 'junior_engineer', 'assistant_engineer'] },
    { to: '/reports', icon: <BarChart3 size={20} />, label: 'Daily Reports', roles: ['admin', 'executive_engineer', 'junior_engineer'] },
    { to: '/admin', icon: <LayoutDashboard size={20} />, label: 'Admin Dashboard', roles: ['admin', 'executive_engineer'] },
    { to: '/control-panel', icon: <Monitor size={20} />, label: 'Control Panel', roles: ['admin', 'executive_engineer'] },
    { to: '/users', icon: <Users size={20} />, label: 'User Management', roles: ['admin'] },
  ];

  return (
    <div className="h-full bg-blue-900 text-white flex flex-col w-64">
      <div className="p-4 border-b border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">MCD Monitor</h1>
            <p className="text-blue-300 text-xs">Construction Monitoring</p>
          </div>
          <button onClick={onClose} className="lg:hidden text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-blue-800 bg-blue-800/50">
        <p className="font-medium text-sm">{user?.full_name}</p>
        <p className="text-blue-300 text-xs">{getRoleLabel(user?.role)}</p>
        {user?.zone && <p className="text-blue-400 text-xs">{user.zone}</p>}
      </div>

      <nav className="flex-1 py-2">
        {links.filter(l => l.roles.includes(user?.role)).map(link => (
          <Link
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              location.pathname === link.to
                ? 'bg-blue-700 text-white border-r-3 border-white'
                : 'text-blue-200 hover:bg-blue-800 hover:text-white'
            }`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-blue-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-blue-300 hover:text-white text-sm w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar onClose={() => {}} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full w-64">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm px-4 py-3 flex items-center lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <Menu size={24} />
          </button>
          <h1 className="ml-3 font-bold text-blue-900">MCD Monitor</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/data-entry" element={
          <ProtectedRoute><Layout><DataEntry /></Layout></ProtectedRoute>
        } />
        <Route path="/media-capture" element={
          <ProtectedRoute><Layout><MediaCapture /></Layout></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['admin', 'executive_engineer', 'junior_engineer']}>
            <Layout><Reports /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/report/:id" element={
          <ProtectedRoute><Layout><ReportDetail /></Layout></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin', 'executive_engineer']}>
            <Layout><AdminDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/control-panel" element={
          <ProtectedRoute allowedRoles={['admin', 'executive_engineer']}>
            <Layout><ControlPanel /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout><UserManagement /></Layout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
