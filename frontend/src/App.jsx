/**
 * App.jsx - Root component for SmartAttend.
 * Sets up React Router with role-based PrivateRoute guards.
 * Routes: /login, /admin, /faculty, /student, /student-photo/:rollNumber
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentPhoto from './pages/StudentPhoto';
import SessionTimeout from './components/common/SessionTimeout';
import { Box, CircularProgress } from '@mui/material';

/** /admin — shows admin login if not authenticated, dashboard if authenticated as admin */
function AdminGate() {
    const { user } = useAuth();
    if (user && user.role === 'admin') return <Outlet />;
    return <Login />;
}

/** /hod — role derived from DB designation via AuthContext */
function HodGate() {
    const { user, loading } = useAuth();

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--color-bg)' }}>
            <CircularProgress sx={{ color: 'var(--color-primary)' }} />
        </Box>
    );
    if (!user) return <Navigate to="/login" replace />;
    // AuthContext derives role='hod' for faculty with HOD designation in DB
    if (user.role === 'hod') return <Outlet />;
    // Redirect to their own dashboard
    const roleRedirect = { admin: '/admin', faculty: '/faculty', student: '/student' };
    return <Navigate to={roleRedirect[user.role] || '/login'} replace />;
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <SessionTimeout />
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route element={<AdminGate />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                    </Route>

                    <Route element={<HodGate />}>
                        <Route path="/hod" element={<AdminDashboard />} />
                    </Route>

                    <Route element={<PrivateRoute roles={['faculty', 'hod']} />}>
                        <Route path="/faculty" element={<FacultyDashboard />} />
                    </Route>

                    <Route element={<PrivateRoute roles={['student']} />}>
                        <Route path="/student" element={<StudentDashboard />} />
                    </Route>

                    <Route path="/:college/Student/:filename" element={<StudentPhoto />} />
                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
