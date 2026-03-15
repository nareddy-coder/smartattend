/**
 * AuthContext.jsx - Authentication state management for SmartAttend.
 * Only the JWT token is stored in localStorage. All user data (role, name,
 * designation, department) is fetched from the database via /users/me.
 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

/** Derive effective role: faculty with HOD designation → 'hod' */
const deriveRole = (profile) => {
    if (!profile) return 'student';
    if (
        profile.role === 'faculty' &&
        profile.designation &&
        profile.designation.toUpperCase() === 'HOD'
    ) {
        return 'hod';
    }
    return profile.role;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // true until initial profile fetch completes

    // On mount: if a token exists, fetch user profile from DB
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        // Check token expiry before making API call
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload?.exp && payload.exp <= Math.floor(Date.now() / 1000)) {
                localStorage.removeItem('token');
                setLoading(false);
                return;
            }
        } catch { /* ignore parse errors */ }

        // Fetch profile from database
        api.get('/users/me')
            .then((res) => {
                const profile = res.data;
                setUser({
                    username: profile.username,
                    role: deriveRole(profile),
                    name: profile.name || profile.username,
                    department: profile.department || '',
                    designation: profile.designation || '',
                });
            })
            .catch(() => {
                // Token invalid or expired — clean up
                localStorage.removeItem('token');
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (username, password, selectedRole = '') => {
        const normalizedUsername = username.trim().toLowerCase();
        const formData = new FormData();
        formData.append('username', normalizedUsername);
        formData.append('password', password);
        if (selectedRole) formData.append('role', selectedRole);
        try {
            const response = await api.post('/auth/token', formData);
            const { access_token, first_login } = response.data;
            localStorage.setItem('token', access_token);

            // Fetch full profile from database
            const profileRes = await api.get('/users/me');
            const profile = profileRes.data;
            const userData = {
                username: profile.username,
                role: deriveRole(profile),
                name: profile.name || profile.username,
                department: profile.department || '',
                designation: profile.designation || '',
            };
            setUser(userData);
            return { success: true, first_login, user: userData };
        } catch (error) {
            // Clean up token if it was set but profile fetch failed
            localStorage.removeItem('token');
            setUser(null);
            console.error("Login failed", error);
            const detail = error.response?.data?.detail || '';
            return { success: false, error: detail };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    /** Force refresh user profile from the database */
    const refreshProfile = async () => {
        try {
            const res = await api.get('/users/me');
            const profile = res.data;
            setUser({
                username: profile.username,
                role: deriveRole(profile),
                name: profile.name || profile.username,
                department: profile.department || '',
                designation: profile.designation || '',
            });
        } catch {
            localStorage.removeItem('token');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
