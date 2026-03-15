/**
 * Faculty dashboard with webcam-based face-recognition attendance capture.
 * Allows faculty to manage classes, mark attendance, and view attendance reports.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import Webcam from 'react-webcam';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    Box,
    Button,
    Typography,
    Container,
    Paper,
    Chip,
    Grid,
    Card,
    CardContent,
    IconButton,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    FormControlLabel,
    Tooltip,
} from '@mui/material';
import {
    PlayArrow,
    Stop,
    Download,
    Timer,
    People,
    CheckCircle,
    Cancel,
    CloudUpload,
    PersonAdd,
    PersonRemove,
    CalendarMonth as CalendarMonthIcon,
    ExpandMore,
    ExpandLess,
    History,
    Schedule,
} from '@mui/icons-material';
import Navbar from '../components/layout/Navbar';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/common/EmptyState';
import TimetableGrid from '../components/common/TimetableGrid';
import BackToTop from '../components/common/BackToTop';
import { useToast } from '../context/ToastContext';

// Period time ranges mapped to timetable db period numbers
const PERIOD_TIMES = [
    { period: 1, label: 'P1', time: '9:30-10:20', start: 570, end: 620 },
    { period: 2, label: 'P2', time: '10:20-11:10', start: 620, end: 670 },
    { period: 3, label: 'P3', time: '11:10-12:00', start: 670, end: 720 },
    { period: 5, label: 'P4', time: '1:00-1:50', start: 780, end: 830 },
    { period: 6, label: 'P5', time: '1:50-2:40', start: 830, end: 880 },
    { period: 7, label: 'P6', time: '2:40-3:30', start: 880, end: 930 },
];

const getCurrentPeriodNumber = () => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const match = PERIOD_TIMES.find(p => mins >= p.start && mins < p.end);
    return match ? match.period : null;
};

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
};

const formatYearSection = (year, dept, section) => {
    if (!year) return `${dept || ''}-${section || ''}`;
    const yearSuffix = year == 1 ? 'st' : year == 2 ? 'nd' : year == 3 ? 'rd' : 'th';
    return `${year}${yearSuffix} Year ${dept || ''}-${section || ''}`;
};

const FacultyDashboard = () => {
    const { user } = useAuth();
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(muiTheme.breakpoints.between('sm', 'md'));
    const { showToast } = useToast();
    const [facultyName, setFacultyName] = useState(user?.name || '');
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [logs, setLogs] = useState([]);
    const [detectedFaces, setDetectedFaces] = useState([]);
    const [sessionTime, setSessionTime] = useState(0);
    const [uploadedImageSrc, setUploadedImageSrc] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [sessionSummary, setSessionSummary] = useState(null);
    const [summaryView, setSummaryView] = useState('present');
    const [sectionStudents, setSectionStudents] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [checkedPeriods, setCheckedPeriods] = useState([]);
    const [takenPeriods, setTakenPeriods] = useState([]);
    const [manualMarkedRolls, setManualMarkedRolls] = useState(new Set());
    const [myTimetable, setMyTimetable] = useState([]);
    const [showTimetable, setShowTimetable] = useState(!isMobile);
    const [recentSessions, setRecentSessions] = useState([]);

    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const uploadedImgRef = useRef(null);
    const intervalRef = useRef(null);
    const timerRef = useRef(null);
    const sessionIdRef = useRef(null);
    const sectionRef = useRef('');
    const subjectRef = useRef('');
    const pendingRequests = useRef(0);
    const isCapturing = useRef(false);
    const webcamReady = useRef(false);
    const cameraStreamRef = useRef(null);

    const videoConstraints = isMobile
        ? { facingMode: 'user' }
        : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/users/me');
                setFacultyName(res.data.name || '');
            } catch (_) {}
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const res = await api.get('/assignments/my-assignments');
                setAssignments(res.data);
                if (res.data.length > 0) {
                    setSelectedAssignment(res.data[0].id);
                    setSelectedSection(res.data[0].section_id);
                    setSelectedSubject(res.data[0].subject_name);
                    sectionRef.current = res.data[0].section_id;
                    subjectRef.current = res.data[0].subject_name;
                }
                // Also fetch timetable and recent sessions
                try {
                    const ttRes = await api.get('/timetable/faculty/me');
                    setMyTimetable(ttRes.data);
                } catch (_) {}
                try {
                    const histRes = await api.get('/attendance/faculty/session-history');
                    setRecentSessions((histRes.data || []).slice(0, 5));
                } catch (_) {}
            } catch (err) {
                console.error('Failed to fetch assignments', err);
            }
        };
        fetchAssignments();
        return () => stopSession();
    }, []);

    useEffect(() => {
        const fetchSectionData = async () => {
            if (!selectedSection) {
                setSectionStudents([]);
                setTakenPeriods([]);
                return;
            }
            try {
                const [studentsRes, takenRes] = await Promise.all([
                    api.get(`/students/?section_id=${selectedSection}`),
                    api.get(`/attendance/taken-periods?section_id=${selectedSection}`),
                ]);
                setSectionStudents(studentsRes.data);
                setTakenPeriods(takenRes.data.all_taken || []);
            } catch (err) {
                console.error('Failed to fetch section data', err);
                setSectionStudents([]);
                setTakenPeriods([]);
            }
        };
        fetchSectionData();
    }, [selectedSection]);

    useEffect(() => {
        if (isSessionActive && !uploadedImageSrc) {
            timerRef.current = setInterval(() => {
                setSessionTime((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            if (!isSessionActive) setSessionTime(0);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isSessionActive, uploadedImageSrc]);

    // Helper to build local summary from current logs + sectionStudents
    const buildLocalSummary = async () => {
        if (!sessionIdRef.current) return;
        try {
            // If sectionStudents not loaded yet, fetch them first
            let students = sectionStudents;
            if (students.length === 0 && sectionRef.current) {
                try {
                    const studentsRes = await api.get(`/students/?section_id=${sectionRef.current}`);
                    students = studentsRes.data;
                    setSectionStudents(students);
                } catch (_) {}
            }
            const res = await api.get(`/attendance/logs/${encodeURIComponent(sessionIdRef.current)}`);
            const presentRolls = new Set(res.data.map(l => l.roll_number));
            const present = students.filter(s => presentRolls.has(s.roll_number));
            const absent = students.filter(s => !presentRolls.has(s.roll_number));
            setSessionSummary({
                message: `${present.length} present, ${absent.length} absent.`,
                present_students: present,
                absent_students: absent,
            });
        } catch (err) {
            console.error('Failed to build summary', err);
            // Still show a summary with whatever logs we have
            const presentRolls = new Set(logs.map(l => l.roll_number));
            setSessionSummary({
                message: `${presentRolls.size} student(s) detected.`,
                present_students: logs.map(l => ({ roll_number: l.roll_number, name: l.name || l.roll_number })),
                absent_students: [],
            });
        }
    };

    const startSession = () => {
        if (checkedPeriods.length === 0) {
            showToast('Please select at least one period before starting the session.', 'error');
            return;
        }
        const sid = new Date().toISOString();
        sessionIdRef.current = sid;
        setSessionId(sid);
        setIsSessionActive(true);
        setLogs([]);
        setDetectedFaces([]);
        setUploadedImageSrc(null);
        setSessionSummary(null);
        setIsSubmitted(false);
        setManualMarkedRolls(new Set());
        webcamReady.current = false;
        // Wait for webcam component to initialize before starting capture
        const waitForWebcam = () => {
            let attempts = 0;
            const check = setInterval(() => {
                attempts++;
                if (webcamReady.current || (webcamRef.current?.video?.readyState === 4)) {
                    clearInterval(check);
                    intervalRef.current = setInterval(captureAndSend, 3000);
                } else if (attempts > 30) {
                    clearInterval(check);
                    intervalRef.current = setInterval(captureAndSend, 3000);
                }
            }, 200);
        };
        waitForWebcam();
    };

    const stopSession = async () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsSessionActive(false);
        setUploadedImageSrc(null);
        webcamReady.current = false;
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(t => t.stop());
            cameraStreamRef.current = null;
        }

        const maxWait = 10000;
        const start = Date.now();
        while (pendingRequests.current > 0 && Date.now() - start < maxWait) {
            await new Promise(r => setTimeout(r, 300));
        }

        await fetchLogs();
        await buildLocalSummary();
        setSummaryView('present');
    };

    const submitAttendance = async () => {
        const sid = sessionIdRef.current;
        const secId = sectionRef.current;
        if (!sid || !secId) return;

        if (checkedPeriods.length === 0) {
            showToast('Please select at least one period.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('section_id', secId);
            formData.append('period_numbers', JSON.stringify(checkedPeriods));
            const subj = subjectRef.current;
            if (subj) formData.append('subject_name', subj);
            const response = await api.post(`/attendance/session/${encodeURIComponent(sid)}/submit`, formData);
            setSessionSummary(response.data);
            setSummaryView('present');
            setIsSubmitted(true);
            try {
                const takenRes = await api.get(`/attendance/taken-periods?section_id=${secId}`);
                setTakenPeriods(takenRes.data.all_taken || []);
            } catch (_) {}
        } catch (error) {
            console.error('Failed to submit attendance', error);
            showToast('Failed to submit attendance: ' + (error.response?.data?.detail || error.message), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const captureAndSend = async () => {
        // Skip if previous request is still in progress
        if (isCapturing.current) return;
        if (!webcamRef.current || uploadedImageSrc) return;

        const imageSrc = webcamRef.current.getScreenshot(isMobile ? { width: 640, height: 480 } : { width: 1280, height: 720 });
        const sid = sessionIdRef.current;
        const secId = sectionRef.current;
        const subj = subjectRef.current;
        if (!imageSrc || !sid || !secId) return;

        isCapturing.current = true;
        pendingRequests.current++;
        try {
            const blob = await fetch(imageSrc).then((res) => res.blob());
            const formData = new FormData();
            formData.append('file', blob, 'frame.jpg');
            formData.append('session_id', sid);
            formData.append('section_id', secId);
            if (subj) formData.append('subject_name', subj);

            const response = await api.post('/attendance/recognize', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setDetectedFaces(response.data.faces || []);
            drawBoundingBoxes(response.data.faces || []);
            fetchLogs();
        } catch (error) {
            console.error('Recognition failed', error);
        } finally {
            pendingRequests.current--;
            isCapturing.current = false;
        }
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => setUploadedImageSrc(e.target.result);
        reader.readAsDataURL(file);

        let currentSessionId = sessionIdRef.current;
        if (!isSessionActive) {
            currentSessionId = new Date().toISOString();
            sessionIdRef.current = currentSessionId;
            setSessionId(currentSessionId);
            setIsSessionActive(true);
            setLogs([]);
            setDetectedFaces([]);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        const secId = sectionRef.current || selectedSection || '1';
        const subj = subjectRef.current || selectedSubject;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', currentSessionId);
        formData.append('section_id', secId);
        if (subj) formData.append('subject_name', subj);

        try {
            const response = await api.post('/attendance/recognize', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const faces = response.data.faces || [];
            setDetectedFaces(faces);
            setTimeout(() => {
                if (uploadedImgRef.current && canvasRef.current) {
                    drawBoundingBoxes(faces, true);
                }
            }, 100);
            fetchLogs(currentSessionId);
        } catch (error) {
            console.error('Recognition on upload failed', error);
        }
    };

    const drawBoundingBoxes = (faces, isImagePreview = false) => {
        const sourceElement = isImagePreview ? uploadedImgRef.current : webcamRef.current?.video;
        const canvas = canvasRef.current;
        if (!sourceElement || !canvas) return;

        const ctx = canvas.getContext('2d');

        if (isImagePreview) {
            canvas.width = sourceElement.naturalWidth || sourceElement.width;
            canvas.height = sourceElement.naturalHeight || sourceElement.height;
            const scaleX = sourceElement.clientWidth / canvas.width;
            const scaleY = sourceElement.clientHeight / canvas.height;
            canvas.width = sourceElement.clientWidth;
            canvas.height = sourceElement.clientHeight;
            ctx.scale(scaleX, scaleY);
        } else {
            canvas.width = sourceElement.videoWidth;
            canvas.height = sourceElement.videoHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        faces.forEach((face) => {
            if (face.bbox) {
                const [x, y, w, h] = face.bbox;
                ctx.strokeStyle = face.status === 'Identified' ? '#10b981' : '#ef4444';
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, w, h);

                const label = face.status === 'Identified'
                    ? `${face.roll_number || ''} - ${face.name || ''}`
                    : 'Unknown';

                ctx.font = '14px Inter';
                const textWidth = ctx.measureText(label).width;
                const labelWidth = Math.max(w, textWidth + 10);

                ctx.fillStyle = face.status === 'Identified' ? '#10b981' : '#ef4444';
                ctx.fillRect(x, y - 25, labelWidth, 25);

                ctx.fillStyle = 'white';
                ctx.fillText(label, x + 5, y - 8);
            }
        });
    };

    const fetchLogs = async (overrideSessionId = null) => {
        const idToFetch = overrideSessionId || sessionIdRef.current;
        if (!idToFetch) return;
        try {
            const response = await api.get(`/attendance/logs/${encodeURIComponent(idToFetch)}`);
            setLogs(response.data);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const manualMarkPresent = async (studentRoll) => {
        const sid = sessionIdRef.current;
        const secId = sectionRef.current;
        const subj = subjectRef.current;
        if (!sid || !secId) return;

        try {
            const formData = new FormData();
            formData.append('session_id', sid);
            formData.append('student_roll', studentRoll);
            formData.append('section_id', secId);
            if (subj) formData.append('subject_name', subj);
            await api.post('/attendance/manual-mark', formData);
            setManualMarkedRolls(prev => new Set([...prev, studentRoll]));
            await fetchLogs();
            if (!isSessionActive) await buildLocalSummary();
        } catch (error) {
            console.error('Manual mark failed', error);
            showToast('Failed to mark student: ' + (error.response?.data?.detail || error.message), 'error');
        }
    };

    const manualUnmarkPresent = async (studentRoll) => {
        const sid = sessionIdRef.current;
        if (!sid) return;

        try {
            const formData = new FormData();
            formData.append('session_id', sid);
            formData.append('student_roll', studentRoll);
            await api.post('/attendance/manual-unmark', formData);
            setManualMarkedRolls(prev => {
                const next = new Set(prev);
                next.delete(studentRoll);
                return next;
            });
            await fetchLogs();
            if (!isSessionActive) await buildLocalSummary();
        } catch (error) {
            console.error('Manual unmark failed', error);
            showToast('Failed to remove student: ' + (error.response?.data?.detail || error.message), 'error');
        }
    };

    const triggerDownload = (blob, fileName) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            try { document.body.removeChild(a); } catch (_) {}
            URL.revokeObjectURL(url);
        }, 5000);
    };

    const downloadSummaryCSV = (type) => {
        const students = type === 'present'
            ? sessionSummary?.present_students
            : sessionSummary?.absent_students;
        if (!students || students.length === 0) return;
        const label = type === 'present' ? 'Present' : 'Absent';
        const rows = [['#', 'Roll Number', 'Name']];
        students.forEach((s, i) => rows.push([i + 1, s.roll_number, s.name]));
        const csvContent = rows.map(r => r.join(',')).join('\r\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
        const ca = assignments.find(a2 => a2.id === selectedAssignment);
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        const assignInfo = ca ? `${ca.subject_name || 'Subject'}-${ca.section_name || 'Section'}-Year${ca.year || ''}-${ca.department || ''}` : 'Session';
        triggerDownload(blob, `${assignInfo}_${label}_${dateStr}.csv`);
    };

    const downloadAttendanceLog = () => {
        if (!sessionSummary || sectionStudents.length === 0) return;
        const presentRolls = new Set((sessionSummary.present_students || []).map(s => s.roll_number));
        const rows = [['Roll Number', 'Name', 'Status']];
        sectionStudents.forEach((student) => {
            const status = presentRolls.has(student.roll_number) ? 'Present' : 'Absent';
            rows.push([student.roll_number, student.name, status]);
        });
        const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\r\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
        const ca = assignments.find(a2 => a2.id === selectedAssignment);
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        const assignInfo = ca ? `${ca.subject_name || 'Subject'}-${ca.section_name || 'Section'}-Year${ca.year || ''}-${ca.department || ''}` : 'Session';
        triggerDownload(blob, `${assignInfo}_Attendance_${dateStr}.csv`);
    };

    const uniqueStudents = new Set(logs.map((log) => log.roll_number)).size;
    const presentCount = logs.filter((log) => log.status === 'Present').length;
    const faceDetectedCount = logs.length - manualMarkedRolls.size;
    const manualCount = manualMarkedRolls.size;
    const isStopped = !isSessionActive && !!sessionId;

    return (
        <Box sx={{ height: '100%', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Navbar title={facultyName ? `${getGreeting()}, ${facultyName}` : getGreeting()} />

            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Container maxWidth="xl" sx={{ pb: 4, px: { xs: 1, sm: 2, md: 3 }, pt: { xs: 1.5, md: 2.5 }, overflowX: 'hidden' }}>
                {/* Compact Header Bar */}
                <Box sx={{
                    background: 'var(--color-surface)',
                    borderRadius: { xs: '10px', md: '14px' },
                    border: '1px solid var(--color-border)',
                    px: { xs: 1, sm: 2.5 },
                    py: { xs: 1, sm: 1.5 },
                    mb: { xs: 1.5, md: 2.5 },
                    boxShadow: '0 1px 3px var(--color-shadow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: { xs: 1, sm: 0 },
                    maxWidth: '100%',
                }}>
                    {/* Left: Title */}
                    <Box sx={{ minWidth: 0, mr: { xs: 0, sm: 2 } }}>
                        <Typography sx={{
                            fontWeight: 800,
                            fontSize: { xs: '0.95rem', sm: '1.2rem', md: '1.35rem' },
                            color: 'var(--color-primary-dark)',
                            lineHeight: 1.2,
                        }}>
                            Attendance Session
                        </Typography>
                        <Typography sx={{ color: 'var(--color-text-muted)', fontSize: { xs: '0.68rem', sm: '0.75rem' }, mt: 0.2 }}>
                            Real-time face recognition attendance tracking
                        </Typography>
                    </Box>

                    {/* Right: Stats */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: { xs: 1, sm: 2.5 },
                        flexWrap: 'wrap',
                        justifyContent: { xs: 'center', sm: 'flex-end' },
                        minWidth: 0,
                    }}>
                        {/* Duration */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.6, sm: 1 } }}>
                            <Timer sx={{ fontSize: { xs: 16, sm: 20 }, color: 'var(--color-primary)' }} />
                            <Box>
                                <Typography sx={{ color: 'var(--color-text-muted)', fontSize: { xs: '0.65rem', sm: '0.72rem' }, fontWeight: 600, lineHeight: 1 }}>
                                    Duration
                                </Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.82rem', sm: '1.05rem' }, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                                    {formatTime(sessionTime)}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Divider */}
                        <Box sx={{ width: '1px', height: { xs: 28, sm: 34 }, background: 'var(--color-border)' }} />

                        {/* Detected */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.6, sm: 1 } }}>
                            <People sx={{ fontSize: { xs: 16, sm: 20 }, color: 'var(--color-primary-light)' }} />
                            <Box>
                                <Typography sx={{ color: 'var(--color-text-muted)', fontSize: { xs: '0.65rem', sm: '0.72rem' }, fontWeight: 600, lineHeight: 1 }}>
                                    Detected
                                </Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.82rem', sm: '1.05rem' }, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                                    {uniqueStudents}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Divider */}
                        <Box sx={{ width: '1px', height: { xs: 28, sm: 34 }, background: 'var(--color-border)' }} />

                        {/* Status */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.6, sm: 1 } }}>
                            {isSessionActive ? (
                                <CheckCircle sx={{ fontSize: { xs: 16, sm: 20 }, color: 'var(--color-success)' }} />
                            ) : (
                                <Cancel sx={{ fontSize: { xs: 16, sm: 20 }, color: 'var(--color-text-muted)' }} />
                            )}
                            <Box>
                                <Typography sx={{ color: 'var(--color-text-muted)', fontSize: { xs: '0.65rem', sm: '0.72rem' }, fontWeight: 600, lineHeight: 1 }}>
                                    Status
                                </Typography>
                                <Chip
                                    label={isSubmitted ? 'Submitted' : isSessionActive ? 'Active' : isStopped ? 'Stopped' : 'Inactive'}
                                    size="small"
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: { xs: '0.65rem', sm: '0.72rem' },
                                        height: { xs: 20, sm: 24 },
                                        mt: 0.2,
                                        background: isSubmitted ? 'linear-gradient(135deg, var(--color-success), var(--color-secondary-dark))'
                                            : isSessionActive ? 'linear-gradient(135deg, var(--color-success), var(--color-secondary-dark))'
                                            : isStopped ? 'linear-gradient(135deg, var(--color-warning), var(--color-warning-dark))'
                                            : 'var(--color-gray-100)',
                                        color: isSubmitted || isSessionActive || isStopped ? 'var(--color-text-white)' : 'var(--color-text-secondary)',
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* Quick Stats Cards */}
                {myTimetable.length > 0 && (() => {
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const today = days[new Date().getDay()];
                    const todaySlots = myTimetable.filter(s => (s.day_name || s.day) === today);
                    const curPeriod = getCurrentPeriodNumber();
                    const remainingToday = curPeriod
                        ? todaySlots.filter(s => s.period_number > curPeriod).length
                        : todaySlots.length;
                    const completedToday = todaySlots.length - remainingToday;
                    const uniqueSubjects = [...new Set(myTimetable.map(s => s.subject_name))].length;
                    const sectionCount = new Set(myTimetable.map(s => s.section_id)).size;

                    const statCards = [
                        { label: "Today's Classes", value: todaySlots.length, sub: todaySlots.length === 0 ? 'No classes today' : `${completedToday} done · ${remainingToday} left`, color: 'var(--color-primary)', icon: <Schedule sx={{ fontSize: 22 }} /> },
                        { label: 'Weekly Load', value: `${myTimetable.length}`, sub: `${uniqueSubjects} subjects · ${sectionCount} sections`, color: 'var(--color-success)', icon: <CalendarMonthIcon sx={{ fontSize: 22 }} /> },
                    ];

                    if (curPeriod) {
                        const currentSlot = todaySlots.find(s => s.period_number === curPeriod);
                        const periodInfo = PERIOD_TIMES.find(p => p.period === curPeriod);
                        statCards.push({
                            label: 'Current Period',
                            value: currentSlot ? currentSlot.subject_name : 'Free',
                            sub: currentSlot
                                ? `${periodInfo?.label} · ${formatYearSection(currentSlot.section_year, currentSlot.section_department, currentSlot.section_name)}`
                                : `${periodInfo?.label} · ${periodInfo?.time || ''}`,
                            color: currentSlot ? '#e65100' : 'var(--color-text-muted)',
                            icon: <Timer sx={{ fontSize: 22 }} />,
                        });
                    }

                    return (
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr 1fr', md: `repeat(${statCards.length}, 1fr)` },
                            gap: { xs: 0.8, md: 2 },
                            mb: { xs: 1.5, md: 2.5 },
                            maxWidth: '100%',
                        }}>
                            {statCards.map((card, idx) => (
                                <Box key={idx} sx={{
                                    background: 'var(--color-surface)',
                                    borderRadius: { xs: '10px', md: '14px' },
                                    border: '1px solid var(--color-border)',
                                    p: { xs: 1.2, sm: 1.8 },
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: { xs: 1, sm: 1.5 },
                                    boxShadow: '0 1px 3px var(--color-shadow)',
                                    gridColumn: idx === statCards.length - 1 && statCards.length === 3 ? { xs: '1 / -1', md: 'auto' } : 'auto',
                                }}>
                                    <Box sx={{
                                        background: `${card.color}15`,
                                        borderRadius: '12px',
                                        p: 1,
                                        display: 'flex',
                                        color: card.color,
                                        flexShrink: 0,
                                    }}>
                                        {card.icon}
                                    </Box>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontSize: { xs: '0.68rem', sm: '0.72rem' }, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            {card.label}
                                        </Typography>
                                        <Typography sx={{
                                            fontWeight: 800, fontSize: { xs: '0.95rem', sm: '1.15rem' },
                                            color: 'var(--color-text-primary)', lineHeight: 1.2,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {card.value}
                                        </Typography>
                                        <Typography sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' }, color: 'var(--color-text-secondary)', lineHeight: 1.3, mt: 0.2 }}>
                                            {card.sub}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    );
                })()}

                <Grid container spacing={{ xs: 1, md: 3 }} sx={{ overflow: 'hidden', maxWidth: '100%', m: 0 }}>
                    {/* Left: Camera + Controls */}
                    <Grid size={{ xs: 12, lg: 8 }}>
                        <Box sx={{
                            background: 'var(--color-surface)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: { xs: 'var(--radius-lg)', md: '20px' },
                            border: '1px solid var(--color-primary-alpha-15)',
                            p: { xs: 1.5, sm: 2, md: 3 },
                            boxShadow: '0 1px 3px var(--color-primary-alpha-8)',
                        }}>
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1.1rem' }, color: 'var(--color-text-primary)' }}>
                                    Live Camera Feed
                                </Typography>
                                {isSessionActive && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: 'var(--color-error-alpha-15)', px: 1.5, py: 0.5, borderRadius: '20px' }}>
                                        <Box
                                            sx={{
                                                width: 8, height: 8, borderRadius: '50%', bgcolor: 'var(--color-error)',
                                                animation: 'pulse 2s infinite',
                                                '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
                                            }}
                                        />
                                        <Typography sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'var(--color-error)', letterSpacing: 1 }}>
                                            RECORDING
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Subject/Section Select */}
                            <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: { xs: '0.7rem', sm: '0.75rem' }, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', pl: 0.5 }}>
                                    Select Subject / Section
                                </Typography>
                                <FormControl fullWidth sx={{
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
                                    '& .MuiSelect-select': { fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 } },
                                }}>
                                    <Select
                                        value={selectedAssignment}
                                        displayEmpty
                                        onChange={(e) => {
                                            const assignmentId = e.target.value;
                                            setSelectedAssignment(assignmentId);
                                            const assignment = assignments.find(a => a.id === assignmentId);
                                            if (assignment) {
                                                setSelectedSection(assignment.section_id);
                                                setSelectedSubject(assignment.subject_name);
                                                sectionRef.current = assignment.section_id;
                                                subjectRef.current = assignment.subject_name;
                                                setCheckedPeriods([]);
                                            }
                                        }}
                                        disabled={isSessionActive || isStopped}
                                    >
                                        {assignments.map((assignment) => (
                                            <MenuItem key={assignment.id} value={assignment.id}>
                                                {assignment.subject_name} — {formatYearSection(assignment.year, assignment.department, assignment.section_name)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>

                            {/* Period Checkboxes */}
                            {selectedAssignment && (
                                <Box sx={{ mb: 2, p: { xs: 1.5, sm: 2 }, borderRadius: { xs: '10px', sm: '14px' }, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                                    <Typography sx={{ fontWeight: 700, mb: 1, color: 'var(--color-primary-dark)', fontSize: { xs: '0.7rem', sm: '0.8rem' }, letterSpacing: 1, textTransform: 'uppercase' }}>
                                        Select Period(s) for Today's Attendance
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.3, sm: 0.5 } }}>
                                        {[1, 2, 3, 4, 5, 6].map((period) => {
                                            const isTaken = takenPeriods.includes(period);
                                            const isChecked = checkedPeriods.includes(period);
                                            const periodTime = PERIOD_TIMES[period - 1]?.time || '';
                                            return (
                                                <Tooltip key={period} title={isTaken ? 'Already taken by another faculty today' : periodTime} arrow>
                                                    <Box>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    disabled={isTaken || isSessionActive || isSubmitted || isStopped}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setCheckedPeriods(prev => [...prev, period].sort((a, b) => a - b));
                                                                        } else {
                                                                            setCheckedPeriods(prev => prev.filter(p => p !== period));
                                                                        }
                                                                    }}
                                                                    size="small"
                                                                    sx={{ p: { xs: 0.5, sm: 0.5 }, ...(isTaken ? { color: 'error.main' } : {}) }}
                                                                />
                                                            }
                                                            label={
                                                                <Chip
                                                                    label={`P${period}`}
                                                                    size="small"
                                                                    color={isTaken ? 'error' : isChecked ? 'primary' : 'default'}
                                                                    variant={isChecked ? 'filled' : 'outlined'}
                                                                    sx={{
                                                                        fontWeight: 600,
                                                                        fontSize: { xs: '0.7rem', sm: '0.78rem' },
                                                                        height: { xs: 24, sm: 28 },
                                                                        cursor: isTaken ? 'not-allowed' : 'pointer',
                                                                        opacity: isTaken ? 0.6 : 1,
                                                                        textDecoration: isTaken ? 'line-through' : 'none',
                                                                    }}
                                                                />
                                                            }
                                                            sx={{ mr: { xs: 0, sm: 0.5 }, ml: 0 }}
                                                        />
                                                    </Box>
                                                </Tooltip>
                                            );
                                        })}
                                    </Box>
                                    {checkedPeriods.length > 0 && (
                                        <Typography sx={{ mt: 1, display: 'block', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.75rem' }}>
                                            Selected: Period {checkedPeriods.join(', ')} ({checkedPeriods.length} period{checkedPeriods.length > 1 ? 's' : ''})
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            {/* Camera / Image Preview */}
                            <Box
                                sx={{
                                    position: 'relative',
                                    backgroundColor: 'black',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    aspectRatio: '16/9',
                                }}
                            >
                                {uploadedImageSrc ? (
                                    <img
                                        ref={uploadedImgRef}
                                        src={uploadedImageSrc}
                                        alt="Uploaded Preview"
                                        style={{
                                            width: '100%', height: '100%', objectFit: 'contain',
                                            position: 'absolute', top: 0, left: 0,
                                        }}
                                        onLoad={() => {
                                            if (detectedFaces.length > 0 && uploadedImgRef.current && canvasRef.current) {
                                                drawBoundingBoxes(detectedFaces, true);
                                            }
                                        }}
                                    />
                                ) : isSessionActive ? (
                                    <Webcam
                                        ref={webcamRef}
                                        audio={false}
                                        screenshotFormat="image/jpeg"
                                        screenshotQuality={0.92}
                                        videoConstraints={videoConstraints}
                                        onUserMedia={() => { webcamReady.current = true; }}
                                        onUserMediaError={(err) => { console.error('Webcam error:', err); }}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <Box sx={{
                                        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0,
                                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
                                    }}>
                                        <Box sx={{
                                            width: { xs: 60, sm: 80 }, height: { xs: 60, sm: 80 },
                                            borderRadius: '50%',
                                            border: '2px solid rgba(148,163,184,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            mb: 2,
                                            animation: 'cameraBreath 3s ease-in-out infinite',
                                            '@keyframes cameraBreath': {
                                                '0%, 100%': { borderColor: 'rgba(148,163,184,0.2)', transform: 'scale(1)' },
                                                '50%': { borderColor: 'rgba(70,123,240,0.5)', transform: 'scale(1.05)' },
                                            },
                                        }}>
                                            <People sx={{ fontSize: { xs: 28, sm: 38 }, color: 'rgba(148,163,184,0.6)' }} />
                                        </Box>
                                        <Typography sx={{ color: 'rgba(226,232,240,0.8)', fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 600 }}>
                                            Camera Standby
                                        </Typography>
                                        <Typography sx={{ color: 'rgba(148,163,184,0.6)', fontSize: { xs: '0.65rem', sm: '0.75rem' }, mt: 0.5 }}>
                                            Select subject & periods, then start session
                                        </Typography>
                                    </Box>
                                )}
                                <canvas
                                    ref={canvasRef}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                />
                            </Box>

                            {/* Action Buttons */}
                            <Box sx={{ mt: { xs: 2, md: 3 }, display: 'flex', gap: { xs: 1, md: 2 }, justifyContent: 'center', flexWrap: 'wrap' }}>
                                {!isSessionActive && !isStopped && (
                                    <>
                                        <Button
                                            variant="contained"
                                            size={isMobile ? 'medium' : 'large'}
                                            startIcon={<PlayArrow />}
                                            onClick={startSession}
                                            disabled={!selectedAssignment || checkedPeriods.length === 0}
                                            sx={{
                                                px: { xs: 2, sm: 4 }, py: { xs: 1, sm: 1.5 },
                                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                                flex: { xs: 1, sm: 'none' },
                                                background: 'linear-gradient(135deg, var(--color-success) 0%, var(--color-secondary-dark) 100%)',
                                                '&:hover': { background: 'linear-gradient(135deg, var(--color-secondary-dark) 0%, var(--color-secondary-dark) 100%)' },
                                            }}
                                        >
                                            Start Session
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size={isMobile ? 'medium' : 'large'}
                                            component="label"
                                            startIcon={<CloudUpload />}
                                            disabled={!selectedAssignment || checkedPeriods.length === 0}
                                            sx={{ px: { xs: 2, sm: 4 }, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, flex: { xs: 1, sm: 'none' }, borderColor: 'var(--color-primary)', color: 'var(--color-primary)', '&:hover': { borderColor: 'var(--color-primary-dark)', background: 'var(--color-primary-alpha-4)' } }}
                                        >
                                            Upload Image
                                            <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                                        </Button>
                                    </>
                                )}
                                {isSessionActive && (
                                    <>
                                        <Button
                                            variant="contained"
                                            size={isMobile ? 'medium' : 'large'}
                                            startIcon={<Stop />}
                                            onClick={stopSession}
                                            color="error"
                                            sx={{ px: { xs: 2, sm: 4 }, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, flex: { xs: 1, sm: 'none' } }}
                                        >
                                            Stop Session
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size={isMobile ? 'medium' : 'large'}
                                            component="label"
                                            startIcon={<CloudUpload />}
                                            sx={{ px: { xs: 2, sm: 4 }, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, flex: { xs: 1, sm: 'none' }, borderColor: 'var(--color-primary)', color: 'var(--color-primary)', '&:hover': { borderColor: 'var(--color-primary-dark)', background: 'var(--color-primary-alpha-4)' } }}
                                        >
                                            Upload Image
                                            <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                                        </Button>
                                    </>
                                )}
                            </Box>

                            {/* Submit / Cancel Buttons - shown after session stopped, before submission */}
                            {isStopped && !isSubmitted && (
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: { xs: 1, md: 2 }, flexWrap: 'wrap' }}>
                                    <Button
                                        variant="contained"
                                        size={isMobile ? 'medium' : 'large'}
                                        startIcon={<CheckCircle />}
                                        onClick={submitAttendance}
                                        disabled={isSubmitting}
                                        sx={{
                                            px: { xs: 3, sm: 5 }, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 700,
                                            flex: { xs: 1, sm: 'none' },
                                            background: 'var(--gradient-primary-reverse)',
                                            '&:hover': { background: 'var(--gradient-primary-hover)' },
                                        }}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size={isMobile ? 'medium' : 'large'}
                                        color="error"
                                        onClick={() => {
                                            setSessionId(null);
                                            sessionIdRef.current = null;
                                            setLogs([]);
                                            setDetectedFaces([]);
                                            setSessionSummary(null);
                                            setManualMarkedRolls(new Set());
                                            setSessionTime(0);
                                            setCheckedPeriods([]);
                                        }}
                                        disabled={isSubmitting}
                                        sx={{
                                            px: { xs: 3, sm: 5 }, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 700,
                                            flex: { xs: 1, sm: 'none' },
                                            borderColor: 'var(--color-error)', color: 'var(--color-error)',
                                            '&:hover': { borderColor: 'var(--color-error)', background: 'rgba(239,68,68,0.08)' },
                                        }}
                                    >
                                        Cancel Session
                                    </Button>
                                    {sessionSummary && sectionStudents.length > 0 && (
                                        <Button
                                            variant="outlined"
                                            size={isMobile ? 'medium' : 'large'}
                                            startIcon={<Download />}
                                            onClick={downloadAttendanceLog}
                                            sx={{
                                                px: { xs: 3, sm: 5 }, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 700,
                                                flex: { xs: 1, sm: 'none' },
                                                borderColor: 'var(--color-primary)', color: 'var(--color-primary)',
                                                '&:hover': { borderColor: 'var(--color-primary-dark)', background: 'var(--color-primary-alpha-4)' },
                                            }}
                                        >
                                            Download
                                        </Button>
                                    )}
                                </Box>
                            )}

                            {/* Submitted success */}
                            {isSubmitted && (
                                <Box sx={{ mt: 2, textAlign: 'center' }}>
                                    <Chip
                                        icon={<CheckCircle />}
                                        label="Attendance Submitted Successfully"
                                        color="success"
                                        sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.9rem' }, py: { xs: 1.5, sm: 2.5 }, px: 1 }}
                                    />
                                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: { xs: 1, md: 2 }, flexWrap: 'wrap' }}>
                                        <Button
                                            variant="contained"
                                            size={isMobile ? 'medium' : 'large'}
                                            startIcon={<Download />}
                                            onClick={downloadAttendanceLog}
                                            sx={{
                                                px: { xs: 3, sm: 5 }, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 700,
                                                background: 'var(--gradient-primary-reverse)',
                                                color: 'var(--color-text-white)',
                                                '&:hover': { background: 'var(--gradient-primary-hover)' },
                                            }}
                                        >
                                            Download
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size={isMobile ? 'medium' : 'large'}
                                            startIcon={<PlayArrow />}
                                            onClick={() => {
                                                setSessionId(null);
                                                sessionIdRef.current = null;
                                                setIsSessionActive(false);
                                                setIsSubmitted(false);
                                                setSessionSummary(null);
                                                setLogs([]);
                                                setDetectedFaces([]);
                                                setCheckedPeriods([]);
                                                setManualMarkedRolls(new Set());
                                                setUploadedImageSrc(null);
                                                setSessionTime(0);
                                            }}
                                            sx={{
                                                px: { xs: 3, sm: 5 }, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 700,
                                                borderColor: 'var(--color-success)', color: 'var(--color-success)',
                                                '&:hover': { borderColor: 'var(--color-secondary-dark)', background: 'var(--color-secondary-alpha-4)' },
                                            }}
                                        >
                                            New Session
                                        </Button>
                                    </Box>
                                </Box>
                            )}

                            {/* Student List with Mark/Unmark Actions */}
                            {selectedAssignment && sectionStudents.length > 0 && (
                                <Box sx={{ mt: { xs: 2, md: 3 }, borderRadius: { xs: '10px', sm: '14px' }, overflow: 'hidden', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                    {/* Fixed Students title header */}
                                    <Box sx={{ textAlign: 'center', fontWeight: 800, fontSize: { xs: '0.75rem', sm: '0.9rem' }, background: 'var(--gradient-primary-reverse)', color: 'var(--color-text-white)', py: { xs: 1, sm: 1.5 }, letterSpacing: 1, textTransform: 'uppercase' }}>
                                        Students
                                    </Box>
                                    {/* Students table */}
                                    {(() => {
                                        const hasAction = sessionId && !isSubmitted;
                                        const columns = [
                                            { label: 'S.No', mobileLabel: 'S.No', width: isMobile ? '8%' : '8%', align: 'left' },
                                            { label: 'Roll Number', mobileLabel: 'Roll No.', width: isMobile ? (hasAction ? '22%' : '30%') : '25%', align: 'left' },
                                            { label: 'Name', mobileLabel: 'Name', width: isMobile ? (hasAction ? '24%' : '35%') : (hasAction ? '27%' : '37%'), align: 'left' },
                                            { label: 'Status', mobileLabel: 'Status', width: isMobile ? (hasAction ? '24%' : '27%') : (hasAction ? '20%' : '30%'), align: 'center' },
                                            ...(hasAction ? [{ label: 'Action', mobileLabel: 'Action', width: isMobile ? '22%' : '20%', align: 'center' }] : []),
                                        ];
                                        return (
                                    <>
                                    {/* Fixed header */}
                                    <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                        <colgroup>
                                            {columns.map((col) => (
                                                <col key={col.label} style={{ width: col.width }} />
                                            ))}
                                        </colgroup>
                                        <TableHead>
                                            <TableRow>
                                                {columns.map((h) => (
                                                    <TableCell key={h.label} align={h.align} sx={{ fontWeight: '800 !important', color: 'var(--color-primary-dark) !important', background: 'var(--color-table-header-bg) !important', fontSize: { xs: '0.55rem', sm: '0.8rem' }, px: { xs: 0.3, sm: 1 }, py: { xs: 0.5, sm: 0.8 }, letterSpacing: { xs: 0, sm: 0.5 }, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{isMobile ? h.mobileLabel : h.label}</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                    </Table>
                                    {/* Scrollable data */}
                                    <TableContainer sx={{ maxHeight: { xs: 200, sm: 260 }, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
                                        <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                        <colgroup>
                                            {columns.map((col) => (
                                                <col key={col.label} style={{ width: col.width }} />
                                            ))}
                                        </colgroup>
                                            <TableBody>
                                                {sectionStudents.map((student, idx) => {
                                                    const isPresent = logs.some(log => log.roll_number === student.roll_number);
                                                    const isManual = manualMarkedRolls.has(student.roll_number);
                                                    return (
                                                        <TableRow key={student.roll_number} sx={{ '&:hover': { background: 'var(--color-primary-alpha-4)' }, transition: 'all var(--transition-base)' }}>
                                                            <TableCell sx={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: { xs: '0.55rem', sm: '0.8rem' }, px: { xs: 0.3, sm: 1 }, py: { xs: 0.5, sm: 0.8 } }}>{idx + 1}</TableCell>
                                                            <TableCell sx={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: { xs: '0.5rem', sm: '0.8rem' }, px: { xs: 0.3, sm: 1 }, py: { xs: 0.5, sm: 0.8 }, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.roll_number}</TableCell>
                                                            <TableCell sx={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', fontSize: { xs: '0.55rem', sm: '0.8rem' }, px: { xs: 0.3, sm: 1 }, py: { xs: 0.5, sm: 0.8 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</TableCell>
                                                            <TableCell align="center" sx={{ borderBottom: '1px solid var(--color-border)', px: { xs: 0.3, sm: 1 }, py: { xs: 0.3, sm: 0.8 } }}>
                                                                {isPresent ? (
                                                                    <Chip
                                                                        label={'Present'}
                                                                        size="small"
                                                                        sx={{
                                                                            fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                                                            height: { xs: 20, sm: 24 },
                                                                            fontWeight: 700,
                                                                            background: isManual
                                                                                ? 'var(--gradient-primary-reverse)'
                                                                                : 'linear-gradient(135deg, var(--color-success), var(--color-secondary-dark))',
                                                                            color: 'var(--color-text-white)',
                                                                            boxShadow: isManual
                                                                                ? '0 2px 8px var(--color-primary-alpha-30)'
                                                                                : '0 2px 8px var(--color-secondary-alpha-30)',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Chip
                                                                        label={sessionId ? 'Absent' : '\u2014'}
                                                                        size="small"
                                                                        sx={{
                                                                            fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                                                            height: { xs: 20, sm: 24 },
                                                                            fontWeight: 700,
                                                                            background: sessionId
                                                                                ? 'linear-gradient(135deg, var(--color-error), var(--color-error-dark))'
                                                                                : 'var(--color-primary-alpha-10)',
                                                                            color: sessionId ? 'var(--color-text-white)' : 'var(--color-text-muted)',
                                                                            boxShadow: sessionId ? '0 2px 8px var(--color-error-alpha-30)' : 'none',
                                                                        }}
                                                                    />
                                                                )}
                                                            </TableCell>
                                                            {sessionId && !isSubmitted && (
                                                                <TableCell align="center" sx={{ borderBottom: '1px solid var(--color-border)', px: { xs: 0.3, sm: 1 }, py: { xs: 0.3, sm: 0.8 }, textAlign: 'center' }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                                    {!isPresent ? (
                                                                        <Tooltip title="Mark present (HOD Permission)" arrow>
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => manualMarkPresent(student.roll_number)}
                                                                                sx={{
                                                                                    background: 'var(--color-primary-alpha-10)',
                                                                                    color: 'var(--color-primary)',
                                                                                    '&:hover': { background: 'var(--color-primary-alpha-20)' },
                                                                                }}
                                                                            >
                                                                                <PersonAdd fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Tooltip title="Undo \u2014 remove from attendance" arrow>
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => manualUnmarkPresent(student.roll_number)}
                                                                                sx={{
                                                                                    background: 'var(--color-error-alpha-15)',
                                                                                    color: 'var(--color-error)',
                                                                                    '&:hover': { background: 'var(--color-error-alpha-25)' },
                                                                                }}
                                                                            >
                                                                                <PersonRemove fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )}
                                                                    </Box>
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    </>
                                        );
                                    })()}
                                </Box>
                            )}
                        </Box>
                    </Grid>

                    {/* Right Side Panel */}
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <Box sx={{
                            background: 'var(--color-surface)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: { xs: 'var(--radius-lg)', md: '20px' },
                            border: '1px solid var(--color-primary-alpha-15)',
                            p: { xs: 1.5, sm: 2, md: 3 },
                            height: '100%',
                            boxShadow: '0 1px 3px var(--color-primary-alpha-8)',
                        }}>
                            {isSessionActive ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: { xs: 120, md: 200 } }}>
                                    <Box
                                        sx={{
                                            width: 14, height: 14, borderRadius: '50%', bgcolor: 'var(--color-error)',
                                            animation: 'pulse 2s infinite',
                                            '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
                                            mb: 2,
                                            boxShadow: '0 0 20px var(--color-error-alpha-50)',
                                        }}
                                    />
                                    <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.1rem' }, color: 'var(--color-text-primary)', mb: 1 }}>
                                        Session in Progress
                                    </Typography>
                                    <Typography sx={{ color: 'var(--color-text-secondary)', fontSize: { xs: '0.75rem', sm: '0.85rem' }, textAlign: 'center' }}>
                                        {logs.length > 0
                                            ? `Detected: ${faceDetectedCount} | Manual: ${manualCount}`
                                            : 'Waiting for faces...'}
                                    </Typography>
                                    <Typography sx={{ color: 'var(--color-text-muted)', fontSize: { xs: '0.65rem', sm: '0.75rem' }, mt: 1 }}>
                                        Total Students: {sectionStudents.length}
                                    </Typography>
                                </Box>
                            ) : sessionSummary ? (
                                <>
                                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', sm: '1.1rem' }, color: 'var(--color-text-primary)', mb: 0.5 }}>
                                        {isSubmitted ? 'Submission Summary' : 'Session Summary'}
                                    </Typography>
                                    <Typography sx={{ color: 'var(--color-text-secondary)', fontSize: { xs: '0.75rem', sm: '0.85rem' }, mb: 2 }}>
                                        {sessionSummary.message}
                                    </Typography>

                                    {/* Detected / Manual breakdown */}
                                    {!isSubmitted && (
                                        <Box sx={{ mb: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            <Chip label={`Face: ${faceDetectedCount}`} size="small" color="primary" variant="outlined" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }} />
                                            <Chip label={`Manual: ${manualCount}`} size="small" color="info" variant="outlined" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }} />
                                        </Box>
                                    )}

                                    {/* Present / Absent toggle cards */}
                                    <Grid container spacing={1.5} sx={{ mb: 2, overflow: 'hidden' }}>
                                        <Grid size={6}>
                                            <Box
                                                onClick={() => setSummaryView('present')}
                                                sx={{
                                                    p: { xs: 1.5, sm: 2 }, textAlign: 'center', cursor: 'pointer', transition: 'all var(--transition-slow)',
                                                    borderRadius: { xs: '10px', sm: '14px' },
                                                    background: summaryView === 'present' ? 'linear-gradient(135deg, var(--color-success), var(--color-secondary-dark))' : 'var(--color-secondary-alpha-10)',
                                                    border: summaryView === 'present' ? 'none' : '1px solid var(--color-secondary-alpha-30)',
                                                    boxShadow: summaryView === 'present' ? '0 4px 16px var(--color-secondary-alpha-40)' : 'none',
                                                    transform: summaryView === 'present' ? 'scale(1.03)' : 'scale(1)',
                                                    '&:hover': { transform: 'scale(1.03)' },
                                                }}
                                            >
                                                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.3rem', sm: '1.8rem' }, color: summaryView === 'present' ? 'var(--color-text-white)' : 'var(--color-success)' }}>
                                                    {sessionSummary.present_students?.length || 0}
                                                </Typography>
                                                <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, fontWeight: 600, color: summaryView === 'present' ? 'var(--color-bg-overlay)' : 'var(--color-secondary-alpha-70)' }}>Present</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={6}>
                                            <Box
                                                onClick={() => setSummaryView('absent')}
                                                sx={{
                                                    p: { xs: 1.5, sm: 2 }, textAlign: 'center', cursor: 'pointer', transition: 'all var(--transition-slow)',
                                                    borderRadius: { xs: '10px', sm: '14px' },
                                                    background: summaryView === 'absent' ? 'linear-gradient(135deg, var(--color-error), var(--color-error-dark))' : 'var(--color-error-alpha-10)',
                                                    border: summaryView === 'absent' ? 'none' : '1px solid var(--color-error-alpha-30)',
                                                    boxShadow: summaryView === 'absent' ? '0 4px 16px var(--color-error-alpha-40)' : 'none',
                                                    transform: summaryView === 'absent' ? 'scale(1.03)' : 'scale(1)',
                                                    '&:hover': { transform: 'scale(1.03)' },
                                                }}
                                            >
                                                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.3rem', sm: '1.8rem' }, color: summaryView === 'absent' ? 'var(--color-text-white)' : 'var(--color-error)' }}>
                                                    {sessionSummary.absent_students?.length || 0}
                                                </Typography>
                                                <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, fontWeight: 600, color: summaryView === 'absent' ? 'var(--color-bg-overlay)' : 'var(--color-error-alpha-70)' }}>Absent</Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>

                                    {/* Present list */}
                                    {summaryView === 'present' && (
                                        sessionSummary.present_students?.length > 0 ? (
                                            <TableContainer sx={{ maxHeight: { xs: 250, sm: 350 }, borderRadius: 'var(--radius-lg)', overflow: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--color-secondary-alpha-20)' }}>
                                                <Table size="small" stickyHeader>
                                                    <TableHead>
                                                        <TableRow sx={{ '& th:first-of-type': { borderTopLeftRadius: 'var(--radius-lg)' }, '& th:last-of-type': { borderTopRightRadius: 'var(--radius-lg)' } }}>
                                                            {['#', isMobile ? 'Roll No.' : 'Roll Number', 'Name'].map((h) => (
                                                                <TableCell key={h} sx={{ fontWeight: '700 !important', background: 'linear-gradient(135deg, var(--color-success), var(--color-secondary-dark)) !important', color: 'var(--color-text-white) !important', fontSize: { xs: '0.7rem', sm: '0.8rem' }, letterSpacing: 0.5 }}>{h}</TableCell>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {sessionSummary.present_students.map((student, idx) => (
                                                            <TableRow key={student.roll_number} sx={{ '&:hover': { background: 'var(--color-secondary-alpha-8)' } }}>
                                                                <TableCell sx={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', fontSize: { xs: '0.55rem', sm: '0.8rem' }, px: { xs: 0.3, sm: 1 }, py: { xs: 0.4, sm: 0.6 } }}>{idx + 1}</TableCell>
                                                                <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600, borderBottom: '1px solid var(--color-border)', fontSize: { xs: '0.55rem', sm: '0.8rem' }, px: { xs: 0.3, sm: 1 }, py: { xs: 0.4, sm: 0.6 }, whiteSpace: { xs: 'normal', sm: 'nowrap' }, wordBreak: { xs: 'break-all', sm: 'normal' } }}>{student.roll_number}</TableCell>
                                                                <TableCell sx={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', fontSize: { xs: '0.55rem', sm: '0.8rem' }, px: { xs: 0.3, sm: 1 }, py: { xs: 0.4, sm: 0.6 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        ) : (
                                            <Typography sx={{ textAlign: 'center', py: 2, color: 'var(--color-text-muted)' }}>
                                                No students were marked present.
                                            </Typography>
                                        )
                                    )}

                                    {/* Absent list */}
                                    {summaryView === 'absent' && (
                                        sessionSummary.absent_students?.length > 0 ? (
                                            <TableContainer sx={{ maxHeight: { xs: 250, sm: 350 }, borderRadius: 'var(--radius-lg)', overflow: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--color-error-alpha-20)' }}>
                                                <Table size="small" stickyHeader>
                                                    <TableHead>
                                                        <TableRow sx={{ '& th:first-of-type': { borderTopLeftRadius: 'var(--radius-lg)' }, '& th:last-of-type': { borderTopRightRadius: 'var(--radius-lg)' } }}>
                                                            {['#', isMobile ? 'Roll No.' : 'Roll Number', 'Name'].map((h) => (
                                                                <TableCell key={h} sx={{ fontWeight: '700 !important', background: 'linear-gradient(135deg, var(--color-error), var(--color-error-dark)) !important', color: 'var(--color-text-white) !important', fontSize: { xs: '0.7rem', sm: '0.8rem' }, letterSpacing: 0.5 }}>{h}</TableCell>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {sessionSummary.absent_students.map((student, idx) => (
                                                            <TableRow key={student.roll_number} sx={{ '&:hover': { background: 'var(--color-error-alpha-8)' } }}>
                                                                <TableCell sx={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', fontSize: { xs: '0.55rem', sm: '0.8rem' }, px: { xs: 0.3, sm: 1 }, py: { xs: 0.4, sm: 0.6 } }}>{idx + 1}</TableCell>
                                                                <TableCell sx={{ color: 'var(--color-text-primary)', fontWeight: 600, borderBottom: '1px solid var(--color-border)', fontSize: { xs: '0.55rem', sm: '0.8rem' }, px: { xs: 0.3, sm: 1 }, py: { xs: 0.4, sm: 0.6 }, whiteSpace: { xs: 'normal', sm: 'nowrap' }, wordBreak: { xs: 'break-all', sm: 'normal' } }}>{student.roll_number}</TableCell>
                                                                <TableCell sx={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', fontSize: { xs: '0.55rem', sm: '0.8rem' }, px: { xs: 0.3, sm: 1 }, py: { xs: 0.4, sm: 0.6 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        ) : (
                                            <Typography sx={{ textAlign: 'center', py: 2, color: 'var(--color-text-muted)' }}>
                                                All students are present!
                                            </Typography>
                                        )
                                    )}

                                    {/* Download CSV */}
                                    <Box sx={{ mt: 2 }}>
                                        <Button
                                            size="small"
                                            startIcon={<Download />}
                                            fullWidth
                                            onClick={() => downloadSummaryCSV(summaryView)}
                                            sx={{
                                                borderRadius: 'var(--radius-lg)',
                                                py: 1,
                                                fontWeight: 700,
                                                background: 'var(--gradient-primary-reverse)',
                                                color: 'var(--color-text-white)',
                                                '&:hover': { background: 'var(--gradient-primary-hover)' },
                                            }}
                                        >
                                            Download
                                        </Button>
                                    </Box>
                                </>
                            ) : (
                                <Box sx={{ minHeight: { xs: 120, md: 200 } }}>
                                    {/* Today's Schedule */}
                                    {(() => {
                                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                        const today = days[new Date().getDay()];
                                        const todaySlots = myTimetable.filter(s => (s.day_name || s.day) === today).sort((a, b) => a.period_number - b.period_number);
                                        if (todaySlots.length > 0) {
                                            return (
                                                <Box sx={{ mb: 2.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                                        <Schedule sx={{ fontSize: 18, color: 'var(--color-primary)' }} />
                                                        <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.85rem', sm: '0.95rem' }, color: 'var(--color-text-primary)' }}>
                                                            Today's Schedule
                                                        </Typography>
                                                    </Box>
                                                    {(() => {
                                                        const curPeriod = getCurrentPeriodNumber();
                                                        return todaySlots.map((slot, idx) => {
                                                            const isCurrent = slot.period_number === curPeriod;
                                                            const periodInfo = PERIOD_TIMES.find(p => p.period === slot.period_number);
                                                            const classLabel = slot.section_department && slot.section_year && slot.section_name
                                                                ? formatYearSection(slot.section_year, slot.section_department, slot.section_name)
                                                                : slot.section_name || '';
                                                            return (
                                                                <Box key={idx} sx={{
                                                                    display: 'flex', alignItems: 'center', gap: 1.5,
                                                                    py: 0.8, px: 1.2, mb: 0.5,
                                                                    borderRadius: 'var(--radius-md)',
                                                                    background: isCurrent ? 'var(--color-primary-alpha-8)' : 'var(--color-bg)',
                                                                    border: isCurrent ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                                    boxShadow: isCurrent ? '0 0 0 2px var(--color-primary-alpha-15)' : 'none',
                                                                    transition: 'all 0.2s',
                                                                }}>
                                                                    <Chip label={periodInfo?.label || `P${slot.period_number}`} size="small" sx={{
                                                                        fontWeight: 700, fontSize: '0.65rem', height: 22, minWidth: 32,
                                                                        background: isCurrent ? 'var(--color-primary)' : 'var(--gradient-primary-reverse)',
                                                                        color: 'var(--color-text-white)',
                                                                        animation: isCurrent ? 'todayPulse 2s infinite' : 'none',
                                                                        '@keyframes todayPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.7 } },
                                                                    }} />
                                                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                                                        <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            {slot.subject_name}
                                                                        </Typography>
                                                                        <Typography sx={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                                                                            {classLabel}{periodInfo ? ` · ${periodInfo.time}` : ''}
                                                                        </Typography>
                                                                    </Box>
                                                                    {isCurrent && (
                                                                        <Chip label="NOW" size="small" sx={{
                                                                            height: 20, fontSize: '0.6rem', fontWeight: 800,
                                                                            background: 'var(--color-primary)', color: '#fff',
                                                                            '& .MuiChip-label': { px: 0.8 },
                                                                        }} />
                                                                    )}
                                                                </Box>
                                                            );
                                                        });
                                                    })()}
                                                </Box>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* Recent Sessions */}
                                    {recentSessions.length > 0 ? (
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                                <History sx={{ fontSize: 18, color: 'var(--color-primary)' }} />
                                                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.85rem', sm: '0.95rem' }, color: 'var(--color-text-primary)' }}>
                                                    Recent Sessions
                                                </Typography>
                                            </Box>
                                            {recentSessions.map((session, idx) => {
                                                const pct = session.total_students > 0
                                                    ? Math.round((session.present_count / session.total_students) * 100)
                                                    : 0;
                                                // Try to find section info from assignments
                                                const matchedAssignment = assignments.find(a =>
                                                    a.subject_name === session.subject_name && a.section_id === session.section_id
                                                );
                                                const sectionLabel = session.section_department && session.section_year && session.section_name
                                                    ? formatYearSection(session.section_year, session.section_department, session.section_name)
                                                    : matchedAssignment
                                                        ? formatYearSection(matchedAssignment.year, matchedAssignment.department, matchedAssignment.section_name)
                                                        : '';
                                                // Map period number to label and time
                                                const periods = Array.isArray(session.period_number) ? session.period_number : [session.period_number];
                                                const periodLabels = periods.map(p => {
                                                    const info = PERIOD_TIMES.find(pt => pt.period === p);
                                                    return info ? `${info.label} (${info.time})` : `P${p}`;
                                                }).join(', ');
                                                return (
                                                    <Box key={idx} sx={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        py: 1, px: 1.2, mb: 0.5,
                                                        borderRadius: 'var(--radius-md)',
                                                        background: 'var(--color-bg)',
                                                        border: '1px solid var(--color-border)',
                                                    }}>
                                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                                            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {session.subject_name} — {periodLabels}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                                                                {sectionLabel ? `${sectionLabel} · ` : ''}{(() => {
                                                                    try {
                                                                        const dt = new Date(`${session.date}T${session.time}Z`);
                                                                        const localDate = dt.toLocaleDateString('en-CA');
                                                                        const localTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                                                                        return `${localDate} at ${localTime}`;
                                                                    } catch { return `${session.date} at ${session.time}`; }
                                                                })()}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1, flexShrink: 0 }}>
                                                            <Chip
                                                                label={`${session.present_count}/${session.total_students}`}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 700, fontSize: '0.65rem', height: 22,
                                                                    background: pct >= 75
                                                                        ? 'var(--color-secondary-alpha-15)' : 'var(--color-error-alpha-15)',
                                                                    color: pct >= 75
                                                                        ? 'var(--color-success)' : 'var(--color-error)',
                                                                }}
                                                            />
                                                            <Typography sx={{
                                                                fontSize: '0.68rem', fontWeight: 700,
                                                                color: pct >= 75 ? 'var(--color-success)' : 'var(--color-error)',
                                                                minWidth: 30, textAlign: 'right',
                                                            }}>
                                                                {pct}%
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 3 }}>
                                            <People sx={{ fontSize: { xs: 36, sm: 48 }, color: 'var(--color-text-muted)', mb: 2 }} />
                                            <Typography sx={{ fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                                                No sessions yet
                                            </Typography>
                                            <Typography sx={{ color: 'var(--color-text-muted)', fontSize: { xs: '0.7rem', sm: '0.8rem' }, mt: 0.5, textAlign: 'center' }}>
                                                Start a session to begin tracking attendance
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Grid>
                </Grid>

                {/* Workload Summary */}
                {myTimetable.length > 0 && (() => {
                    const sectionSet = new Set(myTimetable.map(s => s.section_id));
                    // Subject breakdown: count periods per subject
                    const subjectCounts = {};
                    myTimetable.forEach(s => {
                        subjectCounts[s.subject_name] = (subjectCounts[s.subject_name] || 0) + 1;
                    });
                    const sortedSubjects = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]);

                    return (
                        <Box sx={{
                            mt: { xs: 2, md: 3 },
                            background: 'var(--color-bg-paper)',
                            borderRadius: { xs: 'var(--radius-lg)', md: 'var(--radius-xl)' },
                            border: '1px solid var(--color-primary-alpha-12)',
                            boxShadow: '0 1px 3px var(--color-shadow)',
                            p: { xs: 1, sm: 2 },
                            overflow: 'hidden',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, mb: 1.5 }}>
                                <Box sx={{ background: 'var(--color-primary-alpha-12)', borderRadius: 'var(--radius-lg)', p: { xs: 0.8, sm: 1.2 }, display: 'flex' }}>
                                    <CalendarMonthIcon sx={{ color: 'var(--color-primary)', fontSize: { xs: 22, sm: 28 } }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.3rem' }, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                                        {myTimetable.length} periods/week
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                        across {sectionSet.size} section{sectionSet.size !== 1 ? 's' : ''} · {sortedSubjects.length} subject{sortedSubjects.length !== 1 ? 's' : ''}
                                    </Typography>
                                </Box>
                            </Box>
                            {/* Subject breakdown */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {sortedSubjects.map(([name, count]) => (
                                    <Chip
                                        key={name}
                                        label={`${name}: ${count}p`}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            fontSize: { xs: '0.68rem', sm: '0.75rem' },
                                            fontWeight: 600,
                                            height: { xs: 22, sm: 24 },
                                            borderColor: 'var(--color-border)',
                                            color: 'var(--color-text-secondary)',
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    );
                })()}

                {/* My Timetable */}
                {myTimetable.length > 0 && (
                    <Box sx={{
                        mt: { xs: 2, md: 3 },
                        background: 'var(--color-bg-paper)',
                        borderRadius: { xs: 'var(--radius-lg)', md: 'var(--radius-xl)' },
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
                                transition: 'all var(--transition-base)',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarMonthIcon sx={{ color: 'var(--color-primary)', fontSize: { xs: 20, sm: 24 } }} />
                                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' }, color: 'var(--color-text-primary)' }}>
                                    My Weekly Timetable
                                </Typography>
                            </Box>
                            {showTimetable ? <ExpandLess sx={{ color: 'var(--color-text-muted)' }} /> : <ExpandMore sx={{ color: 'var(--color-text-muted)' }} />}
                        </Box>
                        {showTimetable && (
                            <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, pb: { xs: 1.5, sm: 2 } }}>
                                <TimetableGrid
                                    slots={myTimetable}
                                    highlightFacultyId={myTimetable[0]?.faculty_id}
                                    highlightToday
                                    sectionName={facultyName || ''}
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
                    py: 3,
                    textAlign: 'center',
                    borderTop: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                }}
            >
                <Typography sx={{
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    fontWeight: 600,
                    color: 'var(--color-primary-dark)',
                    letterSpacing: 0.5,
                }}>
                    SmartAttend — Face Recognition Attendance System
                </Typography>
                <Typography sx={{
                    fontSize: { xs: '0.6rem', sm: '0.7rem' },
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

export default FacultyDashboard;
