/**
 * Password change dialog that validates the current password and enforces
 * strength requirements for the new password via a built-in strength meter.
 */
import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    TextField,
    Button,
    Alert,
    Box,
    Typography,
    InputAdornment,
    IconButton,
    LinearProgress,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, CheckCircle, Cancel } from '@mui/icons-material';
import api from '../api/axios';

const ChangePassword = ({ open, onClose, onSuccess, isFirstLogin = false }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

    const passwordChecks = [
        { label: 'At least 8 characters', test: (p) => p.length >= 8 },
        { label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
        { label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
        { label: 'One number (0-9)', test: (p) => /\d/.test(p) },
        { label: 'One special character (!@#$%^&*)', test: (p) => /[^a-zA-Z\d]/.test(p) },
    ];

    const passedChecks = newPassword ? passwordChecks.filter((c) => c.test(newPassword)).length : 0;

    const getPasswordStrength = () => {
        if (!newPassword) return 0;
        return (passedChecks / passwordChecks.length) * 100;
    };

    const passwordStrength = getPasswordStrength();

    const getStrengthColor = () => {
        if (passwordStrength <= 20) return 'var(--color-error)';
        if (passwordStrength <= 40) return 'var(--color-primary)';
        if (passwordStrength <= 60) return 'var(--color-accent)';
        if (passwordStrength <= 80) return 'var(--color-secondary)';
        return 'var(--color-secondary-dark)';
    };

    const getStrengthLabel = () => {
        if (passwordStrength <= 20) return 'Very Weak';
        if (passwordStrength <= 40) return 'Weak';
        if (passwordStrength <= 60) return 'Medium';
        if (passwordStrength <= 80) return 'Strong';
        return 'Very Strong';
    };

    const allChecksPassed = passedChecks === passwordChecks.length;
    const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

    const handleSubmit = async () => {
        setError('');

        if (!allChecksPassed) {
            setError('Please meet all password requirements');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await api.post('/users/change-password', {
                old_password: oldPassword,
                new_password: newPassword,
            });
            onSuccess();
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-input-bg)',
            '& fieldset': { borderColor: 'var(--color-border)' },
            '&:hover fieldset': { borderColor: 'var(--color-primary)' },
            '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
        },
    };

    return (
        <Dialog
            open={open}
            onClose={isFirstLogin ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : '24px',
                    border: isMobile ? 'none' : '1px solid var(--color-border)',
                    overflow: isMobile ? 'auto' : 'visible',
                    m: isMobile ? 0 : undefined,
                },
            }}
        >
            <DialogContent sx={{ p: 0 }}>
                {/* Header */}
                <Box
                    sx={{
                        background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary), var(--color-primary-light))',
                        borderRadius: isMobile ? 0 : '24px 24px 0 0',
                        px: { xs: 2.5, sm: 4 },
                        py: { xs: 2.5, sm: 3.5 },
                        textAlign: 'center',
                    }}
                >
                    <Box
                        sx={{
                            width: { xs: 44, sm: 56 },
                            height: { xs: 44, sm: 56 },
                            borderRadius: '50%',
                            background: 'var(--glass-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 1.5,
                        }}
                    >
                        <Lock sx={{ fontSize: { xs: 22, sm: 28 }, color: 'var(--color-text-white)' }} />
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'var(--color-text-white)' }}>
                        {isFirstLogin ? 'Set Your Password' : 'Change Password'}
                    </Typography>
                    <Typography sx={{ color: 'var(--color-text-white-muted)', fontSize: { xs: '0.78rem', sm: '0.85rem' }, mt: 0.5 }}>
                        {isFirstLogin
                            ? 'Choose a strong password to protect your account'
                            : 'Update your password to keep your account secure'}
                    </Typography>
                </Box>

                {/* Form */}
                <Box component="form" onSubmit={(e) => { e.preventDefault(); if (!loading && oldPassword && allChecksPassed && passwordsMatch) handleSubmit(); }} sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {error && (
                        <Alert severity="error" sx={{ borderRadius: 'var(--radius-lg)' }}>
                            {error}
                        </Alert>
                    )}

                    {/* Old/Current Password */}
                    <Box>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, mb: 0.8 }}>
                            Current Password
                        </Typography>
                        <TextField
                            placeholder="Enter current password"
                            type={showOldPassword ? 'text' : 'password'}
                            fullWidth
                            size="small"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            disabled={loading}
                            sx={inputSx}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowOldPassword(!showOldPassword)} edge="end" disabled={loading} size="small">
                                            {showOldPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    {/* New Password */}
                    <Box>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, mb: 0.8 }}>
                            Password
                        </Typography>
                        <TextField
                            placeholder="Enter new password"
                            type={showNewPassword ? 'text' : 'password'}
                            fullWidth
                            size="small"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={loading}
                            sx={inputSx}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" disabled={loading} size="small">
                                            {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Strength Bar */}
                        {newPassword && (
                            <Box sx={{ mt: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                                        Password Strength
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: getStrengthColor() }}>
                                        {getStrengthLabel()}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={passwordStrength}
                                    sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        backgroundColor: 'var(--color-gray-100)',
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 3,
                                            backgroundColor: getStrengthColor(),
                                        },
                                    }}
                                />
                            </Box>
                        )}

                        {/* Password Requirements Checklist */}
                        <Box sx={{ mt: 2, p: { xs: 1.5, sm: 2 }, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)' }}>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-primary)', mb: 1 }}>
                                Password must contain:
                            </Typography>
                            {passwordChecks.map((check, idx) => {
                                const passed = newPassword && check.test(newPassword);
                                return (
                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.3 }}>
                                        {passed ? (
                                            <CheckCircle sx={{ fontSize: 16, color: 'var(--color-success)', flexShrink: 0 }} />
                                        ) : (
                                            <Cancel sx={{ fontSize: 16, color: newPassword ? 'var(--color-error)' : 'var(--color-gray-300)', flexShrink: 0 }} />
                                        )}
                                        <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' }, color: passed ? 'var(--color-success)' : newPassword ? 'var(--color-text-secondary)' : 'var(--color-text-muted)', fontWeight: passed ? 600 : 400 }}>
                                            {check.label}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>

                    {/* Confirm Password */}
                    <Box>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, mb: 0.8 }}>
                            Confirm Password
                        </Typography>
                        <TextField
                            placeholder="Re-enter new password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            fullWidth
                            size="small"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                            sx={inputSx}
                            error={!!confirmPassword && !passwordsMatch}
                            helperText={confirmPassword && !passwordsMatch ? 'Passwords do not match' : confirmPassword && passwordsMatch ? 'Passwords match' : ''}
                            FormHelperTextProps={{
                                sx: { color: passwordsMatch ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 },
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" disabled={loading} size="small">
                                            {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    {/* Buttons */}
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                        {!isFirstLogin && (
                            <Button
                                onClick={onClose}
                                disabled={loading}
                                fullWidth
                                sx={{
                                    borderRadius: 'var(--radius-lg)',
                                    py: 1.2,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    color: 'var(--color-text-secondary)',
                                    border: '1px solid var(--color-gray-200)',
                                    '&:hover': { background: 'var(--color-surface-alt)' },
                                }}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            type="submit"
                            disabled={loading || !oldPassword || !allChecksPassed || !passwordsMatch}
                            fullWidth
                            sx={{
                                borderRadius: 'var(--radius-lg)',
                                py: 1.2,
                                fontWeight: 700,
                                textTransform: 'none',
                                background: 'var(--gradient-primary-reverse)',
                                boxShadow: 'var(--shadow-primary-sm)',
                                '&:hover': {
                                    background: 'var(--gradient-primary)',
                                },
                                '&.Mui-disabled': {
                                    background: 'var(--color-gray-200)',
                                    color: 'var(--color-text-muted)',
                                },
                            }}
                        >
                            {loading ? 'Saving...' : isFirstLogin ? 'Set Password' : 'Change Password'}
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ChangePassword;
