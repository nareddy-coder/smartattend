/**
 * MUI theme configuration defining the application's color palette,
 * typography, component overrides, and responsive design tokens.
 */
import { createTheme } from '@mui/material/styles';

const fontFamily = "var(--font-family)";

const theme = createTheme({
    palette: {
        primary: {
            main: '#467bf0',
            dark: '#3560c8',
            light: '#6b96f5',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#10b981',
            dark: '#059669',
            light: '#34d399',
            contrastText: '#ffffff',
        },
        error: {
            main: '#ef4444',
            dark: '#dc2626',
            light: '#f87171',
        },
        warning: {
            main: '#f59e0b',
            dark: '#d97706',
            light: '#fbbf24',
        },
        info: {
            main: '#467bf0',
            dark: '#3560c8',
            light: '#6b96f5',
        },
        success: {
            main: '#10b981',
            dark: '#059669',
            light: '#34d399',
        },
        background: {
            default: '#f8fafc',
            paper: '#ffffff',
        },
        text: {
            primary: '#1e293b',
            secondary: '#64748b',
            disabled: '#94a3b8',
        },
        divider: '#e2e8f0',
    },
    typography: {
        fontFamily,
        h1: {
            fontSize: '2.25rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontSize: '1.875rem',
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
        },
        h3: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h4: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h5: {
            fontSize: '1.125rem',
            fontWeight: 600,
            lineHeight: 1.5,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.5,
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.6,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.6,
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 8,
    },
    shadows: [
        'none',
        'var(--shadow-sm)',
        '0 1px 3px var(--color-shadow)',
        'var(--shadow-md)',
        '0 5px 15px rgba(0,0,0,0.08)',
        'var(--shadow-lg)',
        '0 10px 20px rgba(0,0,0,0.12)',
        '0 15px 25px rgba(0,0,0,0.15)',
        'var(--shadow-xl)',
        '0 25px 30px rgba(0,0,0,0.18)',
        ...Array(15).fill('0 25px 30px rgba(0,0,0,0.18)'),
    ],
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    fontFamily,
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text-primary)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 20px',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'var(--shadow-md)',
                    },
                },
                contained: {
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    },
                },
                sizeLarge: {
                    padding: '12px 28px',
                    fontSize: '1rem',
                },
                sizeSmall: {
                    padding: '6px 16px',
                    fontSize: '0.875rem',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 'var(--radius-md)',
                        transition: 'all var(--transition-base)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-bg-paper)',
                },
                elevation1: {
                    boxShadow: '0 1px 3px var(--color-shadow)',
                },
                elevation2: {
                    boxShadow: 'var(--shadow-md)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 1px 3px var(--color-shadow)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-paper)',
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-xl)',
                    backgroundColor: 'var(--color-bg-paper)',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    color: 'var(--color-text-primary)',
                    borderBottomColor: 'var(--color-border)',
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: 'var(--color-table-header-bg)',
                    borderBottom: '2px solid var(--color-border)',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 500,
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                },
            },
        },
    },
});

export default theme;
