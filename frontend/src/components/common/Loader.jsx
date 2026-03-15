/**
 * Loading spinner component that supports inline and full-screen modes.
 * Displays a centered circular progress indicator while content is loading.
 */
import React from 'react';
import { CircularProgress, Box } from '@mui/material';

const Loader = ({ size = 40, fullScreen = false }) => {
    if (fullScreen) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    background: 'var(--color-bg)',
                }}
            >
                <CircularProgress size={size} thickness={4} sx={{ color: 'var(--color-primary)' }} />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={size} thickness={4} sx={{ color: 'var(--color-primary)' }} />
        </Box>
    );
};

export default Loader;
