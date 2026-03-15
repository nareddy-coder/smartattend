/**
 * Student dashboard page displaying attendance records, timetable, and profile info.
 * Provides students with an overview of their academic schedule and attendance history.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    Box,
    Container,
    Typography,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    LinearProgress,
    Skeleton,
} from '@mui/material';
import {
    Today as TodayIcon,
    DateRange as DateRangeIcon,
    CalendarMonth as CalendarMonthIcon,
    AllInclusive as AllInclusiveIcon,
    ExpandMore,
    ExpandLess,
    Person as PersonIcon,
    School as SchoolIcon,
    Badge as BadgeIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import Navbar from '../components/layout/Navbar';
import EmptyState from '../components/common/EmptyState';
import Loader from '../components/common/Loader';
import TimetableGrid from '../components/common/TimetableGrid';
import BackToTop from '../components/common/BackToTop';

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
};

const StudentDashboard = () => {
    const { user } = useAuth();
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [showTimetable, setShowTimetable] = useState(false);
    const [timetableSlots, setTimetableSlots] = useState([]);
    const [timetableInfo, setTimetableInfo] = useState({});
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarData, setCalendarData] = useState([]);
    const [tabLoading, setTabLoading] = useState(false);
    const [summary, setSummary] = useState({ subjects: [], total_held: 0, total_attended: 0, total_percentage: 0 });
    const [studentName, setStudentName] = useState(user?.name || '');
    const [studentRoll, setStudentRoll] = useState('');
    const [studentSection, setStudentSection] = useState('');
    const [studentDepartment, setStudentDepartment] = useState('');
    const [studentYear, setStudentYear] = useState('');
    const [viewMode, setViewMode] = useState('today');
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const fetchIdRef = useRef(0);
    const hasFetchedOnce = useRef(false);
    const todayStr = new Date().toISOString().split('T')[0];
    const [periodFromDate, setPeriodFromDate] = useState(todayStr);
    const [periodToDate, setPeriodToDate] = useState(todayStr);
    const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

    const username = user?.username || '';
    const rollPrefix = username.match(/^(\d{2})/);
    const startYear = rollPrefix ? 2000 + parseInt(rollPrefix[1], 10) : new Date().getFullYear() - 4;
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let y = startYear; y <= currentYear; y++) {
        yearOptions.push(String(y));
    }

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/users/me');
            setStudentName(res.data.name || '');
            setStudentRoll(res.data.roll_number || res.data.username || '');
            setStudentSection(res.data.section_name || res.data.section || '');
            setStudentDepartment(res.data.department || '');
            setStudentYear(res.data.year || '');
            // Fetch student timetable
            try {
                const ttRes = await api.get('/timetable/student/me');
                setTimetableSlots(ttRes.data?.slots || []);
                setTimetableInfo(ttRes.data || {});
            } catch (_) {}
            // Fetch attendance calendar for current month
            fetchCalendar(calYear, calMonth);
        } catch (err) {
            console.error('Profile fetch failed', err);
            setFetchError('Unable to load data. Please refresh the page.');
        }
    };

    const fetchCalendar = async (year, month) => {
        try {
            const m = String(month + 1).padStart(2, '0');
            const firstDay = `${year}-${m}-01`;
            const lastDay = `${year}-${m}-${new Date(year, month + 1, 0).getDate()}`;
            const calRes = await api.get(`/attendance/my-period-summary?from_date=${firstDay}&to_date=${lastDay}`);
            setCalendarData(calRes.data?.periods || []);
        } catch (_) {
            setCalendarData([]);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [viewMode, periodFromDate, periodToDate, selectedMonth, selectedYear]);

    const fetchSummary = async () => {
        const currentFetchId = ++fetchIdRef.current;

        if (hasFetchedOnce.current) {
            setTabLoading(true);
        }

        try {
            let backendMode = viewMode === 'today' ? 'period' : viewMode === 'period' ? 'date_range' : viewMode;
            let url = '/attendance/my-subject-summary?mode=' + backendMode;
            if (viewMode === 'today') {
                const today = new Date().toISOString().split('T')[0];
                url += '&target_date=' + today;
            } else if (viewMode === 'period') {
                url += `&from_date=${periodFromDate}&to_date=${periodToDate}`;
            } else if (viewMode === 'monthly') {
                url += `&target_month=${selectedYear}-${selectedMonth}`;
            }
            const res = await api.get(url);
            if (currentFetchId === fetchIdRef.current) {
                setSummary(res.data);
                hasFetchedOnce.current = true;
            }
        } catch (error) {
            if (currentFetchId === fetchIdRef.current) {
                console.error('Failed to fetch summary', error);
            }
        } finally {
            if (currentFetchId === fetchIdRef.current) {
                setLoading(false);
                setTabLoading(false);
            }
        }
    };

    const navigateCalendar = (direction) => {
        let newMonth = calMonth + direction;
        let newYear = calYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        setCalMonth(newMonth);
        setCalYear(newYear);
        fetchCalendar(newYear, newMonth);
    };

    const getPercentageColor = (pct) => {
        if (pct >= 75) return '#10b981';
        if (pct >= 60) return '#f59e0b';
        return '#ef4444';
    };

    const getShortageInfo = (held, attended) => {
        if (held === 0) return null;
        const pct = (attended / held) * 100;
        if (pct >= 75) return null;
        const needed = Math.ceil((0.75 * held - attended) / 0.25);
        return needed > 0 ? needed : null;
    };

    const getEmptyDescription = () => {
        if (viewMode === 'today') return 'No attendance has been taken for today yet.';
        if (viewMode === 'period') return 'No attendance records found for the selected date range.';
        if (viewMode === 'monthly') return 'No attendance records found for the selected month.';
        return 'No attendance records found.';
    };

    const filterTabs = [
        { value: 'today', label: 'Today', icon: <TodayIcon fontSize="small" />, gradient: 'var(--gradient-primary)' },
        { value: 'period', label: 'Period', icon: <DateRangeIcon fontSize="small" />, gradient: 'var(--gradient-primary)' },
        { value: 'monthly', label: 'Monthly', icon: <CalendarMonthIcon fontSize="small" />, gradient: 'var(--gradient-primary)' },
        { value: 'tillnow', label: 'Till Now', icon: <AllInclusiveIcon fontSize="small" />, gradient: 'var(--gradient-primary)' },
    ];

    if (loading) return (
        <Box sx={{ height: '100%', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Navbar title={studentName ? `${getGreeting()}, ${studentName}` : getGreeting()} />
            <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 1.5, sm: 2, md: 3 }, flex: 1 }}>
                {/* Skeleton student info bar */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: { xs: 1.5, sm: 3 },
                    mb: { xs: 2, sm: 3 },
                    py: { xs: 1, sm: 1.2 },
                    px: { xs: 1.5, sm: 2.5 },
                    background: 'var(--color-surface)',
                    borderRadius: '14px',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <Skeleton variant="rounded" width={80} height={20} />
                    <Skeleton variant="rounded" width={120} height={20} />
                    <Skeleton variant="rounded" width={90} height={20} />
                </Box>
                {/* Skeleton filter tabs */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 0.8, sm: 1.5 }, mb: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} variant="rounded" width={90} height={38} sx={{ borderRadius: '14px' }} />
                    ))}
                </Box>
                {/* Skeleton attendance card */}
                <Box sx={{ background: 'var(--color-surface)', borderRadius: '20px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    {/* Card header skeleton */}
                    <Box sx={{ px: 3, py: 2, background: 'linear-gradient(135deg, var(--color-primary-alpha-8), var(--color-primary-alpha-6))', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center' }}>
                        <Skeleton variant="rounded" width={200} height={24} />
                    </Box>
                    {/* Circle skeleton */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <Skeleton variant="circular" width={120} height={120} />
                    </Box>
                    {/* Table header skeleton */}
                    <Box sx={{ px: 2 }}>
                        <Skeleton variant="rounded" width="100%" height={40} sx={{ mb: 1 }} />
                    </Box>
                    {/* Table row skeletons */}
                    {[1, 2, 3, 4].map((i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 2, px: 2, py: 1.2 }}>
                            <Skeleton variant="rounded" width={40} height={28} />
                            <Skeleton variant="rounded" width="40%" height={28} />
                            <Skeleton variant="rounded" width={50} height={28} />
                            <Skeleton variant="rounded" width={50} height={28} />
                            <Skeleton variant="rounded" width={70} height={28} sx={{ borderRadius: 'var(--radius-xl)' }} />
                        </Box>
                    ))}
                    <Box sx={{ pb: 2 }} />
                </Box>
            </Container>
        </Box>
    );

    return (
        <Box sx={{ height: '100%', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Navbar title={studentName ? `${getGreeting()}, ${studentName}` : getGreeting()} />

            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 1.5, sm: 2, md: 3 }, overflowX: 'hidden' }}>
                {fetchError && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 'var(--radius-lg)' }} onClose={() => setFetchError('')}>
                        {fetchError}
                    </Alert>
                )}
                {/* Student Info Bar */}
                {(studentRoll || studentSection || studentDepartment) && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: { xs: 1.5, sm: 3 },
                        mb: { xs: 2, sm: 3 },
                        py: { xs: 1, sm: 1.2 },
                        px: { xs: 1.5, sm: 2.5 },
                        background: 'var(--color-surface)',
                        borderRadius: '14px',
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        flexWrap: 'wrap',
                    }}>
                        {studentRoll && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                <BadgeIcon sx={{ fontSize: { xs: 15, sm: 17 }, color: 'var(--color-primary)' }} />
                                <Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' }, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                    {studentRoll}
                                </Typography>
                            </Box>
                        )}
                        {studentDepartment && (
                            <>
                                <Box sx={{ width: '1px', height: 16, background: 'var(--color-border)', display: { xs: 'none', sm: 'block' } }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                    <SchoolIcon sx={{ fontSize: { xs: 15, sm: 17 }, color: 'var(--color-primary)' }} />
                                    <Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' }, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                        {studentYear ? `${studentYear}${studentYear == 1 ? 'st' : studentYear == 2 ? 'nd' : studentYear == 3 ? 'rd' : 'th'} Year - ` : ''}{studentDepartment}
                                    </Typography>
                                </Box>
                            </>
                        )}
                        {studentSection && (
                            <>
                                <Box sx={{ width: '1px', height: 16, background: 'var(--color-border)', display: { xs: 'none', sm: 'block' } }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                    <PersonIcon sx={{ fontSize: { xs: 15, sm: 17 }, color: 'var(--color-primary)' }} />
                                    <Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' }, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                        Section {studentSection}
                                    </Typography>
                                </Box>
                            </>
                        )}
                    </Box>
                )}

                {/* Filter Tabs */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: { xs: 0.8, sm: 1.5 },
                    mb: { xs: 2, sm: 3 },
                    flexWrap: 'wrap',
                }}>
                    {filterTabs.map((tab) => (
                        <Box
                            key={tab.value}
                            onClick={() => setViewMode(tab.value)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.8,
                                px: { xs: 1.5, sm: 2.5 },
                                py: { xs: 0.8, sm: 1 },
                                borderRadius: '14px',
                                cursor: 'pointer',
                                transition: 'all var(--transition-slow)',
                                background: viewMode === tab.value ? tab.gradient : 'var(--color-surface)',
                                border: viewMode === tab.value ? 'none' : '1px solid var(--color-border)',
                                color: viewMode === tab.value ? 'var(--color-text-white)' : 'var(--color-text-secondary)',
                                boxShadow: viewMode === tab.value ? 'var(--shadow-primary-md)' : '0 1px 3px rgba(0,0,0,0.05)',
                                transform: viewMode === tab.value ? 'scale(1.05)' : 'scale(1)',
                                '&:hover': {
                                    background: viewMode === tab.value ? tab.gradient : 'var(--color-surface-hover)',
                                    color: viewMode === tab.value ? 'var(--color-text-white)' : 'var(--color-primary-dark)',
                                    transform: 'scale(1.05)',
                                },
                            }}
                        >
                            {tab.icon}
                            <Typography sx={{
                                fontWeight: viewMode === tab.value ? 700 : 500,
                                fontSize: { xs: '0.78rem', sm: '0.88rem' },
                                letterSpacing: 0.5,
                            }}>
                                {tab.label}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {/* Date Pickers for Period */}
                {viewMode === 'period' && (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        gap: { xs: 1, sm: 2 },
                        mb: 3,
                        flexWrap: 'wrap',
                    }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: { xs: 1, sm: 'none' }, minWidth: 0 }}>
                            <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: { xs: '0.65rem', sm: '0.75rem' }, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', pl: 0.5 }}>
                                From Date
                            </Typography>
                            <TextField
                                type="date"
                                size="small"
                                value={periodFromDate}
                                onChange={(e) => setPeriodFromDate(e.target.value)}
                                inputProps={{ max: periodToDate }}
                                sx={{
                                    minWidth: { xs: 0, sm: 170 },
                                    width: '100%',
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 'var(--radius-lg)',
                                        background: 'var(--color-input-bg)',
                                        color: 'var(--color-text-primary)',
                                        fontWeight: 600,
                                        '& fieldset': { borderColor: 'var(--color-border)' },
                                        '&:hover fieldset': { borderColor: 'var(--color-primary)' },
                                        '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)', borderWidth: 2 },
                                    },
                                }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: { xs: 1, sm: 'none' }, minWidth: 0 }}>
                            <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: { xs: '0.65rem', sm: '0.75rem' }, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', pl: 0.5 }}>
                                To Date
                            </Typography>
                            <TextField
                                type="date"
                                size="small"
                                value={periodToDate}
                                onChange={(e) => setPeriodToDate(e.target.value)}
                                inputProps={{ min: periodFromDate, max: todayStr }}
                                sx={{
                                    minWidth: { xs: 0, sm: 170 },
                                    width: '100%',
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 'var(--radius-lg)',
                                        background: 'var(--color-input-bg)',
                                        color: 'var(--color-text-primary)',
                                        fontWeight: 600,
                                        '& fieldset': { borderColor: 'var(--color-border)' },
                                        '&:hover fieldset': { borderColor: 'var(--color-primary)' },
                                        '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)', borderWidth: 2 },
                                    },
                                }}
                            />
                        </Box>
                    </Box>
                )}

                {/* Month/Year Pickers for Monthly */}
                {viewMode === 'monthly' && (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 2,
                        mb: 3,
                        flexWrap: 'wrap',
                    }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', pl: 0.5 }}>
                                Month
                            </Typography>
                            <FormControl size="small" sx={{
                                minWidth: { xs: 130, sm: 170 },
                                width: { xs: '100%', sm: 'auto' },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 'var(--radius-lg)',
                                    background: 'var(--color-input-bg)',
                                    color: 'var(--color-text-primary)',
                                    fontWeight: 600,
                                    '& fieldset': { borderColor: 'var(--color-border)' },
                                    '&:hover fieldset': { borderColor: 'var(--color-primary)' },
                                    '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)', borderWidth: 2 },
                                },
                                '& .MuiSvgIcon-root': { color: 'var(--color-primary)' },
                            }}>
                                <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                                    {[
                                        { value: '01', label: 'January' },
                                        { value: '02', label: 'February' },
                                        { value: '03', label: 'March' },
                                        { value: '04', label: 'April' },
                                        { value: '05', label: 'May' },
                                        { value: '06', label: 'June' },
                                        { value: '07', label: 'July' },
                                        { value: '08', label: 'August' },
                                        { value: '09', label: 'September' },
                                        { value: '10', label: 'October' },
                                        { value: '11', label: 'November' },
                                        { value: '12', label: 'December' },
                                    ].map((m) => (
                                        <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', pl: 0.5 }}>
                                Year
                            </Typography>
                            <FormControl size="small" sx={{
                                minWidth: { xs: 130, sm: 170 },
                                width: { xs: '100%', sm: 'auto' },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 'var(--radius-lg)',
                                    background: 'var(--color-input-bg)',
                                    color: 'var(--color-text-primary)',
                                    fontWeight: 600,
                                    '& fieldset': { borderColor: 'var(--color-border)' },
                                    '&:hover fieldset': { borderColor: 'var(--color-primary)' },
                                    '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)', borderWidth: 2 },
                                },
                                '& .MuiSvgIcon-root': { color: 'var(--color-primary)' },
                            }}>
                                <Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                                    {yearOptions.map((y) => (
                                        <MenuItem key={y} value={y}>{y}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                )}

                {/* Attendance Card */}
                <Box sx={{
                    background: 'var(--color-surface)',
                    borderRadius: { xs: '14px', sm: '20px' },
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                }}>
                    {/* Card Header */}
                    <Box sx={{
                        px: { xs: 2, sm: 3 },
                        py: { xs: 1.5, sm: 2 },
                        background: 'linear-gradient(135deg, var(--color-primary-alpha-8), var(--color-primary-alpha-6))',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                    }}>
                        <Typography sx={{
                            fontWeight: 700,
                            fontSize: { xs: '0.9rem', sm: '1.1rem' },
                            color: 'var(--color-primary-dark)',
                            letterSpacing: { xs: 0.5, sm: 1 },
                            textTransform: 'uppercase',
                        }}>
                            Attendance Summary
                        </Typography>
                    </Box>

                    {/* Subtle loading bar for tab switches */}
                    {tabLoading && (
                        <LinearProgress sx={{
                            height: 3,
                            '& .MuiLinearProgress-bar': {
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                            },
                            backgroundColor: 'var(--color-bg)',
                        }} />
                    )}

                    {!summary || !summary.subjects || summary.subjects.length === 0 ? (
                        <Box sx={{ py: 6 }}>
                            <EmptyState
                                title="No subjects found"
                                description={getEmptyDescription()}
                            />
                        </Box>
                    ) : (
                        <Box sx={{ opacity: tabLoading ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>
                            {/* Overall Percentage Circle */}
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                py: 3,
                            }}>
                                <Box sx={{
                                    position: 'relative',
                                    width: { xs: 100, sm: 120 },
                                    height: { xs: 100, sm: 120 },
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <CircularProgress
                                        variant="determinate"
                                        value={100}
                                        size={isMobile ? 100 : 120}
                                        thickness={4}
                                        sx={{ color: 'var(--color-skeleton)', position: 'absolute' }}
                                    />
                                    <CircularProgress
                                        variant="determinate"
                                        value={Math.min(summary.total_percentage, 100)}
                                        size={isMobile ? 100 : 120}
                                        thickness={4}
                                        sx={{
                                            color: getPercentageColor(summary.total_percentage),
                                            position: 'absolute',
                                            '& .MuiCircularProgress-circle': {
                                                strokeLinecap: 'round',
                                            },
                                        }}
                                    />
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography sx={{
                                            fontWeight: 800,
                                            fontSize: '1.5rem',
                                            color: getPercentageColor(summary.total_percentage),
                                            lineHeight: 1,
                                        }}>
                                            {summary.total_percentage.toFixed(1)}%
                                        </Typography>
                                        <Typography sx={{
                                            fontSize: '0.65rem',
                                            color: 'var(--color-text-muted)',
                                            fontWeight: 500,
                                            mt: 0.3,
                                        }}>
                                            {summary.total_attended}/{summary.total_held}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Table */}
                            <TableContainer sx={{ borderRadius: 'var(--radius-lg)' }}>
                                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                                    <TableHead>
                                        <TableRow sx={{ '& th:first-of-type': { borderTopLeftRadius: '12px' }, '& th:last-of-type': { borderTopRightRadius: '12px' } }}>
                                            {[
                                                { label: 'Sl.No', labelSm: 'Sl No', width: { xs: '12%', sm: '8%' } },
                                                { label: 'Subject', width: { xs: '36%', sm: '36%' } },
                                                { label: 'Held', width: { xs: '12%', sm: '14%' } },
                                                { label: 'Attend', width: { xs: '14%', sm: '14%' } },
                                                { label: '%', width: { xs: '26%', sm: '28%' } },
                                            ].map((header, i) => (
                                                <TableCell
                                                    key={header.label}
                                                    align={i >= 2 ? 'center' : 'left'}
                                                    sx={{
                                                        fontWeight: '800 !important',
                                                        color: 'var(--color-primary-dark) !important',
                                                        borderBottom: '2px solid var(--color-primary-alpha-15)',
                                                        fontSize: { xs: '0.6rem', sm: '0.85rem' },
                                                        letterSpacing: { xs: 0, sm: 0.5 },
                                                        textTransform: 'uppercase',
                                                        py: { xs: 0.8, sm: 1.8 },
                                                        px: { xs: 0.3, sm: 2 },
                                                        background: 'var(--color-table-header-bg) !important',
                                                        width: header.width,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>{header.label}</Box>
                                                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{header.labelSm || header.label}</Box>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {summary.subjects.map((row, index) => (
                                            <TableRow
                                                key={index}
                                                sx={{
                                                    '&:hover': { background: 'var(--color-primary-alpha-4)' },
                                                    transition: 'background 0.2s ease',
                                                }}
                                            >
                                                <TableCell sx={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-gray-200)', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.85rem' }, px: { xs: 0.5, sm: 2 } }}>
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell sx={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-gray-200)', fontWeight: 600, fontSize: { xs: '0.6rem', sm: '0.85rem' }, px: { xs: 0.3, sm: 2 }, whiteSpace: { xs: 'normal', sm: 'nowrap' }, wordBreak: { xs: 'break-word', sm: 'normal' }, overflow: { sm: 'hidden' }, textOverflow: { sm: 'ellipsis' } }}>
                                                    {row.subject}
                                                </TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-gray-200)', fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.85rem' }, px: { xs: 0.5, sm: 2 } }}>
                                                    {row.held}
                                                </TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-gray-200)', fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.85rem' }, px: { xs: 0.5, sm: 2 } }}>
                                                    {row.attended}
                                                </TableCell>
                                                <TableCell align="center" sx={{ borderBottom: '1px solid var(--color-gray-200)', px: { xs: 0.5, sm: 2 } }}>
                                                    <Chip
                                                        label={row.percentage.toFixed(2) + '%'}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 700,
                                                            fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                                            height: { xs: 22, sm: 24 },
                                                            background: row.held === 0 ? 'transparent' : `${getPercentageColor(row.percentage)}18`,
                                                            color: getPercentageColor(row.percentage),
                                                            border: row.held === 0 ? `1px solid var(--color-gray-200)` : `1px solid ${getPercentageColor(row.percentage)}44`,
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {/* Total Row */}
                                        <TableRow sx={{
                                            background: 'linear-gradient(135deg, var(--color-primary-alpha-6), var(--color-primary-alpha-4))',
                                        }}>
                                            <TableCell colSpan={2} sx={{
                                                fontWeight: 800,
                                                fontSize: { xs: '0.75rem', sm: '0.95rem' },
                                                color: 'var(--color-primary-dark)',
                                                borderBottom: 'none',
                                                letterSpacing: 1,
                                                px: { xs: 0.5, sm: 2 },
                                            }}>
                                                TOTAL
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: { xs: '0.8rem', sm: '0.95rem' }, color: 'var(--color-text-primary)', borderBottom: 'none' }}>
                                                {summary.total_held}
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: { xs: '0.8rem', sm: '0.95rem' }, color: 'var(--color-text-primary)', borderBottom: 'none' }}>
                                                {summary.total_attended}
                                            </TableCell>
                                            <TableCell align="center" sx={{ borderBottom: 'none' }}>
                                                <Chip
                                                    label={summary.total_percentage.toFixed(2) + '%'}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 800,
                                                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                                        height: { xs: 22, sm: 24 },
                                                        background: getPercentageColor(summary.total_percentage),
                                                        color: 'var(--color-text-white)',
                                                        boxShadow: `0 4px 12px ${getPercentageColor(summary.total_percentage)}66`,
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>


                            {/* Shortage Warnings */}
                            {viewMode === 'tillnow' && (() => {
                                const shortageSubjects = summary.subjects
                                    .filter(row => row.held > 0 && row.percentage < 75)
                                    .map(row => ({ ...row, needed: getShortageInfo(row.held, row.attended) }))
                                    .filter(row => row.needed);
                                const hasOverallShortage = summary.total_held > 0 && summary.total_percentage < 75;
                                if (!hasOverallShortage && shortageSubjects.length === 0) return null;
                                return (
                                    <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: 2, pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {hasOverallShortage && (
                                            <Alert
                                                severity="warning"
                                                sx={{
                                                    borderRadius: '14px',
                                                    background: 'var(--color-warning-alpha-8)',
                                                    border: '1px solid var(--color-warning-alpha-20)',
                                                    color: 'var(--color-warning-dark)',
                                                    '& .MuiAlert-icon': { color: 'var(--color-warning)' },
                                                }}
                                            >
                                                Your overall attendance is <strong>{summary.total_percentage.toFixed(2)}%</strong>. You need to attend <strong>{getShortageInfo(summary.total_held, summary.total_attended)}</strong> more consecutive classes to reach 75%.
                                            </Alert>
                                        )}
                                        {shortageSubjects.length > 0 && (
                                            <Box sx={{
                                                borderRadius: '14px',
                                                background: 'var(--color-error-alpha-5)',
                                                border: '1px solid var(--color-error-alpha-15)',
                                                p: { xs: 1.5, sm: 2 },
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    <WarningIcon sx={{ fontSize: 18, color: 'var(--color-error)' }} />
                                                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-error)' }}>
                                                        Subject-wise Shortage
                                                    </Typography>
                                                </Box>
                                                {shortageSubjects.map((row, idx) => (
                                                    <Box key={idx} sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        py: 0.6,
                                                        px: 1,
                                                        mb: 0.3,
                                                        borderRadius: 'var(--radius-md)',
                                                        background: 'var(--color-error-alpha-4)',
                                                    }}>
                                                        <Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' }, fontWeight: 600, color: 'var(--color-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {row.subject}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                                            <Chip
                                                                label={`${row.percentage.toFixed(1)}%`}
                                                                size="small"
                                                                sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20, background: 'var(--color-error-alpha-12)', color: 'var(--color-error)' }}
                                                            />
                                                            <Typography sx={{ fontSize: { xs: '0.68rem', sm: '0.75rem' }, fontWeight: 600, color: 'var(--color-error)' }}>
                                                                Need {row.needed} more
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })()}
                        </Box>
                    )}
                </Box>
                {/* Attendance Calendar */}
                {(() => {
                    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
                    const monthName = new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const now = new Date();
                    const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth();

                    // Build date -> status map
                    const dateMap = {};
                    calendarData.forEach(p => {
                        if (!dateMap[p.date]) dateMap[p.date] = new Set();
                        dateMap[p.date].add(p.status);
                    });

                    return (
                        <Box sx={{ mt: { xs: 2, md: 3 }, background: 'var(--color-bg-paper)', borderRadius: { xs: '12px', md: '16px' }, border: '1px solid var(--color-primary-alpha-12)', boxShadow: '0 1px 3px var(--color-shadow)', overflow: 'hidden' }}>
                            <Box onClick={() => setShowCalendar(!showCalendar)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.2, sm: 1.5 }, cursor: 'pointer', '&:hover': { background: 'var(--color-primary-alpha-8)' }, transition: 'background 0.2s' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarMonthIcon sx={{ color: 'var(--color-primary)', fontSize: { xs: 20, sm: 24 } }} />
                                    <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' }, color: 'var(--color-text-primary)' }}>
                                        Attendance Calendar
                                    </Typography>
                                </Box>
                                {showCalendar ? <ExpandLess sx={{ color: 'var(--color-text-muted)' }} /> : <ExpandMore sx={{ color: 'var(--color-text-muted)' }} />}
                            </Box>
                            {showCalendar && (
                                <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, pb: 2 }}>
                                    {/* Month Navigation */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1.5 }}>
                                        <Box
                                            onClick={() => navigateCalendar(-1)}
                                            sx={{
                                                width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                                                '&:hover': { background: 'var(--color-primary-alpha-10)', borderColor: 'var(--color-primary)' },
                                                transition: 'all var(--transition-base)',
                                            }}
                                        >
                                            <ChevronLeftIcon sx={{ fontSize: 18, color: 'var(--color-text-secondary)' }} />
                                        </Box>
                                        <Typography sx={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.95rem', minWidth: { xs: 'auto', sm: 160 }, textAlign: 'center' }}>
                                            {monthName}
                                        </Typography>
                                        <Box
                                            onClick={() => !isCurrentMonth && navigateCalendar(1)}
                                            sx={{
                                                width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: isCurrentMonth ? 'default' : 'pointer',
                                                background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                                                opacity: isCurrentMonth ? 0.3 : 1,
                                                '&:hover': isCurrentMonth ? {} : { background: 'var(--color-primary-alpha-10)', borderColor: 'var(--color-primary)' },
                                                transition: 'all var(--transition-base)',
                                            }}
                                        >
                                            <ChevronRightIcon sx={{ fontSize: 18, color: 'var(--color-text-secondary)' }} />
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, maxWidth: 350, mx: 'auto' }}>
                                        {dayNames.map(d => (
                                            <Typography key={d} sx={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)', py: 0.3 }}>{d}</Typography>
                                        ))}
                                        {Array.from({ length: firstDayOfWeek }).map((_, i) => <Box key={`e${i}`} />)}
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const day = i + 1;
                                            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                            const statuses = dateMap[dateStr];
                                            const isToday = isCurrentMonth && day === now.getDate();
                                            let bg = 'var(--color-surface-alt)';
                                            let color = 'var(--color-text-muted)';
                                            if (statuses) {
                                                if (statuses.has('Present')) {
                                                    bg = 'var(--color-secondary-alpha-20)'; color = 'var(--color-secondary-dark)';
                                                } else {
                                                    bg = 'var(--color-error-alpha-20)'; color = 'var(--color-error-dark)';
                                                }
                                            }
                                            return (
                                                <Box key={day} sx={{
                                                    textAlign: 'center', py: 0.5, borderRadius: 'var(--radius-md)', background: bg,
                                                    fontSize: '0.75rem', fontWeight: isToday ? 800 : 600, color,
                                                    minHeight: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    ...(isToday ? { outline: '2px solid var(--color-primary)', outlineOffset: -1 } : {}),
                                                }}>
                                                    {day}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 2 }}>
                                        <Chip
                                            label="Present"
                                            size="small"
                                            sx={{
                                                fontWeight: 700, fontSize: '0.72rem', height: 26, px: 1,
                                                background: 'var(--color-secondary-alpha-12)', color: 'var(--color-secondary-dark)',
                                                border: '1.5px solid var(--color-secondary-alpha-40)',
                                            }}
                                        />
                                        <Chip
                                            label="Absent"
                                            size="small"
                                            sx={{
                                                fontWeight: 700, fontSize: '0.72rem', height: 26, px: 1,
                                                background: 'var(--color-error-alpha-12)', color: 'var(--color-error-dark)',
                                                border: '1.5px solid var(--color-error-alpha-40)',
                                            }}
                                        />
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    );
                })()}

                {/* My Timetable */}
                {timetableSlots.length > 0 && (
                    <Box sx={{
                        mt: { xs: 2, md: 3 },
                        background: 'var(--color-bg-paper)',
                        borderRadius: { xs: '12px', md: '16px' },
                        border: '1px solid var(--color-primary-alpha-12)',
                        boxShadow: '0 1px 3px var(--color-shadow)',
                        overflow: 'hidden',
                    }}>
                        <Box
                            onClick={() => setShowTimetable(!showTimetable)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: { xs: 1.5, sm: 2, md: 3 },
                                py: { xs: 1.2, sm: 1.5 },
                                cursor: 'pointer',
                                '&:hover': { background: 'var(--color-primary-alpha-8)' },
                                transition: 'background 0.2s',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarMonthIcon sx={{ color: 'var(--color-primary)', fontSize: { xs: 20, sm: 24 } }} />
                                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' }, color: 'var(--color-text-primary)' }}>
                                    My Timetable
                                </Typography>
                            </Box>
                            {showTimetable ? <ExpandLess sx={{ color: 'var(--color-text-muted)' }} /> : <ExpandMore sx={{ color: 'var(--color-text-muted)' }} />}
                        </Box>
                        {showTimetable && (
                            <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, pb: { xs: 1.5, sm: 2 } }}>
                                <TimetableGrid
                                    slots={timetableSlots}
                                    highlightToday
                                    sectionName={timetableInfo.section_name || ''}
                                    department={timetableInfo.department || ''}
                                    year={timetableInfo.year || ''}
                                    semester={timetableInfo.semester || ''}
                                />
                            </Box>
                        )}
                    </Box>
                )}
            </Container>

            {/* Footer */}
            <Box
                component="footer"
                sx={{
                    mt: 'auto',
                    py: { xs: 2, sm: 3 },
                    textAlign: 'center',
                    borderTop: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                }}
            >
                <Typography sx={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--color-primary-dark)',
                    letterSpacing: 0.5,
                }}>
                    SmartAttend — Face Recognition Attendance System
                </Typography>
                <Typography sx={{
                    fontSize: '0.7rem',
                    color: 'var(--color-text-muted)',
                    mt: 0.5,
                }}>
                    &copy; {new Date().getFullYear()} All rights reserved.
                </Typography>
            </Box>
            <BackToTop />
            </Box>
        </Box>
    );
};

export default StudentDashboard;
