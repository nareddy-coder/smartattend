/**
 * Session timeout handler that monitors JWT expiry and user inactivity.
 * Displays a warning dialog before automatic logout when the session is about to expire.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Timer } from '@mui/icons-material';

const parseJwt = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
};

const SessionTimeout = () => {
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }, []);

    useEffect(() => {
        const check = () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            const payload = parseJwt(token);
            if (!payload?.exp) return;

            const now = Math.floor(Date.now() / 1000);
            const remaining = payload.exp - now;

            if (remaining <= 0) {
                handleLogout();
            } else if (remaining <= 300) {
                setTimeLeft(remaining);
                setShowWarning(true);
            } else {
                setShowWarning(false);
            }
        };

        check();
        const interval = setInterval(check, 30000);
        return () => clearInterval(interval);
    }, [handleLogout]);

    // Countdown timer: decrement timeLeft every second while the warning is visible
    useEffect(() => {
        if (!showWarning) return;

        const countdown = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(countdown);
    }, [showWarning, handleLogout]);

    const handleDismiss = () => {
        setShowWarning(false);
    };

    return (
        <Dialog open={showWarning} onClose={handleDismiss} maxWidth="xs" fullWidth fullScreen={isMobile}
            PaperProps={{ sx: { borderRadius: 'var(--radius-xl)', background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)' } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                <Timer sx={{ color: 'var(--color-primary)' }} />
                Session Expiring Soon
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    Your session will expire in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}. Please save your work and log in again to continue.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button onClick={handleDismiss} sx={{ color: 'var(--color-text-muted)', textTransform: 'none' }}>
                    Dismiss
                </Button>
                <Button onClick={handleLogout} variant="contained" sx={{
                    background: 'var(--gradient-primary)',
                    borderRadius: 'var(--radius-md)', textTransform: 'none', fontWeight: 600,
                    '&:hover': { background: 'var(--gradient-primary-hover)' },
                }}>
                    Logout Now
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SessionTimeout;
