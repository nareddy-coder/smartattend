/**
 * React error boundary that catches unhandled exceptions in its child tree
 * and renders a user-friendly fallback UI with a retry option.
 */
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    textAlign: 'center',
                    px: 3,
                    background: 'var(--color-bg)',
                }}>
                    <ErrorOutline sx={{ fontSize: 64, color: 'var(--color-primary)', mb: 2 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-text-primary)', mb: 1 }}>
                        Something went wrong
                    </Typography>
                    <Typography sx={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', mb: 1, maxWidth: 400 }}>
                        An unexpected error occurred. Please try reloading the page.
                    </Typography>
                    {this.state.error && (
                        <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', mb: 3, maxWidth: 500, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {this.state.error.toString()}
                        </Typography>
                    )}
                    <Button
                        variant="contained"
                        onClick={this.handleReload}
                        sx={{
                            background: 'var(--gradient-primary)',
                            borderRadius: 'var(--radius-lg)',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 4,
                            py: 1.2,
                            '&:hover': { background: 'var(--gradient-primary-hover)' },
                        }}
                    >
                        Reload Page
                    </Button>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
