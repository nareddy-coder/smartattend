/**
 * ToastContext.jsx - Global toast/snackbar notification system for SmartAttend.
 * Provides showToast(message, severity) via useToast() hook.
 * Supports queued notifications with auto-dismiss.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [queue, setQueue] = useState([]);
    const [current, setCurrent] = useState(null);
    const [open, setOpen] = useState(false);

    const processQueue = useCallback(() => {
        setQueue((prev) => {
            if (prev.length > 0) {
                const [next, ...rest] = prev;
                setCurrent(next);
                setOpen(true);
                return rest;
            }
            return prev;
        });
    }, []);

    const showToast = useCallback((message, severity = 'info') => {
        const toast = { message, severity, key: Date.now() + Math.random() };
        setCurrent((currentToast) => {
            if (!currentToast) {
                setCurrent(toast);
                setOpen(true);
                return toast;
            } else {
                setQueue((prev) => [...prev, toast]);
                return currentToast;
            }
        });
    }, []);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setOpen(false);
    };

    const handleExited = () => {
        setCurrent(null);
        processQueue();
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Snackbar
                key={current?.key}
                open={open}
                autoHideDuration={4000}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                TransitionProps={{ onExited: handleExited }}
            >
                {current ? (
                    <Alert
                        onClose={handleClose}
                        severity={current.severity}
                        variant="filled"
                        sx={{
                            width: '100%',
                            fontWeight: 600,
                            borderRadius: 2,
                            boxShadow: 'var(--shadow-toast)',
                            ...(current.severity === 'info' && {
                                backgroundColor: 'var(--color-primary)',
                                color: 'var(--color-text-white)',
                            }),
                            ...(current.severity === 'warning' && {
                                backgroundColor: 'var(--color-accent)',
                                color: 'var(--color-text-white)',
                            }),
                        }}
                    >
                        {current.message}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </ToastContext.Provider>
    );
};
