import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    TextField,
    Typography,
    Alert,
    Paper,
    InputAdornment,
    IconButton,
    CircularProgress,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    FormControlLabel,
    Checkbox,
    useMediaQuery,
    useTheme
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Login as LoginIcon,
    School,
    Person,
    FaceRetouchingNatural,
    Security,
    Speed,
    CheckCircleOutline,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
    // SupervisorAccount as SupervisorAccountIcon,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import ChangePassword from '../components/ChangePassword';
import { useToast } from '../context/ToastContext';
import { useThemeMode } from '../context/ThemeContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [firstLogin, setFirstLogin] = useState(false);
    const [roleTab, setRoleTab] = useState(0);
    const [forgotOpen, setForgotOpen] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { isDarkMode, toggleDarkMode } = useThemeMode();
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
    const isXs = useMediaQuery('(max-width:400px)');
    const location = useLocation();
    const isAdminRoute = location.pathname.toLowerCase() === '/admin';

    const [rememberedRoleTab, setRememberedRoleTab] = useState(null);

    useEffect(() => {
        const savedUsername = localStorage.getItem('rememberedUsername');
        const savedRole = localStorage.getItem('rememberedRole');
        if (savedUsername && savedRole !== null) {
            const roleIndex = Number(savedRole);
            setUsername(savedUsername);
            setRememberMe(true);
            setRoleTab(roleIndex);
            setRememberedRoleTab(roleIndex);
        }
    }, []);

    // const roles = isAdminRoute ? ['admin'] : ['hod', 'faculty', 'student'];
    const roles = isAdminRoute ? ['admin'] : ['faculty', 'student'];
    const rolePlaceholders = isAdminRoute ? {
        0: { user: 'User ID', pass: 'Password' },
    } : {
        // 0: { user: 'Employee ID', pass: 'Password' }, // HOD
        0: { user: 'Employee ID', pass: 'Password' },
        1: { user: 'Roll Number', pass: 'Password' },
    };

    const showLoginError = (errorCode = '') => {
        // const roleLabel = isAdminRoute ? 'Admin' : ['HOD', 'Faculty', 'Student'][roleTab];
        const roleLabel = isAdminRoute ? 'Admin' : ['Faculty', 'Student'][roleTab];
        const credLabel = roleLabel === 'Student' ? 'Roll Number' : roleLabel === 'Faculty' ? 'Employee ID' : 'Username';
        let msg = '';

        if (errorCode === 'USER_NOT_FOUND') {
            const msgs = [
                `No ${roleLabel} account found with this ${credLabel}. Please check and try again.`,
                `This ${credLabel} is not registered in our system. Contact your administrator if this is unexpected.`,
                `We couldn't find any ${roleLabel} with ${credLabel} "${username}". Please verify and retry.`,
            ];
            msg = msgs[Math.floor(Math.random() * msgs.length)];
        } else if (errorCode === 'WRONG_PASSWORD') {
            const msgs = [
                `Incorrect password for this ${roleLabel} account. Please try again.`,
                `The password you entered doesn't match. Hint: default password is your ${credLabel}.`,
                `Wrong password! Double-check your password and try again.`,
            ];
            msg = msgs[Math.floor(Math.random() * msgs.length)];
        } else if (errorCode.startsWith?.('WRONG_ROLE:')) {
            const actualRole = errorCode.split(':')[1] || 'unknown';
            msg = `This account belongs to ${actualRole}, not ${roleLabel}. Please switch to the "${actualRole}" tab to login.`;
        } else {
            msg = `Something went wrong. Please check your ${credLabel} and password, then try again.`;
        }

        setError(msg);
        const form = document.getElementById('login-form');
        form?.classList.add('animate-shake');
        setTimeout(() => form?.classList.remove('animate-shake'), 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const selectedRole = roles[roleTab];
            // login() fetches profile from DB — role is derived from designation in DB
            const result = await login(username, password, selectedRole);
            if (result.success) {
                if (rememberMe) {
                    localStorage.setItem('rememberedUsername', username);
                    localStorage.setItem('rememberedRole', roleTab);
                    localStorage.setItem('rememberedIsAdmin', isAdminRoute ? 'true' : 'false');
                } else {
                    localStorage.removeItem('rememberedUsername');
                    localStorage.removeItem('rememberedRole');
                    localStorage.removeItem('rememberedIsAdmin');
                }
                // Role comes from DB via AuthContext (faculty with HOD designation → 'hod')
                navigateByRole(result.user.role);
            } else {
                showLoginError(result.error);
            }
        } catch (err) {
            showLoginError();
        } finally {
            setLoading(false);
        }
    };

    const navigateByRole = (role) => {
        if (role === 'admin') navigate('/admin');
        else if (role === 'hod') navigate('/hod');
        else if (role === 'faculty') navigate('/faculty');
        else if (role === 'student') navigate('/student');
        else navigate('/');
    };

    const handlePasswordChangeSuccess = () => {
        setShowPasswordChange(false);
        showToast('Password changed successfully! Please login again.', 'success');
        localStorage.removeItem('token');
        setUsername('');
        setPassword('');
        setFirstLogin(false);
    };

    const handleForgotOpen = () => setForgotOpen(true);
    const handleForgotClose = () => setForgotOpen(false);

    const features = [
        { icon: <FaceRetouchingNatural />, text: 'AI-Powered Face Recognition' },
        { icon: <Speed />, text: 'Real-Time Attendance Tracking' },
        { icon: <Security />, text: 'Secure & Reliable System' },
        { icon: <CheckCircleOutline />, text: 'Instant Verification' },
    ];

    return (
        <Box
            sx={{
                height: '100dvh',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                background: 'var(--gradient-primary-full)',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
            }}
        >
            {/* Dark Mode Toggle */}
            <IconButton
                onClick={toggleDarkMode}
                sx={{
                    position: 'absolute',
                    top: { xs: 12, sm: 20 },
                    right: { xs: 12, sm: 20 },
                    zIndex: 10,
                    color: 'var(--color-text-white)',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    '&:hover': { background: 'rgba(255,255,255,0.25)' },
                }}
            >
                {isDarkMode ? <LightModeIcon sx={{ fontSize: { xs: 18, sm: 22 } }} /> : <DarkModeIcon sx={{ fontSize: { xs: 18, sm: 22 } }} />}
            </IconButton>

            {/* Animated Background Elements */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '-15%',
                    right: '-10%',
                    width: '50%',
                    height: '50%',
                    borderRadius: '50%',
                    background: 'var(--glass-glow)',
                    filter: 'blur(80px)',
                    animation: 'float 6s ease-in-out infinite',
                    '@keyframes float': {
                        '0%, 100%': { transform: 'translateY(0px)' },
                        '50%': { transform: 'translateY(-30px)' },
                    },
                    pointerEvents: 'none',
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: '-15%',
                    left: '-10%',
                    width: '45%',
                    height: '45%',
                    borderRadius: '50%',
                    background: 'var(--glass-glow-light)',
                    filter: 'blur(80px)',
                    animation: 'float2 8s ease-in-out infinite',
                    '@keyframes float2': {
                        '0%, 100%': { transform: 'translateY(0px)' },
                        '50%': { transform: 'translateY(20px)' },
                    },
                    pointerEvents: 'none',
                }}
            />

            {/* Left Side - Branding */}
            <Box
                sx={{
                    flex: 1,
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: 'var(--color-text-white)',
                    px: { md: 4, lg: 6 },
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {/* Logo */}
                <Box
                    sx={{
                        position: 'relative',
                        width: { md: 100, lg: 120 },
                        height: { md: 100, lg: 120 },
                        mb: 4,
                        overflow: 'hidden',
                        borderRadius: '28px',
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '28px',
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(20px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-logo)',
                            border: '1px solid var(--glass-border)',
                        }}
                    >
                        <FaceRetouchingNatural sx={{ fontSize: { md: 52, lg: 64 }, color: 'var(--color-text-white)', filter: 'drop-shadow(0 4px 8px var(--color-overlay-dark))' }} />
                    </Box>
                    {/* Scan line animation */}
                    <Box
                        sx={{
                            position: 'absolute',
                            left: 12,
                            right: 12,
                            height: 2,
                            background: 'var(--gradient-scan-line)',
                            borderRadius: 1,
                            overflow: 'hidden',
                            clipPath: 'inset(0 0 0 0 round 28px)',
                            animation: 'scan 2.5s ease-in-out infinite',
                            '@keyframes scan': {
                                '0%': { top: 20 },
                                '50%': { top: 92 },
                                '100%': { top: 20 },
                            },
                        }}
                    />
                </Box>

                <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, textAlign: 'center', letterSpacing: '-0.02em', textShadow: '0 2px 10px var(--color-overlay-dark)', fontSize: { md: '2.2rem', lg: '2.8rem' } }}>
                    SmartAttend
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.85, textAlign: 'center', maxWidth: 450, mb: 5, fontWeight: 400, fontSize: { md: '0.95rem', lg: '1.1rem' } }}>
                    AI-powered face recognition attendance system for modern institutions
                </Typography>

                {/* Feature List */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {features.map((feature, index) => (
                        <Box
                            key={index}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                opacity: 0,
                                animation: `fadeSlideIn 0.5s ease-out ${0.3 + index * 0.15}s forwards`,
                                '@keyframes fadeSlideIn': {
                                    '0%': { opacity: 0, transform: 'translateX(-20px)' },
                                    '100%': { opacity: 1, transform: 'translateX(0)' },
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 'var(--radius-lg)',
                                    background: 'var(--glass-bg)',
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid var(--glass-border-light)',
                                    flexShrink: 0,
                                }}
                            >
                                {React.cloneElement(feature.icon, { sx: { fontSize: 22, opacity: 0.9 } })}
                            </Box>
                            <Typography variant="body1" sx={{ opacity: 0.9, fontWeight: 500 }}>
                                {feature.text}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Right Side - Login Form */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    px: { xs: 1.5, sm: 3 },
                    py: { xs: 1.5, sm: 3 },
                    position: 'relative',
                    zIndex: 1,
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                }}
            >
                {/* Mobile Branding */}
                <Box
                    sx={{
                        display: { xs: 'flex', md: 'none' },
                        flexDirection: 'column',
                        alignItems: 'center',
                        mb: 1,
                        color: 'var(--color-text-white)',
                    }}
                >
                    <Box
                        sx={{
                            position: 'relative',
                            width: { xs: 50, sm: 72 },
                            height: { xs: 50, sm: 72 },
                            mb: 1,
                            overflow: 'hidden',
                            borderRadius: '16px',
                        }}
                    >
                        <Box
                            sx={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '16px',
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(20px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 12px 40px var(--color-overlay-dark)',
                                border: '1px solid var(--glass-border)',
                            }}
                        >
                            <FaceRetouchingNatural sx={{ fontSize: { xs: 26, sm: 40 }, color: 'var(--color-text-white)' }} />
                        </Box>
                        <Box
                            sx={{
                                position: 'absolute',
                                left: 8,
                                right: 8,
                                height: 2,
                                background: 'var(--gradient-scan-line)',
                                borderRadius: 1,
                                animation: 'scanMobile 2.5s ease-in-out infinite',
                                '@keyframes scanMobile': {
                                    '0%': { top: 10 },
                                    '50%': { top: 44 },
                                    '100%': { top: 10 },
                                },
                            }}
                        />
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.4rem' } }}>
                        SmartAttend
                    </Typography>
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 1.5, sm: 3.5 },
                        width: '100%',
                        maxWidth: { xs: '100%', sm: 420 },
                        borderRadius: { xs: 3, sm: 4 },
                        backgroundColor: 'var(--color-bg-paper)',
                        boxShadow: 'var(--shadow-card-lg)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <Box sx={{ textAlign: 'center', mb: { xs: 1.5, sm: 3 } }}>
                        <Typography sx={{ fontWeight: 700, mb: 0.3, color: 'var(--color-text-primary)', fontSize: { xs: '1rem', sm: '1.35rem' } }}>
                            {isAdminRoute ? 'Admin Login' : 'Welcome Back'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {isAdminRoute ? 'Sign in with administrator credentials' : 'Sign in to continue to your dashboard'}
                        </Typography>
                    </Box>

                    {/* Role Tabs — hidden for admin login */}
                    {!isAdminRoute && (
                    <Tabs
                        value={roleTab}
                        onChange={(e, v) => {
                            setRoleTab(v);
                            setError('');
                            setPassword('');
                            if (rememberedRoleTab !== null && v === rememberedRoleTab) {
                                const savedUsername = localStorage.getItem('rememberedUsername');
                                if (savedUsername) setUsername(savedUsername);
                            } else {
                                setUsername('');
                            }
                        }}
                        variant="fullWidth"
                        sx={{
                            mb: { xs: 1.5, sm: 3 },
                            '& .MuiTabs-indicator': {
                                background: 'var(--gradient-primary)',
                                height: 3,
                                borderRadius: 2,
                            },
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                                minHeight: { xs: 42, sm: 48 },
                                px: { xs: 0.5, sm: 1 },
                                minWidth: 0,
                                color: 'var(--color-text-secondary)',
                                '&.Mui-selected': {
                                    color: 'var(--color-primary-dark)',
                                },
                            },
                        }}
                    >
                        {/* <Tab key="hod" icon={<SupervisorAccountIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />} iconPosition="start" label="HOD" /> */}
                        <Tab key="faculty" icon={<Person sx={{ fontSize: { xs: 16, sm: 20 } }} />} iconPosition="start" label="Faculty" />
                        <Tab key="student" icon={<School sx={{ fontSize: { xs: 16, sm: 20 } }} />} iconPosition="start" label="Student" />
                    </Tabs>
                    )}

                    {error && (
                        <Alert severity="error" role="alert" sx={{ mb: 2, borderRadius: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                            {error}
                        </Alert>
                    )}

                    <Box
                        id="login-form"
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2.5 } }}
                    >
                        <TextField
                            label={rolePlaceholders[roleTab].user}
                            variant="outlined"
                            fullWidth
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                            disabled={loading}
                            size={isMobile ? 'small' : 'medium'}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: 'var(--color-surface-alt)',
                                    color: 'var(--color-text-primary)',
                                    '& fieldset': { borderColor: 'var(--color-border)' },
                                    '&:hover fieldset': { borderColor: 'var(--color-primary-alpha-50)' },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'var(--color-primary)',
                                    },
                                    '& input': { color: 'var(--color-text-primary)', WebkitTextFillColor: 'var(--color-text-primary)' },
                                    '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px var(--color-surface-alt) inset', WebkitTextFillColor: 'var(--color-text-primary)' },
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'var(--color-text-muted)',
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: 'var(--color-primary-dark)',
                                },
                            }}
                        />

                        <TextField
                            label={rolePlaceholders[roleTab].pass}
                            variant="outlined"
                            type={showPassword ? 'text' : 'password'}
                            fullWidth
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            size={isMobile ? 'small' : 'medium'}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            disabled={loading}
                                            size="small"
                                            aria-label="Toggle password visibility"
                                            sx={{ color: 'var(--color-text-muted)' }}
                                        >
                                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: 'var(--color-surface-alt)',
                                    color: 'var(--color-text-primary)',
                                    '& fieldset': { borderColor: 'var(--color-border)' },
                                    '&:hover fieldset': { borderColor: 'var(--color-primary-alpha-50)' },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'var(--color-primary)',
                                    },
                                    '& input': { color: 'var(--color-text-primary)', WebkitTextFillColor: 'var(--color-text-primary)' },
                                    '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px var(--color-surface-alt) inset', WebkitTextFillColor: 'var(--color-text-primary)' },
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'var(--color-text-muted)',
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: 'var(--color-primary-dark)',
                                },
                            }}
                        />

                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            flexDirection: { xs: isXs ? 'column' : 'row', sm: 'row' },
                            gap: { xs: 0.5, sm: 0 },
                        }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        size="small"
                                        sx={{
                                            color: 'var(--color-primary)',
                                            '&.Mui-checked': {
                                                color: 'var(--color-primary-dark)',
                                            },
                                        }}
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'var(--color-text-secondary)', fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
                                        Remember me
                                    </Typography>
                                }
                                sx={{ mr: 0 }}
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'var(--color-primary)',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    fontSize: { xs: '0.78rem', sm: '0.85rem' },
                                    whiteSpace: 'nowrap',
                                    '&:hover': { textDecoration: 'underline' },
                                }}
                                onClick={handleForgotOpen}
                            >
                                Forgot Password?
                            </Typography>
                        </Box>

                        <Button
                            type="submit"
                            variant="contained"
                            size={isMobile ? 'medium' : 'large'}
                            fullWidth
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
                            sx={{
                                py: { xs: 1, sm: 1.5 },
                                fontSize: { xs: '0.85rem', sm: '1rem' },
                                fontWeight: 600,
                                textTransform: 'none',
                                borderRadius: 2,
                                background: 'var(--gradient-primary)',
                                boxShadow: 'var(--shadow-primary-md)',
                                '&:hover': {
                                    background: 'var(--gradient-primary-hover)',
                                    boxShadow: 'var(--shadow-primary-lg)',
                                },
                            }}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </Box>

                    <Box sx={{ mt: { xs: 1.5, sm: 3 }, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
                            &copy; {new Date().getFullYear()} SmartAttend. All rights reserved.
                        </Typography>
                    </Box>
                </Paper>
            </Box>

            {/* Forgot Password Info Dialog */}
            <Dialog
                open={forgotOpen}
                onClose={handleForgotClose}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: { xs: 'var(--radius-xl)', sm: '20px' },
                        m: { xs: 2, sm: 4 },
                        backgroundColor: 'var(--color-bg-paper)',
                        border: '1px solid var(--color-border)',
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.15rem' }, pb: 1, color: 'var(--color-text-primary)' }}>
                    Forgot Password?
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                            Try logging in with your default password:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Chip label="Students — Default password is your Roll Number" variant="outlined" size="small" sx={{ height: 'auto', py: 0.5, borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', '& .MuiChip-label': { whiteSpace: 'normal', fontSize: '0.75rem' } }} />
                            <Chip label="Faculty — Default password is your Employee ID" variant="outlined" size="small" sx={{ height: 'auto', py: 0.5, borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', '& .MuiChip-label': { whiteSpace: 'normal', fontSize: '0.75rem' } }} />
                            {/* <Chip label="HOD — Default password is your Employee ID" variant="outlined" size="small" sx={{ height: 'auto', py: 0.5, borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', '& .MuiChip-label': { whiteSpace: 'normal', fontSize: '0.75rem' } }} /> */}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                            If you still can't login, please contact your administrator to reset your password.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button variant="contained" onClick={handleForgotClose} sx={{
                        background: 'var(--gradient-primary)', borderRadius: 2, textTransform: 'none', fontWeight: 600,
                    }}>
                        Got It
                    </Button>
                </DialogActions>
            </Dialog>

            <ChangePassword
                open={showPasswordChange}
                onClose={() => { }}
                onSuccess={handlePasswordChangeSuccess}
                isFirstLogin={firstLogin}
            />
        </Box>
    );
};

export default Login;
