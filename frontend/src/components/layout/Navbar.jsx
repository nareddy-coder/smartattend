/**
 * Top application bar displaying the app title, user avatar with profile menu,
 * notification bell, and role-based navigation actions.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem, Box,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider,
    CircularProgress, useMediaQuery, Tooltip, Drawer, Chip, List, ListItem,
    Badge as MuiBadge,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Logout, Person, Email, Badge, School, Phone, MenuBook, Numbers, Work, Business, Menu as MenuIconNav, DarkMode as DarkModeIcon, LightMode as LightModeIcon, Notifications as NotificationsIcon, Close as CloseIcon, Error as ErrorIcon, Warning as WarningAmberIcon, Info as InfoIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const deptFullName = {
    'CSE': 'Computer Science and Engineering',
    'ECE': 'Electronics and Communication Engineering',
    'EEE': 'Electrical and Electronics Engineering',
    'ME': 'Mechanical Engineering',
    'CE': 'Civil Engineering',
    'IT': 'Information Technology',
    'CSE (AI&ML)': 'CSE (Artificial Intelligence & Machine Learning)',
    'CSE (DS)': 'CSE (Data Science)',
    'CSE (CS)': 'CSE (Cyber Security)',
    'MBA': 'Master of Business Administration',
    'MCA': 'Master of Computer Applications',
};

const Navbar = ({ title = 'SmartAttend', onMenuClick, notifications = [], notificationsOpen = false, setNotificationsOpen }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { isDarkMode, toggleDarkMode } = useThemeMode();

    const [anchorEl, setAnchorEl] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [notificationsSeen, setNotificationsSeen] = useState(false);
    const prevNotifCountRef = useRef(notifications.length);

    // Reset seen state when notification count changes (new notifications arrived)
    useEffect(() => {
        if (notifications.length !== prevNotifCountRef.current) {
            setNotificationsSeen(false);
            prevNotifCountRef.current = notifications.length;
        }
    }, [notifications.length]);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        const currentRole = user?.role;
        logout();
        navigate(currentRole === 'admin' ? '/admin' : '/login');
        handleClose();
    };

    const handleProfileOpen = async () => {
        handleClose();
        setProfileOpen(true);
        setProfileLoading(true);
        setImageError(false);
        try {
            const res = await api.get('/users/me');
            setProfileData(res.data);
        } catch (err) {
            console.error('Failed to fetch profile', err);
            setProfileData(null);
        } finally {
            setProfileLoading(false);
        }
    };

    const ProfileRow = ({ icon, label, value }) => (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 1.5,
            px: 2,
            borderRadius: 'var(--radius-lg)',
            transition: 'background var(--transition-base)',
            '&:hover': { background: 'var(--color-primary-alpha-6)' },
        }}>
            <Box sx={{
                color: 'var(--color-primary-dark)',
                display: 'flex',
                background: 'var(--color-primary-alpha-10)',
                borderRadius: '10px',
                p: 1,
            }}>{icon}</Box>
            <Box>
                <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Typography>
                <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' }, fontWeight: 700, color: 'var(--color-text-primary)', wordBreak: 'break-word' }}>{value || '—'}</Typography>
            </Box>
        </Box>
    );

    return (
        <>
            <AppBar
                position="static"
                elevation={0}
                sx={{
                    flexShrink: 0,
                    zIndex: 1100,
                    background: 'var(--navbar-gradient)',
                    boxShadow: 'var(--navbar-shadow)',
                    borderRadius: 0,
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between', py: 0.5, px: { xs: 1, sm: 2 }, minHeight: { xs: 52, sm: 64 } }}>
                    {/* Left: Menu + Hi + Name */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, minWidth: 0, flex: 1 }}>
                        {onMenuClick && (
                            <IconButton
                                onClick={onMenuClick}
                                sx={{
                                    color: 'var(--color-text-white)',
                                    p: { xs: 0.5, sm: 0.8 },
                                    '&:hover': { background: 'var(--color-bg-overlay)' },
                                }}
                            >
                                <MenuIconNav sx={{ fontSize: { xs: 20, sm: 24 } }} />
                            </IconButton>
                        )}
                        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                            <Typography
                                variant="body2"
                                component="div"
                                sx={{
                                    fontWeight: 700,
                                    fontSize: { xs: '0.75rem', sm: '1.2rem' },
                                    color: 'var(--color-text-white)',
                                    letterSpacing: 0.5,
                                    lineHeight: 1.2,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {title?.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Right: Name + Role + Avatar */}
                    {user && (
                        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, ml: { xs: 'auto', sm: 1 }, gap: { xs: 0.3, sm: 1.5 } }}>
                            <Tooltip title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
                                <IconButton
                                    onClick={toggleDarkMode}
                                    sx={{
                                        color: 'var(--color-text-white)',
                                        p: { xs: 0.5, sm: 0.8 },
                                        '&:hover': { background: 'var(--color-bg-overlay)' },
                                    }}
                                >
                                    {isDarkMode ? <LightModeIcon sx={{ fontSize: { xs: 18, sm: 22 } }} /> : <DarkModeIcon sx={{ fontSize: { xs: 18, sm: 22 } }} />}
                                </IconButton>
                            </Tooltip>
                            {setNotificationsOpen ? (
                                <IconButton onClick={() => { setNotificationsOpen(true); setNotificationsSeen(true); }} sx={{ color: 'var(--color-text-white)', p: { xs: 0.5, sm: 0.8 }, '&:hover': { background: 'var(--color-bg-overlay)' } }}>
                                    <MuiBadge badgeContent={notificationsSeen ? 0 : notifications.length} color="error" max={99}>
                                        <NotificationsIcon sx={{ fontSize: { xs: 18, sm: 22 } }} />
                                    </MuiBadge>
                                </IconButton>
                            ) : null}
                            <IconButton
                                size="large"
                                onClick={handleMenu}
                                sx={{
                                    p: '3px',
                                    background: 'var(--color-bg-overlay)',
                                    borderRadius: '50%',
                                    '&:hover': {
                                        background: 'var(--glass-bg-hover)',
                                        transform: 'scale(1.05)',
                                    },
                                    transition: 'all var(--transition-slow)',
                                }}
                            >
                                <Avatar
                                    sx={{
                                        width: { xs: 28, sm: 36 },
                                        height: { xs: 28, sm: 36 },
                                        bgcolor: 'var(--color-primary)',
                                        fontSize: { xs: '0.85rem', sm: '1rem' },
                                        fontWeight: 700,
                                        color: 'var(--color-text-white)',
                                    }}
                                >
                                    {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
                                </Avatar>
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                PaperProps={{
                                    sx: {
                                        mt: 1.5,
                                        minWidth: { xs: 160, sm: 200 },
                                        borderRadius: 3,
                                        background: 'var(--color-bg-paper)',
                                        border: '1px solid var(--color-border)',
                                        boxShadow: 'var(--shadow-menu)',
                                        '& .MuiMenuItem-root': {
                                            color: 'var(--color-text-primary)',
                                            borderRadius: 2,
                                            mx: 0.5,
                                            '&:hover': {
                                                background: 'var(--color-primary-alpha-8)',
                                            },
                                        },
                                    }
                                }}
                            >
                                <MenuItem onClick={handleProfileOpen} sx={{ gap: 1.5 }}>
                                    <Person fontSize="small" />
                                    Profile
                                </MenuItem>
                                <MenuItem onClick={handleLogout} sx={{ gap: 1.5, color: 'var(--color-error) !important' }}>
                                    <Logout fontSize="small" />
                                    Logout
                                </MenuItem>
                            </Menu>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            {/* Profile Dialog */}
            <Dialog
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        background: 'var(--color-bg-paper)',
                        borderRadius: { xs: 'var(--radius-xl)', sm: '24px' },
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-dialog)',
                        overflow: 'visible',
                        m: { xs: 2, sm: 4 },
                        maxHeight: { xs: 'calc(100vh - 32px)', sm: 'calc(100vh - 64px)' },
                    }
                }}
            >
                <DialogContent sx={{ p: 0, overflow: 'visible' }}>
                    {profileLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress sx={{ color: 'var(--color-primary)' }} />
                        </Box>
                    ) : profileData ? (
                        <Box>
                            {/* Banner + Photo */}
                            <Box sx={{
                                background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary), var(--color-primary-light))',
                                height: { xs: 80, sm: 100 },
                                borderRadius: { xs: 'var(--radius-xl) var(--radius-xl) 0 0', sm: '24px 24px 0 0' },
                                position: 'relative',
                            }}>
                                {/* Close button */}
                                <Box
                                    onClick={() => setProfileOpen(false)}
                                    sx={{
                                        position: 'absolute',
                                        top: 12,
                                        right: 12,
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: 'var(--color-overlay-dark)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'var(--color-text-white)',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        '&:hover': { background: 'var(--color-overlay-dark-hover)' },
                                    }}
                                >
                                    ✕
                                </Box>

                                {/* Photo */}
                                <Box sx={{
                                    position: 'absolute',
                                    bottom: { xs: -40, sm: -50 },
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                }}>
                                    <Box sx={{
                                        width: { xs: 90, sm: 110 },
                                        height: { xs: 90, sm: 110 },
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary), var(--color-primary-light))',
                                        p: '4px',
                                        boxShadow: 'var(--shadow-primary-glow)',
                                    }}>
                                        {profileData.image_url && !imageError ? (
                                            <Box
                                                component="img"
                                                src={profileData.image_url}
                                                alt={profileData?.name || profileData?.username || 'User'}
                                                onError={() => setImageError(true)}
                                                sx={{
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                    objectPosition: 'top center',
                                                }}
                                            />
                                        ) : (
                                            <Avatar sx={{
                                                width: '100%',
                                                height: '100%',
                                                bgcolor: 'var(--color-bg)',
                                                fontSize: '2.5rem',
                                                fontWeight: 800,
                                                color: 'var(--color-primary-dark)',
                                            }}>
                                                {(profileData?.name || profileData?.username || 'U').charAt(0).toUpperCase()}
                                            </Avatar>
                                        )}
                                    </Box>
                                </Box>
                            </Box>

                            {/* Name + Role */}
                            <Box sx={{ pt: { xs: 6, sm: 7 }, pb: 1, textAlign: 'center' }}>
                                <Typography sx={{
                                    fontWeight: 800,
                                    fontSize: { xs: '1rem', sm: '1.3rem' },
                                    color: 'var(--color-text-primary)',
                                    mb: 0.5,
                                }}>
                                    {profileData?.name || profileData?.username || 'User'}
                                </Typography>
                                <Box sx={{
                                    display: 'inline-block',
                                    background: profileData?.role === 'student'
                                        ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))'
                                        : profileData?.role === 'faculty'
                                        ? 'linear-gradient(135deg, var(--color-secondary), var(--color-info))'
                                        : 'linear-gradient(135deg, var(--color-error), var(--color-primary))',
                                    color: 'var(--color-text-white)',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    letterSpacing: 1.5,
                                    textTransform: 'uppercase',
                                    px: 2,
                                    py: 0.4,
                                    borderRadius: 'var(--radius-full)',
                                }}>
                                    {profileData?.role === 'faculty' ? (profileData?.designation || 'Faculty') : profileData?.role === 'student' ? 'Student' : profileData?.role}
                                </Box>
                            </Box>

                            {/* Divider */}
                            <Box sx={{
                                mx: 3,
                                my: 1.5,
                                height: 1,
                                background: 'var(--gradient-divider)',
                            }} />

                            {/* Details */}
                            <Box sx={{ px: 1.5, pb: 2 }}>
                                {profileData?.role === 'faculty' && (
                                    <>
                                        {profileData.employee_id && <ProfileRow icon={<Badge fontSize="small" />} label="Employee ID" value={profileData.employee_id} />}
                                        {profileData.department && <ProfileRow icon={<Business fontSize="small" />} label="Department" value={deptFullName[profileData.department] || profileData.department} />}
                                        {profileData.email && <ProfileRow icon={<Email fontSize="small" />} label="Email" value={profileData.email} />}
                                        {profileData.phone && <ProfileRow icon={<Phone fontSize="small" />} label="Phone" value={profileData.phone} />}
                                    </>
                                )}
                                {profileData?.role === 'student' && (
                                    <>
                                        {profileData.roll_number && <ProfileRow icon={<Badge fontSize="small" />} label="Roll Number" value={profileData.roll_number?.toUpperCase()} />}
                                        {profileData.department && <ProfileRow icon={<Business fontSize="small" />} label="Department" value={deptFullName[profileData.department] || profileData.department} />}
                                        {profileData.year && <ProfileRow icon={<MenuBook fontSize="small" />} label="Year of Study" value={`${profileData.year}${profileData.year === 1 ? 'st' : profileData.year === 2 ? 'nd' : profileData.year === 3 ? 'rd' : 'th'} Year`} />}
                                        {profileData.semester && <ProfileRow icon={<Numbers fontSize="small" />} label="Semester" value={`${profileData.semester}${profileData.semester === 1 ? 'st' : profileData.semester === 2 ? 'nd' : profileData.semester === 3 ? 'rd' : 'th'} Semester`} />}
                                        {profileData.section && <ProfileRow icon={<School fontSize="small" />} label="Section" value={profileData.section.replace(/^Section\s*/i, '')} />}
                                        {profileData.email && <ProfileRow icon={<Email fontSize="small" />} label="Email" value={profileData.email} />}
                                        {profileData.phone && <ProfileRow icon={<Phone fontSize="small" />} label="Phone" value={profileData.phone} />}
                                    </>
                                )}
                            </Box>

                            {/* Close Button */}
                            <Box sx={{ px: 3, pb: 3 }}>
                                <Button
                                    variant="contained"
                                    onClick={() => setProfileOpen(false)}
                                    fullWidth
                                    sx={{
                                        background: 'var(--gradient-primary-reverse)',
                                        borderRadius: '14px',
                                        py: 1.2,
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        textTransform: 'none',
                                        boxShadow: 'var(--shadow-primary-sm)',
                                        '&:hover': {
                                            background: 'var(--gradient-primary)',
                                            boxShadow: '0 6px 20px var(--color-primary-alpha-50)',
                                        },
                                    }}
                                >
                                    Close
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography sx={{ color: 'var(--color-error)', mb: 2 }}>
                                Failed to load profile.
                            </Typography>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => setProfileOpen(false)}
                                sx={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                            >
                                Close
                            </Button>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Notifications Drawer */}
            {setNotificationsOpen && (
                <Drawer anchor="right" open={notificationsOpen} onClose={() => setNotificationsOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 380 }, background: 'var(--color-bg-paper)', borderLeft: '1px solid var(--color-primary-alpha-15)' } }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid var(--color-primary-alpha-12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NotificationsIcon sx={{ fontSize: 22, color: 'var(--color-primary-dark)' }} />
                            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>Notifications</Typography>
                            <Chip label={notifications.length} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', background: 'var(--color-primary-alpha-15)', color: 'var(--color-primary-dark)', height: 22 }} />
                        </Box>
                        <IconButton onClick={() => setNotificationsOpen(false)} sx={{ color: 'var(--color-text-muted)' }}>
                            <CloseIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Box>
                    <Box sx={{ overflow: 'auto', flex: 1, p: 1 }}>
                        {notifications.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <NotificationsIcon sx={{ fontSize: 48, color: 'var(--color-text-muted)', mb: 1 }} />
                                <Typography sx={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>No notifications</Typography>
                            </Box>
                        ) : (
                            <List sx={{ p: 0 }}>
                                {notifications.map((notif) => (
                                    <ListItem key={notif.id} sx={{ p: 0, mb: 1 }}>
                                        <Box sx={{ width: '100%', p: 1.5, borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: notif.severity === 'error' ? 'var(--color-error-alpha-4)' : notif.severity === 'warning' ? 'var(--color-warning-alpha-4, rgba(234,179,8,0.04))' : 'var(--color-surface-alt)', transition: 'background 0.2s' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                                <Box sx={{ mt: 0.3, color: notif.severity === 'error' ? 'var(--color-error)' : notif.severity === 'warning' ? 'var(--color-warning, #eab308)' : 'var(--color-primary)', display: 'flex' }}>
                                                    {notif.icon === 'error' ? <ErrorIcon sx={{ fontSize: 20 }} /> : notif.icon === 'warning' ? <WarningAmberIcon sx={{ fontSize: 20 }} /> : <InfoIcon sx={{ fontSize: 20 }} />}
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-text-primary)', mb: 0.3 }}>{notif.title}</Typography>
                                                    <Typography sx={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', mb: 0.5, lineHeight: 1.4 }}>{notif.description}</Typography>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                                                        {new Date(notif.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                </Drawer>
            )}

        </>
    );
};

export default Navbar;
