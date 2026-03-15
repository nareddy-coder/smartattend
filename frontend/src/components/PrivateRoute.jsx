/**
 * Role-based route guard that restricts access to authenticated users.
 * Redirects unauthenticated users to login and unauthorized roles to their own dashboard.
 */
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

const PrivateRoute = ({ roles }) => {
    const { user, loading } = useAuth();

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--color-bg)' }}>
            <CircularProgress sx={{ color: 'var(--color-primary)' }} />
        </Box>
    );
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) {
        const roleRedirect = { admin: '/admin', hod: '/hod', faculty: '/faculty', student: '/student' };
        return <Navigate to={roleRedirect[user.role] || '/login'} replace />;
    }

    return <Outlet />;
};

export default PrivateRoute;
