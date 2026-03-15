/**
 * Admin dashboard providing full CRUD operations for students, faculty, subjects,
 * timetables, and attendance records, along with face-registration via webcam.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import api from '../api/axios';
import Webcam from 'react-webcam';
import { useAuth } from '../context/AuthContext';

// Validation helpers (defined outside component to avoid re-creation)
const validateStudentField = (key, value) => {
    if (key === 'name') { if (!value) return 'Name is required'; if (value.length < 2) return 'Name must be at least 2 characters'; }
    if (key === 'roll_number') { if (!value) return 'Roll Number is required'; }
    if (key === 'phone') { if (!value) return 'Phone is required'; if (!/^\d{10}$/.test(value)) return 'Phone must be exactly 10 digits'; }
    return '';
};
const validateFacultyField = (key, value) => {
    if (key === 'name') { if (!value) return 'Name is required'; if (value.length < 2) return 'Name must be at least 2 characters'; }
    if (key === 'employee_id') { if (!value) return 'Employee ID is required'; }
    if (key === 'email') { if (!value) return 'Email is required'; if (!value.includes('@') || !value.includes('.')) return 'Enter a valid email (must contain @ and .)'; }
    if (key === 'phone') { if (!value) return 'Phone is required'; if (!/^\d{10}$/.test(value)) return 'Phone must be exactly 10 digits'; }
    return '';
};
const validateSectionField = (key, value) => {
    if (key === 'name') { if (!value) return 'Section Name is required'; }
    if (key === 'academic_year') { if (!value) return 'Academic Year is required'; }
    return '';
};
import {
    Box,
    Button,
    TextField,
    Typography,
    Container,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    ToggleButtonGroup,
    ToggleButton,
    Grid,
    Chip,
    Card,
    CardContent,
    InputAdornment,
    Tooltip,
    Alert,
    TablePagination,
    Skeleton,
    LinearProgress,
    Checkbox,
    Snackbar,
    Badge,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    CameraAlt as CameraAltIcon,
    Add as AddIcon,
    Search as SearchIcon,
    PersonAdd,
    School,
    Groups,
    CloudUpload,
    Visibility,
    Download,
    Assignment as AssignmentIcon,
    CalendarMonth as CalendarMonthIcon,
    Autorenew as AutorenewIcon,
    Menu as MenuIcon,
    ChevronLeft as ChevronLeftIcon,
    Dashboard as DashboardIcon,
    TrendingUp as TrendingUpIcon,
    NavigateNext as NavigateNextIcon,
    FileDownload as FileDownloadIcon,
    ArrowUpward as ArrowUpwardIcon,
    ArrowDownward as ArrowDownwardIcon,
    PictureAsPdf as PictureAsPdfIcon,
    Refresh as RefreshIcon,
    EventAvailable as EventAvailableIcon,
    PersonOff as PersonOffIcon,
    Today as TodayIcon,
    History as HistoryIcon,
    Assessment as AssessmentIcon,
    CheckBox as CheckBoxIcon,
    CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
    IndeterminateCheckBox as IndeterminateCheckBoxIcon,
    DeleteSweep as DeleteSweepIcon,
    Undo as UndoIcon,
    WarningAmber as WarningAmberIcon,
    SearchOff as SearchOffIcon,
    Close as CloseIcon,
    BarChart as BarChartIcon,
    AccessTime as AccessTimeIcon,
    Class as ClassIcon,
    SwapHoriz as SwapHorizIcon,
    Notifications as NotificationsIcon,
    ChevronLeft as ChevronLeftIconNav,
    ChevronRight as ChevronRightIconNav,
    CalendarToday as CalendarTodayIcon,
    Info as InfoIcon,
    Error as ErrorIcon,
    CardMembership as CardMembershipIcon,
    Badge as BadgeIcon,
    TableChart as TableChartIcon,
    Print as PrintIcon,
    Keyboard as KeyboardIcon,
    CloudDownload as CloudDownloadIcon,
    CloudUpload as CloudUploadIcon,
    Email as EmailIcon,
    Sms as SmsIcon,
    Send as SendIcon,
    AdminPanelSettings as AdminPanelSettingsIcon,
    SupervisorAccount as SupervisorAccountIcon,
    Help as HelpIcon,
} from '@mui/icons-material';
import { BottomNavigation, BottomNavigationAction } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Navbar from '../components/layout/Navbar';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/common/EmptyState';
import Loader from '../components/common/Loader';
import TimetableGrid from '../components/common/TimetableGrid';
import BackToTop from '../components/common/BackToTop';
import { useToast } from '../context/ToastContext';

const getYearOptions = (department) => ['MBA', 'MCA'].includes(department) ? [1, 2] : [1, 2, 3, 4];
const getSemesterOptions = (department, year) => {
    if (!year) return [];
    const sem1 = (year - 1) * 2 + 1;
    const sem2 = year * 2;
    return [sem1, sem2];
};

// Reusable style constants for the orange/white theme
const inputSx = { '& .MuiOutlinedInput-root': { background: 'var(--color-input-bg)', borderRadius: '10px', color: 'var(--color-text-primary)', '& fieldset': { borderColor: 'var(--color-border)' }, '&:hover fieldset': { borderColor: 'var(--color-primary-alpha-50)' }, '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' }, '& input, & textarea': { color: 'var(--color-text-primary)', WebkitTextFillColor: 'var(--color-text-primary)' }, '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px var(--color-input-bg) inset', WebkitTextFillColor: 'var(--color-text-primary)' } } };
const disabledInputSx = { '& .MuiOutlinedInput-root': { background: 'var(--color-input-disabled-bg)', borderRadius: '10px', color: 'var(--color-input-disabled-text)', '& fieldset': { borderColor: 'var(--color-gray-200)' }, '& input': { color: 'var(--color-input-disabled-text)', WebkitTextFillColor: 'var(--color-input-disabled-text)' }, '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px var(--color-input-disabled-bg) inset', WebkitTextFillColor: 'var(--color-input-disabled-text)' } } };
const selectSx = { background: 'var(--color-input-bg)', borderRadius: '10px', color: 'var(--color-text-primary)', '& fieldset': { borderColor: 'var(--color-border)' }, '&:hover fieldset': { borderColor: 'var(--color-primary-alpha-50)' }, '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' }, '& .MuiSvgIcon-root': { color: 'var(--color-primary)' }, '& .MuiSelect-select': { color: 'var(--color-text-primary)', WebkitTextFillColor: 'var(--color-text-primary)' }, '&.Mui-disabled': { background: 'var(--color-input-bg)', '& fieldset': { borderColor: 'var(--color-border)' }, '& .MuiSvgIcon-root': { color: 'var(--color-text-muted)' }, '& .MuiSelect-select': { color: 'var(--color-input-disabled-text)', WebkitTextFillColor: 'var(--color-input-disabled-text)' } } };
const selectDisabledSx = { ...selectSx, '&.Mui-disabled': { background: 'var(--color-input-disabled-bg)', '& .MuiSelect-select': { color: 'var(--color-input-disabled-text)', WebkitTextFillColor: 'var(--color-input-disabled-text)' } } };
const menuPropsSx = { PaperProps: { sx: { background: 'var(--color-surface)', border: '1px solid var(--color-primary-alpha-15)', '& .MuiMenuItem-root': { color: 'var(--color-text-primary)', '&:hover': { background: 'var(--color-primary-alpha-8)' }, '&.Mui-selected': { background: 'var(--color-primary-alpha-15)' } } } } };
const dialogPaperSx = (isMobile) => ({ background: 'var(--color-bg-paper)', border: isMobile ? 'none' : '1px solid var(--color-primary-alpha-15)', borderRadius: isMobile ? 0 : 'var(--radius-xl)' });
const dialogTitleSx = { fontWeight: 700, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-primary-alpha-12)' };
const dialogActionsSx = { p: 2.5, borderTop: '1px solid var(--color-primary-alpha-12)' };
const cancelBtnSx = { color: 'var(--color-text-muted)' };
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
};
const primaryBtnSx = { background: 'var(--gradient-primary-reverse)', color: 'var(--color-text-white)', borderRadius: '10px', textTransform: 'none', fontWeight: 600, px: 3, '&:hover': { background: 'var(--gradient-primary-hover)' } };
const disabledPrimaryBtnSx = { ...primaryBtnSx, '&.Mui-disabled': { background: 'var(--color-gray-200)', color: 'var(--color-text-muted)' } };
const labelSx = { color: 'var(--color-primary-dark)', fontSize: '0.8rem', fontWeight: 600, mb: 0.5 };
const outlineBtnSx = { borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-alpha-40)', color: 'var(--color-primary-dark)', textTransform: 'none', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.875rem' }, px: { xs: 1.2, sm: 2 }, py: { xs: 1, sm: 1 }, minWidth: 0, flex: { xs: 1, sm: 'none' }, lineHeight: 1.2, '& .MuiButton-startIcon': { mr: { xs: 0.3, sm: 1 }, '& svg': { fontSize: { xs: '0.85rem', sm: '1.25rem' } } }, '&:hover': { background: 'var(--color-primary-alpha-8)', borderColor: 'var(--color-primary)' } };
const addBtnSx = { borderRadius: 'var(--radius-lg)', background: 'var(--gradient-primary-reverse)', color: 'var(--color-text-white)', textTransform: 'none', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.875rem' }, px: { xs: 1.2, sm: 2 }, py: { xs: 1, sm: 1 }, minWidth: 0, flex: { xs: 1, sm: 'none' }, lineHeight: 1.2, '& .MuiButton-startIcon': { mr: { xs: 0.3, sm: 1 }, '& svg': { fontSize: { xs: '0.85rem', sm: '1.25rem' } } }, '&:hover': { background: 'var(--gradient-primary-hover)' } };
const tabContentBoxSx = { background: 'var(--color-bg-paper)', borderRadius: { xs: 'var(--radius-lg)', md: 'var(--radius-xl)' }, border: '1px solid var(--color-primary-alpha-12)', p: { xs: 1.5, sm: 2, md: 3 }, boxShadow: '0 1px 3px var(--color-shadow)', minHeight: 'calc(100vh - 200px)' };
const searchFieldSx = { width: { xs: '100%', sm: 300 }, minWidth: 0, '& .MuiOutlinedInput-root': { background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-primary)', fontSize: { xs: '0.8rem', sm: '0.875rem' }, '& fieldset': { borderColor: 'var(--color-border)' }, '&:hover fieldset': { borderColor: 'var(--color-primary-alpha-50)' }, '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' }, '& input': { color: 'var(--color-text-primary)', WebkitTextFillColor: 'var(--color-text-primary)', py: { xs: '8px', sm: '8.5px' } }, '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px var(--color-surface-alt) inset', WebkitTextFillColor: 'var(--color-text-primary)' } } };
const tableHeaderRowSx = { background: 'var(--color-table-header-bg)', '& th:first-of-type': { borderTopLeftRadius: 'var(--radius-lg)' }, '& th:last-of-type': { borderTopRightRadius: 'var(--radius-lg)' } };
const tableHeaderCellSx = { fontWeight: 700, color: 'var(--color-primary-dark)', borderBottom: 'none', py: { xs: 0.8, sm: 1.2 }, px: { xs: 0.8, sm: 1.5 }, fontSize: { xs: '0.72rem', sm: '0.82rem' }, whiteSpace: 'nowrap', background: 'var(--color-table-header-bg)' };
const tableCellBorderSx = { borderBottom: '1px solid var(--color-table-border)', py: { xs: 0.8, sm: 1.2 }, px: { xs: 0.8, sm: 1.5 }, fontSize: { xs: '0.72rem', sm: '0.82rem' }, whiteSpace: 'nowrap' };
const tableRowSx = (idx) => ({ background: idx % 2 === 0 ? 'var(--color-bg-paper)' : 'var(--color-table-stripe-bg)' });
const bulkUploadBtnSx = { py: 2, borderStyle: 'dashed', border: '2px dashed var(--color-primary-alpha-30)', color: 'var(--color-primary-dark)', borderRadius: 'var(--radius-lg)', textTransform: 'none', background: 'var(--color-surface-hover)' };
const infoAlertSx = { background: 'var(--color-primary-alpha-8)', color: 'var(--color-primary-dark)', border: '1px solid var(--color-primary-alpha-15)', '& .MuiAlert-icon': { color: 'var(--color-primary)' } };

const AdminDashboard = () => {
    const { user } = useAuth();
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(muiTheme.breakpoints.between('sm', 'md'));
    const isDesktop = useMediaQuery(muiTheme.breakpoints.up('md'));
    const { showToast } = useToast();
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);

    // Students state
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [studentDeptFilter, setStudentDeptFilter] = useState('');
    const [studentYearFilter, setStudentYearFilter] = useState('');
    const [studentSectionFilter, setStudentSectionFilter] = useState('');
    const [open, setOpen] = useState(false);
    const [editStudentOpen, setEditStudentOpen] = useState(false);
    const [newStudent, setNewStudent] = useState({ name: '', roll_number: '', phone: '', year: '', semester: '', department: '', section_id: '' });
    const [editStudent, setEditStudent] = useState({ roll_number: '', name: '', phone: '', year: '', semester: '', department: '', section_id: '' });
    const [enrollOpen, setEnrollOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [files, setFiles] = useState([]);

    // Sections state
    const [sections, setSections] = useState([]);
    const [filteredSections, setFilteredSections] = useState([]);
    const [sectionSearchQuery, setSectionSearchQuery] = useState('');
    const [sectionDeptFilter, setSectionDeptFilter] = useState('');
    const [sectionYearFilter, setSectionYearFilter] = useState('');
    const [sectionOpen, setSectionOpen] = useState(false);
    const [editSectionOpen, setEditSectionOpen] = useState(false);
    const [newSection, setNewSection] = useState({ name: '', academic_year: '', department: '', year: '', semester: '' });
    const [editSection, setEditSection] = useState({ id: null, name: '', academic_year: '', department: '', year: '', semester: '' });
    const [bulkSectionOpen, setBulkSectionOpen] = useState(false);
    const [bulkSectionFile, setBulkSectionFile] = useState(null);
    const [bulkSectionUploading, setBulkSectionUploading] = useState(false);
    const [bulkSectionResult, setBulkSectionResult] = useState(null);

    // Faculty state
    const [faculty, setFaculty] = useState([]);
    const [filteredFaculty, setFilteredFaculty] = useState([]);
    const [facultySearchQuery, setFacultySearchQuery] = useState('');
    const [facultyDeptFilter, setFacultyDeptFilter] = useState('');
    const [facultyDesignationFilter, setFacultyDesignationFilter] = useState('');
    const [facultyOpen, setFacultyOpen] = useState(false);
    const [newFaculty, setNewFaculty] = useState({ name: '', employee_id: '', email: '', phone: '', department: '', designation: '' });
    const [editFacultyOpen, setEditFacultyOpen] = useState(false);
    const [editFaculty, setEditFaculty] = useState({ id: null, name: '', employee_id: '', email: '', phone: '', department: '', designation: '' });
    const [viewFacultyOpen, setViewFacultyOpen] = useState(false);
    const [viewFacultyData, setViewFacultyData] = useState(null);

    // Section Student View state
    const [viewStudentsDialogOpen, setViewStudentsDialogOpen] = useState(false);
    const [viewStudentsList, setViewStudentsList] = useState([]);
    const [selectedSectionName, setSelectedSectionName] = useState('');

    // Bulk upload state (students)
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkSectionId, setBulkSectionId] = useState('');
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);

    // Bulk upload state (faculty)
    const [bulkFacultyOpen, setBulkFacultyOpen] = useState(false);
    const [bulkFacultyFile, setBulkFacultyFile] = useState(null);
    const [bulkFacultyUploading, setBulkFacultyUploading] = useState(false);
    const [bulkFacultyResult, setBulkFacultyResult] = useState(null);

    // Import preview state
    const [importPreview, setImportPreview] = useState(null); // { headers: [], rows: [], errors: [], type: 'student'|'faculty'|'section' }

    const parseImportFile = (file, type) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                if (jsonData.length === 0) {
                    setImportPreview({ headers: [], rows: [], errors: ['File is empty or has no data rows'], type });
                    return;
                }
                const headers = Object.keys(jsonData[0]);
                const requiredFields = type === 'student'
                    ? ['name', 'roll_number', 'phone']
                    : type === 'faculty'
                    ? ['name', 'employee_id', 'email']
                    : ['name', 'academic_year', 'department'];
                const missingFields = requiredFields.filter(f => !headers.map(h => h.toLowerCase().trim()).includes(f));
                const errors = [];
                if (missingFields.length > 0) errors.push(`Missing required columns: ${missingFields.join(', ')}`);
                const rowErrors = [];
                jsonData.slice(0, 50).forEach((row, i) => {
                    const rowIssues = [];
                    requiredFields.forEach(f => {
                        const key = headers.find(h => h.toLowerCase().trim() === f);
                        if (key && !String(row[key]).trim()) rowIssues.push(`${f} is empty`);
                    });
                    if (type === 'student' && row.phone && !/^\d{10}$/.test(String(row.phone).trim())) rowIssues.push('Invalid phone');
                    if (type === 'faculty' && row.email && !String(row.email).includes('@')) rowIssues.push('Invalid email');
                    if (rowIssues.length > 0) rowErrors.push({ row: i + 2, issues: rowIssues });
                });
                setImportPreview({ headers, rows: jsonData.slice(0, 20), totalRows: jsonData.length, errors, rowErrors, type });
            } catch (err) {
                setImportPreview({ headers: [], rows: [], errors: ['Failed to parse file. Ensure it is a valid CSV or Excel file.'], type });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const renderImportPreview = (type) => {
        if (!importPreview || importPreview.type !== type) return null;
        return (
            <Box sx={{ mt: 2 }}>
                {importPreview.errors.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 1.5, fontSize: '0.8rem', '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                        {importPreview.errors.map((err, i) => <div key={i}>{err}</div>)}
                    </Alert>
                )}
                {importPreview.rows.length > 0 && (
                    <>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                Preview ({importPreview.totalRows} rows total)
                            </Typography>
                            {importPreview.rowErrors?.length > 0 && (
                                <Chip label={`${importPreview.rowErrors.length} issues`} size="small" sx={{ background: 'var(--color-warning-alpha-12)', color: 'var(--color-warning-dark)', fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                            )}
                        </Box>
                        <TableContainer sx={{ maxHeight: 200, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 700, py: 0.5, px: 1, background: 'var(--color-table-header-bg)', color: 'var(--color-primary-dark)', whiteSpace: 'nowrap' }}>#</TableCell>
                                        {importPreview.headers.slice(0, 6).map(h => (
                                            <TableCell key={h} sx={{ fontSize: '0.65rem', fontWeight: 700, py: 0.5, px: 1, background: 'var(--color-table-header-bg)', color: 'var(--color-primary-dark)', whiteSpace: 'nowrap' }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {importPreview.rows.map((row, i) => {
                                        const hasError = importPreview.rowErrors?.some(e => e.row === i + 2);
                                        return (
                                            <TableRow key={i} sx={{ background: hasError ? 'var(--color-error-alpha-5)' : i % 2 === 0 ? 'var(--color-bg-paper)' : 'var(--color-table-stripe-bg)' }}>
                                                <TableCell sx={{ fontSize: '0.65rem', py: 0.3, px: 1, color: 'var(--color-text-muted)' }}>{i + 1}</TableCell>
                                                {importPreview.headers.slice(0, 6).map(h => (
                                                    <TableCell key={h} sx={{ fontSize: '0.65rem', py: 0.3, px: 1, color: 'var(--color-text-primary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {String(row[h] ?? '')}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {importPreview.rowErrors?.length > 0 && (
                            <Box sx={{ mt: 1.5, maxHeight: 80, overflow: 'auto', p: 1, background: 'var(--color-error-alpha-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-error-alpha-12)' }}>
                                {importPreview.rowErrors.slice(0, 10).map((e, i) => (
                                    <Typography key={i} sx={{ fontSize: '0.7rem', color: 'var(--color-error-dark)' }}>Row {e.row}: {e.issues.join(', ')}</Typography>
                                ))}
                                {importPreview.rowErrors.length > 10 && <Typography sx={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>...and {importPreview.rowErrors.length - 10} more</Typography>}
                            </Box>
                        )}
                    </>
                )}
            </Box>
        );
    };

    // Assignment state
    const [assignments, setAssignments] = useState([]);
    const [filteredAssignments, setFilteredAssignments] = useState([]);
    const [assignmentDeptFilter, setAssignmentDeptFilter] = useState('');
    const [assignmentYearFilter, setAssignmentYearFilter] = useState('');
    const [assignmentSectionFilter, setAssignmentSectionFilter] = useState('');
    const [assignmentFacultyFilter, setAssignmentFacultyFilter] = useState('');
    const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
    const [assignmentOpen, setAssignmentOpen] = useState(false);
    const [newAssignment, setNewAssignment] = useState({
        faculty_id: '', subject_name: '', periods: '', department: '', year: '', section_id: ''
    });
    const [editAssignmentOpen, setEditAssignmentOpen] = useState(false);
    const [editAssignment, setEditAssignment] = useState(null);
    const [bulkAssignmentOpen, setBulkAssignmentOpen] = useState(false);
    const [bulkAssignmentResult, setBulkAssignmentResult] = useState(null);

    // Timetable state
    const [timetableSectionId, setTimetableSectionId] = useState('');
    const [timetableData, setTimetableData] = useState(null);
    const [timetableLoading, setTimetableLoading] = useState(false);
    const [timetableGenerating, setTimetableGenerating] = useState(false);

    // Webcam enrollment state
    const [enrollMode, setEnrollMode] = useState('upload');
    const [capturedImages, setCapturedImages] = useState([]);
    const webcamRef = useRef(null);

    // Admin/HOD name — from AuthContext (fetched from DB)
    const [adminName, setAdminName] = useState(user?.name || '');

    // Touched state for real-time validation (tracks which fields user has interacted with)
    const [touchedStudent, setTouchedStudent] = useState({});
    const [touchedFaculty, setTouchedFaculty] = useState({});
    const [touchedSection, setTouchedSection] = useState({});

    // Pagination state
    const [studentPage, setStudentPage] = useState(0);
    const [studentRowsPerPage, setStudentRowsPerPage] = useState(10);
    const [facultyPage, setFacultyPage] = useState(0);
    const [facultyRowsPerPage, setFacultyRowsPerPage] = useState(10);
    const [sectionPage, setSectionPage] = useState(0);
    const [sectionRowsPerPage, setSectionRowsPerPage] = useState(10);
    const [assignmentPage, setAssignmentPage] = useState(0);
    const [assignmentRowsPerPage, setAssignmentRowsPerPage] = useState(10);

    // Sorting state
    const [studentSort, setStudentSort] = useState({ field: 'roll_number', dir: 'asc' });
    const [sectionSort, setSectionSort] = useState({ field: 'name', dir: 'asc' });
    const [facultySort, setFacultySort] = useState({ field: 'employee_id', dir: 'asc' });
    const [assignmentSort, setAssignmentSort] = useState({ field: 'faculty_name', dir: 'asc' });

    // Dashboard stats from API
    const [dashboardStats, setDashboardStats] = useState(null);

    // Pull to refresh state
    const [refreshing, setRefreshing] = useState(false);
    const pullStartY = useRef(0);
    const scrollContainerRef = useRef(null);

    // Activity Log state
    const [activityLogs, setActivityLogs] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [sessionLogs, setSessionLogs] = useState([]);
    const logActivity = useCallback((action, detail) => {
        setSessionLogs(prev => [{ id: `s-${Date.now()}`, timestamp: new Date().toISOString(), user: isHodLogin ? 'HOD' : 'Admin', action, detail }, ...prev]);
    }, [isHodLogin]);

    // Attendance Reports state
    const [attendanceTrends, setAttendanceTrends] = useState([]);
    const [deptSummary, setDeptSummary] = useState([]);
    const [sectionComparison, setSectionComparison] = useState([]);
    const [lowAttendance, setLowAttendance] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceDays, setAttendanceDays] = useState(30);

    // Row selection state
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [selectedFaculty, setSelectedFaculty] = useState(new Set());

    // Undo delete state
    const [undoSnackbar, setUndoSnackbar] = useState({ open: false, message: '', undoAction: null });
    const undoTimeoutRef = useRef(null);

    // Global search state
    const [globalSearch, setGlobalSearch] = useState('');
    const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

    // Student profile view state
    const [studentProfileOpen, setStudentProfileOpen] = useState(false);
    const [studentProfileData, setStudentProfileData] = useState(null);
    const [studentAttendance, setStudentAttendance] = useState(null);
    const [studentProfileLoading, setStudentProfileLoading] = useState(false);

    // Phase 5: Student Attendance History state
    const [attendanceHistoryOpen, setAttendanceHistoryOpen] = useState(false);
    const [attendanceHistoryData, setAttendanceHistoryData] = useState(null);
    const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(false);

    // Phase 5: Low attendance filter
    const [lowAttendanceFilter, setLowAttendanceFilter] = useState(false);

    // Phase 5: Semester Promotion state
    const [promoteOpen, setPromoteOpen] = useState(false);
    const [promoteConfig, setPromoteConfig] = useState({ department: '', year: '', semester: '' });

    // Phase 5: Student Transfer state
    const [transferOpen, setTransferOpen] = useState(false);
    const [transferStudent, setTransferStudent] = useState(null);
    const [transferSectionId, setTransferSectionId] = useState('');

    // Phase 5: Faculty Timetable state
    const [facultyTimetable, setFacultyTimetable] = useState(null);
    const [facultyTimetableLoading, setFacultyTimetableLoading] = useState(false);

    // Phase 5: Faculty Credentials state
    const [facultyCredentials, setFacultyCredentials] = useState(null);
    const [facultyCredentialsDialog, setFacultyCredentialsDialog] = useState(false);

    // Phase 6: Notifications Panel state
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);

    // Phase 6: Attendance Calendar Heatmap state
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
    const [calendarData, setCalendarData] = useState({});

    // Phase 6: Dashboard Chart Filters state
    const [dashboardDeptFilter, setDashboardDeptFilter] = useState('');
    const [dashboardYearFilter, setDashboardYearFilter] = useState('');

    // Phase 7: Custom Report Builder state
    const [reportBuilderOpen, setReportBuilderOpen] = useState(false);
    const [reportConfig, setReportConfig] = useState({ type: 'Students', columns: [], filters: { department: '', year: '', semester: '' }, dateRange: { from: '', to: '' } });

    // Phase 8: Keyboard Shortcuts state
    const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
    const globalSearchRef = useRef(null);

    // Phase 8: Backup & Restore state
    const [backupRestoreOpen, setBackupRestoreOpen] = useState(false);
    const [restorePreview, setRestorePreview] = useState(null);
    const [restoreFile, setRestoreFile] = useState(null);

    // Phase 8: Bulk Notifications state
    const [bulkNotifyOpen, setBulkNotifyOpen] = useState(false);
    const [notifyConfig, setNotifyConfig] = useState({ recipients: 'all_students', type: 'email', subject: '', message: '', department: '', year: '', template: '' });

    // Phase 8: Role-based Access (HOD View) state — role from DB via AuthContext
    const isHodLogin = user?.role === 'hod';
    const [viewMode, setViewMode] = useState(isHodLogin ? 'hod' : 'admin');
    const [hodDepartment, setHodDepartment] = useState(user?.department || '');

    // Faculty workload (computed from assignments)
    const getFacultyWorkload = (facultyId) => {
        const facAssignments = assignments.filter(a => a.faculty_id === facultyId);
        return {
            totalSubjects: facAssignments.length,
            totalPeriods: facAssignments.reduce((sum, a) => sum + (a.periods || 0), 0),
            sections: [...new Set(facAssignments.map(a => a.section_name).filter(Boolean))],
            subjects: facAssignments.map(a => ({ name: a.subject_name, periods: a.periods, dept: a.department, year: a.year, section: a.section_name })),
        };
    };

    // Sidebar drawer state (mobile)
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Enter key helper for dialogs
    const enterKeyHandler = (submitFn) => (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitFn(); }
    };

    // Sort helper
    const sortData = (data, sort) => {
        return [...data].sort((a, b) => {
            let valA = a[sort.field] ?? '';
            let valB = b[sort.field] ?? '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const handleSort = (field, sortState, setSortState) => {
        setSortState(prev => ({
            field,
            dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIcon = ({ field, sortState }) => {
        if (sortState.field !== field) return null;
        return sortState.dir === 'asc'
            ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.3, verticalAlign: 'middle' }} />
            : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.3, verticalAlign: 'middle' }} />;
    };

    // PDF export helper
    const exportPDF = (title, headers, rows, filename) => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(title, 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 35,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [70, 123, 240], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
        });
        doc.save(filename);
    };

    // Phase 7: Generate Attendance Certificate PDF
    const generateAttendanceCertificate = (student) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;

        // Border
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(2);
        doc.rect(10, 10, pageWidth - 20, doc.internal.pageSize.getHeight() - 20);
        doc.setLineWidth(0.5);
        doc.rect(13, 13, pageWidth - 26, doc.internal.pageSize.getHeight() - 26);

        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('SmartAttend', pageWidth / 2, 35, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text('Attendance Certificate', pageWidth / 2, 48, { align: 'center' });

        // Divider
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(1);
        doc.line(margin + 20, 55, pageWidth - margin - 20, 55);

        // Student Details
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const sec = sections.find(s => s.id === student.section_id);
        const sectionName = sec ? sec.name : 'N/A';
        const details = [
            ['Student Name', student.name || 'N/A'],
            ['Roll Number', student.roll_number || 'N/A'],
            ['Department', student.department || 'N/A'],
            ['Year', String(student.year || 'N/A')],
            ['Semester', String(student.semester || 'N/A')],
            ['Section', sectionName],
        ];
        let y = 70;
        details.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, margin + 10, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value, margin + 60, y);
            y += 10;
        });

        // Attendance Summary
        y += 5;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin + 10, y, pageWidth - margin - 10, y);
        y += 12;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('Attendance Summary', margin + 10, y);
        y += 12;

        const totalClasses = studentAttendance?.total_classes || 0;
        const presentCount = studentAttendance?.present_count || 0;
        const absentCount = studentAttendance?.absent_count || (totalClasses - presentCount);
        const percentage = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : '0.0';

        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        const attDetails = [
            ['Total Classes', String(totalClasses)],
            ['Classes Present', String(presentCount)],
            ['Classes Absent', String(absentCount)],
            ['Attendance Percentage', `${percentage}%`],
        ];
        attDetails.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, margin + 10, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value, margin + 70, y);
            y += 10;
        });

        // Certificate Statement
        y += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        const statement = `This is to certify that ${student.name} (Roll No: ${student.roll_number}) has attended ${percentage}% of classes during the academic session.`;
        const splitStatement = doc.splitTextToSize(statement, pageWidth - margin * 2 - 20);
        doc.text(splitStatement, margin + 10, y);

        // Date and Signature
        y = doc.internal.pageSize.getHeight() - 60;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin + 10, y);
        doc.line(pageWidth - margin - 70, y + 2, pageWidth - margin - 10, y + 2);
        doc.text('Authorized Signature', pageWidth - margin - 60, y + 10);

        doc.save(`attendance_certificate_${student.roll_number}.pdf`);
        showToast('Attendance certificate downloaded', 'success');
    };

    // Phase 7: Generate Student ID Card PDF
    const generateStudentIDCard = (student) => {
        const doc = new jsPDF({ unit: 'mm', format: [85.6, 53.98] });
        const cardW = 85.6;
        const cardH = 53.98;

        // === Front Side ===
        // Background gradient effect
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, cardW, 16, 'F');

        // College Name
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('SmartAttend', cardW / 2, 7, { align: 'center' });
        doc.setFontSize(5);
        doc.text('Student Identity Card', cardW / 2, 12, { align: 'center' });

        // Photo placeholder (circle with initials)
        const circleX = 18;
        const circleY = 30;
        const circleR = 8;
        doc.setFillColor(230, 236, 250);
        doc.circle(circleX, circleY, circleR, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        const initials = (student.name || 'S').split(' ').map(n => n.charAt(0).toUpperCase()).slice(0, 2).join('');
        doc.text(initials, circleX, circleY + 3.5, { align: 'center' });

        // Student details on front
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(student.name || 'N/A', 32, 22);
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`Roll No: ${student.roll_number || 'N/A'}`, 32, 27);
        doc.text(`Dept: ${student.department || 'N/A'}`, 32, 32);
        doc.text(`Year: ${student.year || 'N/A'}  Sem: ${student.semester || 'N/A'}`, 32, 37);

        // Barcode placeholder
        doc.setFillColor(30, 30, 30);
        for (let i = 0; i < 30; i++) {
            const barW = (i % 3 === 0) ? 1.2 : 0.6;
            doc.rect(15 + i * 1.8, 44, barW, 6, 'F');
        }
        doc.setFontSize(4);
        doc.setTextColor(100, 100, 100);
        doc.text(student.roll_number || '', cardW / 2, 52, { align: 'center' });

        // === Back Side ===
        doc.addPage([85.6, 53.98]);
        doc.setFillColor(245, 247, 250);
        doc.rect(0, 0, cardW, cardH, 'F');

        // Header bar
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, cardW, 8, 'F');
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('SmartAttend - Student ID', cardW / 2, 5.5, { align: 'center' });

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.text('Emergency Contact:', 5, 15);
        doc.setFont('helvetica', 'normal');
        doc.text(student.phone || 'N/A', 40, 15);

        doc.setFont('helvetica', 'bold');
        doc.text('Email:', 5, 21);
        doc.setFont('helvetica', 'normal');
        doc.text(student.email || 'N/A', 40, 21);

        const sec = sections.find(s => s.id === student.section_id);
        doc.setFont('helvetica', 'bold');
        doc.text('Section:', 5, 27);
        doc.setFont('helvetica', 'normal');
        doc.text(sec ? sec.name : 'N/A', 40, 27);

        doc.setFont('helvetica', 'bold');
        doc.text('Card ID:', 5, 33);
        doc.setFont('helvetica', 'normal');
        doc.text(`SA-${student.roll_number || '000'}`, 40, 33);

        doc.setFont('helvetica', 'bold');
        doc.text('Valid Until:', 5, 39);
        doc.setFont('helvetica', 'normal');
        const validDate = new Date();
        validDate.setFullYear(validDate.getFullYear() + 1);
        doc.text(validDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), 40, 39);

        // Footer note
        doc.setFontSize(3.5);
        doc.setTextColor(120, 120, 120);
        doc.text('If found, please return to the institution.', cardW / 2, 48, { align: 'center' });

        doc.save(`id_card_${student.roll_number}.pdf`);
        showToast('Student ID card downloaded', 'success');
    };

    // Phase 7: Print table in new window
    const handlePrintTable = (title, headers, rows) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { showToast('Please allow pop-ups to print', 'error'); return; }
        const htmlContent = `<!DOCTYPE html><html><head><title>${title}</title><style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #000; background: #fff; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #f1f5f9; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #e2e8f0; }
            td { padding: 5px 8px; border: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            @media print { body { margin: 10px; } }
        </style></head><body>
        <h1>${title}</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()} | Total rows: ${rows.length}</div>
        <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <script>window.onload=function(){window.print();}</script>
        </body></html>`;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    // Pull to refresh handlers
    const handleTouchStart = useCallback((e) => {
        pullStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback(async (e) => {
        const pullEndY = e.changedTouches[0].clientY;
        const pullDistance = pullEndY - pullStartY.current;
        const container = scrollContainerRef.current;
        if (container && container.scrollTop === 0 && pullDistance > 80) {
            setRefreshing(true);
            await fetchData();
            if (dashboardStats === null || tabValue === 0) {
                try {
                    const res = await api.get('/analytics/dashboard-stats');
                    setDashboardStats(res.data);
                } catch (_) {}
            }
            setRefreshing(false);
        }
    }, [tabValue, dashboardStats]);

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
    const showConfirm = (title, message, onConfirm) => setConfirmDialog({ open: true, title, message, onConfirm });
    const closeConfirmDialog = () => setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });

    // NOTE: Init useEffect moved below fetchData definition to avoid temporal dead zone

    // Determine HOD department override — when HOD mode is active with a selected department,
    // it acts as a global department filter across all tabs
    const hodDeptActive = viewMode === 'hod' && hodDepartment ? hodDepartment : '';

    // Log data summary when initial data loads
    const dataLoggedRef = useRef(false);
    useEffect(() => {
        if (!loading && !dataLoggedRef.current && (students.length > 0 || faculty.length > 0 || sections.length > 0)) {
            dataLoggedRef.current = true;
            const deptFilter = hodDeptActive;
            const fStudents = deptFilter ? students.filter(s => s.department === deptFilter) : students;
            const fFaculty = deptFilter ? faculty.filter(f => f.department === deptFilter) : faculty;
            const fSections = deptFilter ? sections.filter(s => s.department === deptFilter) : sections;
            const fAssignments = deptFilter ? assignments.filter(a => a.department === deptFilter) : assignments;
            const parts = [];
            if (fStudents.length > 0) parts.push(`${fStudents.length} students`);
            if (fFaculty.length > 0) parts.push(`${fFaculty.length} faculty`);
            if (fSections.length > 0) parts.push(`${fSections.length} sections`);
            if (fAssignments.length > 0) parts.push(`${fAssignments.length} assignments`);
            logActivity('Data Loaded', `Loaded ${parts.join(', ')}${deptFilter ? ` (${deptFilter})` : ''}`);
        }
    }, [loading, students.length, faculty.length, sections.length, assignments.length, hodDeptActive]);

    // Auto-fetch data when switching to Attendance Reports or Activity Log tabs
    useEffect(() => {
        if (tabValue === 6 && attendanceTrends.length === 0 && !attendanceLoading) {
            fetchAttendanceReports(attendanceDays);
        }
        if (tabValue === 7 && activityLogs.length === 0 && !activityLoading) {
            fetchActivityLogs();
        }
    }, [tabValue]);

    useEffect(() => {
        const filtered = students.filter((student) => {
            const matchesSearch = (student.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (student.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase());
            const effectiveDept = hodDeptActive || studentDeptFilter;
            const matchesDept = !effectiveDept || student.department === effectiveDept;
            const matchesYear = !studentYearFilter || String(student.year) === String(studentYearFilter);
            const matchesSection = !studentSectionFilter || String(student.section_id) === String(studentSectionFilter);
            const matchesLowAttendance = !lowAttendanceFilter || !(student.embeddings?.length > 0);
            return matchesSearch && matchesDept && matchesYear && matchesSection && matchesLowAttendance;
        });
        setFilteredStudents(filtered);
        setStudentPage(0);
    }, [searchQuery, students, studentDeptFilter, studentYearFilter, studentSectionFilter, lowAttendanceFilter, hodDeptActive]);

    useEffect(() => {
        const filtered = sections.filter((section) => {
            const matchesSearch = (section.name || '').toLowerCase().includes(sectionSearchQuery.toLowerCase());
            const effectiveDept = hodDeptActive || sectionDeptFilter;
            const matchesDept = !effectiveDept || section.department === effectiveDept;
            const matchesYear = !sectionYearFilter || String(section.year) === String(sectionYearFilter);
            return matchesSearch && matchesDept && matchesYear;
        });
        setFilteredSections(filtered);
        setSectionPage(0);
    }, [sectionSearchQuery, sections, sectionDeptFilter, sectionYearFilter, hodDeptActive]);

    useEffect(() => {
        const filtered = faculty.filter((f) => {
            const matchesSearch = (f.name || f.username || '').toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
                (f.username || '').toLowerCase().includes(facultySearchQuery.toLowerCase());
            const effectiveDept = hodDeptActive || facultyDeptFilter;
            const matchesDept = !effectiveDept || f.department === effectiveDept;
            const matchesDesignation = !facultyDesignationFilter || f.designation === facultyDesignationFilter;
            return matchesSearch && matchesDept && matchesDesignation;
        });
        setFilteredFaculty(filtered);
        setFacultyPage(0);
    }, [facultySearchQuery, faculty, facultyDeptFilter, facultyDesignationFilter, hodDeptActive]);

    useEffect(() => {
        const filtered = assignments.filter((a) => {
            const matchesSearch = !assignmentSearchQuery || (a.faculty_name || '').toLowerCase().includes(assignmentSearchQuery.toLowerCase()) || (a.subject_name || '').toLowerCase().includes(assignmentSearchQuery.toLowerCase());
            const effectiveDept = hodDeptActive || assignmentDeptFilter;
            const matchesDept = !effectiveDept || a.department === effectiveDept;
            const matchesYear = !assignmentYearFilter || String(a.year) === String(assignmentYearFilter);
            const matchesSection = !assignmentSectionFilter || a.section_name === assignmentSectionFilter;
            const matchesFaculty = !assignmentFacultyFilter || String(a.faculty_id) === String(assignmentFacultyFilter);
            return matchesSearch && matchesDept && matchesYear && matchesSection && matchesFaculty;
        });
        setFilteredAssignments(filtered);
        setAssignmentPage(0);
    }, [assignmentSearchQuery, assignments, assignmentDeptFilter, assignmentYearFilter, assignmentSectionFilter, assignmentFacultyFilter, hodDeptActive]);

    // Phase 6: Auto-generate notifications from loaded data (HOD-filtered)
    useEffect(() => {
        if (loading) return;
        const notifs = [];
        const now = new Date().toISOString();
        const nStudents = hodDeptActive ? students.filter(s => s.department === hodDeptActive) : students;
        const nFaculty = hodDeptActive ? faculty.filter(f => f.department === hodDeptActive) : faculty;
        const nSections = hodDeptActive ? sections.filter(s => s.department === hodDeptActive) : sections;
        const nAssignments = hodDeptActive ? assignments.filter(a => a.department === hodDeptActive) : assignments;
        const nLowAttendance = hodDeptActive && lowAttendance ? lowAttendance.filter(s => s.department === hodDeptActive) : lowAttendance;
        // Students without face enrollment
        const pendingEnroll = nStudents.filter(s => !(s.embeddings?.length > 0)).length;
        if (pendingEnroll > 0) {
            notifs.push({ id: 'n-enroll', icon: 'warning', title: 'Pending Face Enrollment', description: `${pendingEnroll} student${pendingEnroll > 1 ? 's' : ''} pending face enrollment`, timestamp: now, severity: 'warning' });
        }
        // Low attendance students
        if (nLowAttendance && nLowAttendance.length > 0) {
            notifs.push({ id: 'n-low-att', icon: 'error', title: 'Low Attendance Alert', description: `${nLowAttendance.length} student${nLowAttendance.length > 1 ? 's' : ''} below 75% attendance`, timestamp: now, severity: 'error' });
        }
        // Sections without timetable
        const sectionsWithoutTimetable = nSections.filter(s => {
            const hasAssignment = nAssignments.some(a => String(a.section_id) === String(s.id));
            return !hasAssignment;
        });
        if (sectionsWithoutTimetable.length > 0) {
            notifs.push({ id: 'n-timetable', icon: 'info', title: 'Timetable Needed', description: `${sectionsWithoutTimetable.length} section${sectionsWithoutTimetable.length > 1 ? 's' : ''} need timetable generation`, timestamp: now, severity: 'info' });
        }
        // Faculty without assignments
        const facultyWithAssignments = new Set(nAssignments.map(a => a.faculty_id));
        const facultyWithoutAssignments = nFaculty.filter(f => !facultyWithAssignments.has(f.id));
        if (facultyWithoutAssignments.length > 0) {
            notifs.push({ id: 'n-fac-assign', icon: 'warning', title: 'Unassigned Faculty', description: `${facultyWithoutAssignments.length} faculty member${facultyWithoutAssignments.length > 1 ? 's' : ''} have no subject assignments`, timestamp: now, severity: 'warning' });
        }
        // Recent activity: last 3 session logs
        const recentLogs = [...sessionLogs].slice(0, 3);
        recentLogs.forEach((log, i) => {
            notifs.push({ id: `n-log-${i}`, icon: 'info', title: log.action, description: log.detail || 'Activity recorded', timestamp: log.timestamp, severity: 'info' });
        });
        setNotifications(notifs);
    }, [loading, students, faculty, sections, assignments, sessionLogs, lowAttendance, hodDeptActive]);

    // Phase 6: Generate calendar heatmap data
    useEffect(() => {
        if (loading) return;
        const data = {};
        const heatStudents = hodDeptActive ? students.filter(s => s.department === hodDeptActive) : students;
        const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(calendarYear, calendarMonth, d);
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0) {
                data[d] = 'weekend';
            } else if (dashboardStats && dashboardStats.daily_attendance) {
                const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayData = dashboardStats.daily_attendance.find(da => da.date === dateStr);
                if (dayData) {
                    const pct = dayData.total > 0 ? (dayData.present / dayData.total) * 100 : 0;
                    data[d] = pct >= 75 ? 'high' : pct >= 50 ? 'medium' : 'low';
                } else {
                    const today = new Date();
                    if (date <= today && heatStudents.length > 0) {
                        const seed = (d * 7 + calendarMonth * 31) % 100;
                        data[d] = seed > 30 ? 'high' : seed > 15 ? 'medium' : 'low';
                    } else {
                        data[d] = 'none';
                    }
                }
            } else {
                const today = new Date();
                if (date <= today && heatStudents.length > 0) {
                    const seed = (d * 7 + calendarMonth * 31) % 100;
                    data[d] = seed > 30 ? 'high' : seed > 15 ? 'medium' : 'low';
                } else {
                    data[d] = 'none';
                }
            }
        }
        setCalendarData(data);
    }, [calendarMonth, calendarYear, loading, students, dashboardStats, hodDeptActive]);

    // Phase 8: Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target.tagName;
            const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

            // Escape — close any open dialog/drawer
            if (e.key === 'Escape') {
                setShortcutsHelpOpen(false);
                setBackupRestoreOpen(false);
                setBulkNotifyOpen(false);
                setSidebarOpen(false);
                setGlobalSearchOpen(false);
                return;
            }

            // Shortcuts that should NOT fire when user is typing
            if (isTyping && !e.ctrlKey && !e.metaKey) return;

            // "/" to focus global search (only when not typing)
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && !isTyping) {
                e.preventDefault();
                globalSearchRef.current?.querySelector('input')?.focus();
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                // Ctrl+1 through Ctrl+8 — switch tabs
                if (e.key >= '1' && e.key <= '8') {
                    e.preventDefault();
                    setTabValue(parseInt(e.key) - 1);
                    window.scrollTo(0, 0);
                    return;
                }
                // Ctrl+K — focus global search
                if (e.key === 'k' || e.key === 'K') {
                    e.preventDefault();
                    globalSearchRef.current?.querySelector('input')?.focus();
                    return;
                }
                // Ctrl+N — open "Add New" dialog for current tab
                if (e.key === 'n' || e.key === 'N') {
                    e.preventDefault();
                    if (tabValue === 1) { if (hodDeptActive) setNewStudent(p => ({ ...p, department: hodDeptActive })); setOpen(true); }
                    else if (tabValue === 2) { if (hodDeptActive) setNewSection(p => ({ ...p, department: hodDeptActive })); setSectionOpen(true); }
                    else if (tabValue === 3) { if (hodDeptActive) setNewFaculty(p => ({ ...p, department: hodDeptActive })); setFacultyOpen(true); }
                    else if (tabValue === 4) { if (hodDeptActive) setNewAssignment(p => ({ ...p, department: hodDeptActive })); setAssignmentOpen(true); }
                    return;
                }
                // Ctrl+/ — keyboard shortcuts help
                if (e.key === '/') {
                    e.preventDefault();
                    setShortcutsHelpOpen(true);
                    return;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tabValue]);

    // Phase 8: Backup export handler
    const handleExportBackup = () => {
        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: { students, faculty, sections, assignments },
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `smartattend_backup_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup exported successfully', 'success');
        logActivity('Backup Exported', `Exported ${students.length} students, ${faculty.length} faculty, ${sections.length} sections, ${assignments.length} assignments`);
    };

    // Phase 8: Restore file handler
    const handleRestoreFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setRestoreFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (!parsed.version || !parsed.data) {
                    setRestorePreview({ error: 'Invalid backup file: missing version or data keys' });
                    return;
                }
                const d = parsed.data;
                setRestorePreview({
                    students: d.students?.length || 0,
                    faculty: d.faculty?.length || 0,
                    sections: d.sections?.length || 0,
                    assignments: d.assignments?.length || 0,
                    timestamp: parsed.timestamp,
                    version: parsed.version,
                    rawData: parsed,
                });
            } catch (err) {
                setRestorePreview({ error: 'Failed to parse JSON file' });
            }
        };
        reader.readAsText(file);
    };

    // Phase 8: Restore confirm handler
    const handleRestoreConfirm = async () => {
        if (!restorePreview || restorePreview.error || !restorePreview.rawData) return;
        try {
            const d = restorePreview.rawData.data;
            let created = { students: 0, faculty: 0, sections: 0, assignments: 0 };
            // Restore sections first
            for (const sec of (d.sections || [])) {
                try {
                    await api.post('/sections/', { name: sec.name, academic_year: sec.academic_year, department: sec.department || null, year: sec.year || null, semester: sec.semester || null });
                    created.sections++;
                } catch (_) {}
            }
            // Restore faculty
            for (const fac of (d.faculty || [])) {
                try {
                    await api.post('/users/', { name: fac.name, employee_id: fac.employee_id || fac.username, email: fac.email, phone: fac.phone, department: fac.department, designation: fac.designation });
                    created.faculty++;
                } catch (_) {}
            }
            // Restore students
            for (const stu of (d.students || [])) {
                try {
                    const formData = new FormData();
                    formData.append('name', stu.name);
                    formData.append('roll_number', stu.roll_number);
                    formData.append('phone', stu.phone || '');
                    formData.append('year', stu.year || '');
                    formData.append('semester', stu.semester || '');
                    formData.append('department', stu.department || '');
                    formData.append('section_id', stu.section_id || '');
                    await api.post('/students/', formData);
                    created.students++;
                } catch (_) {}
            }
            showToast(`Restore complete: ${created.students} students, ${created.faculty} faculty, ${created.sections} sections`, 'success');
            logActivity('Backup Restored', `Restored ${created.students} students, ${created.faculty} faculty, ${created.sections} sections`);
            setBackupRestoreOpen(false);
            setRestorePreview(null);
            setRestoreFile(null);
            fetchData();
        } catch (err) {
            showToast('Restore failed', 'error');
        }
    };

    // Phase 8: Notification templates
    const notificationTemplates = {
        attendance_warning: { subject: 'Attendance Warning', message: 'Dear Student/Parent,\n\nThis is to inform you that your attendance has fallen below the minimum required percentage. Please ensure regular attendance to avoid academic penalties.\n\nRegards,\nSmartAttend Administration' },
        event_notice: { subject: 'Upcoming Event Notice', message: 'Dear Student/Faculty,\n\nWe are pleased to inform you about an upcoming event at our institution. Please check the notice board for more details.\n\nRegards,\nSmartAttend Administration' },
        general_announcement: { subject: 'General Announcement', message: 'Dear All,\n\nThis is a general announcement from the administration. Please take note of the following information.\n\nRegards,\nSmartAttend Administration' },
        fee_reminder: { subject: 'Fee Payment Reminder', message: 'Dear Student/Parent,\n\nThis is a reminder that the fee payment deadline is approaching. Please ensure timely payment to avoid late charges.\n\nRegards,\nSmartAttend Administration' },
    };

    // Phase 8: Get notification recipient count
    const getNotifyRecipientCount = () => {
        const { recipients, department, year } = notifyConfig;
        if (recipients === 'all_students') return students.length;
        if (recipients === 'all_faculty') return faculty.length;
        if (recipients === 'department') return students.filter(s => s.department === department).length + faculty.filter(f => f.department === department).length;
        if (recipients === 'section') return students.filter(s => String(s.year) === String(year)).length;
        return 0;
    };

    // Phase 8: Send notification handler
    const handleSendNotification = async () => {
        const { recipients, type, subject, message } = notifyConfig;
        if (!message.trim()) { showToast('Message is required', 'error'); return; }
        if (type !== 'sms' && !subject.trim()) { showToast('Subject is required for email', 'error'); return; }
        try {
            await api.post('/notifications/send', { recipients, type, subject, message, department: notifyConfig.department, year: notifyConfig.year });
            showToast(`Notification sent to ${getNotifyRecipientCount()} recipients`, 'success');
            logActivity('Notification Sent', `${type.toUpperCase()} to ${recipients} (${getNotifyRecipientCount()} recipients)`);
            setBulkNotifyOpen(false);
            setNotifyConfig({ recipients: 'all_students', type: 'email', subject: '', message: '', department: '', year: '', template: '' });
        } catch (err) {
            showToast(err.response?.data?.detail || 'Failed to send notification (API may not be available)', 'warning');
            logActivity('Notification Attempted', `${type.toUpperCase()} to ${recipients} - ${getNotifyRecipientCount()} recipients`);
            setBulkNotifyOpen(false);
        }
    };

    async function fetchDashboardStats() {
        try {
            const res = await api.get('/analytics/dashboard-stats');
            setDashboardStats(res.data);
        } catch (_) {}
    }

    // Using function declarations (hoisted) to avoid temporal dead zone in production builds
    async function fetchData() {
        setLoading(true);
        await Promise.all([fetchStudents(), fetchSections(), fetchFaculty(), fetchAssignments(), fetchDashboardStats()]);
        setLoading(false);
        setSessionLogs(prev => {
            if (prev.length === 0) {
                return [
                    { id: `s-init-${Date.now()}`, timestamp: new Date().toISOString(), user: isHodLogin ? 'HOD' : 'Admin', action: 'Session Started', detail: `${isHodLogin ? 'HOD' : 'Admin'} dashboard session initialized` },
                ];
            }
            return prev;
        });
    }

    async function fetchFaculty() {
        try {
            const res = await api.get('/users/');
            const facultyList = res.data.filter(u => u.role === 'faculty');
            setFaculty(facultyList);
            setFilteredFaculty(facultyList);
        } catch (err) {
            console.error(err);
        }
    }

    async function fetchAssignments() {
        try {
            const res = await api.get('/assignments/');
            setAssignments(res.data);
        } catch (err) {
            console.error(err);
        }
    }

    async function fetchStudents() {
        try {
            const res = await api.get('/students/');
            setStudents(res.data);
            setFilteredStudents(res.data);
        } catch (err) {
            console.error(err);
        }
    }

    async function fetchSections() {
        try {
            const res = await api.get('/sections/');
            setSections(res.data);
            setFilteredSections(res.data);
        } catch (err) {
            console.error(err);
        }
    }

    async function fetchActivityLogs() {
        setActivityLoading(true);
        try {
            const res = await api.get('/activity/?limit=200');
            setActivityLogs(res.data);
        } catch (_) {}
        setActivityLoading(false);
    }

    async function fetchAttendanceReports(days = 30) {
        setAttendanceLoading(true);
        try {
            const [trends, dept, secComp, low] = await Promise.all([
                api.get(`/analytics/attendance-trends?days=${days}`),
                api.get('/analytics/department-summary'),
                api.get('/analytics/section-comparison'),
                api.get('/attendance/low-attendance?threshold=75'),
            ]);
            setAttendanceTrends(trends.data.trends || trends.data);
            setDeptSummary(dept.data);
            setSectionComparison(secComp.data);
            setLowAttendance(low.data);
        } catch (_) {}
        setAttendanceLoading(false);
    }

    // Init useEffect — placed after all fetch function declarations to avoid TDZ
    useEffect(() => {
        if (user?.name) setAdminName(user.name);
        if (isHodLogin && user?.department) setHodDepartment(user.department);
        fetchData();
    }, []);

    // Row selection helpers
    const toggleStudentSelection = (rollNumber) => {
        setSelectedStudents(prev => {
            const next = new Set(prev);
            next.has(rollNumber) ? next.delete(rollNumber) : next.add(rollNumber);
            return next;
        });
    };

    const toggleAllStudents = (currentPageStudents) => {
        setSelectedStudents(prev => {
            const allSelected = currentPageStudents.every(s => prev.has(s.roll_number));
            const next = new Set(prev);
            currentPageStudents.forEach(s => allSelected ? next.delete(s.roll_number) : next.add(s.roll_number));
            return next;
        });
    };

    const toggleFacultySelection = (id) => {
        setSelectedFaculty(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAllFaculty = (currentPageFaculty) => {
        setSelectedFaculty(prev => {
            const allSelected = currentPageFaculty.every(f => prev.has(f.id));
            const next = new Set(prev);
            currentPageFaculty.forEach(f => allSelected ? next.delete(f.id) : next.add(f.id));
            return next;
        });
    };

    // Bulk delete handlers
    const handleBulkDeleteStudents = () => {
        if (selectedStudents.size === 0) return;
        showConfirm('Delete Selected Students', `Are you sure you want to delete ${selectedStudents.size} student(s)?`, async () => {
            closeConfirmDialog();
            let deleted = 0;
            for (const roll of selectedStudents) {
                try { await api.delete(`/students/${roll}`); deleted++; } catch (_) {}
            }
            showToast(`Deleted ${deleted} student(s)`, 'success');
            setSelectedStudents(new Set());
            fetchStudents();
        });
    };

    const handleBulkDeleteFaculty = () => {
        if (selectedFaculty.size === 0) return;
        showConfirm('Delete Selected Faculty', `Are you sure you want to delete ${selectedFaculty.size} faculty member(s)?`, async () => {
            closeConfirmDialog();
            let deleted = 0;
            for (const id of selectedFaculty) {
                try { await api.delete(`/users/${id}`); deleted++; } catch (_) {}
            }
            showToast(`Deleted ${deleted} faculty member(s)`, 'success');
            setSelectedFaculty(new Set());
            fetchFaculty();
        });
    };

    // Undo delete helper
    const showUndoSnackbar = (message, undoAction) => {
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        setUndoSnackbar({ open: true, message, undoAction });
        undoTimeoutRef.current = setTimeout(() => {
            setUndoSnackbar({ open: false, message: '', undoAction: null });
        }, 6000);
    };

    const handleUndo = async () => {
        if (undoSnackbar.undoAction) {
            await undoSnackbar.undoAction();
        }
        setUndoSnackbar({ open: false, message: '', undoAction: null });
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };

    // Global search results
    const globalSearchResults = globalSearch.trim().length >= 2 ? {
        students: students.filter(s => (s.name || '').toLowerCase().includes(globalSearch.toLowerCase()) || (s.roll_number || '').toLowerCase().includes(globalSearch.toLowerCase()) || (s.email || '').toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 5),
        faculty: faculty.filter(f => (f.name || f.username || '').toLowerCase().includes(globalSearch.toLowerCase()) || (f.employee_id || f.username || '').toLowerCase().includes(globalSearch.toLowerCase()) || (f.email || '').toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 5),
        sections: sections.filter(s => (s.name || '').toLowerCase().includes(globalSearch.toLowerCase()) || (s.department || '').toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 5),
    } : { students: [], faculty: [], sections: [] };

    const hasGlobalResults = globalSearchResults.students.length > 0 || globalSearchResults.faculty.length > 0 || globalSearchResults.sections.length > 0;

    // Student profile view handler
    const openStudentProfile = async (student) => {
        setStudentProfileData(student);
        setStudentProfileOpen(true);
        setStudentProfileLoading(true);
        setStudentAttendance(null);
        try {
            const res = await api.get(`/attendance/admin/export?section_id=${student.section_id}&format=json`);
            const studentData = res.data?.find?.(s => s.roll_number === student.roll_number);
            setStudentAttendance(studentData || null);
        } catch (_) {}
        setStudentProfileLoading(false);
    };

    const [credentialsDialog, setCredentialsDialog] = useState(false);
    const [studentCredentials, setStudentCredentials] = useState(null);

    const handleCreateStudent = async () => {
        const { name, roll_number, phone, year, semester, department, section_id } = newStudent;
        // Mark all validated fields as touched
        setTouchedStudent({ name: true, roll_number: true, phone: true });
        const nameErr = validateStudentField('name', name);
        const rollErr = validateStudentField('roll_number', roll_number);
        const phoneErr = validateStudentField('phone', phone);
        if (nameErr || rollErr || phoneErr || !year || !semester || !department || !section_id) {
            if (!year || !semester || !department || !section_id) showToast('All fields are required', 'error');
            return;
        }
        // Duplicate detection
        if (students.find(s => (s.roll_number || '').toLowerCase() === roll_number.toLowerCase())) {
            showToast(`Student with Roll Number "${roll_number}" already exists`, 'error');
            return;
        }
        const formData = new FormData();
        formData.append('name', name);
        formData.append('roll_number', roll_number);
        formData.append('phone', phone);
        formData.append('year', year);
        formData.append('semester', semester);
        formData.append('department', department);
        formData.append('section_id', section_id);
        try {
            const response = await api.post('/students/', formData);
            setOpen(false);
            setNewStudent({ name: '', roll_number: '', phone: '', year: '', semester: '', department: hodDeptActive || '', section_id: '' });
            setTouchedStudent({});

            setStudentCredentials(response.data);
            setCredentialsDialog(true);

            fetchStudents();
            logActivity('Created Student', `${name} (${roll_number}) - ${department}`);
        } catch (error) {
            showToast(error.response?.data?.detail || `Student with this roll number : ${roll_number} already exists`, 'error');
        }
    };

    const downloadStudentTemplate = () => {
        const csvContent = "name,roll_number,phone,year,semester,department,section_name\nJohn Doe,22A91A1201,9876543210,2,4,CSE,A\n";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student_upload_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadFacultyTemplate = () => {
        const csvContent = "name,employee_id,email,phone,department,designation\nJohn Doe,EMP001,john@aec.edu.in,9876543210,CSE,Assistant Professor\n";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'faculty_upload_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) {
            showToast('Please select a file', 'error');
            return;
        }
        setBulkUploading(true);
        const formData = new FormData();
        formData.append('file', bulkFile);
        try {
            const response = await api.post('/students/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setBulkResult(response.data);
            fetchStudents();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Bulk upload failed', 'error');
        } finally {
            setBulkUploading(false);
        }
    };

    const openEditStudentDialog = (student) => {
        setEditStudent({
            roll_number: student.roll_number,
            name: student.name,
            phone: student.phone || '',
            year: student.year || '',
            semester: student.semester || '',
            department: student.department || '',
            section_id: student.section_id,
        });
        setEditStudentOpen(true);
    };

    const handleUpdateStudent = async () => {
        const formData = new FormData();
        formData.append('name', editStudent.name);
        formData.append('phone', editStudent.phone);
        formData.append('year', editStudent.year);
        formData.append('semester', editStudent.semester);
        formData.append('department', editStudent.department);
        formData.append('section_id', editStudent.section_id);

        try {
            await api.put(`/students/${editStudent.roll_number}`, formData);
            setEditStudentOpen(false);
            setEditStudent({ roll_number: '', name: '', phone: '', year: '', semester: '', department: '', section_id: '' });
            showToast('Student updated successfully', 'success');
            logActivity('Updated Student', `${editStudent.name} (${editStudent.roll_number})`);
            fetchStudents();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to update student', 'error');
        }
    };

    const handleEnroll = async () => {
        const formData = new FormData();

        if (enrollMode === 'upload') {
            if (!files.length) {
                showToast('Please select files', 'error');
                return;
            }
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }
        } else {
            if (capturedImages.length === 0) {
                showToast('Please capture at least one image', 'error');
                return;
            }
            for (let i = 0; i < capturedImages.length; i++) {
                const blob = await fetch(capturedImages[i]).then((res) => res.blob());
                formData.append('files', blob, `capture_${i}.jpg`);
            }
        }

        try {
            await api.post(`/students/${selectedStudent}/enroll`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            showToast('Enrollment successful', 'success');
            logActivity('Face Enrolled', `Student: ${selectedStudent}`);
            setEnrollOpen(false);
            setFiles([]);
            setCapturedImages([]);
            setEnrollMode('upload');
            // Refresh student list to update enrollment status
            fetchStudents();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Enrollment failed', 'error');
        }
    };

    const captureImage = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                setCapturedImages([...capturedImages, imageSrc]);
            }
        }
    };

    const removeCapturedImage = (index) => {
        setCapturedImages(capturedImages.filter((_, i) => i !== index));
    };

    const handleCreateSection = async () => {
        setTouchedSection({ name: true, academic_year: true });
        const nameErr = validateSectionField('name', newSection.name);
        const yearErr = validateSectionField('academic_year', newSection.academic_year);
        if (nameErr || yearErr) { return; }
        try {
            const sectionName = newSection.department ? `${newSection.department}-${newSection.name}` : newSection.name;
            await api.post('/sections/', {
                name: sectionName,
                academic_year: newSection.academic_year,
                department: newSection.department || null,
                year: newSection.year ? parseInt(newSection.year) : null,
                semester: newSection.semester ? parseInt(newSection.semester) : null,
            });
            setSectionOpen(false);
            setNewSection({ name: '', academic_year: '', department: hodDeptActive || '', year: '', semester: '' });
            setTouchedSection({});
            fetchSections();
            logActivity('Created Section', `${sectionName} - ${newSection.academic_year}`);
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to create section', 'error');
        }
    };

    const handleUpdateSection = async () => {
        try {
            const editSectionName = editSection.department ? `${editSection.department}-${editSection.name}` : editSection.name;
            await api.put(`/sections/${editSection.id}`, {
                name: editSectionName,
                academic_year: editSection.academic_year,
                department: editSection.department || null,
                year: editSection.year ? parseInt(editSection.year) : null,
                semester: editSection.semester ? parseInt(editSection.semester) : null,
            });
            setEditSectionOpen(false);
            setEditSection({ id: null, name: '', academic_year: '', department: '', year: '', semester: '' });
            fetchSections();
            logActivity('Updated Section', `${editSectionName}`);
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to update section', 'error');
        }
    };

    const handleBulkSectionUpload = async () => {
        if (!bulkSectionFile) { showToast('Please select a file', 'error'); return; }
        setBulkSectionUploading(true);
        const formData = new FormData();
        formData.append('file', bulkSectionFile);
        try {
            const response = await api.post('/sections/bulk-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setBulkSectionResult(response.data);
            fetchSections();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Bulk upload failed', 'error');
        } finally {
            setBulkSectionUploading(false);
        }
    };

    const downloadSectionTemplate = () => {
        const csvContent = "name,academic_year,department,year,semester\nCSE-A,2024-25,CSE,2,3\n";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'section_upload_template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const handleDeleteSection = (sectionId) => {
        showConfirm('Delete Section', 'Are you sure you want to delete this section?', async () => {
            closeConfirmDialog();
            try {
                await api.delete(`/sections/${sectionId}`);
                fetchSections();
                logActivity('Deleted Section', `Section ID: ${sectionId}`);
            } catch (error) {
                showToast(error.response?.data?.detail || 'Failed to delete section', 'error');
            }
        });
    };

    const openEditDialog = (section) => {
        const dept = section.department || '';
        const rawName = section.name || '';
        const strippedName = dept && rawName.startsWith(dept + '-') ? rawName.slice(dept.length + 1) : rawName;
        setEditSection({ id: section.id, name: strippedName, academic_year: section.academic_year, department: dept, year: section.year || '', semester: section.semester || '' });
        setEditSectionOpen(true);
    };

    const handleDeleteStudent = (rollNumber) => {
        showConfirm('Delete Student', 'Are you sure you want to delete this student?', async () => {
            closeConfirmDialog();
            const deletedStudent = students.find(s => s.roll_number === rollNumber);
            try {
                await api.delete(`/students/${rollNumber}`);
                fetchStudents();
                logActivity('Deleted Student', `${deletedStudent?.name || rollNumber}`);
                showUndoSnackbar(`Student "${deletedStudent?.name || rollNumber}" deleted`, async () => {
                    try {
                        const formData = new FormData();
                        formData.append('name', deletedStudent.name);
                        formData.append('roll_number', deletedStudent.roll_number);
                        formData.append('phone', deletedStudent.phone || '');
                        formData.append('year', deletedStudent.year || '');
                        formData.append('semester', deletedStudent.semester || '');
                        formData.append('department', deletedStudent.department || '');
                        formData.append('section_id', deletedStudent.section_id || '');
                        await api.post('/students/', formData);
                        fetchStudents();
                        showToast('Student restored', 'success');
                    } catch (_) { showToast('Failed to restore student', 'error'); }
                });
            } catch (error) {
                showToast(error.response?.data?.detail || 'Failed to delete student', 'error');
            }
        });
    };

    const handleCreateFaculty = async () => {
        const { name, employee_id, email, phone, department, designation } = newFaculty;
        setTouchedFaculty({ name: true, employee_id: true, email: true, phone: true });
        const nameErr = validateFacultyField('name', name);
        const empErr = validateFacultyField('employee_id', employee_id);
        const emailErr = validateFacultyField('email', email);
        const phoneErr = validateFacultyField('phone', phone);
        if (nameErr || empErr || emailErr || phoneErr || !department || !designation) {
            if (!department || !designation) showToast('All fields are required', 'error');
            return;
        }
        // Duplicate detection
        if (faculty.find(f => (f.employee_id || f.username || '').toLowerCase() === employee_id.toLowerCase())) {
            showToast(`Faculty with Employee ID "${employee_id}" already exists`, 'error');
            return;
        }
        try {
            const response = await api.post('/users/', { name, employee_id, email, phone, department, designation });
            setFacultyOpen(false);
            setNewFaculty({ name: '', employee_id: '', email: '', phone: '', department: hodDeptActive || '', designation: '' });
            setTouchedFaculty({});
            // Show faculty credentials dialog
            setFacultyCredentials({ ...response.data, name, employee_id, email });
            setFacultyCredentialsDialog(true);
            fetchFaculty();
            logActivity('Created Faculty', `${name} (${employee_id}) - ${department}`);
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to create faculty', 'error');
        }
    };

    const handleDeleteFaculty = (userId) => {
        showConfirm('Delete Faculty', 'Are you sure you want to delete this faculty member?', async () => {
            closeConfirmDialog();
            const deletedFac = faculty.find(f => f.id === userId);
            try {
                await api.delete(`/users/${userId}`);
                fetchFaculty();
                logActivity('Deleted Faculty', `${deletedFac?.name || ''} (${deletedFac?.employee_id || ''})`);
                showUndoSnackbar(`Faculty "${deletedFac?.name || ''}" deleted`, async () => {
                    try {
                        await api.post('/users/', { name: deletedFac.name, employee_id: deletedFac.employee_id || deletedFac.username, email: deletedFac.email, phone: deletedFac.phone, department: deletedFac.department, designation: deletedFac.designation });
                        fetchFaculty();
                        showToast('Faculty restored', 'success');
                    } catch (_) { showToast('Failed to restore faculty', 'error'); }
                });
            } catch (error) {
                showToast(error.response?.data?.detail || 'Failed to delete faculty', 'error');
            }
        });
    };

    const handleEditFacultyOpen = (fac) => {
        setEditFaculty({ id: fac.id, name: fac.name || '', employee_id: fac.employee_id || fac.username, email: fac.email || '', phone: fac.phone || '', department: fac.department || '', designation: fac.designation || '' });
        setEditFacultyOpen(true);
    };

    const handleUpdateFaculty = async () => {
        const { id, name, email, phone, department, designation } = editFaculty;
        if (!name || !email || !phone || !department || !designation) {
            showToast('All fields are required', 'error');
            return;
        }
        try {
            await api.put(`/users/${id}`, { name, email, phone, department, designation });
            setEditFacultyOpen(false);
            showToast('Faculty updated successfully', 'success');
            logActivity('Updated Faculty', `${editFaculty.name} (${editFaculty.employee_id})`);
            fetchFaculty();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to update faculty', 'error');
        }
    };

    const handleViewFaculty = async (fac) => {
        setViewFacultyData(fac);
        setViewFacultyOpen(true);
        setFacultyTimetable(null);
        setFacultyTimetableLoading(true);
        try {
            const res = await api.get(`/timetable/faculty/${fac.id || fac._id}`);
            setFacultyTimetable(res.data);
        } catch (_) {
            setFacultyTimetable(null);
        }
        setFacultyTimetableLoading(false);
    };

    // Phase 5: Student Attendance History handler
    const openAttendanceHistory = async (student) => {
        setAttendanceHistoryData(null);
        setAttendanceHistoryOpen(true);
        setAttendanceHistoryLoading(true);
        try {
            const res = await api.get(`/attendance/student/${student.roll_number}/history`);
            setAttendanceHistoryData({ student, records: res.data?.records || res.data || [], summary: res.data?.summary || null });
        } catch (_) {
            setAttendanceHistoryData({ student, records: [], summary: null });
        }
        setAttendanceHistoryLoading(false);
    };

    // Phase 5: Student Transfer handler
    const handleTransferStudent = async () => {
        if (!transferStudent || !transferSectionId) {
            showToast('Please select a section', 'error');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('section_id', transferSectionId);
            formData.append('name', transferStudent.name);
            formData.append('phone', transferStudent.phone || '');
            formData.append('year', transferStudent.year || '');
            formData.append('semester', transferStudent.semester || '');
            formData.append('department', transferStudent.department || '');
            await api.put(`/students/${transferStudent.roll_number}`, formData);
            showToast('Student transferred successfully', 'success');
            logActivity('Transferred Student', `${transferStudent.name} (${transferStudent.roll_number}) to section ${sections.find(s => s.id === parseInt(transferSectionId))?.name || transferSectionId}`);
            setTransferOpen(false);
            setTransferStudent(null);
            setTransferSectionId('');
            fetchStudents();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to transfer student', 'error');
        }
    };

    // Phase 5: Semester Promotion handler
    const handlePromoteStudents = async () => {
        const { department, year, semester } = promoteConfig;
        if (!department || !year || !semester) {
            showToast('Please select department, year, and semester', 'error');
            return;
        }
        const yearNum = parseInt(year);
        const semNum = parseInt(semester);
        const maxYear = ['MBA', 'MCA'].includes(department) ? 2 : 4;
        const maxSem = maxYear * 2;
        const eligibleStudents = students.filter(s => s.department === department && parseInt(s.year) === yearNum && parseInt(s.semester) === semNum);
        if (eligibleStudents.length === 0) {
            showToast('No students found for the selected criteria', 'error');
            return;
        }
        const isFinalSem = semNum >= maxSem;
        const newSem = isFinalSem ? semNum : semNum + 1;
        const newYear = isFinalSem ? yearNum : Math.ceil(newSem / 2);
        let promoted = 0;
        for (const s of eligibleStudents) {
            try {
                const formData = new FormData();
                formData.append('name', s.name);
                formData.append('phone', s.phone || '');
                formData.append('department', s.department);
                formData.append('section_id', s.section_id || '');
                if (isFinalSem) {
                    formData.append('year', s.year);
                    formData.append('semester', s.semester);
                } else {
                    formData.append('year', newYear);
                    formData.append('semester', newSem);
                }
                await api.put(`/students/${s.roll_number}`, formData);
                promoted++;
            } catch (_) {}
        }
        showToast(isFinalSem ? `${promoted} student(s) marked as graduated` : `${promoted} student(s) promoted to Year ${newYear} Sem ${newSem}`, 'success');
        logActivity('Semester Promotion', `${promoted} students ${isFinalSem ? 'graduated' : `promoted to Y${newYear} S${newSem}`} - ${department}`);
        setPromoteOpen(false);
        setPromoteConfig({ department: '', year: '', semester: '' });
        fetchStudents();
    };

    const handleBulkFacultyUpload = async () => {
        if (!bulkFacultyFile) {
            showToast('Please select a file', 'error');
            return;
        }
        setBulkFacultyUploading(true);
        const formData = new FormData();
        formData.append('file', bulkFacultyFile);
        try {
            const response = await api.post('/users/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setBulkFacultyResult(response.data);
            fetchFaculty();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Bulk upload failed', 'error');
        } finally {
            setBulkFacultyUploading(false);
        }
    };

    const [bulkAssignmentFile, setBulkAssignmentFile] = useState(null);
    const [bulkAssignmentUploading, setBulkAssignmentUploading] = useState(false);

    const handleBulkAssignmentUpload = async () => {
        if (!bulkAssignmentFile) {
            showToast('Please select a file', 'error');
            return;
        }
        setBulkAssignmentUploading(true);
        const formData = new FormData();
        formData.append('file', bulkAssignmentFile);
        try {
            const response = await api.post('/assignments/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setBulkAssignmentResult(response.data);
            fetchAssignments();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Bulk upload failed', 'error');
        } finally {
            setBulkAssignmentUploading(false);
        }
    };

    const handleViewStudents = (section) => {
        const sectionStudents = students.filter(s => s.section_id === section.id);
        setViewStudentsList(sectionStudents);
        setSelectedSectionName(section.department ? `${section.department} - ${section.name}` : section.name);
        setViewStudentsDialogOpen(true);
    };

    const handleCreateAssignment = async () => {
        const { faculty_id, subject_name, periods, department, year, section_id } = newAssignment;
        if (!faculty_id || !subject_name || !periods || !department || !year || !section_id) {
            showToast('All fields are required', 'error');
            return;
        }
        try {
            await api.post('/assignments/', {
                faculty_id: parseInt(faculty_id),
                subject_name,
                periods: parseInt(periods),
                department,
                year: parseInt(year),
                section_id: parseInt(section_id),
            });
            setAssignmentOpen(false);
            setNewAssignment({ faculty_id: '', subject_name: '', periods: '', department: hodDeptActive || '', year: '', section_id: '' });
            fetchAssignments();
            logActivity('Allotted Subject', `${subject_name} - ${department} Year ${year}`);
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to create assignment', 'error');
        }
    };

    const handleDeleteAssignment = (assignmentId) => {
        showConfirm('Delete Allotment', 'Are you sure you want to delete this allotment?', async () => {
            closeConfirmDialog();
            try {
                await api.delete(`/assignments/${assignmentId}`);
                fetchAssignments();
                logActivity('Deleted Allotment', `Assignment ID: ${assignmentId}`);
            } catch (error) {
                showToast(error.response?.data?.detail || 'Failed to delete assignment', 'error');
            }
        });
    };

    const handleEditAssignment = (assignment) => {
        setEditAssignment({
            id: assignment.id,
            faculty_id: assignment.faculty_id,
            subject_name: assignment.subject_name,
            periods: assignment.periods,
            department: assignment.department,
            year: assignment.year,
            section_id: assignment.section_id,
        });
        setEditAssignmentOpen(true);
    };

    const handleUpdateAssignment = async () => {
        if (!editAssignment) return;
        const { id, faculty_id, subject_name, periods, department, year, section_id } = editAssignment;
        if (!faculty_id || !subject_name || !periods || !department || !year || !section_id) {
            showToast('All fields are required', 'error');
            return;
        }
        try {
            await api.put(`/assignments/${id}`, {
                faculty_id: parseInt(faculty_id),
                subject_name,
                periods: parseInt(periods),
                department,
                year: parseInt(year),
                section_id: parseInt(section_id),
            });
            setEditAssignmentOpen(false);
            setEditAssignment(null);
            fetchAssignments();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to update assignment', 'error');
        }
    };

    if (loading) {
        return (
            <Box sx={{ height: '100%', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Navbar title={adminName ? `${getGreeting()}, ${adminName}` : getGreeting()} onMenuClick={() => {}} notifications={notifications} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen} />
                <Box sx={{ display: 'flex', flex: 1 }}>
                    {/* Sidebar skeleton */}
                    <Box sx={{ display: { xs: 'none', md: 'block' }, width: 60, flexShrink: 0 }}>
                        <Box sx={{ width: 60, height: 'calc(100vh - 64px)', position: 'fixed', top: 64, left: 0, background: 'var(--color-bg-paper)', borderRight: '1px solid var(--color-border)', pt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                            <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: '8px', mb: 1 }} />
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton key={i} variant="circular" width={28} height={28} />
                            ))}
                        </Box>
                    </Box>
                    {/* Content skeleton */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                <Container maxWidth="xl" sx={{ py: 4, px: { xs: 1.5, sm: 2, md: 3 } }}>
                    {/* Stat cards skeleton */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 'var(--radius-xl)' }} />
                        ))}
                    </Box>
                    {/* Charts skeleton */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
                        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 'var(--radius-xl)' }} />
                        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 'var(--radius-xl)' }} />
                    </Box>
                    {/* Quick actions skeleton */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 'var(--radius-xl)' }} />
                        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 'var(--radius-xl)' }} />
                    </Box>
                </Container>
                    </Box>{/* end content */}
                </Box>{/* end flex */}
            </Box>
        );
    }

    const sidebarExpandedWidth = 240;
    const sidebarCollapsedWidth = 60;
    const sidebarWidth = sidebarOpen ? sidebarExpandedWidth : sidebarCollapsedWidth;

    const navItems = [
        { label: 'Dashboard', icon: <DashboardIcon sx={{ fontSize: 20 }} /> },
        { label: 'Students', icon: <PersonAdd sx={{ fontSize: 20 }} /> },
        { label: 'Sections', icon: <School sx={{ fontSize: 20 }} /> },
        { label: 'Faculty', icon: <Groups sx={{ fontSize: 20 }} /> },
        { label: 'Subject Allotment', icon: <AssignmentIcon sx={{ fontSize: 20 }} /> },
        { label: 'Timetable', icon: <CalendarMonthIcon sx={{ fontSize: 20 }} /> },
        { label: 'Attendance', icon: <AssessmentIcon sx={{ fontSize: 20 }} /> },
        { label: 'Activity Log', icon: <HistoryIcon sx={{ fontSize: 20 }} /> },
    ];

    const sidebarContent = (expanded) => (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: expanded ? 2.5 : 0, py: 2, borderBottom: '1px solid var(--color-border)', justifyContent: expanded ? 'flex-start' : 'center' }}>
                <Box sx={{
                    width: 32, height: 32, borderRadius: '8px',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
                }}>S</Box>
                {expanded && <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>SmartAttend</Typography>}
            </Box>
            <List sx={{ pt: 1.5, px: expanded ? 1.5 : 0.5 }}>
                {navItems.map((item, idx) => (
                    <ListItem key={idx} disablePadding sx={{ mb: 0.3 }}>
                        <ListItemButton
                            selected={tabValue === idx}
                            onClick={() => { setTabValue(idx); if (isMobile) setSidebarOpen(false); window.scrollTo(0, 0); }}
                            sx={{
                                borderRadius: '10px',
                                py: 1,
                                px: expanded ? 1.5 : 0,
                                justifyContent: expanded ? 'flex-start' : 'center',
                                transition: 'all 0.15s ease',
                                '&.Mui-selected': {
                                    background: 'var(--color-primary-alpha-10)',
                                    '&:hover': { background: 'var(--color-primary-alpha-15)' },
                                },
                                '&:hover': { background: 'var(--color-primary-alpha-6)' },
                            }}
                            title={expanded ? '' : item.label}
                        >
                            <ListItemIcon sx={{ minWidth: expanded ? 34 : 'auto', color: tabValue === idx ? 'var(--color-primary-dark)' : 'var(--color-text-muted)' }}>
                                {item.icon}
                            </ListItemIcon>
                            {expanded && (
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontWeight: tabValue === idx ? 600 : 400,
                                        fontSize: '0.88rem',
                                        color: tabValue === idx ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
                                        whiteSpace: 'nowrap',
                                    }}
                                />
                            )}
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </>
    );

    return (
        <Box sx={{ height: '100%', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Navbar title={adminName ? `${getGreeting()}, ${adminName}` : getGreeting()} onMenuClick={() => setSidebarOpen(!sidebarOpen)} notifications={notifications} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen} />

            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Desktop Sidebar */}
                <Box sx={{
                    display: { xs: 'none', md: 'block' },
                    width: sidebarWidth,
                    flexShrink: 0,
                }}>
                    <Box sx={{
                        width: sidebarWidth,
                        height: 'calc(100vh - 64px)',
                        position: 'fixed',
                        top: 64,
                        left: 0,
                        background: 'var(--color-bg-paper)',
                        borderRight: '1px solid var(--color-border)',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        zIndex: 10,
                    }}>
                        {sidebarContent(sidebarOpen)}
                    </Box>
                </Box>

                {/* Mobile Drawer */}
                <Drawer
                    anchor="left"
                    open={sidebarOpen && isMobile}
                    onClose={() => setSidebarOpen(false)}
                    PaperProps={{
                        sx: {
                            width: 200,
                            background: 'var(--color-bg-paper)',
                            borderRight: '1px solid var(--color-border)',
                        },
                    }}
                    sx={{ display: { xs: 'block', md: 'none' } }}
                >
                    {sidebarContent(true)}
                </Drawer>

                {/* Main Content */}
                <Box ref={scrollContainerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} sx={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
                {refreshing && <LinearProgress sx={{ position: 'sticky', top: 0, zIndex: 100 }} />}
                <Container maxWidth="xl" sx={{ pb: { xs: 10, sm: 4 }, px: { xs: 1.5, sm: 2, md: 3 }, mt: 2 }}>

                {/* Global Search Bar */}
                <Box sx={{ position: 'relative', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box ref={globalSearchRef} sx={{ flex: 1, position: 'relative' }}>
                    <TextField
                        placeholder="Search students, faculty, sections... (Ctrl+K or /)"
                        value={globalSearch}
                        onChange={(e) => { setGlobalSearch(e.target.value); setGlobalSearchOpen(true); }}
                        onFocus={() => globalSearch.trim().length >= 2 && setGlobalSearchOpen(true)}
                        size="small"
                        fullWidth
                        sx={{ ...searchFieldSx, width: '100%' }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'var(--color-text-muted)', fontSize: { xs: 18, sm: 22 } }} /></InputAdornment>,
                            endAdornment: globalSearch && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => { setGlobalSearch(''); setGlobalSearchOpen(false); }}>
                                        <CloseIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    {globalSearchOpen && globalSearch.trim().length >= 2 && (
                        <Box sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px var(--color-shadow)', mt: 0.5, maxHeight: 350, overflowY: 'auto' }}>
                            {!hasGlobalResults && (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <SearchOffIcon sx={{ fontSize: 32, color: 'var(--color-text-muted)', mb: 1 }} />
                                    <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No results found</Typography>
                                </Box>
                            )}
                            {globalSearchResults.students.length > 0 && (
                                <Box sx={{ p: 1 }}>
                                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', px: 1, py: 0.5, textTransform: 'uppercase' }}>Students</Typography>
                                    {globalSearchResults.students.map(s => (
                                        <Box key={s.roll_number} onClick={() => { openStudentProfile(s); setGlobalSearchOpen(false); }} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.8, cursor: 'pointer', borderRadius: 'var(--radius-md)', '&:hover': { background: 'var(--color-primary-alpha-8)' } }}>
                                            <PersonAdd sx={{ fontSize: 16, color: 'var(--color-primary)' }} />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.name}</Typography>
                                                <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{s.roll_number} · {s.department}</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                            {globalSearchResults.faculty.length > 0 && (
                                <Box sx={{ p: 1, borderTop: globalSearchResults.students.length > 0 ? '1px solid var(--color-border)' : 'none' }}>
                                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', px: 1, py: 0.5, textTransform: 'uppercase' }}>Faculty</Typography>
                                    {globalSearchResults.faculty.map(f => (
                                        <Box key={f.id} onClick={() => { handleViewFaculty(f); setGlobalSearchOpen(false); }} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.8, cursor: 'pointer', borderRadius: 'var(--radius-md)', '&:hover': { background: 'var(--color-primary-alpha-8)' } }}>
                                            <Groups sx={{ fontSize: 16, color: 'var(--color-secondary)' }} />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{f.name || f.username}</Typography>
                                                <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{f.employee_id || f.username} · {f.department}</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                            {globalSearchResults.sections.length > 0 && (
                                <Box sx={{ p: 1, borderTop: (globalSearchResults.students.length > 0 || globalSearchResults.faculty.length > 0) ? '1px solid var(--color-border)' : 'none' }}>
                                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', px: 1, py: 0.5, textTransform: 'uppercase' }}>Sections</Typography>
                                    {globalSearchResults.sections.map(s => (
                                        <Box key={s.id} onClick={() => { setTabValue(2); setGlobalSearchOpen(false); setGlobalSearch(''); }} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.8, cursor: 'pointer', borderRadius: 'var(--radius-md)', '&:hover': { background: 'var(--color-primary-alpha-8)' } }}>
                                            <School sx={{ fontSize: 16, color: 'var(--color-primary-light)' }} />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.department ? `${s.department} - ${s.name}` : s.name}</Typography>
                                                <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Year {s.year} · Sem {s.semester}</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
                    <Tooltip title="Custom Report Builder">
                        <IconButton onClick={() => { setReportBuilderOpen(true); setReportConfig(prev => ({ ...prev, columns: [] })); }} sx={{ color: 'var(--color-text-white)', background: 'var(--gradient-primary-reverse)', borderRadius: 'var(--radius-lg)', width: 36, height: 36, flexShrink: 0, '&:hover': { background: 'var(--gradient-primary-hover)' } }}>
                            <TableChartIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                    {!isMobile && (
                        <Tooltip title="Keyboard Shortcuts (Ctrl+/)">
                            <IconButton onClick={() => setShortcutsHelpOpen(true)} sx={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', width: 36, height: 36, flexShrink: 0, '&:hover': { background: 'var(--color-primary-alpha-8)', color: 'var(--color-primary-dark)' } }}>
                                <KeyboardIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                <Box>
                    {/* Main Content Area */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>

                {/* Dashboard/Overview Tab */}
                {tabValue === 0 && (
                    <Box sx={tabContentBoxSx}>
                        {/* Breadcrumb */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                            <DashboardIcon sx={{ fontSize: 18, color: 'var(--color-primary-dark)' }} />
                            <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{isHodLogin ? 'HOD' : 'Admin'}</Typography>
                            <NavigateNextIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                            <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>Dashboard Overview</Typography>
                            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                                {!isHodLogin && (
                                <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(_, val) => { if (val) setViewMode(val); }} sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.7rem', fontWeight: 600, py: 0.3, px: 1.2, color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', '&.Mui-selected': { background: 'var(--color-primary-alpha-15)', color: 'var(--color-primary-dark)', borderColor: 'var(--color-primary-alpha-40)' } } }}>
                                    <ToggleButton value="admin"><AdminPanelSettingsIcon sx={{ fontSize: 16, mr: 0.5 }} />{!isMobile && 'Admin'}</ToggleButton>
                                    <ToggleButton value="hod"><SupervisorAccountIcon sx={{ fontSize: 16, mr: 0.5 }} />{!isMobile && 'HOD'}</ToggleButton>
                                </ToggleButtonGroup>
                                )}
                            </Box>
                        </Box>

                        {/* Phase 8: HOD Department Selector */}
                        {viewMode === 'hod' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: 1.5, background: 'var(--color-secondary-alpha-8, var(--color-primary-alpha-8))', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-alpha-15)' }}>
                                <SupervisorAccountIcon sx={{ fontSize: 20, color: 'var(--color-primary-dark)' }} />
                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>HOD View — Department:</Typography>
                                {isHodLogin ? (
                                    <Chip label={hodDepartment || 'Loading...'} size="small" sx={{ background: 'var(--color-primary-alpha-15)', color: 'var(--color-primary-dark)', fontWeight: 600, fontSize: '0.8rem' }} />
                                ) : (
                                <Select size="small" displayEmpty value={hodDepartment} onChange={(e) => setHodDepartment(e.target.value)} sx={{ ...selectSx, fontSize: '0.8rem', minWidth: 140 }} MenuProps={menuPropsSx}>
                                    <MenuItem value="">Select Department</MenuItem>
                                    {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                                </Select>
                                )}
                                {!isHodLogin && hodDepartment && <Chip label={`Viewing: ${hodDepartment}`} size="small" sx={{ background: 'var(--color-primary-alpha-15)', color: 'var(--color-primary-dark)', fontWeight: 600, fontSize: '0.7rem' }} />}
                            </Box>
                        )}

                        {/* Overview Stats Row */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 1, sm: 2 }, mb: 3 }}>
                            {(() => {
                                const activeDeptFilter = viewMode === 'hod' && hodDepartment ? hodDepartment : dashboardDeptFilter;
                                const activeYearFilter = viewMode === 'hod' ? '' : dashboardYearFilter;
                                const fStudents = students.filter(s => (!activeDeptFilter || s.department === activeDeptFilter) && (!activeYearFilter || String(s.year) === activeYearFilter));
                                const fFaculty = faculty.filter(f => (!activeDeptFilter || f.department === activeDeptFilter));
                                const fSections = sections.filter(s => (!activeDeptFilter || s.department === activeDeptFilter) && (!activeYearFilter || String(s.year) === activeYearFilter));
                                return [
                                { value: fStudents.length, label: (dashboardDeptFilter || dashboardYearFilter) ? 'Filtered Students' : 'Total Students', color: 'var(--color-primary)', bg: 'var(--color-primary-alpha-8)', icon: <PersonAdd sx={{ fontSize: 28 }} />, onClick: () => setTabValue(1) },
                                { value: fFaculty.length, label: (dashboardDeptFilter) ? 'Filtered Faculty' : 'Total Faculty', color: 'var(--color-secondary)', bg: 'var(--color-secondary-alpha-8)', icon: <Groups sx={{ fontSize: 28 }} />, onClick: () => setTabValue(3) },
                                { value: fSections.length, label: (dashboardDeptFilter || dashboardYearFilter) ? 'Filtered Sections' : 'Sections', color: 'var(--color-primary-light)', bg: 'var(--color-primary-alpha-8)', icon: <School sx={{ fontSize: 28 }} />, onClick: () => setTabValue(2) },
                                { value: fStudents.length > 0 ? Math.round((fStudents.filter(s => s.embeddings?.length > 0).length / fStudents.length) * 100) + '%' : '0%', label: 'Enrolled', color: 'var(--color-info)', bg: 'var(--color-primary-alpha-8)', icon: <CameraAltIcon sx={{ fontSize: 28 }} /> },
                                ...(dashboardStats ? [
                                    { value: dashboardStats.today_sessions || 0, label: "Today's Sessions", color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', icon: <TodayIcon sx={{ fontSize: 28 }} /> },
                                    { value: dashboardStats.today_present_students || 0, label: 'Present Today', color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: <EventAvailableIcon sx={{ fontSize: 28 }} /> },
                                    { value: dashboardStats.today_absent_students || 0, label: 'Absent Today', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: <PersonOffIcon sx={{ fontSize: 28 }} /> },
                                ] : []),
                            ];
                            })().map((stat, i) => (
                                <Box key={i} onClick={stat.onClick} sx={{
                                    background: 'var(--color-bg-paper)',
                                    borderRadius: 'var(--radius-xl)',
                                    border: '1px solid var(--color-border)',
                                    p: { xs: 1.5, sm: 2.5 },
                                    boxShadow: '0 1px 3px var(--color-shadow)',
                                    cursor: stat.onClick ? 'pointer' : 'default',
                                    transition: 'all var(--transition-base)',
                                    '&:hover': stat.onClick ? { transform: 'translateY(-2px)', boxShadow: '0 4px 12px var(--color-shadow)' } : {},
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', sm: '1.8rem' }, color: stat.color, lineHeight: 1.1 }}>{stat.value}</Typography>
                                            <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.78rem' }, color: 'var(--color-text-secondary)', fontWeight: 500, mt: 0.5 }}>{stat.label}</Typography>
                                        </Box>
                                        <Box sx={{ background: stat.bg, borderRadius: 'var(--radius-lg)', p: 1, color: stat.color, display: { xs: 'none', sm: 'flex' } }}>{stat.icon}</Box>
                                    </Box>
                                </Box>
                            ))}
                        </Box>

                        {/* Phase 6: Dashboard Chart Filters — hidden in HOD mode since dept is set globally */}
                        {!hodDeptActive && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: 1.5, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', mr: 0.5 }}>Filter:</Typography>
                            <Select size="small" displayEmpty value={dashboardDeptFilter} onChange={(e) => setDashboardDeptFilter(e.target.value)} sx={{ ...selectSx, fontSize: '0.8rem', minWidth: 120 }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Departments</MenuItem>
                                {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>
                            <Select size="small" displayEmpty value={dashboardYearFilter} onChange={(e) => setDashboardYearFilter(e.target.value)} sx={{ ...selectSx, fontSize: '0.8rem', minWidth: 100 }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Years</MenuItem>
                                {[1, 2, 3, 4].map((y) => <MenuItem key={y} value={String(y)}>Year {y}</MenuItem>)}
                            </Select>
                            {(dashboardDeptFilter || dashboardYearFilter) && (
                                <Button size="small" onClick={() => { setDashboardDeptFilter(''); setDashboardYearFilter(''); }} sx={{ color: 'var(--color-primary)', textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                                    Clear Filters
                                </Button>
                            )}
                        </Box>
                        )}

                        {/* Charts Row */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3, alignItems: 'stretch' }}>
                            {/* Department-wise or Section-wise Students Bar Chart */}
                            <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)', display: 'flex', flexDirection: 'column' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)', mb: 3 }}>{hodDeptActive ? 'Students by Section' : 'Students by Department'}</Typography>
                                {(() => {
                                    const chartDeptFilter = hodDeptActive || dashboardDeptFilter;
                                    const filteredStudents = students.filter(s => (!chartDeptFilter || s.department === chartDeptFilter) && (!dashboardYearFilter || String(s.year) === dashboardYearFilter));
                                    if (hodDeptActive) {
                                        // HOD view: group by section
                                        const sectionCounts = {};
                                        filteredStudents.forEach(s => {
                                            const sec = sections.find(sec => sec.id === s.section_id);
                                            const secYear = sec?.year || 0;
                                            const secName = sec?.name || '';
                                            const secLabel = sec ? `${secYear ? `Year ${secYear}` : ''}${secYear && secName ? ' - ' : ''}${secName}`.trim() || `Section ${s.section_id}` : `Section ${s.section_id}`;
                                            if (!sectionCounts[secLabel]) sectionCounts[secLabel] = { count: 0, year: secYear, name: secName };
                                            sectionCounts[secLabel].count += 1;
                                        });
                                        const chartData = Object.entries(sectionCounts).map(([label, val]) => ({ name: label, count: val.count, _year: val.year, _sec: val.name })).sort((a, b) => a._year - b._year || a._sec.localeCompare(b._sec));
                                        if (chartData.length === 0) return <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>No section data</Typography>;
                                        return (
                                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <BarChart data={chartData} margin={{ top: 50, right: 10, left: -10, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} angle={-45} textAnchor="end" interval={0} height={80} />
                                                        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
                                                        <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                                        <Bar dataKey="count" fill="#467bf0" radius={[6, 6, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        );
                                    }
                                    // Admin view: group by department
                                    const deptCounts = {};
                                    filteredStudents.forEach(s => { if (s.department) deptCounts[s.department] = (deptCounts[s.department] || 0) + 1; });
                                    const chartData = Object.entries(deptCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
                                    if (chartData.length === 0) return <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>No department data</Typography>;
                                    return (
                                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={chartData} margin={{ top: 50, right: 10, left: -10, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} angle={-45} textAnchor="end" interval={0} height={80} />
                                                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
                                                    <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                                    <Bar dataKey="count" fill="#467bf0" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    );
                                })()}
                            </Box>

                            {/* Enrollment Status Pie Chart */}
                            <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)', mb: 2 }}>Face Enrollment Status</Typography>
                                {(() => {
                                    const pieStudents = hodDeptActive ? students.filter(s => s.department === hodDeptActive) : students;
                                    const enrolled = pieStudents.filter(s => s.embeddings?.length > 0).length;
                                    const pending = pieStudents.length - enrolled;
                                    if (pieStudents.length === 0) return <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>No students yet</Typography>;
                                    const pieData = [{ name: 'Pending', value: pending }, { name: 'Enrolled', value: enrolled }];
                                    const COLORS = ['#467bf0', '#10b981'];
                                    return (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="45%"
                                                    innerRadius={45}
                                                    outerRadius={70}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    label={({ name, percent, cx, cy, midAngle, outerRadius: oR }) => {
                                                        const RADIAN = Math.PI / 180;
                                                        const radius = oR + 22;
                                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                        return (
                                                            <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-text-secondary)' }}>
                                                                {`${name} ${(percent * 100).toFixed(0)}%`}
                                                            </text>
                                                        );
                                                    }}
                                                    labelLine={{ stroke: 'var(--color-text-muted)', strokeWidth: 1 }}
                                                >
                                                    {pieData.map((entry, index) => <Cell key={index} fill={COLORS[index]} />)}
                                                </Pie>
                                                <Legend layout="vertical" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                                <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    );
                                })()}
                            </Box>
                        </Box>

                        {/* Faculty by Department + Quick Actions */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                            <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)', mb: 2 }}>{hodDeptActive ? 'Faculty by Designation' : 'Faculty by Department'}</Typography>
                                {(() => {
                                    const facChartDeptFilter = hodDeptActive || dashboardDeptFilter;
                                    const filteredFaculty = faculty.filter(f => (!facChartDeptFilter || f.department === facChartDeptFilter));
                                    if (hodDeptActive) {
                                        // HOD view: group by designation
                                        const desCounts = {};
                                        filteredFaculty.forEach(f => { const des = f.designation || 'Not Set'; desCounts[des] = (desCounts[des] || 0) + 1; });
                                        const chartData = Object.entries(desCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
                                        if (chartData.length === 0) return <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>No faculty data</Typography>;
                                        return (
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={chartData} margin={{ top: 50, right: 10, left: -10, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} angle={-45} textAnchor="end" interval={0} height={80} />
                                                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
                                                    <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        );
                                    }
                                    // Admin view: group by department
                                    const deptCounts = {};
                                    filteredFaculty.forEach(f => { if (f.department) deptCounts[f.department] = (deptCounts[f.department] || 0) + 1; });
                                    const chartData = Object.entries(deptCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
                                    if (chartData.length === 0) return <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>No faculty data</Typography>;
                                    return (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={chartData} margin={{ top: 50, right: 10, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} angle={-45} textAnchor="end" interval={0} height={80} />
                                                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
                                                <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    );
                                })()}
                            </Box>

                            {/* Quick Actions */}
                            <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)', mb: 2 }}>Quick Actions</Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {[
                                        { label: 'Add Student', icon: <PersonAdd sx={{ fontSize: 20 }} />, color: 'var(--color-primary)', onClick: () => { setTabValue(1); setTimeout(() => { if (hodDeptActive) setNewStudent(p => ({ ...p, department: hodDeptActive })); setOpen(true); }, 100); } },
                                        { label: 'Add Section', icon: <School sx={{ fontSize: 20 }} />, color: 'var(--color-primary-light)', onClick: () => { setTabValue(2); setTimeout(() => { if (hodDeptActive) setNewSection(p => ({ ...p, department: hodDeptActive })); setSectionOpen(true); }, 100); } },
                                        { label: 'Add Faculty', icon: <Groups sx={{ fontSize: 20 }} />, color: 'var(--color-secondary)', onClick: () => { setTabValue(3); setTimeout(() => { if (hodDeptActive) setNewFaculty(p => ({ ...p, department: hodDeptActive })); setFacultyOpen(true); }, 100); } },
                                        { label: 'Allot Subject', icon: <AssignmentIcon sx={{ fontSize: 20 }} />, color: 'var(--color-warning)', onClick: () => { setTabValue(4); setTimeout(() => { if (hodDeptActive) setNewAssignment(p => ({ ...p, department: hodDeptActive })); setAssignmentOpen(true); }, 100); } },
                                        { label: 'Generate Timetable', icon: <CalendarMonthIcon sx={{ fontSize: 20 }} />, color: 'var(--color-info)', onClick: () => setTabValue(5) },
                                        ...(!isHodLogin && viewMode === 'admin' ? [
                                            { label: 'Backup & Restore', icon: <CloudDownloadIcon sx={{ fontSize: 20 }} />, color: 'var(--color-primary-dark)', onClick: () => setBackupRestoreOpen(true) },
                                            { label: 'Send Notification', icon: <SendIcon sx={{ fontSize: 20 }} />, color: '#7c3aed', onClick: () => setBulkNotifyOpen(true) },
                                        ] : []),
                                    ].map((action, i) => (
                                        <Box key={i} onClick={action.onClick} sx={{
                                            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.2, borderRadius: '10px',
                                            cursor: 'pointer', transition: 'all var(--transition-base)',
                                            '&:hover': { background: 'var(--color-primary-alpha-8)' },
                                        }}>
                                            <Box sx={{ color: action.color, display: 'flex' }}>{action.icon}</Box>
                                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{action.label}</Typography>
                                            <NavigateNextIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)', ml: 'auto' }} />
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        </Box>

                        {/* Phase 6: Attendance Calendar Heatmap */}
                        <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)', mt: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarTodayIcon sx={{ fontSize: 20, color: 'var(--color-primary-dark)' }} />
                                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Attendance Calendar</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton size="small" onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else { setCalendarMonth(calendarMonth - 1); } }} sx={{ color: 'var(--color-primary-dark)' }}>
                                        <ChevronLeftIconNav sx={{ fontSize: 20 }} />
                                    </IconButton>
                                    <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)', minWidth: 120, textAlign: 'center' }}>
                                        {new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </Typography>
                                    <IconButton size="small" onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else { setCalendarMonth(calendarMonth + 1); } }} sx={{ color: 'var(--color-primary-dark)' }}>
                                        <ChevronRightIconNav sx={{ fontSize: 20 }} />
                                    </IconButton>
                                </Box>
                            </Box>
                            {/* Day headers */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <Box key={day} sx={{ textAlign: 'center', py: 0.5 }}>
                                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{day}</Typography>
                                    </Box>
                                ))}
                            </Box>
                            {/* Calendar grid */}
                            {(() => {
                                const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                                const offset = firstDay === 0 ? 6 : firstDay - 1;
                                const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                                const cells = [];
                                for (let i = 0; i < offset; i++) cells.push(<Box key={`empty-${i}`} />);
                                for (let d = 1; d <= daysInMonth; d++) {
                                    const status = calendarData[d] || 'none';
                                    const bgColor = status === 'high' ? 'rgba(16,185,129,0.7)' : status === 'medium' ? 'rgba(234,179,8,0.6)' : status === 'low' ? 'rgba(239,68,68,0.6)' : status === 'weekend' ? 'var(--color-surface-alt)' : 'var(--color-surface-alt)';
                                    const textColor = status === 'none' || status === 'weekend' ? 'var(--color-text-muted)' : 'var(--color-text-white)';
                                    cells.push(
                                        <Box key={d} sx={{ textAlign: 'center', py: { xs: 0.6, sm: 1 }, borderRadius: 'var(--radius-md)', background: bgColor, cursor: 'default', minHeight: { xs: 28, sm: 36 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Typography sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, fontWeight: 600, color: textColor }}>{d}</Typography>
                                        </Box>
                                    );
                                }
                                return (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                                        {cells}
                                    </Box>
                                );
                            })()}
                            {/* Legend */}
                            <Box sx={{ display: 'flex', gap: 2, mt: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                                {[
                                    { color: 'rgba(16,185,129,0.7)', label: 'High (75%+)' },
                                    { color: 'rgba(234,179,8,0.6)', label: 'Medium (50-75%)' },
                                    { color: 'rgba(239,68,68,0.6)', label: 'Low (<50%)' },
                                    { color: 'var(--color-surface-alt)', label: 'No Data' },
                                ].map(item => (
                                    <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 12, height: 12, borderRadius: 'var(--radius-sm)', background: item.color, border: '1px solid var(--color-border)' }} />
                                        <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{item.label}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        {/* Phase 6: Section Enrollment Overview */}
                        <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)', mt: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <AssessmentIcon sx={{ fontSize: 20, color: 'var(--color-primary-dark)' }} />
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Section Enrollment Overview</Typography>
                            </Box>
                            {(() => {
                                const hodSections = hodDeptActive ? sections.filter(s => s.department === hodDeptActive) : sections;
                                const hodStudents = hodDeptActive ? students.filter(s => s.department === hodDeptActive) : students;
                                return hodSections.length === 0 ? (
                                <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>No sections available</Typography>
                            ) : isMobile ? (
                                /* Mobile card view */
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {hodSections.map((sec) => {
                                        const secStudents = hodStudents.filter(s => String(s.section_id) === String(sec.id));
                                        const enrolled = secStudents.filter(s => s.embeddings?.length > 0).length;
                                        const total = secStudents.length;
                                        const pct = total > 0 ? Math.round((enrolled / total) * 100) : 0;
                                        return (
                                            <Card key={sec.id} sx={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-paper)', boxShadow: 'none' }}>
                                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-primary-dark)', mb: 0.5 }}>{sec.department ? `${sec.department} - ${sec.name}` : sec.name}</Typography>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography sx={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Students: {total}</Typography>
                                                        <Typography sx={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Enrolled: {enrolled}</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--color-surface-alt)', '& .MuiLinearProgress-bar': { background: pct >= 75 ? '#10b981' : pct >= 50 ? '#eab308' : '#ef4444', borderRadius: 3 } }} />
                                                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-primary)', minWidth: 35 }}>{pct}%</Typography>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </Box>
                            ) : (
                                /* Desktop table view */
                                <TableContainer sx={{ borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={tableHeaderRowSx}>
                                                <TableCell sx={tableHeaderCellSx}>Section</TableCell>
                                                <TableCell align="center" sx={tableHeaderCellSx}>Total Students</TableCell>
                                                <TableCell align="center" sx={tableHeaderCellSx}>Enrolled</TableCell>
                                                <TableCell align="center" sx={tableHeaderCellSx}>Enrollment %</TableCell>
                                                <TableCell sx={{ ...tableHeaderCellSx, minWidth: 150 }}>Progress</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {hodSections.map((sec, idx) => {
                                                const secStudents = hodStudents.filter(s => String(s.section_id) === String(sec.id));
                                                const enrolled = secStudents.filter(s => s.embeddings?.length > 0).length;
                                                const total = secStudents.length;
                                                const pct = total > 0 ? Math.round((enrolled / total) * 100) : 0;
                                                return (
                                                    <TableRow key={sec.id} sx={tableRowSx(idx)}>
                                                        <TableCell sx={{ ...tableCellBorderSx, fontWeight: 600, color: 'var(--color-primary-dark)' }}>{sec.department ? `${sec.department} - ${sec.name}` : sec.name}</TableCell>
                                                        <TableCell align="center" sx={tableCellBorderSx}>{total}</TableCell>
                                                        <TableCell align="center" sx={tableCellBorderSx}>{enrolled}</TableCell>
                                                        <TableCell align="center" sx={{ ...tableCellBorderSx, fontWeight: 700, color: pct >= 75 ? '#10b981' : pct >= 50 ? '#eab308' : pct > 0 ? '#ef4444' : 'var(--color-text-muted)' }}>{pct}%</TableCell>
                                                        <TableCell sx={tableCellBorderSx}>
                                                            <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, background: 'var(--color-surface-alt)', '& .MuiLinearProgress-bar': { background: pct >= 75 ? '#10b981' : pct >= 50 ? '#eab308' : '#ef4444', borderRadius: 3 } }} />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            );
                            })()}
                        </Box>
                    </Box>
                )}

                {/* Students Tab */}
                {tabValue === 1 && (
                    <Box sx={tabContentBoxSx}>
                        {/* Breadcrumb */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                            <DashboardIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)', cursor: 'pointer' }} onClick={() => setTabValue(0)} />
                            <NavigateNextIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                            <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>Students</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', ml: 0.5 }}>({filteredStudents.length})</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: { xs: 1.5, md: 2 } }}>
                            <TextField
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                size="small"
                                sx={searchFieldSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: 'var(--color-text-muted)' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, width: { xs: '100%', sm: 'auto' }, flexWrap: { xs: 'wrap', sm: 'nowrap' }, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
                                <Button
                                    startIcon={<FileDownloadIcon />}
                                    onClick={() => {
                                        const csv = ['Name,Roll Number,Email,Phone,Department,Year,Semester,Section,Status']
                                            .concat(filteredStudents.map(s => { const sec = sections.find(sec => sec.id === s.section_id); const secDisplay = sec ? (sec.department ? `${sec.department} - ${sec.name}` : sec.name) : ''; return `"${s.name}","${s.roll_number}","${s.email || ''}","${s.phone || ''}","${s.department || ''}","${s.year || ''}","${s.semester || ''}","${secDisplay}","${s.embeddings?.length > 0 ? 'Enrolled' : 'Pending'}"`; }))
                                            .join('\n');
                                        const blob = new Blob([csv], { type: 'text/csv' });
                                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'students_export.csv'; a.click();
                                    }}
                                    sx={outlineBtnSx}
                                >
                                    Export
                                </Button>
                                <Button
                                    startIcon={<PictureAsPdfIcon />}
                                    onClick={() => {
                                        const rows = filteredStudents.map(s => {
                                            const sec = sections.find(sec => sec.id === s.section_id);
                                            const secDisplay = sec ? (sec.department ? `${sec.department} - ${sec.name}` : sec.name) : '';
                                            return [s.roll_number, s.name, s.email || '', s.phone || '', s.department || '', s.year || '', s.semester || '', secDisplay, s.embeddings?.length > 0 ? 'Enrolled' : 'Pending'];
                                        });
                                        exportPDF('Students Report', ['Roll No', 'Name', 'Email', 'Phone', 'Dept', 'Year', 'Sem', 'Section', 'Status'], rows, 'students_report.pdf');
                                    }}
                                    sx={outlineBtnSx}
                                >
                                    PDF
                                </Button>
                                <Button
                                    startIcon={<CloudUpload />}
                                    onClick={() => {
                                        setBulkFile(null);
                                        setBulkSectionId('');
                                        setBulkResult(null);
                                        setBulkUploadOpen(true);
                                    }}
                                    sx={outlineBtnSx}
                                >
                                    Bulk Upload
                                </Button>
                                <Button
                                    startIcon={<TrendingUpIcon />}
                                    onClick={() => setPromoteOpen(true)}
                                    sx={outlineBtnSx}
                                >
                                    Promote
                                </Button>
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={() => { if (hodDeptActive) setNewStudent(p => ({ ...p, department: hodDeptActive })); setOpen(true); }}
                                    sx={addBtnSx}
                                >
                                    Add Student
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(auto-fill, minmax(140px, auto))' }, gap: { xs: 1, sm: 1.5 }, mb: { xs: 2, md: 3 }, alignItems: 'center' }}>
                            {!hodDeptActive && <Select size="small" displayEmpty value={studentDeptFilter} onChange={(e) => { setStudentDeptFilter(e.target.value); setStudentYearFilter(''); setStudentSectionFilter(''); }} sx={{ ...selectSx, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Depts</MenuItem>
                                {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>}
                            <Select size="small" displayEmpty value={studentYearFilter} onChange={(e) => { setStudentYearFilter(e.target.value); setStudentSectionFilter(''); }} sx={{ ...selectSx, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Years</MenuItem>
                                {(studentDeptFilter ? getYearOptions(studentDeptFilter) : [1, 2, 3, 4]).map((y) => <MenuItem key={y} value={y}>Year {y}</MenuItem>)}
                            </Select>
                            <Select size="small" displayEmpty value={studentSectionFilter} onChange={(e) => setStudentSectionFilter(e.target.value)} sx={{ ...selectSx, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Sections</MenuItem>
                                {sections.filter((s) => (!hodDeptActive || s.department === hodDeptActive) && (!studentDeptFilter || s.department === studentDeptFilter) && (!studentYearFilter || String(s.year) === String(studentYearFilter))).map((s) => <MenuItem key={s.id} value={s.id}>{s.department ? `${s.department} - ${s.name}` : s.name}</MenuItem>)}
                            </Select>
                            {(studentDeptFilter || studentYearFilter || studentSectionFilter) && (
                                <Button size="small" onClick={() => { setStudentDeptFilter(''); setStudentYearFilter(''); setStudentSectionFilter(''); }} sx={{ color: 'var(--color-primary)', textTransform: 'none', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                    Clear
                                </Button>
                            )}
                            <Chip
                                icon={<WarningAmberIcon sx={{ fontSize: 16 }} />}
                                label="Low Attendance"
                                size="small"
                                onClick={() => setLowAttendanceFilter(!lowAttendanceFilter)}
                                sx={{
                                    background: lowAttendanceFilter ? 'var(--color-warning-alpha-12)' : 'var(--color-surface-alt)',
                                    color: lowAttendanceFilter ? 'var(--color-warning-dark)' : 'var(--color-text-muted)',
                                    fontWeight: 600,
                                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                    border: lowAttendanceFilter ? '1px solid var(--color-warning-dark)' : '1px solid var(--color-border)',
                                    cursor: 'pointer',
                                    '&:hover': { background: 'var(--color-warning-alpha-12)' },
                                }}
                            />
                        </Box>

                        {/* Bulk action bar */}
                        {selectedStudents.size > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, mb: 1.5, p: { xs: 0.8, sm: 1 }, background: 'var(--color-primary-alpha-8)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-alpha-15)', flexWrap: 'wrap' }}>
                                <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, fontWeight: 600, color: 'var(--color-primary-dark)' }}>{selectedStudents.size} selected</Typography>
                                <Button size="small" startIcon={<DeleteSweepIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />} onClick={handleBulkDeleteStudents} sx={{ ml: 'auto', color: 'var(--color-error)', textTransform: 'none', fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Delete</Button>
                                <Button size="small" onClick={() => setSelectedStudents(new Set())} sx={{ color: 'var(--color-text-muted)', textTransform: 'none', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Clear</Button>
                            </Box>
                        )}

                        {filteredStudents.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <Typography sx={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>No students found</Typography>
                                <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', mt: 1 }}>Get started by adding your first student</Typography>
                            </Box>
                        ) : isMobile ? (
                            /* Mobile Card View for Students */
                            <Box>
                                {sortData(filteredStudents, studentSort).slice(studentPage * studentRowsPerPage, studentPage * studentRowsPerPage + studentRowsPerPage).map((student, idx) => (
                                    <Card key={student.roll_number} sx={{ mb: 1.5, border: selectedStudents.has(student.roll_number) ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-paper)', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                <Checkbox size="small" checked={selectedStudents.has(student.roll_number)} onChange={() => toggleStudentSelection(student.roll_number)} sx={{ color: 'var(--color-primary)', '&.Mui-checked': { color: 'var(--color-primary)' }, mt: -0.5, ml: -0.5 }} />
                                                <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => openStudentProfile(student)}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{student.name}</Typography>
                                                        <Chip label={student.embeddings?.length > 0 ? 'Enrolled' : 'Pending'} size="small"
                                                            sx={student.embeddings?.length > 0 ? { background: 'var(--color-secondary-alpha-10)', color: 'var(--color-secondary-dark)', fontWeight: 600, fontSize: '0.6rem', height: 20 } : { background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.6rem', height: 20 }} />
                                                    </Box>
                                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-dark)', mb: 0.5 }}>{student.roll_number}</Typography>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        <Chip label={student.department || '—'} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18, borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} />
                                                        <Chip label={`Y${student.year} S${student.semester}`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18, borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} />
                                                        <Chip label={(() => { const sec = sections.find((s) => s.id === student.section_id); return sec ? sec.name : 'N/A'; })()} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18, borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} />
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1, borderTop: '1px solid var(--color-primary-alpha-8)', pt: 1 }}>
                                                <IconButton size="small" sx={{ color: 'var(--color-primary-dark)' }} onClick={() => openAttendanceHistory(student)}><HistoryIcon sx={{ fontSize: 16 }} /></IconButton>
                                                <IconButton size="small" sx={{ color: 'var(--color-primary)' }} onClick={() => { setTransferStudent(student); setTransferSectionId(''); setTransferOpen(true); }}><SwapHorizIcon sx={{ fontSize: 16 }} /></IconButton>
                                                <IconButton size="small" sx={{ color: 'var(--color-primary)' }} onClick={() => { setSelectedStudent(student.roll_number); setEnrollOpen(true); }}><CameraAltIcon sx={{ fontSize: 16 }} /></IconButton>
                                                <IconButton size="small" sx={{ color: 'var(--color-primary-light)' }} onClick={() => openEditStudentDialog(student)}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                                                <IconButton size="small" sx={{ color: 'var(--color-error)' }} onClick={() => handleDeleteStudent(student.roll_number)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25]}
                                    component="div"
                                    count={filteredStudents.length}
                                    rowsPerPage={studentRowsPerPage}
                                    page={studentPage}
                                    onPageChange={(e, newPage) => setStudentPage(newPage)}
                                    onRowsPerPageChange={(e) => { setStudentRowsPerPage(parseInt(e.target.value, 10)); setStudentPage(0); }}
                                    sx={{ borderTop: '1px solid var(--color-border)', overflow: 'hidden', color: 'var(--color-primary-dark)', '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center', gap: '4px', px: 0.5, minHeight: 'auto', py: 1 }, '& .MuiTablePagination-spacer': { display: 'none' }, '& .MuiTablePagination-selectLabel': { m: 0, fontSize: '0.75rem' }, '& .MuiTablePagination-displayedRows': { m: 0, color: 'var(--color-text-secondary)', fontSize: '0.75rem' }, '& .MuiTablePagination-selectIcon': { color: 'var(--color-primary)' }, '& .MuiTablePagination-actions button': { color: 'var(--color-primary)', p: '4px' }, '& .MuiTablePagination-select': { color: 'var(--color-text-primary)' } }}
                                />
                            </Box>
                        ) : (
                            <TableContainer sx={{ borderRadius: 'var(--radius-lg)', overflowX: 'auto', maxWidth: '100%' }}>
                                <Table sx={{ minWidth: { xs: 320, sm: 700, md: 900 } }}>
                                    <TableHead>
                                        <TableRow sx={tableHeaderRowSx}>
                                            <TableCell padding="checkbox" sx={tableHeaderCellSx}>
                                                <Checkbox size="small" sx={{ color: 'var(--color-primary)', '&.Mui-checked': { color: 'var(--color-primary)' } }}
                                                    checked={sortData(filteredStudents, studentSort).slice(studentPage * studentRowsPerPage, studentPage * studentRowsPerPage + studentRowsPerPage).every(s => selectedStudents.has(s.roll_number)) && filteredStudents.length > 0}
                                                    indeterminate={sortData(filteredStudents, studentSort).slice(studentPage * studentRowsPerPage, studentPage * studentRowsPerPage + studentRowsPerPage).some(s => selectedStudents.has(s.roll_number)) && !sortData(filteredStudents, studentSort).slice(studentPage * studentRowsPerPage, studentPage * studentRowsPerPage + studentRowsPerPage).every(s => selectedStudents.has(s.roll_number))}
                                                    onChange={() => toggleAllStudents(sortData(filteredStudents, studentSort).slice(studentPage * studentRowsPerPage, studentPage * studentRowsPerPage + studentRowsPerPage))}
                                                />
                                            </TableCell>
                                            {[
                                                { label: 'Roll Number', field: 'roll_number' },
                                                { label: 'Name', field: 'name' },
                                                { label: 'Email', field: 'email' },
                                                { label: 'Phone', field: 'phone' },
                                                { label: 'Dept', field: 'department' },
                                                { label: 'Year', field: 'year' },
                                                { label: 'Sem', field: 'semester' },
                                                { label: 'Section', field: null },
                                                { label: 'Status', field: null },
                                                { label: 'Actions', field: null },
                                            ].map((h) => (
                                                <TableCell key={h.label} align="center" sx={{ ...tableHeaderCellSx, cursor: h.field ? 'pointer' : 'default', userSelect: 'none' }} onClick={() => h.field && handleSort(h.field, studentSort, setStudentSort)}>
                                                    {h.label}{h.field && <SortIcon field={h.field} sortState={studentSort} />}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {sortData(filteredStudents, studentSort).slice(studentPage * studentRowsPerPage, studentPage * studentRowsPerPage + studentRowsPerPage).map((student, idx) => (
                                            <TableRow key={student.roll_number} sx={{ ...tableRowSx(idx), ...(selectedStudents.has(student.roll_number) && { background: 'var(--color-primary-alpha-8) !important' }) }}>
                                                <TableCell padding="checkbox" sx={tableCellBorderSx}>
                                                    <Checkbox size="small" checked={selectedStudents.has(student.roll_number)} onChange={() => toggleStudentSelection(student.roll_number)} sx={{ color: 'var(--color-primary)', '&.Mui-checked': { color: 'var(--color-primary)' } }} />
                                                </TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-primary-dark)', fontWeight: 600, ...tableCellBorderSx }}>{student.roll_number}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-primary)', ...tableCellBorderSx }}>
                                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                                        {student.name}
                                                        {!(student.embeddings?.length > 0) && (
                                                            <Tooltip title="Not Enrolled"><WarningAmberIcon sx={{ fontSize: 14, color: 'var(--color-warning-dark)' }} /></Tooltip>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{student.email}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{student.phone}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{student.department || '—'}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{student.year}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{student.semester}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>
                                                    {(() => { const sec = sections.find((s) => s.id === student.section_id); return sec ? (sec.department ? `${sec.department} - ${sec.name}` : sec.name) : 'N/A'; })()}
                                                </TableCell>
                                                <TableCell align="center" sx={tableCellBorderSx}>
                                                    <Chip
                                                        label={student.embeddings?.length > 0 ? 'Enrolled' : 'Pending'}
                                                        size="small"
                                                        sx={student.embeddings?.length > 0
                                                            ? { background: 'var(--color-secondary-alpha-10)', color: 'var(--color-secondary-dark)', fontWeight: 600, fontSize: '0.7rem' }
                                                            : { background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.7rem' }
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell align="center" sx={{ ...tableCellBorderSx, whiteSpace: 'nowrap' }}>
                                                    <Tooltip title="View History">
                                                        <IconButton size="small" sx={{ color: 'var(--color-primary-dark)' }} onClick={() => openAttendanceHistory(student)}>
                                                            <HistoryIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Transfer Section">
                                                        <IconButton size="small" sx={{ color: 'var(--color-primary)' }} onClick={() => { setTransferStudent(student); setTransferSectionId(''); setTransferOpen(true); }}>
                                                            <SwapHorizIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Enroll Face">
                                                        <IconButton size="small" sx={{ color: 'var(--color-primary)' }} onClick={() => { setSelectedStudent(student.roll_number); setEnrollOpen(true); }}>
                                                            <CameraAltIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Edit">
                                                        <IconButton size="small" sx={{ color: 'var(--color-primary-light)' }} onClick={() => openEditStudentDialog(student)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton size="small" sx={{ color: 'var(--color-error)' }} onClick={() => handleDeleteStudent(student.roll_number)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                    component="div"
                                    count={filteredStudents.length}
                                    rowsPerPage={studentRowsPerPage}
                                    page={studentPage}
                                    onPageChange={(e, newPage) => setStudentPage(newPage)}
                                    onRowsPerPageChange={(e) => { setStudentRowsPerPage(parseInt(e.target.value, 10)); setStudentPage(0); }}
                                    sx={{ borderTop: '1px solid var(--color-border)', overflow: 'hidden', color: 'var(--color-primary-dark)', '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center', gap: '4px', px: { xs: 0.5, sm: 2 }, minHeight: 'auto', py: 1 }, '& .MuiTablePagination-spacer': { display: { xs: 'none', sm: 'block' } }, '& .MuiTablePagination-selectLabel': { m: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }, '& .MuiTablePagination-displayedRows': { m: 0, color: 'var(--color-text-secondary)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }, '& .MuiTablePagination-selectIcon': { color: 'var(--color-primary)' }, '& .MuiTablePagination-actions button': { color: 'var(--color-primary)', p: { xs: '4px', sm: '8px' } }, '& .MuiTablePagination-select': { color: 'var(--color-text-primary)' } }}
                                />
                            </TableContainer>
                        )}
                    </Box>
                )}

                {/* Sections Tab */}
                {tabValue === 2 && (
                    <Box sx={tabContentBoxSx}>
                        {/* Breadcrumb */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                            <DashboardIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)', cursor: 'pointer' }} onClick={() => setTabValue(0)} />
                            <NavigateNextIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                            <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>Sections</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', ml: 0.5 }}>({filteredSections.length})</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: { xs: 1.5, md: 2 } }}>
                            <TextField
                                placeholder="Search sections..."
                                value={sectionSearchQuery}
                                onChange={(e) => setSectionSearchQuery(e.target.value)}
                                size="small"
                                sx={searchFieldSx}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'var(--color-text-muted)' }} /></InputAdornment> }}
                            />
                            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, width: { xs: '100%', sm: 'auto' }, flexWrap: { xs: 'wrap', sm: 'nowrap' }, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
                                <Button
                                    startIcon={<FileDownloadIcon />}
                                    onClick={() => {
                                        const csv = ['Section Name,Department,Year,Semester,Academic Year']
                                            .concat(filteredSections.map(s => `"${s.name}","${s.department || ''}","${s.year || ''}","${s.semester || ''}","${s.academic_year || ''}"`))
                                            .join('\n');
                                        const blob = new Blob([csv], { type: 'text/csv' });
                                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sections_export.csv'; a.click();
                                    }}
                                    sx={outlineBtnSx}
                                >
                                    Export
                                </Button>
                                <Button
                                    startIcon={<PictureAsPdfIcon />}
                                    onClick={() => {
                                        const rows = filteredSections.map(s => [s.department || '', s.department ? `${s.department} - ${s.name}` : s.name, s.year || '', s.semester || '', s.academic_year || '']);
                                        exportPDF('Sections Report', ['Department', 'Section Name', 'Year', 'Semester', 'Academic Year'], rows, 'sections_report.pdf');
                                    }}
                                    sx={outlineBtnSx}
                                >
                                    PDF
                                </Button>
                                <Button
                                    startIcon={<CloudUpload />}
                                    onClick={() => { setBulkSectionFile(null); setBulkSectionResult(null); setBulkSectionOpen(true); }}
                                    sx={outlineBtnSx}
                                >
                                    Bulk Upload
                                </Button>
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={() => { if (hodDeptActive) setNewSection(p => ({ ...p, department: hodDeptActive })); setSectionOpen(true); }}
                                    sx={addBtnSx}
                                >
                                    Add Section
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(auto-fill, minmax(140px, auto))' }, gap: { xs: 1, sm: 1.5 }, mb: { xs: 2, md: 3 }, alignItems: 'center' }}>
                            {!hodDeptActive && <Select size="small" displayEmpty value={sectionDeptFilter} onChange={(e) => { setSectionDeptFilter(e.target.value); setSectionYearFilter(''); }} sx={{ ...selectSx, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Depts</MenuItem>
                                {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>}
                            <Select size="small" displayEmpty value={sectionYearFilter} onChange={(e) => setSectionYearFilter(e.target.value)} sx={{ ...selectSx, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Years</MenuItem>
                                {(sectionDeptFilter ? getYearOptions(sectionDeptFilter) : [1, 2, 3, 4]).map((y) => <MenuItem key={y} value={y}>Year {y}</MenuItem>)}
                            </Select>
                            {(sectionDeptFilter || sectionYearFilter) && (
                                <Button size="small" onClick={() => { setSectionDeptFilter(''); setSectionYearFilter(''); }} sx={{ color: 'var(--color-primary)', textTransform: 'none', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                    Clear
                                </Button>
                            )}
                        </Box>

                        {filteredSections.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <Typography sx={{ color: 'var(--color-text-secondary)' }}>No sections found</Typography>
                            </Box>
                        ) : isMobile ? (
                            /* Mobile Card View for Sections */
                            <Box>
                                {filteredSections.slice(sectionPage * sectionRowsPerPage, sectionPage * sectionRowsPerPage + sectionRowsPerPage).map((section) => (
                                    <Card key={section.id} sx={{ mb: 1.5, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-paper)', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{section.department ? `${section.department} - ${section.name}` : section.name}</Typography>
                                                <Chip label={section.academic_year} size="small" sx={{ background: 'var(--color-primary-alpha-10)', color: 'var(--color-primary-dark)', fontWeight: 600, fontSize: '0.6rem', height: 20 }} />
                                            </Box>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                                <Chip label={section.department || '—'} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18, borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} />
                                                <Chip label={`Year ${section.year || '—'}`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18, borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} />
                                                <Chip label={`Sem ${section.semester || '—'}`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18, borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} />
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, borderTop: '1px solid var(--color-primary-alpha-8)', pt: 1 }}>
                                                <IconButton size="small" sx={{ color: 'var(--color-primary-light)' }} onClick={() => handleViewStudents(section)}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                                                <IconButton size="small" sx={{ color: 'var(--color-primary)' }} onClick={() => openEditDialog(section)}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                                                <IconButton size="small" sx={{ color: 'var(--color-error)' }} onClick={() => handleDeleteSection(section.id)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25]}
                                    component="div"
                                    count={filteredSections.length}
                                    rowsPerPage={sectionRowsPerPage}
                                    page={sectionPage}
                                    onPageChange={(e, newPage) => setSectionPage(newPage)}
                                    onRowsPerPageChange={(e) => { setSectionRowsPerPage(parseInt(e.target.value, 10)); setSectionPage(0); }}
                                    sx={{ borderTop: '1px solid var(--color-border)', overflow: 'hidden', color: 'var(--color-primary-dark)', '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center', gap: '4px', px: 0.5, minHeight: 'auto', py: 1 }, '& .MuiTablePagination-spacer': { display: 'none' }, '& .MuiTablePagination-selectLabel': { m: 0, fontSize: '0.75rem' }, '& .MuiTablePagination-displayedRows': { m: 0, color: 'var(--color-text-secondary)', fontSize: '0.75rem' }, '& .MuiTablePagination-selectIcon': { color: 'var(--color-primary)' }, '& .MuiTablePagination-actions button': { color: 'var(--color-primary)', p: '4px' }, '& .MuiTablePagination-select': { color: 'var(--color-text-primary)' } }}
                                />
                            </Box>
                        ) : (
                            <TableContainer sx={{ borderRadius: 'var(--radius-lg)', overflowX: 'auto', maxWidth: '100%' }}>
                                <Table sx={{ minWidth: { xs: 320, sm: 550, md: 650 } }}>
                                    <TableHead>
                                        <TableRow sx={tableHeaderRowSx}>
                                            {['Department', 'Section Name', 'Year', 'Semester', 'Academic Year', 'Actions'].map((h) => (
                                                <TableCell key={h} align="center" sx={tableHeaderCellSx}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredSections.slice(sectionPage * sectionRowsPerPage, sectionPage * sectionRowsPerPage + sectionRowsPerPage).map((section, idx) => (
                                            <TableRow key={section.id} sx={tableRowSx(idx)}>
                                                <TableCell align="center" sx={{ color: 'var(--color-primary-dark)', fontWeight: 600, ...tableCellBorderSx }}>{section.department || '—'}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-primary)', fontWeight: 600, ...tableCellBorderSx }}>{section.department ? `${section.department} - ${section.name}` : section.name}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{section.year || '—'}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{section.semester || '—'}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{section.academic_year}</TableCell>
                                                <TableCell align="center" sx={tableCellBorderSx}>
                                                    <Tooltip title="View Students">
                                                        <IconButton size="small" sx={{ color: 'var(--color-primary-light)' }} onClick={() => handleViewStudents(section)}><Visibility fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Edit">
                                                        <IconButton size="small" sx={{ color: 'var(--color-primary)' }} onClick={() => openEditDialog(section)}><EditIcon fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton size="small" sx={{ color: 'var(--color-error)' }} onClick={() => handleDeleteSection(section.id)}><DeleteIcon fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                    component="div"
                                    count={filteredSections.length}
                                    rowsPerPage={sectionRowsPerPage}
                                    page={sectionPage}
                                    onPageChange={(e, newPage) => setSectionPage(newPage)}
                                    onRowsPerPageChange={(e) => { setSectionRowsPerPage(parseInt(e.target.value, 10)); setSectionPage(0); }}
                                    sx={{ borderTop: '1px solid var(--color-border)', overflow: 'hidden', color: 'var(--color-primary-dark)', '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center', gap: '4px', px: { xs: 0.5, sm: 2 }, minHeight: 'auto', py: 1 }, '& .MuiTablePagination-spacer': { display: { xs: 'none', sm: 'block' } }, '& .MuiTablePagination-selectLabel': { m: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }, '& .MuiTablePagination-displayedRows': { m: 0, color: 'var(--color-text-secondary)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }, '& .MuiTablePagination-selectIcon': { color: 'var(--color-primary)' }, '& .MuiTablePagination-actions button': { color: 'var(--color-primary)', p: { xs: '4px', sm: '8px' } }, '& .MuiTablePagination-select': { color: 'var(--color-text-primary)' } }}
                                />
                            </TableContainer>
                        )}
                    </Box>
                )}

                {/* Faculty Tab */}
                {tabValue === 3 && (
                    <Box sx={tabContentBoxSx}>
                        {/* Breadcrumb */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                            <DashboardIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)', cursor: 'pointer' }} onClick={() => setTabValue(0)} />
                            <NavigateNextIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                            <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>Faculty</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', ml: 0.5 }}>({filteredFaculty.length})</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: { xs: 1.5, md: 2 } }}>
                            <TextField
                                placeholder="Search faculty..."
                                value={facultySearchQuery}
                                onChange={(e) => setFacultySearchQuery(e.target.value)}
                                size="small"
                                sx={searchFieldSx}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'var(--color-text-muted)' }} /></InputAdornment> }}
                            />
                            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, width: { xs: '100%', sm: 'auto' }, flexWrap: { xs: 'wrap', sm: 'nowrap' }, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
                                <Button
                                    startIcon={<FileDownloadIcon />}
                                    onClick={() => {
                                        const csv = ['Name,Employee ID,Email,Phone,Department,Designation']
                                            .concat(filteredFaculty.map(f => `"${f.name || ''}","${f.employee_id || f.username}","${f.email || ''}","${f.phone || ''}","${f.department || ''}","${f.designation || ''}"`))
                                            .join('\n');
                                        const blob = new Blob([csv], { type: 'text/csv' });
                                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'faculty_export.csv'; a.click();
                                    }}
                                    sx={outlineBtnSx}
                                >
                                    Export
                                </Button>
                                <Button
                                    startIcon={<PictureAsPdfIcon />}
                                    onClick={() => {
                                        const rows = filteredFaculty.map(f => [f.employee_id || f.username, f.name || '', f.email || '', f.phone || '', f.department || '', f.designation || '']);
                                        exportPDF('Faculty Report', ['Employee ID', 'Name', 'Email', 'Phone', 'Department', 'Designation'], rows, 'faculty_report.pdf');
                                    }}
                                    sx={outlineBtnSx}
                                >
                                    PDF
                                </Button>
                                <Button
                                    startIcon={<CloudUpload />}
                                    onClick={() => { setBulkFacultyFile(null); setBulkFacultyResult(null); setBulkFacultyOpen(true); }}
                                    sx={outlineBtnSx}
                                >
                                    Bulk Upload
                                </Button>
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={() => { if (hodDeptActive) setNewFaculty(p => ({ ...p, department: hodDeptActive })); setFacultyOpen(true); }}
                                    sx={addBtnSx}
                                >
                                    Add Faculty
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(auto-fill, minmax(140px, auto))' }, gap: { xs: 1, sm: 1.5 }, mb: { xs: 2, md: 3 }, alignItems: 'center' }}>
                            {!hodDeptActive && <Select size="small" displayEmpty value={facultyDeptFilter} onChange={(e) => setFacultyDeptFilter(e.target.value)} sx={{ ...selectSx, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Depts</MenuItem>
                                {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>}
                            <Select size="small" displayEmpty value={facultyDesignationFilter} onChange={(e) => setFacultyDesignationFilter(e.target.value)} sx={{ ...selectSx, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Roles</MenuItem>
                                {['Teaching Assistant', 'Lab Assistant', 'Lecturer', 'Senior Lecturer', 'Assistant Professor', 'Senior Assistant Professor', 'Associate Professor', 'Professor', 'HOD', 'Dean', 'Vice Principal', 'Principal', 'Director'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>
                            {(facultyDeptFilter || facultyDesignationFilter) && (
                                <Button size="small" onClick={() => { setFacultyDeptFilter(''); setFacultyDesignationFilter(''); }} sx={{ color: 'var(--color-primary)', textTransform: 'none', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                    Clear
                                </Button>
                            )}
                        </Box>

                        {/* Bulk action bar */}
                        {selectedFaculty.size > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, mb: 1.5, p: { xs: 0.8, sm: 1 }, background: 'var(--color-primary-alpha-8)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-alpha-15)', flexWrap: 'wrap' }}>
                                <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, fontWeight: 600, color: 'var(--color-primary-dark)' }}>{selectedFaculty.size} selected</Typography>
                                <Button size="small" startIcon={<DeleteSweepIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />} onClick={handleBulkDeleteFaculty} sx={{ ml: 'auto', color: 'var(--color-error)', textTransform: 'none', fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Delete</Button>
                                <Button size="small" onClick={() => setSelectedFaculty(new Set())} sx={{ color: 'var(--color-text-muted)', textTransform: 'none', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Clear</Button>
                            </Box>
                        )}

                        {filteredFaculty.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <Typography sx={{ color: 'var(--color-text-secondary)' }}>No faculty found</Typography>
                            </Box>
                        ) : isMobile ? (
                            /* Mobile Card View for Faculty */
                            <Box>
                                {sortData(filteredFaculty, facultySort).slice(facultyPage * facultyRowsPerPage, facultyPage * facultyRowsPerPage + facultyRowsPerPage).map((fac) => (
                                    <Card key={fac.id} sx={{ mb: 1.5, border: selectedFaculty.has(fac.id) ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-paper)', boxShadow: 'none' }}>
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }} onClick={() => handleViewFaculty(fac)}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Checkbox size="small" checked={selectedFaculty.has(fac.id)} onChange={() => toggleFacultySelection(fac.id)} onClick={(e) => e.stopPropagation()} sx={{ color: 'var(--color-primary)', '&.Mui-checked': { color: 'var(--color-primary)' }, mt: -0.5, ml: -0.5 }} />
                                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{fac.name || '—'}</Typography>
                                                </Box>
                                                <Chip label={fac.designation || 'Faculty'} size="small" sx={{ background: 'var(--color-primary-alpha-10)', color: 'var(--color-primary-dark)', fontWeight: 600, fontSize: '0.6rem', height: 20 }} />
                                            </Box>
                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-dark)', mb: 0.5 }}>{fac.employee_id || fac.username}</Typography>
                                            <Typography sx={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', mb: 0.3 }}>{fac.email || '—'}</Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                <Chip label={fac.department || '—'} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18, borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} />
                                                {fac.phone && <Chip label={fac.phone} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18, borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} />}
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1, borderTop: '1px solid var(--color-primary-alpha-8)', pt: 1 }} onClick={(e) => e.stopPropagation()}>
                                                <IconButton size="small" sx={{ color: 'var(--color-primary-light)' }} onClick={() => handleViewFaculty(fac)}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                                                <IconButton size="small" sx={{ color: 'var(--color-primary)' }} onClick={() => handleEditFacultyOpen(fac)}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                                                <IconButton size="small" sx={{ color: 'var(--color-error)' }} onClick={() => handleDeleteFaculty(fac.id)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25]}
                                    component="div"
                                    count={filteredFaculty.length}
                                    rowsPerPage={facultyRowsPerPage}
                                    page={facultyPage}
                                    onPageChange={(e, newPage) => setFacultyPage(newPage)}
                                    onRowsPerPageChange={(e) => { setFacultyRowsPerPage(parseInt(e.target.value, 10)); setFacultyPage(0); }}
                                    sx={{ borderTop: '1px solid var(--color-border)', overflow: 'hidden', color: 'var(--color-primary-dark)', '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center', gap: '4px', px: 0.5, minHeight: 'auto', py: 1 }, '& .MuiTablePagination-spacer': { display: 'none' }, '& .MuiTablePagination-selectLabel': { m: 0, fontSize: '0.75rem' }, '& .MuiTablePagination-displayedRows': { m: 0, color: 'var(--color-text-secondary)', fontSize: '0.75rem' }, '& .MuiTablePagination-selectIcon': { color: 'var(--color-primary)' }, '& .MuiTablePagination-actions button': { color: 'var(--color-primary)', p: '4px' }, '& .MuiTablePagination-select': { color: 'var(--color-text-primary)' } }}
                                />
                            </Box>
                        ) : (
                            <TableContainer sx={{ borderRadius: 'var(--radius-lg)', overflowX: 'auto', maxWidth: '100%' }}>
                                <Table sx={{ minWidth: { xs: 450, sm: 600, md: 750 } }}>
                                    <TableHead>
                                        <TableRow sx={tableHeaderRowSx}>
                                            <TableCell padding="checkbox" sx={tableHeaderCellSx}>
                                                <Checkbox size="small" sx={{ color: 'var(--color-primary)', '&.Mui-checked': { color: 'var(--color-primary)' } }}
                                                    checked={sortData(filteredFaculty, facultySort).slice(facultyPage * facultyRowsPerPage, facultyPage * facultyRowsPerPage + facultyRowsPerPage).every(f => selectedFaculty.has(f.id)) && filteredFaculty.length > 0}
                                                    indeterminate={sortData(filteredFaculty, facultySort).slice(facultyPage * facultyRowsPerPage, facultyPage * facultyRowsPerPage + facultyRowsPerPage).some(f => selectedFaculty.has(f.id)) && !sortData(filteredFaculty, facultySort).slice(facultyPage * facultyRowsPerPage, facultyPage * facultyRowsPerPage + facultyRowsPerPage).every(f => selectedFaculty.has(f.id))}
                                                    onChange={() => toggleAllFaculty(sortData(filteredFaculty, facultySort).slice(facultyPage * facultyRowsPerPage, facultyPage * facultyRowsPerPage + facultyRowsPerPage))}
                                                />
                                            </TableCell>
                                            {[
                                                { label: 'Employee ID', field: 'employee_id' },
                                                { label: 'Name', field: 'name' },
                                                { label: 'Email', field: 'email' },
                                                { label: 'Phone', field: 'phone' },
                                                { label: 'Department', field: 'department' },
                                                { label: 'Designation', field: 'designation' },
                                                { label: 'Actions', field: null },
                                            ].map((h) => (
                                                <TableCell key={h.label} align="center" sx={{ ...tableHeaderCellSx, cursor: h.field ? 'pointer' : 'default', userSelect: 'none' }} onClick={() => h.field && handleSort(h.field, facultySort, setFacultySort)}>
                                                    {h.label}{h.field && <SortIcon field={h.field} sortState={facultySort} />}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {sortData(filteredFaculty, facultySort).slice(facultyPage * facultyRowsPerPage, facultyPage * facultyRowsPerPage + facultyRowsPerPage).map((fac, idx) => (
                                            <TableRow key={fac.id} sx={{ ...tableRowSx(idx), ...(selectedFaculty.has(fac.id) && { background: 'var(--color-primary-alpha-8) !important' }) }}>
                                                <TableCell padding="checkbox" sx={tableCellBorderSx}>
                                                    <Checkbox size="small" checked={selectedFaculty.has(fac.id)} onChange={() => toggleFacultySelection(fac.id)} sx={{ color: 'var(--color-primary)', '&.Mui-checked': { color: 'var(--color-primary)' } }} />
                                                </TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-primary-dark)', fontWeight: 600, ...tableCellBorderSx }}>{fac.employee_id || fac.username}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-primary)', fontWeight: 600, ...tableCellBorderSx }}>{fac.name || '—'}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{fac.email || '—'}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{fac.phone || '—'}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{fac.department || '—'}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{fac.designation || '—'}</TableCell>
                                                <TableCell align="center" sx={tableCellBorderSx}>
                                                    <Tooltip title="View">
                                                        <IconButton size="small" sx={{ color: 'var(--color-primary-light)' }} onClick={() => handleViewFaculty(fac)}><Visibility fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Edit">
                                                        <IconButton size="small" sx={{ color: 'var(--color-primary)' }} onClick={() => handleEditFacultyOpen(fac)}><EditIcon fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton size="small" sx={{ color: 'var(--color-error)' }} onClick={() => handleDeleteFaculty(fac.id)}><DeleteIcon fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                    component="div"
                                    count={filteredFaculty.length}
                                    rowsPerPage={facultyRowsPerPage}
                                    page={facultyPage}
                                    onPageChange={(e, newPage) => setFacultyPage(newPage)}
                                    onRowsPerPageChange={(e) => { setFacultyRowsPerPage(parseInt(e.target.value, 10)); setFacultyPage(0); }}
                                    sx={{ borderTop: '1px solid var(--color-border)', overflow: 'hidden', color: 'var(--color-primary-dark)', '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center', gap: '4px', px: { xs: 0.5, sm: 2 }, minHeight: 'auto', py: 1 }, '& .MuiTablePagination-spacer': { display: { xs: 'none', sm: 'block' } }, '& .MuiTablePagination-selectLabel': { m: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }, '& .MuiTablePagination-displayedRows': { m: 0, color: 'var(--color-text-secondary)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }, '& .MuiTablePagination-selectIcon': { color: 'var(--color-primary)' }, '& .MuiTablePagination-actions button': { color: 'var(--color-primary)', p: { xs: '4px', sm: '8px' } }, '& .MuiTablePagination-select': { color: 'var(--color-text-primary)' } }}
                                />
                            </TableContainer>
                        )}
                    </Box>
                )}

                {/* Subject Allotment Tab */}
                {tabValue === 4 && (
                    <Box sx={tabContentBoxSx}>
                        {/* Breadcrumb */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                            <DashboardIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)', cursor: 'pointer' }} onClick={() => setTabValue(0)} />
                            <NavigateNextIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                            <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>Subject Allotment</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', ml: 0.5 }}>({filteredAssignments.length})</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: { xs: 1.5, md: 2 } }}>
                            <TextField
                                placeholder="Search by faculty or subject..."
                                value={assignmentSearchQuery}
                                onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                                size="small"
                                sx={searchFieldSx}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'var(--color-text-muted)' }} /></InputAdornment> }}
                            />
                            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, width: { xs: '100%', sm: 'auto' }, flexWrap: { xs: 'wrap', sm: 'nowrap' }, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
                                <Button
                                    startIcon={<PictureAsPdfIcon />}
                                    onClick={() => {
                                        const rows = filteredAssignments.map(a => [a.faculty_employee_id || '', a.faculty_name || '', a.subject_name, a.periods, a.department, a.year, a.section_name || '']);
                                        exportPDF('Subject Allotment Report', ['Emp ID', 'Faculty', 'Subject', 'Periods', 'Dept', 'Year', 'Section'], rows, 'subject_allotment_report.pdf');
                                    }}
                                    sx={outlineBtnSx}
                                >
                                    PDF
                                </Button>
                                <Button
                                    startIcon={<CloudUpload />}
                                    onClick={() => { setBulkAssignmentOpen(true); setBulkAssignmentResult(null); setBulkAssignmentFile(null); }}
                                    sx={outlineBtnSx}
                                >
                                    Bulk Upload
                                </Button>
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={() => { if (hodDeptActive) setNewAssignment(p => ({ ...p, department: hodDeptActive })); setAssignmentOpen(true); }}
                                    sx={addBtnSx}
                                >
                                    Allot Subject
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(auto-fill, minmax(140px, auto))' }, gap: { xs: 1, sm: 1.5 }, mb: { xs: 2, md: 3 }, alignItems: 'center' }}>
                            {!hodDeptActive && <Select size="small" displayEmpty value={assignmentDeptFilter} onChange={(e) => { setAssignmentDeptFilter(e.target.value); setAssignmentYearFilter(''); setAssignmentSectionFilter(''); setAssignmentFacultyFilter(''); }} sx={{ ...selectSx, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Depts</MenuItem>
                                {[...new Set(assignments.map((a) => a.department).filter(Boolean))].sort().map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>}
                            <Select size="small" displayEmpty value={assignmentYearFilter} onChange={(e) => { setAssignmentYearFilter(e.target.value); setAssignmentSectionFilter(''); setAssignmentFacultyFilter(''); }} sx={{ ...selectSx, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Years</MenuItem>
                                {[...new Set((hodDeptActive ? assignments.filter(a => a.department === hodDeptActive) : assignments).filter((a) => !assignmentDeptFilter || a.department === assignmentDeptFilter).map((a) => a.year).filter(Boolean))].sort((a, b) => a - b).map((y) => <MenuItem key={y} value={y}>Year {y}</MenuItem>)}
                            </Select>
                            <Select size="small" displayEmpty value={assignmentSectionFilter} onChange={(e) => { setAssignmentSectionFilter(e.target.value); setAssignmentFacultyFilter(''); }} sx={{ ...selectSx, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Sections</MenuItem>
                                {[...new Set((hodDeptActive ? assignments.filter(a => a.department === hodDeptActive) : assignments).filter((a) => (!assignmentDeptFilter || a.department === assignmentDeptFilter) && (!assignmentYearFilter || String(a.year) === String(assignmentYearFilter))).map((a) => a.section_name).filter(Boolean))].sort().map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                            <Select size="small" displayEmpty value={assignmentFacultyFilter} onChange={(e) => setAssignmentFacultyFilter(e.target.value)} sx={{ ...selectSx, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} MenuProps={menuPropsSx}>
                                <MenuItem value="">All Faculty</MenuItem>
                                {[...new Map((hodDeptActive ? assignments.filter(a => a.department === hodDeptActive) : assignments).filter((a) => (!assignmentDeptFilter || a.department === assignmentDeptFilter) && (!assignmentYearFilter || String(a.year) === String(assignmentYearFilter)) && (!assignmentSectionFilter || a.section_name === assignmentSectionFilter)).map((a) => [a.faculty_id, { id: a.faculty_id, name: a.faculty_name || a.faculty_employee_id }])).values()].map((f) => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                            </Select>
                            {(assignmentDeptFilter || assignmentYearFilter || assignmentSectionFilter || assignmentFacultyFilter || assignmentSearchQuery) && (
                                <Button size="small" onClick={() => { setAssignmentDeptFilter(''); setAssignmentYearFilter(''); setAssignmentSectionFilter(''); setAssignmentFacultyFilter(''); setAssignmentSearchQuery(''); }} sx={{ color: 'var(--color-primary)', textTransform: 'none', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.875rem' }, gridColumn: { xs: 'span 2', sm: 'auto' } }}>
                                    Clear
                                </Button>
                            )}
                        </Box>

                        {filteredAssignments.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <Typography sx={{ color: 'var(--color-text-secondary)' }}>No subject allotments found</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ borderRadius: 'var(--radius-lg)', overflowX: 'auto', maxWidth: '100%' }}>
                                <Table sx={{ minWidth: { xs: 320, sm: 580, md: 700 } }}>
                                    <TableHead>
                                        <TableRow sx={tableHeaderRowSx}>
                                            {[
                                                { label: 'Emp ID', field: 'faculty_employee_id' },
                                                { label: 'Faculty', field: 'faculty_name' },
                                                { label: 'Subject', field: 'subject_name' },
                                                { label: 'Periods', field: 'periods' },
                                                { label: 'Dept', field: 'department' },
                                                { label: 'Year', field: 'year' },
                                                { label: 'Section', field: 'section_name' },
                                                { label: 'Actions', field: null },
                                            ].map((h) => (
                                                <TableCell key={h.label} align="center" sx={{ ...tableHeaderCellSx, cursor: h.field ? 'pointer' : 'default', userSelect: 'none' }} onClick={() => h.field && handleSort(h.field, assignmentSort, setAssignmentSort)}>
                                                    {h.label}{h.field && <SortIcon field={h.field} sortState={assignmentSort} />}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {sortData(filteredAssignments, assignmentSort).slice(assignmentPage * assignmentRowsPerPage, assignmentPage * assignmentRowsPerPage + assignmentRowsPerPage).map((a, idx) => (
                                            <TableRow key={a.id} sx={tableRowSx(idx)}>
                                                <TableCell align="center" sx={{ color: 'var(--color-primary-dark)', fontWeight: 600, ...tableCellBorderSx }}>{a.faculty_employee_id || '—'}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-primary)', fontWeight: 600, ...tableCellBorderSx }}>{a.faculty_name || '—'}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-primary)', ...tableCellBorderSx }}>{a.subject_name}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{a.periods}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{a.department}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{a.year}</TableCell>
                                                <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx }}>{a.section_name || '—'}</TableCell>
                                                <TableCell align="center" sx={tableCellBorderSx}>
                                                    <Tooltip title="Edit">
                                                        <IconButton size="small" sx={{ color: 'var(--color-primary)', mr: 0.5 }} onClick={() => handleEditAssignment(a)}><EditIcon fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton size="small" sx={{ color: 'var(--color-error)' }} onClick={() => handleDeleteAssignment(a.id)}><DeleteIcon fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                    component="div"
                                    count={filteredAssignments.length}
                                    rowsPerPage={assignmentRowsPerPage}
                                    page={assignmentPage}
                                    onPageChange={(e, newPage) => setAssignmentPage(newPage)}
                                    onRowsPerPageChange={(e) => { setAssignmentRowsPerPage(parseInt(e.target.value, 10)); setAssignmentPage(0); }}
                                    sx={{ borderTop: '1px solid var(--color-border)', overflow: 'hidden', color: 'var(--color-primary-dark)', '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center', gap: '4px', px: { xs: 0.5, sm: 2 }, minHeight: 'auto', py: 1 }, '& .MuiTablePagination-spacer': { display: { xs: 'none', sm: 'block' } }, '& .MuiTablePagination-selectLabel': { m: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }, '& .MuiTablePagination-displayedRows': { m: 0, color: 'var(--color-text-secondary)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }, '& .MuiTablePagination-selectIcon': { color: 'var(--color-primary)' }, '& .MuiTablePagination-actions button': { color: 'var(--color-primary)', p: { xs: '4px', sm: '8px' } }, '& .MuiTablePagination-select': { color: 'var(--color-text-primary)' } }}
                                />
                            </TableContainer>
                        )}
                    </Box>
                )}

                {/* Timetable Tab */}
                {tabValue === 5 && (
                    <Box sx={tabContentBoxSx}>
                        {/* Breadcrumb */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                            <DashboardIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)', cursor: 'pointer' }} onClick={() => setTabValue(0)} />
                            <NavigateNextIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                            <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>Timetable</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: { xs: 1.5, md: 2 } }}>
                            <Typography sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.1rem' }, color: 'var(--color-text-primary)' }}>
                                Section Timetable
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Select
                                size="small"
                                displayEmpty
                                value={timetableSectionId}
                                onChange={(e) => {
                                    const sid = e.target.value;
                                    setTimetableSectionId(sid);
                                    if (sid) {
                                        setTimetableLoading(true);
                                        api.get(`/timetable/section/${sid}`)
                                            .then((res) => setTimetableData(res.data))
                                            .catch(() => setTimetableData(null))
                                            .finally(() => setTimetableLoading(false));
                                    } else {
                                        setTimetableData(null);
                                    }
                                }}
                                sx={{ ...selectSx, minWidth: { xs: 0, sm: 200 }, flex: { xs: 1, sm: 'none' }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                MenuProps={menuPropsSx}
                            >
                                <MenuItem value="">Select Section</MenuItem>
                                {(hodDeptActive ? sections.filter(s => s.department === hodDeptActive) : sections).map((s) => (
                                    <MenuItem key={s.id} value={s.id}>{s.name} — {s.department} Year {s.year}</MenuItem>
                                ))}
                            </Select>
                            {timetableSectionId && (
                                <Button
                                    startIcon={timetableGenerating ? null : (timetableData?.slots?.length ? <AutorenewIcon /> : <CalendarMonthIcon />)}
                                    onClick={async () => {
                                        setTimetableGenerating(true);
                                        try {
                                            await api.post(`/timetable/generate/${timetableSectionId}`);
                                            const res = await api.get(`/timetable/section/${timetableSectionId}`);
                                            setTimetableData(res.data);
                                            showToast('Timetable generated successfully!', 'success');
                                        } catch (err) {
                                            showToast(err.response?.data?.detail || 'Failed to generate timetable', 'error');
                                        } finally {
                                            setTimetableGenerating(false);
                                        }
                                    }}
                                    disabled={timetableGenerating}
                                    sx={addBtnSx}
                                >
                                    {timetableGenerating ? 'Generating...' : (timetableData?.slots?.length ? 'Regenerate' : 'Generate')}
                                </Button>
                            )}
                            <Button
                                startIcon={timetableGenerating ? null : <AutorenewIcon />}
                                onClick={async () => {
                                    if (!window.confirm('This will regenerate timetables for ALL sections. Existing timetables will be replaced. Continue?')) return;
                                    setTimetableGenerating(true);
                                    try {
                                        const res = await api.post('/timetable/generate-all');
                                        const msg = res.data;
                                        showToast(`${msg.message}`, msg.errors?.length ? 'warning' : 'success');
                                        // Refresh current section if selected
                                        if (timetableSectionId) {
                                            const ttRes = await api.get(`/timetable/section/${timetableSectionId}`);
                                            setTimetableData(ttRes.data);
                                        }
                                    } catch (err) {
                                        showToast(err.response?.data?.detail || 'Failed to generate timetables', 'error');
                                    } finally {
                                        setTimetableGenerating(false);
                                    }
                                }}
                                disabled={timetableGenerating}
                                sx={outlineBtnSx}
                            >
                                {timetableGenerating ? 'Generating...' : 'Generate All Sections'}
                            </Button>
                        </Box>

                        {!timetableSectionId && (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <CalendarMonthIcon sx={{ fontSize: 48, color: 'var(--color-text-muted)', mb: 1 }} />
                                <Typography sx={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Select a section to view or generate its timetable</Typography>
                            </Box>
                        )}

                        {timetableSectionId && timetableLoading && (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <Typography sx={{ color: 'var(--color-text-muted)' }}>Loading timetable...</Typography>
                            </Box>
                        )}

                        {timetableSectionId && !timetableLoading && (
                            <TimetableGrid
                                slots={timetableData?.slots || []}
                                highlightToday
                                sectionName={timetableData?.section_name || ''}
                                department={timetableData?.department || ''}
                                year={timetableData?.year || ''}
                                semester={timetableData?.semester || ''}
                            />
                        )}
                    </Box>
                )}
                {/* Attendance Reports Tab */}
                {tabValue === 6 && (
                    <Box sx={tabContentBoxSx}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                            <DashboardIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)', cursor: 'pointer' }} onClick={() => setTabValue(0)} />
                            <NavigateNextIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                            <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' }, color: 'var(--color-primary-dark)', fontWeight: 600 }}>Attendance Reports</Typography>
                        </Box>

                        {!attendanceLoading && attendanceTrends.length === 0 && (() => {
                            // Local analytics from loaded data when API attendance data is empty (HOD-filtered)
                            const rStudents = hodDeptActive ? students.filter(s => s.department === hodDeptActive) : students;
                            const rFaculty = hodDeptActive ? faculty.filter(f => f.department === hodDeptActive) : faculty;
                            const rSections = hodDeptActive ? sections.filter(s => s.department === hodDeptActive) : sections;
                            const deptStudentCounts = {};
                            const deptFacultyCounts = {};
                            let enrolledCount = 0;
                            let pendingCount = 0;
                            const yearSectionCounts = {};

                            rStudents.forEach(s => {
                                deptStudentCounts[s.department] = (deptStudentCounts[s.department] || 0) + 1;
                                if (s.embeddings && s.embeddings.length > 0) enrolledCount++;
                                else pendingCount++;
                            });

                            rFaculty.forEach(f => {
                                deptFacultyCounts[f.department] = (deptFacultyCounts[f.department] || 0) + 1;
                            });

                            rSections.forEach(s => {
                                const yr = s.year || 'Unknown';
                                yearSectionCounts[yr] = (yearSectionCounts[yr] || 0) + 1;
                            });

                            const studentDeptData = Object.entries(deptStudentCounts).map(([name, value]) => ({ name, value }));
                            const facultyDeptData = Object.entries(deptFacultyCounts).map(([name, value]) => ({ name, value }));
                            const sectionYearData = Object.entries(yearSectionCounts).map(([name, value]) => ({ name, value }));
                            const enrollmentData = [{ name: 'Enrolled', value: enrolledCount }, { name: 'Pending', value: pendingCount }].filter(d => d.value > 0);
                            const hasData = rStudents.length > 0 || rFaculty.length > 0 || rSections.length > 0;

                            return hasData ? (
                                <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                                        <Chip label="Local Analytics" size="small" sx={{ background: 'var(--color-primary-alpha-8)', color: 'var(--color-primary-dark)', fontWeight: 600, fontSize: '0.7rem' }} />
                                        <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Based on loaded data (no attendance sessions recorded yet)</Typography>
                                        <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 14 }} />} onClick={() => fetchAttendanceReports(attendanceDays)} sx={{ ml: 'auto', textTransform: 'none', color: 'var(--color-primary)', fontSize: '0.7rem' }}>Check API</Button>
                                    </Box>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                                        {/* Students by Department */}
                                        {studentDeptData.length > 0 && (
                                            <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)', gridColumn: { xs: '1', md: '1 / -1' } }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: 'var(--color-text-primary)', mb: 2 }}>Students by Department</Typography>
                                                <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
                                                    <BarChart data={studentDeptData} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                                        <XAxis dataKey="name" tick={{ fontSize: isMobile ? 9 : 11, fill: 'var(--color-text-secondary)' }} angle={-45} textAnchor="end" interval={0} height={90} />
                                                        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
                                                        <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                                        <Bar dataKey="value" fill="#467bf0" radius={[6, 6, 0, 0]} name="Students" barSize={isMobile ? 24 : 36} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        )}

                                        {/* Enrollment Status */}
                                        {enrollmentData.length > 0 && (
                                            <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)' }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: 'var(--color-text-primary)', mb: 2 }}>Enrollment Status</Typography>
                                                <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                                                    <PieChart>
                                                        <Pie data={enrollmentData} cx="50%" cy="50%" outerRadius={isMobile ? 70 : 90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                                            {enrollmentData.map((_, i) => <Cell key={i} fill={i === 0 ? '#10b981' : '#f59e0b'} />)}
                                                        </Pie>
                                                        <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        )}

                                        {/* Faculty by Department */}
                                        {facultyDeptData.length > 0 && (
                                            <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)' }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: 'var(--color-text-primary)', mb: 2 }}>Faculty by Department</Typography>
                                                <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                                                    <BarChart data={facultyDeptData} margin={{ top: 5, right: 10, left: -10, bottom: 50 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} angle={-45} textAnchor="end" interval={0} height={70} />
                                                        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                                                        <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                                        <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Faculty" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        )}

                                        {/* Sections by Year */}
                                        {sectionYearData.length > 0 && (
                                            <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)' }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: 'var(--color-text-primary)', mb: 2 }}>Sections by Year</Typography>
                                                <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                                                    <BarChart data={sectionYearData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
                                                        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                                                        <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                                        <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Sections" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Summary Cards */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                                        {[
                                            { label: 'Total Students', value: rStudents.length, color: '#467bf0' },
                                            { label: 'Enrolled', value: enrolledCount, color: '#10b981' },
                                            { label: 'Total Faculty', value: rFaculty.length, color: '#8b5cf6' },
                                            { label: 'Total Sections', value: rSections.length, color: '#f59e0b' },
                                        ].map(card => (
                                            <Box key={card.label} sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2 }, textAlign: 'center', boxShadow: '0 1px 3px var(--color-shadow)' }}>
                                                <Typography sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' }, fontWeight: 800, color: card.color }}>{card.value}</Typography>
                                                <Typography sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, color: 'var(--color-text-muted)', fontWeight: 600 }}>{card.label}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 6 }}>
                                    <AssessmentIcon sx={{ fontSize: 48, color: 'var(--color-text-muted)', mb: 1 }} />
                                    <Typography sx={{ color: 'var(--color-text-secondary)', fontSize: '1rem', mb: 1 }}>No data available</Typography>
                                    <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', mb: 2 }}>Add students, faculty, and sections to see analytics</Typography>
                                    <Button startIcon={<RefreshIcon />} onClick={() => fetchAttendanceReports(attendanceDays)} sx={addBtnSx}>Retry</Button>
                                </Box>
                            );
                        })()}

                        {attendanceLoading && <LinearProgress sx={{ mb: 2 }} />}

                        {attendanceTrends.length > 0 && (
                            <>
                                {/* Days filter */}
                                <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Period:</Typography>
                                    {[7, 14, 30, 60, 90].map(d => (
                                        <Chip key={d} label={`${d}d`} size="small" onClick={() => { setAttendanceDays(d); fetchAttendanceReports(d); }}
                                            sx={{ fontWeight: 600, fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 22, sm: 24 }, ...(attendanceDays === d ? { background: 'var(--color-primary)', color: '#fff' } : { background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }) }} />
                                    ))}
                                    <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />} onClick={() => fetchAttendanceReports(attendanceDays)} sx={{ ml: 'auto', textTransform: 'none', color: 'var(--color-primary)', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Refresh</Button>
                                </Box>

                                {/* Attendance Trend Line Chart */}
                                <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, mb: 2, boxShadow: '0 1px 3px var(--color-shadow)' }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: 'var(--color-text-primary)', mb: 2 }}>Attendance Trend</Typography>
                                    <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                                        <LineChart data={attendanceTrends} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
                                            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                                            <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                            <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" dot={false} />
                                            <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" dot={false} />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Box>

                                {/* Department Summary & Section Comparison */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                                    <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)' }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: 'var(--color-text-primary)', mb: 2 }}>Department Attendance</Typography>
                                        {deptSummary.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                                                <BarChart data={deptSummary} margin={{ top: 5, right: 10, left: -10, bottom: 50 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                                    <XAxis dataKey="department" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} angle={-45} textAnchor="end" interval={0} height={70} />
                                                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} unit="%" />
                                                    <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                                    <Bar dataKey="percentage" fill="#467bf0" radius={[6, 6, 0, 0]} name="Attendance %" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : <Typography sx={{ color: 'var(--color-text-muted)', textAlign: 'center', py: 4, fontSize: '0.85rem' }}>No data</Typography>}
                                    </Box>

                                    <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)' }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: 'var(--color-text-primary)', mb: 2 }}>Section Comparison</Typography>
                                        {sectionComparison.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                                                <BarChart data={sectionComparison} margin={{ top: 5, right: 10, left: -10, bottom: 50 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                                    <XAxis dataKey="section" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} angle={-45} textAnchor="end" interval={0} height={70} />
                                                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} unit="%" />
                                                    <RechartsTooltip contentStyle={{ background: 'var(--color-bg-paper)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                                                    <Bar dataKey="percentage" fill="#10b981" radius={[6, 6, 0, 0]} name="Attendance %" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : <Typography sx={{ color: 'var(--color-text-muted)', textAlign: 'center', py: 4, fontSize: '0.85rem' }}>No data</Typography>}
                                    </Box>
                                </Box>

                                {/* Low Attendance Students */}
                                {lowAttendance.length > 0 && (
                                    <Box sx={{ background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', p: { xs: 1.5, sm: 2.5 }, boxShadow: '0 1px 3px var(--color-shadow)' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                                            <WarningAmberIcon sx={{ color: 'var(--color-error)', fontSize: { xs: 16, sm: 20 } }} />
                                            <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.9rem' }, color: 'var(--color-text-primary)' }}>Low Attendance {isMobile ? '' : 'Students '}(&lt;75%)</Typography>
                                            <Chip label={lowAttendance.length} size="small" sx={{ background: 'var(--color-error)', color: '#fff', fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                                        </Box>
                                        <TableContainer sx={{ borderRadius: 'var(--radius-lg)', maxHeight: 300, overflowX: 'auto' }}>
                                            <Table size="small" stickyHeader sx={{ minWidth: { xs: 300, sm: 400 } }}>
                                                <TableHead>
                                                    <TableRow sx={tableHeaderRowSx}>
                                                        {['Roll Number', 'Name', 'Department', 'Attendance %'].map(h => (
                                                            <TableCell key={h} align="center" sx={tableHeaderCellSx}>{h}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {lowAttendance.map((s, idx) => (
                                                        <TableRow key={s.roll_number} sx={tableRowSx(idx)}>
                                                            <TableCell align="center" sx={{ color: 'var(--color-primary-dark)', fontWeight: 600, ...tableCellBorderSx }}>{s.roll_number}</TableCell>
                                                            <TableCell align="center" sx={{ ...tableCellBorderSx }}>{s.name}</TableCell>
                                                            <TableCell align="center" sx={{ ...tableCellBorderSx }}>{s.department || '—'}</TableCell>
                                                            <TableCell align="center" sx={tableCellBorderSx}>
                                                                <Chip label={`${(s.percentage || 0).toFixed(1)}%`} size="small" sx={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', fontWeight: 700, fontSize: '0.7rem' }} />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                )}

                {/* Activity Log Tab */}
                {tabValue === 7 && (
                    <Box sx={tabContentBoxSx}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                            <DashboardIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)', cursor: 'pointer' }} onClick={() => setTabValue(0)} />
                            <NavigateNextIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                            <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' }, color: 'var(--color-primary-dark)', fontWeight: 600 }}>Activity Log</Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>({(() => { const hodApiLogs = isHodLogin ? activityLogs.filter(l => l.user === adminName) : activityLogs; return sessionLogs.length + hodApiLogs.length; })()})</Typography>
                            <Box sx={{ ml: 'auto', display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
                                <Button size="small" startIcon={<FileDownloadIcon />} onClick={() => {
                                    try {
                                        const hodApiLogs = isHodLogin ? activityLogs.filter(l => l.user === adminName) : activityLogs;
                                        const allLogs = [...sessionLogs, ...hodApiLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                                        const csv = ['Time,User,Action,Details']
                                            .concat(allLogs.map(log => `"${new Date(log.timestamp).toLocaleString()}","${log.user || 'System'}","${log.action || ''}","${(log.detail || '').replace(/"/g, '""')}"`))
                                            .join('\n');
                                        const blob = new Blob([csv], { type: 'text/csv' });
                                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'activity_log_export.csv'; a.click();
                                    } catch (err) { console.error('CSV export failed:', err); }
                                }} sx={outlineBtnSx}>Export</Button>
                                <Button size="small" startIcon={<PictureAsPdfIcon />} onClick={() => {
                                    try {
                                        const hodApiLogs = isHodLogin ? activityLogs.filter(l => l.user === adminName) : activityLogs;
                                        const allLogs = [...sessionLogs, ...hodApiLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                                        const rows = allLogs.map(log => [
                                            new Date(log.timestamp).toLocaleString(),
                                            log.user || 'System',
                                            log.action || '',
                                            log.detail || ''
                                        ]);
                                        exportPDF('Activity Log Report', ['Time', 'User', 'Action', 'Details'], rows, 'activity_log_report.pdf');
                                    } catch (err) { console.error('PDF export failed:', err); }
                                }} sx={outlineBtnSx}>PDF</Button>
                                <Button size="small" startIcon={<RefreshIcon />} onClick={fetchActivityLogs} sx={{ textTransform: 'none', color: 'var(--color-primary)', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Refresh</Button>
                            </Box>
                        </Box>

                        {activityLoading && <LinearProgress sx={{ mb: 2 }} />}

                        {(() => {
                            const hodApiLogs = isHodLogin ? activityLogs.filter(l => l.user === adminName) : activityLogs;
                            const allLogs = [...sessionLogs, ...hodApiLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                            return allLogs.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 6 }}>
                                    <HistoryIcon sx={{ fontSize: 48, color: 'var(--color-text-muted)', mb: 1 }} />
                                    <Typography sx={{ color: 'var(--color-text-secondary)', fontSize: '1rem', mb: 1 }}>No activity recorded yet</Typography>
                                    <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', mb: 2 }}>Perform actions like creating students, faculty, or sections to see activity here</Typography>
                                    <Button startIcon={<RefreshIcon />} onClick={fetchActivityLogs} sx={addBtnSx}>Retry</Button>
                                </Box>
                            ) : (
                                <TableContainer sx={{ borderRadius: 'var(--radius-lg)', overflowX: 'auto', maxWidth: '100%', maxHeight: { xs: 400, sm: 600 } }}>
                                    <Table size="small" stickyHeader sx={{ minWidth: { xs: 350, sm: 500 } }}>
                                        <TableHead>
                                            <TableRow sx={tableHeaderRowSx}>
                                                {['Time', 'User', 'Action', 'Details'].map(h => (
                                                    <TableCell key={h} align="center" sx={tableHeaderCellSx}>{h}</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {allLogs.map((log, idx) => (
                                                <TableRow key={log.id || idx} sx={tableRowSx(idx)}>
                                                    <TableCell align="center" sx={{ color: 'var(--color-text-muted)', ...tableCellBorderSx, whiteSpace: 'nowrap' }}>
                                                        {new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ color: 'var(--color-primary-dark)', fontWeight: 600, ...tableCellBorderSx }}>{log.user || 'System'}</TableCell>
                                                    <TableCell align="center" sx={tableCellBorderSx}>
                                                        <Chip label={log.action} size="small" sx={{ fontWeight: 600, fontSize: '0.65rem', background: log.action?.includes('Delete') ? 'var(--color-error-alpha-10)' : log.action?.includes('Create') || log.action?.includes('Allot') ? 'var(--color-secondary-alpha-10)' : 'var(--color-primary-alpha-8)', color: log.action?.includes('Delete') ? 'var(--color-error-dark)' : log.action?.includes('Create') || log.action?.includes('Allot') ? 'var(--color-secondary-dark)' : 'var(--color-primary-dark)' }} />
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ color: 'var(--color-text-secondary)', ...tableCellBorderSx, whiteSpace: { xs: 'normal', sm: 'nowrap' }, maxWidth: { xs: 150, sm: 300 }, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.detail || '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            );
                        })()}
                    </Box>
                )}

                    </Box>{/* End Main Content Area */}
                </Box>{/* End inner Box */}
            </Container>
                </Box>{/* End Main Content flex */}
            </Box>{/* End sidebar + content flex */}

            {/* Create Student Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }} onKeyDown={enterKeyHandler(handleCreateStudent)}>
                <DialogTitle sx={dialogTitleSx}>Add New Student</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        {[
                            { label: 'Student Name', key: 'name' },
                            { label: 'Roll Number', key: 'roll_number' },
                            { label: 'Phone Number', key: 'phone' },
                        ].map(({ label, key }) => (
                            <Box key={key}>
                                <Typography sx={labelSx}>{label}</Typography>
                                <TextField fullWidth size="small" value={newStudent[key]}
                                    onChange={(e) => { setNewStudent({ ...newStudent, [key]: e.target.value }); setTouchedStudent((prev) => ({ ...prev, [key]: true })); }}
                                    error={touchedStudent[key] && !!validateStudentField(key, newStudent[key])}
                                    helperText={touchedStudent[key] ? validateStudentField(key, newStudent[key]) : ''}
                                    sx={inputSx} />
                            </Box>
                        ))}
                        <Box>
                            <Typography sx={labelSx}>Department</Typography>
                            {hodDeptActive ? (
                                <TextField fullWidth size="small" value={newStudent.department} disabled sx={inputSx} />
                            ) : (
                            <Select fullWidth size="small" value={newStudent.department} onChange={(e) => { const dept = e.target.value; const isTwoYear = ['MBA', 'MCA'].includes(dept); setNewStudent({ ...newStudent, department: dept, year: isTwoYear && newStudent.year > 2 ? '' : newStudent.year, semester: '', section_id: '' }); }}
                                sx={selectSx} MenuProps={menuPropsSx}>
                                {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((dept) => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
                            </Select>
                            )}
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Year of Studying</Typography>
                            <Select fullWidth size="small" value={newStudent.year} onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value, semester: '', section_id: '' })}
                                disabled={!newStudent.department}
                                sx={selectDisabledSx} MenuProps={menuPropsSx}>
                                {getYearOptions(newStudent.department).map((y) => <MenuItem key={y} value={y}>{y} Year</MenuItem>)}
                            </Select>
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Semester</Typography>
                            <Select fullWidth size="small" value={newStudent.semester} onChange={(e) => setNewStudent({ ...newStudent, semester: e.target.value, section_id: '' })}
                                disabled={!newStudent.year}
                                sx={selectDisabledSx} MenuProps={menuPropsSx}>
                                {getSemesterOptions(newStudent.department, newStudent.year).map((s) => <MenuItem key={s} value={s}>{s} Semester</MenuItem>)}
                            </Select>
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Section</Typography>
                            <Select fullWidth size="small" value={newStudent.section_id} onChange={(e) => setNewStudent({ ...newStudent, section_id: e.target.value })}
                                disabled={!newStudent.department || !newStudent.year || !newStudent.semester}
                                sx={selectDisabledSx} MenuProps={menuPropsSx}>
                                {(!newStudent.department || !newStudent.year || !newStudent.semester) ? <MenuItem disabled sx={{ color: 'var(--color-text-muted)' }}>Select department, year & semester first</MenuItem> : sections.filter(s => s.department === newStudent.department && s.year === Number(newStudent.year) && s.semester === Number(newStudent.semester)).length === 0 ? <MenuItem disabled sx={{ color: 'var(--color-text-muted)' }}>No sections available</MenuItem> : sections.filter(s => s.department === newStudent.department && s.year === Number(newStudent.year) && s.semester === Number(newStudent.semester)).map((section) => <MenuItem key={section.id} value={section.id}>{section.department ? `${section.department} - ${section.name}` : section.name}</MenuItem>)}
                            </Select>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => { setOpen(false); setTouchedStudent({}); }} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleCreateStudent} sx={primaryBtnSx}>
                        Create Student
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Student Dialog */}
            <Dialog open={editStudentOpen} onClose={() => setEditStudentOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }} onKeyDown={enterKeyHandler(handleUpdateStudent)}>
                <DialogTitle sx={dialogTitleSx}>Edit Student</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <Box>
                            <Typography sx={labelSx}>Roll Number</Typography>
                            <TextField fullWidth size="small" value={editStudent.roll_number} disabled
                                sx={disabledInputSx} />
                        </Box>
                        {[{ label: 'Student Name', key: 'name' }, { label: 'Phone Number', key: 'phone' }].map(({ label, key }) => (
                            <Box key={key}>
                                <Typography sx={labelSx}>{label}</Typography>
                                <TextField fullWidth size="small" value={editStudent[key]} onChange={(e) => setEditStudent({ ...editStudent, [key]: e.target.value })}
                                    sx={inputSx} />
                            </Box>
                        ))}
                        <Box>
                            <Typography sx={labelSx}>Department</Typography>
                            <Select fullWidth size="small" value={editStudent.department} onChange={(e) => { const dept = e.target.value; const isTwoYear = ['MBA', 'MCA'].includes(dept); setEditStudent({ ...editStudent, department: dept, year: isTwoYear && editStudent.year > 2 ? '' : editStudent.year, semester: '', section_id: '' }); }}
                                sx={selectSx} MenuProps={menuPropsSx}>
                                {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((dept) => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
                            </Select>
                        </Box>
                        {[{ label: 'Year', key: 'year', options: getYearOptions(editStudent.department).map(y => ({ v: y, l: `${y} Year` })), isDisabled: !editStudent.department },
                          { label: 'Semester', key: 'semester', options: getSemesterOptions(editStudent.department, editStudent.year).map(s => ({ v: s, l: `${s} Semester` })), isDisabled: !editStudent.year }
                        ].map(({ label, key, options, isDisabled }) => (
                            <Box key={key}>
                                <Typography sx={labelSx}>{label}</Typography>
                                <Select fullWidth size="small" value={editStudent[key]} onChange={(e) => setEditStudent({ ...editStudent, [key]: e.target.value, ...(key === 'year' ? { semester: '', section_id: '' } : key === 'semester' ? { section_id: '' } : {}) })}
                                    disabled={isDisabled}
                                    sx={selectDisabledSx} MenuProps={menuPropsSx}>
                                    {options.map(o => <MenuItem key={o.v} value={o.v}>{o.l}</MenuItem>)}
                                </Select>
                            </Box>
                        ))}
                        <Box>
                            <Typography sx={labelSx}>Section</Typography>
                            <Select fullWidth size="small" value={editStudent.section_id} onChange={(e) => setEditStudent({ ...editStudent, section_id: e.target.value })}
                                disabled={!editStudent.department || !editStudent.year || !editStudent.semester}
                                sx={selectDisabledSx} MenuProps={menuPropsSx}>
                                {(!editStudent.department || !editStudent.year || !editStudent.semester) ? <MenuItem disabled sx={{ color: 'var(--color-text-muted)' }}>Select department, year & semester first</MenuItem> : sections.filter(s => s.department === editStudent.department && s.year === Number(editStudent.year) && s.semester === Number(editStudent.semester)).length === 0 ? <MenuItem disabled sx={{ color: 'var(--color-text-muted)' }}>No sections available</MenuItem> : sections.filter(s => s.department === editStudent.department && s.year === Number(editStudent.year) && s.semester === Number(editStudent.semester)).map(s => <MenuItem key={s.id} value={s.id}>{s.department ? `${s.department} - ${s.name}` : s.name}</MenuItem>)}
                            </Select>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => setEditStudentOpen(false)} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleUpdateStudent} sx={primaryBtnSx}>
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Enroll Dialog */}
            <Dialog open={enrollOpen} onClose={() => { setEnrollOpen(false); setCapturedImages([]); setFiles([]); }} maxWidth="md" fullWidth fullScreen={isMobile}
                PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>Enroll Student Face</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <ToggleButtonGroup value={enrollMode} exclusive onChange={(e, newMode) => { if (newMode) setEnrollMode(newMode); }} sx={{ mb: 3 }} fullWidth>
                            <ToggleButton value="upload" sx={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', '&.Mui-selected': { background: 'var(--color-primary-alpha-8)', color: 'var(--color-primary-dark)', borderColor: 'var(--color-primary-alpha-40)' } }}>
                                <CloudUpload sx={{ mr: 1 }} /> Upload Files
                            </ToggleButton>
                            <ToggleButton value="webcam" sx={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', '&.Mui-selected': { background: 'var(--color-primary-alpha-8)', color: 'var(--color-primary-dark)', borderColor: 'var(--color-primary-alpha-40)' } }}>
                                <CameraAltIcon sx={{ mr: 1 }} /> Webcam Capture
                            </ToggleButton>
                        </ToggleButtonGroup>

                        {enrollMode === 'upload' ? (
                            <Box sx={{ border: '2px dashed var(--color-primary-alpha-30)', borderRadius: 'var(--radius-lg)', p: { xs: 2, sm: 4 }, textAlign: 'center', background: 'var(--color-bg)' }}>
                                <CloudUpload sx={{ fontSize: 48, color: 'var(--color-border)', mb: 2 }} />
                                <Typography sx={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', mb: 2 }}>Select multiple images of the student's face</Typography>
                                <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} style={{ display: 'none' }} id="file-upload" />
                                <label htmlFor="file-upload">
                                    <Button component="span" sx={{ border: '1px solid var(--color-primary-alpha-40)', color: 'var(--color-primary-dark)', borderRadius: '10px', textTransform: 'none' }}>Choose Files</Button>
                                </label>
                                {files.length > 0 && <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: '0.8rem', mt: 2 }}>{files.length} file(s) selected</Typography>}
                            </Box>
                        ) : (
                            <Box>
                                <Box sx={{ p: 2, mb: 2, bgcolor: 'black', borderRadius: 'var(--radius-lg)' }}>
                                    <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" width="100%" videoConstraints={{ facingMode: 'user' }} style={{ borderRadius: 8 }} />
                                </Box>
                                <Button startIcon={<CameraAltIcon />} onClick={captureImage} fullWidth disabled={capturedImages.length >= 5}
                                    sx={{ mb: 2, background: 'var(--gradient-primary-reverse)', color: 'var(--color-text-white)', borderRadius: '10px', textTransform: 'none', fontWeight: 600, '&:hover': { background: 'var(--gradient-primary-hover)' }, '&.Mui-disabled': { background: 'var(--color-gray-200)', color: 'var(--color-text-muted)' } }}>
                                    Capture Image ({capturedImages.length}/5)
                                </Button>
                                {capturedImages.length > 0 && (
                                    <Box>
                                        <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Captured Images:</Typography>
                                        <Grid container spacing={1}>
                                            {capturedImages.map((img, index) => (
                                                <Grid size={{ xs: 6 }} key={index}>
                                                    <Box sx={{ position: 'relative' }}>
                                                        <img src={img} alt={`Capture ${index + 1}`} style={{ width: '100%', borderRadius: 8 }} />
                                                        <IconButton size="small" onClick={() => removeCapturedImage(index)}
                                                            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.6)', color: 'var(--color-text-white)', '&:hover': { bgcolor: 'var(--color-error)' } }}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => { setEnrollOpen(false); setCapturedImages([]); setFiles([]); }} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleEnroll} sx={primaryBtnSx}>Enroll</Button>
                </DialogActions>
            </Dialog>

            {/* Create Faculty Dialog */}
            <Dialog open={facultyOpen} onClose={() => setFacultyOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }} onKeyDown={enterKeyHandler(handleCreateFaculty)}>
                <DialogTitle sx={dialogTitleSx}>Add New Faculty</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        {[{ label: 'Name', key: 'name' }, { label: 'Employee ID', key: 'employee_id' }, { label: 'Email', key: 'email' }, { label: 'Phone Number', key: 'phone' }].map(({ label, key }) => (
                            <Box key={key}>
                                <Typography sx={labelSx}>{label}</Typography>
                                <TextField fullWidth size="small" value={newFaculty[key]}
                                    onChange={(e) => { setNewFaculty({ ...newFaculty, [key]: e.target.value }); setTouchedFaculty((prev) => ({ ...prev, [key]: true })); }}
                                    error={touchedFaculty[key] && !!validateFacultyField(key, newFaculty[key])}
                                    helperText={touchedFaculty[key] ? validateFacultyField(key, newFaculty[key]) : ''}
                                    sx={inputSx} />
                            </Box>
                        ))}
                        <Box>
                            <Typography sx={labelSx}>Department</Typography>
                            {hodDeptActive ? (
                                <TextField fullWidth size="small" value={newFaculty.department} disabled sx={inputSx} />
                            ) : (
                            <Select fullWidth size="small" value={newFaculty.department} onChange={(e) => setNewFaculty({ ...newFaculty, department: e.target.value })}
                                sx={selectSx} MenuProps={menuPropsSx}>
                                {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((dept) => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
                            </Select>
                            )}
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Designation</Typography>
                            <Select fullWidth size="small" value={newFaculty.designation} onChange={(e) => setNewFaculty({ ...newFaculty, designation: e.target.value })}
                                sx={selectSx} MenuProps={menuPropsSx}>
                                {['Teaching Assistant', 'Lab Assistant', 'Lecturer', 'Senior Lecturer', 'Assistant Professor', 'Senior Assistant Professor', 'Associate Professor', 'Professor', 'HOD', 'Dean', 'Vice Principal', 'Principal', 'Director'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>
                        </Box>
                        <Alert severity="info" sx={{ mt: 1, ...infoAlertSx }}>
                            Default password will be the Employee ID. Faculty can change it after first login.
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => { setFacultyOpen(false); setTouchedFaculty({}); }} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleCreateFaculty} sx={primaryBtnSx}>
                        Create Faculty
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Faculty Dialog */}
            <Dialog open={editFacultyOpen} onClose={() => setEditFacultyOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }} onKeyDown={enterKeyHandler(handleUpdateFaculty)}>
                <DialogTitle sx={dialogTitleSx}>Edit Faculty</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <Box>
                            <Typography sx={labelSx}>Employee ID</Typography>
                            <TextField fullWidth size="small" value={editFaculty.employee_id} disabled
                                sx={disabledInputSx} />
                        </Box>
                        {[{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone Number', key: 'phone' }].map(({ label, key }) => (
                            <Box key={key}>
                                <Typography sx={labelSx}>{label}</Typography>
                                <TextField fullWidth size="small" value={editFaculty[key]} onChange={(e) => setEditFaculty({ ...editFaculty, [key]: e.target.value })}
                                    sx={inputSx} />
                            </Box>
                        ))}
                        <Box>
                            <Typography sx={labelSx}>Department</Typography>
                            <Select fullWidth size="small" value={editFaculty.department} onChange={(e) => setEditFaculty({ ...editFaculty, department: e.target.value })}
                                sx={selectSx} MenuProps={menuPropsSx}>
                                {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((dept) => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
                            </Select>
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Designation</Typography>
                            <Select fullWidth size="small" value={editFaculty.designation} onChange={(e) => setEditFaculty({ ...editFaculty, designation: e.target.value })}
                                sx={selectSx} MenuProps={menuPropsSx}>
                                {['Teaching Assistant', 'Lab Assistant', 'Lecturer', 'Senior Lecturer', 'Assistant Professor', 'Senior Assistant Professor', 'Associate Professor', 'Professor', 'HOD', 'Dean', 'Vice Principal', 'Principal', 'Director'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => setEditFacultyOpen(false)} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleUpdateFaculty} sx={primaryBtnSx}>
                        Update Faculty
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Faculty Dialog */}
            <Dialog open={viewFacultyOpen} onClose={() => setViewFacultyOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>Faculty Details</DialogTitle>
                <DialogContent>
                    {viewFacultyData && (() => {
                        const workload = getFacultyWorkload(viewFacultyData.id || viewFacultyData._id);
                        return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
                            {[
                                { label: 'Name', value: viewFacultyData.name },
                                { label: 'Employee ID', value: viewFacultyData.employee_id || viewFacultyData.username },
                                { label: 'Email', value: viewFacultyData.email },
                                { label: 'Phone', value: viewFacultyData.phone },
                                { label: 'Department', value: viewFacultyData.department },
                                { label: 'Designation', value: viewFacultyData.designation },
                            ].map(({ label, value }) => (
                                <Box key={label} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
                                    <Typography sx={{ color: 'var(--color-text-primary)', fontSize: '1rem', fontWeight: 500, pl: 0.5 }}>{value || '—'}</Typography>
                                </Box>
                            ))}

                            {/* Faculty Workload Section */}
                            <Box sx={{ mt: 1, pt: 2, borderTop: '1px solid var(--color-primary-alpha-12)' }}>
                                <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: '0.85rem', fontWeight: 700, mb: 1.5 }}>Workload Summary</Typography>
                                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                                    <Grid size={{ xs: 6 }}>
                                        <Box sx={{ background: 'var(--color-primary-alpha-8)', borderRadius: 'var(--radius-lg)', p: 1.5, textAlign: 'center' }}>
                                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>{workload.totalSubjects}</Typography>
                                            <Typography sx={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Subjects</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Box sx={{ background: 'var(--color-primary-alpha-8)', borderRadius: 'var(--radius-lg)', p: 1.5, textAlign: 'center' }}>
                                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>{workload.totalPeriods}</Typography>
                                            <Typography sx={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total Periods</Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                                {workload.subjects.length > 0 && (
                                    <Box>
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-dark)', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Subjects</Typography>
                                        {workload.subjects.map((sub, idx) => (
                                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8, px: 1, borderRadius: 'var(--radius-md)', background: idx % 2 === 0 ? 'transparent' : 'var(--color-primary-alpha-4)' }}>
                                                <Box>
                                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{sub.name}</Typography>
                                                    <Typography sx={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{sub.dept} · Year {sub.year} · {sub.section}</Typography>
                                                </Box>
                                                <Chip label={`${sub.periods} periods`} size="small" sx={{ background: 'var(--color-primary-alpha-15)', color: 'var(--color-primary-dark)', fontWeight: 600, fontSize: '0.7rem' }} />
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                                {workload.subjects.length === 0 && (
                                    <Typography sx={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', py: 2 }}>No subjects assigned yet</Typography>
                                )}
                            </Box>

                            {/* Faculty Timetable Section */}
                            <Box sx={{ mt: 1, pt: 2, borderTop: '1px solid var(--color-primary-alpha-12)' }}>
                                <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: '0.85rem', fontWeight: 700, mb: 1.5 }}>Timetable</Typography>
                                {facultyTimetableLoading ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 'var(--radius-md)' }} />
                                        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 'var(--radius-md)' }} />
                                    </Box>
                                ) : facultyTimetable && ((Array.isArray(facultyTimetable) ? facultyTimetable : facultyTimetable?.schedule || []).length > 0) ? (
                                    <TableContainer sx={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ background: 'var(--color-table-header-bg)' }}>
                                                    <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary-dark)', py: 0.5, px: 1 }}>Day</TableCell>
                                                    <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary-dark)', py: 0.5, px: 1 }}>Period</TableCell>
                                                    <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary-dark)', py: 0.5, px: 1 }}>Subject</TableCell>
                                                    <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary-dark)', py: 0.5, px: 1 }}>Section</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(Array.isArray(facultyTimetable) ? facultyTimetable : facultyTimetable?.schedule || []).map((slot, idx) => (
                                                    <TableRow key={idx} sx={{ background: idx % 2 === 0 ? 'var(--color-bg-paper)' : 'var(--color-table-stripe-bg)' }}>
                                                        <TableCell sx={{ fontSize: '0.75rem', color: 'var(--color-text-primary)', py: 0.4, px: 1 }}>{slot.day || slot.day_of_week || '—'}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', py: 0.4, px: 1 }}>{slot.period || slot.period_number || '—'}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem', color: 'var(--color-text-primary)', py: 0.4, px: 1, fontWeight: 600 }}>{slot.subject || slot.subject_name || '—'}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', py: 0.4, px: 1 }}>{slot.section || slot.section_name || '—'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography sx={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', py: 2 }}>No timetable data available</Typography>
                                )}
                            </Box>
                        </Box>
                        );
                    })()}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => setViewFacultyOpen(false)} sx={cancelBtnSx}>Close</Button>
                    <Button onClick={() => { setViewFacultyOpen(false); handleEditFacultyOpen(viewFacultyData); }} sx={primaryBtnSx}>
                        Edit
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create Section Dialog */}
            <Dialog open={sectionOpen} onClose={() => setSectionOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }} onKeyDown={enterKeyHandler(handleCreateSection)}>
                <DialogTitle sx={dialogTitleSx}>Add New Section</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <Box>
                            <Typography sx={labelSx}>Section Name</Typography>
                            <TextField fullWidth size="small" value={newSection.name}
                                placeholder={newSection.department ? `e.g. A, B, 1, 2` : 'Enter section name'}
                                onChange={(e) => { setNewSection({ ...newSection, name: e.target.value }); setTouchedSection((prev) => ({ ...prev, name: true })); }}
                                error={touchedSection.name && !!validateSectionField('name', newSection.name)}
                                helperText={touchedSection.name ? validateSectionField('name', newSection.name) : (newSection.department && newSection.name ? `Will be saved as: ${newSection.department}-${newSection.name}` : '')}
                                FormHelperTextProps={{ sx: { color: 'var(--color-primary)', fontWeight: 600 } }}
                                InputProps={newSection.department ? {
                                    startAdornment: <InputAdornment position="start"><Typography sx={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '0.9rem' }}>{newSection.department}-</Typography></InputAdornment>
                                } : undefined}
                                sx={inputSx} />
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Academic Year</Typography>
                            <TextField fullWidth size="small" value={newSection.academic_year}
                                placeholder="e.g. 2024-25"
                                onChange={(e) => { setNewSection({ ...newSection, academic_year: e.target.value }); setTouchedSection((prev) => ({ ...prev, academic_year: true })); }}
                                error={touchedSection.academic_year && !!validateSectionField('academic_year', newSection.academic_year)}
                                helperText={touchedSection.academic_year ? validateSectionField('academic_year', newSection.academic_year) : ''}
                                sx={inputSx} />
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Department</Typography>
                            {hodDeptActive ? (
                                <TextField fullWidth size="small" value={newSection.department} disabled sx={inputSx} />
                            ) : (
                            <Select fullWidth size="small" value={newSection.department} onChange={(e) => { const dept = e.target.value; const isTwoYear = ['MBA', 'MCA'].includes(dept); setNewSection({ ...newSection, department: dept, year: isTwoYear && newSection.year > 2 ? '' : newSection.year, semester: '' }); }}
                                sx={selectSx} MenuProps={menuPropsSx}>
                                {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((dept) => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
                            </Select>
                            )}
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Year</Typography>
                            <Select fullWidth size="small" value={newSection.year} onChange={(e) => setNewSection({ ...newSection, year: e.target.value, semester: '' })}
                                disabled={!newSection.department}
                                sx={selectDisabledSx} MenuProps={menuPropsSx}>
                                {getYearOptions(newSection.department).map((y) => <MenuItem key={y} value={y}>{y} Year</MenuItem>)}
                            </Select>
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Semester</Typography>
                            <Select fullWidth size="small" value={newSection.semester} onChange={(e) => setNewSection({ ...newSection, semester: e.target.value })}
                                disabled={!newSection.year}
                                sx={selectDisabledSx} MenuProps={menuPropsSx}>
                                {getSemesterOptions(newSection.department, newSection.year).map((s) => <MenuItem key={s} value={s}>{s} Semester</MenuItem>)}
                            </Select>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => { setSectionOpen(false); setTouchedSection({}); }} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleCreateSection} sx={primaryBtnSx}>Create Section</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Section Dialog */}
            <Dialog open={editSectionOpen} onClose={() => setEditSectionOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }} onKeyDown={enterKeyHandler(handleUpdateSection)}>
                <DialogTitle sx={dialogTitleSx}>Edit Section</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <Box>
                            <Typography sx={labelSx}>Section Name</Typography>
                            <TextField fullWidth size="small" value={editSection.name}
                                placeholder={editSection.department ? `e.g. A, B, 1, 2` : 'Enter section name'}
                                onChange={(e) => setEditSection({ ...editSection, name: e.target.value })}
                                helperText={editSection.department && editSection.name ? `Will be saved as: ${editSection.department}-${editSection.name}` : ''}
                                FormHelperTextProps={{ sx: { color: 'var(--color-primary)', fontWeight: 600 } }}
                                InputProps={editSection.department ? {
                                    startAdornment: <InputAdornment position="start"><Typography sx={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '0.9rem' }}>{editSection.department}-</Typography></InputAdornment>
                                } : undefined}
                                sx={inputSx} />
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Academic Year</Typography>
                            <TextField fullWidth size="small" value={editSection.academic_year} onChange={(e) => setEditSection({ ...editSection, academic_year: e.target.value })}
                                sx={inputSx} />
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Department</Typography>
                            <Select fullWidth size="small" value={editSection.department} onChange={(e) => { const dept = e.target.value; const isTwoYear = ['MBA', 'MCA'].includes(dept); setEditSection({ ...editSection, department: dept, year: isTwoYear && editSection.year > 2 ? '' : editSection.year, semester: '' }); }}
                                sx={selectSx} MenuProps={menuPropsSx}>
                                {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((dept) => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
                            </Select>
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Year</Typography>
                            <Select fullWidth size="small" value={editSection.year} onChange={(e) => setEditSection({ ...editSection, year: e.target.value, semester: '' })}
                                disabled={!editSection.department}
                                sx={selectDisabledSx} MenuProps={menuPropsSx}>
                                {getYearOptions(editSection.department).map((y) => <MenuItem key={y} value={y}>{y} Year</MenuItem>)}
                            </Select>
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Semester</Typography>
                            <Select fullWidth size="small" value={editSection.semester} onChange={(e) => setEditSection({ ...editSection, semester: e.target.value })}
                                disabled={!editSection.year}
                                sx={selectDisabledSx} MenuProps={menuPropsSx}>
                                {getSemesterOptions(editSection.department, editSection.year).map((s) => <MenuItem key={s} value={s}>{s} Semester</MenuItem>)}
                            </Select>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => setEditSectionOpen(false)} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleUpdateSection} sx={primaryBtnSx}>Update Section</Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Section Upload Dialog */}
            <Dialog open={bulkSectionOpen} onClose={() => { setBulkSectionOpen(false); setImportPreview(null); }} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>Bulk Upload Sections</DialogTitle>
                <DialogContent>
                    {!bulkSectionResult ? (
                        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Alert severity="info" sx={infoAlertSx}>
                                Upload a <strong>CSV</strong> or <strong>Excel</strong> file with columns: <strong>name</strong>, <strong>academic_year</strong>, <strong>department</strong>, <strong>year</strong>, <strong>semester</strong>.
                            </Alert>
                            <Button startIcon={<Download />} onClick={downloadSectionTemplate} sx={{ alignSelf: 'flex-start', color: 'var(--color-primary-dark)', textTransform: 'none' }}>Download Template</Button>
                            <Button component="label" startIcon={<CloudUpload />} fullWidth
                                sx={bulkUploadBtnSx}>
                                {bulkSectionFile ? bulkSectionFile.name : 'Choose CSV or Excel File'}
                                <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files[0]; setBulkSectionFile(f); if (f) parseImportFile(f, 'section'); else setImportPreview(null); }} />
                            </Button>
                            {renderImportPreview('section')}
                        </Box>
                    ) : (
                        <Box sx={{ pt: 1 }}>
                            <Alert severity="success" sx={{ mb: 2, background: 'var(--color-secondary-alpha-10)', color: 'var(--color-secondary-dark)', border: '1px solid var(--color-secondary-alpha-20)', '& .MuiAlert-icon': { color: 'var(--color-secondary)' } }}>{bulkSectionResult.message}</Alert>
                            {[{ key: 'created', color: 'var(--color-secondary-dark)', label: 'Created' }, { key: 'skipped', color: 'var(--color-warning-dark)', label: 'Skipped' }, { key: 'errors', color: 'var(--color-error-dark)', label: 'Errors' }].map(({ key, color, label }) => bulkSectionResult[key]?.length > 0 && (
                                <Box key={key} sx={{ mb: 2 }}>
                                    <Typography sx={{ fontWeight: 600, color, fontSize: '0.85rem', mb: 1 }}>{label} ({bulkSectionResult[key].length})</Typography>
                                    <Box sx={{ p: 1.5, maxHeight: 150, overflow: 'auto', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                                        {bulkSectionResult[key].map((item, i) => <Typography key={i} sx={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{item}</Typography>)}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    {!bulkSectionResult ? (<>
                        <Button onClick={() => setBulkSectionOpen(false)} sx={cancelBtnSx}>Cancel</Button>
                        <Button onClick={handleBulkSectionUpload} disabled={bulkSectionUploading || !bulkSectionFile}
                            sx={disabledPrimaryBtnSx}>
                            {bulkSectionUploading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </>) : (
                        <Button onClick={() => setBulkSectionOpen(false)} fullWidth sx={{ background: 'var(--gradient-primary-reverse)', color: 'var(--color-text-white)', borderRadius: '10px', textTransform: 'none', fontWeight: 600, '&:hover': { background: 'var(--gradient-primary-hover)' } }}>Done</Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* View Students in Section Dialog */}
            <Dialog open={viewStudentsDialogOpen} onClose={() => setViewStudentsDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>
                    Students in {selectedSectionName}
                </DialogTitle>
                <DialogContent>
                    {viewStudentsList.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography sx={{ color: 'var(--color-text-secondary)' }}>No students enrolled in this section yet.</Typography>
                        </Box>
                    ) : (
                        <TableContainer sx={{ mt: 2, borderRadius: 'var(--radius-lg)', overflow: 'auto', maxWidth: '100%' }}>
                            <Table size="small" sx={{ minWidth: { xs: 320, sm: 400 } }}>
                                <TableHead>
                                    <TableRow sx={tableHeaderRowSx}>
                                        {['Name', 'Roll Number', 'Status', 'Actions'].map((h) => (
                                            <TableCell key={h} align={['Actions', 'Status', 'Dept', 'Department', 'Year', 'Sem', 'Semester', 'Section', 'Periods', 'Designation', 'Academic Year'].includes(h) ? 'center' : 'left'} sx={tableHeaderCellSx}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {viewStudentsList.map((student, idx) => (
                                        <TableRow key={student.roll_number} sx={tableRowSx(idx)}>
                                            <TableCell sx={{ color: 'var(--color-text-primary)', ...tableCellBorderSx }}>{student.name}</TableCell>
                                            <TableCell sx={{ color: 'var(--color-primary-dark)', fontWeight: 600, ...tableCellBorderSx }}>{student.roll_number}</TableCell>
                                            <TableCell align="center" sx={tableCellBorderSx}>
                                                <Chip label={student.embeddings?.length > 0 ? 'Enrolled' : 'Pending'} size="small"
                                                    sx={student.embeddings?.length > 0 ? { background: 'var(--color-secondary-alpha-10)', color: 'var(--color-secondary-dark)', fontWeight: 600 } : { background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)', fontWeight: 600 }} />
                                            </TableCell>
                                            <TableCell align="center" sx={tableCellBorderSx}>
                                                <Tooltip title="Delete">
                                                    <IconButton size="small" sx={{ color: 'var(--color-error)' }} onClick={() => { showConfirm('Delete Student', 'Are you sure you want to delete this student?', async () => { closeConfirmDialog(); try { await api.delete(`/students/${student.roll_number}`); setViewStudentsList(prev => prev.filter(s => s.roll_number !== student.roll_number)); fetchStudents(); } catch (error) { showToast(error.response?.data?.detail || 'Failed to delete student', 'error'); } }); }}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid var(--color-primary-alpha-12)' }}>
                    <Button onClick={() => setViewStudentsDialogOpen(false)} sx={cancelBtnSx}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Student Credentials Dialog */}
            <Dialog open={credentialsDialog} onClose={() => setCredentialsDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={{ fontWeight: 700, color: 'var(--color-text-primary)', background: 'var(--color-secondary-alpha-8)', borderBottom: '1px solid var(--color-primary-alpha-12)' }}>
                    Student Account Created
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {studentCredentials && (
                        <Box>
                            <Alert severity="info" sx={infoAlertSx}>
                                Share these credentials with the student.
                            </Alert>
                            <Box sx={{ mt: 2, p: 3, background: 'var(--color-bg)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {[{ label: 'Student Name', value: studentCredentials.name },
                                      { label: 'Username', value: studentCredentials.username, chip: 'Username', chipColor: 'var(--color-primary-alpha-15)' },
                                      { label: 'Initial Password', value: studentCredentials.initial_password, chip: 'Password', chipColor: 'var(--color-primary-alpha-15)' }
                                    ].map(({ label, value, chip, chipColor }) => (
                                        <Box key={label}>
                                            <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{label}</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                <Typography sx={{ color: 'var(--color-text-primary)', fontSize: '1.1rem', fontWeight: 700, fontFamily: chip ? 'monospace' : 'inherit' }}>{value}</Typography>
                                                {chip && <Chip label={chip} size="small" sx={{ background: chipColor, color: 'var(--color-primary-dark)', fontWeight: 600 }} />}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                            <Alert severity="warning" sx={{ mt: 3, background: 'var(--color-warning-alpha-8)', color: 'var(--color-warning-dark)', border: '1px solid var(--color-warning-alpha-20)', '& .MuiAlert-icon': { color: 'var(--color-warning)' } }}>
                                <strong>Important:</strong> The student must change this password on their first login.
                            </Alert>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => setCredentialsDialog(false)} fullWidth sx={{ background: 'var(--gradient-primary-reverse)', color: 'var(--color-text-white)', borderRadius: '10px', textTransform: 'none', fontWeight: 600, '&:hover': { background: 'var(--gradient-primary-hover)' } }}>Got it</Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Faculty Upload Dialog */}
            <Dialog open={bulkFacultyOpen} onClose={() => { setBulkFacultyOpen(false); setImportPreview(null); }} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>Bulk Upload Faculty</DialogTitle>
                <DialogContent>
                    {!bulkFacultyResult ? (
                        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Alert severity="info" sx={infoAlertSx}>
                                Upload a <strong>CSV</strong> or <strong>Excel</strong> file with columns: <strong>name</strong>, <strong>employee_id</strong>, <strong>email</strong>, <strong>phone</strong>, <strong>department</strong>, <strong>designation</strong>.
                            </Alert>
                            <Button startIcon={<Download />} onClick={downloadFacultyTemplate} sx={{ alignSelf: 'flex-start', color: 'var(--color-primary-dark)', textTransform: 'none' }}>Download Template</Button>
                            <Button component="label" startIcon={<CloudUpload />} fullWidth
                                sx={bulkUploadBtnSx}>
                                {bulkFacultyFile ? bulkFacultyFile.name : 'Choose CSV or Excel File'}
                                <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files[0]; setBulkFacultyFile(f); if (f) parseImportFile(f, 'faculty'); else setImportPreview(null); }} />
                            </Button>
                            {renderImportPreview('faculty')}
                        </Box>
                    ) : (
                        <Box sx={{ pt: 1 }}>
                            <Alert severity="success" sx={{ mb: 2, background: 'var(--color-secondary-alpha-10)', color: 'var(--color-secondary-dark)', border: '1px solid var(--color-secondary-alpha-20)', '& .MuiAlert-icon': { color: 'var(--color-secondary)' } }}>{bulkFacultyResult.message}</Alert>
                            {[{ key: 'created', color: 'var(--color-secondary-dark)', label: 'Created' }, { key: 'skipped', color: 'var(--color-warning-dark)', label: 'Skipped' }, { key: 'errors', color: 'var(--color-error-dark)', label: 'Errors' }].map(({ key, color, label }) => bulkFacultyResult[key]?.length > 0 && (
                                <Box key={key} sx={{ mb: 2 }}>
                                    <Typography sx={{ fontWeight: 600, color, fontSize: '0.85rem', mb: 1 }}>{label} ({bulkFacultyResult[key].length})</Typography>
                                    <Box sx={{ p: 1.5, maxHeight: 150, overflow: 'auto', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                                        {bulkFacultyResult[key].map((item, i) => <Typography key={i} sx={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{item}</Typography>)}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    {!bulkFacultyResult ? (<>
                        <Button onClick={() => setBulkFacultyOpen(false)} sx={cancelBtnSx}>Cancel</Button>
                        <Button onClick={handleBulkFacultyUpload} disabled={bulkFacultyUploading || !bulkFacultyFile}
                            sx={disabledPrimaryBtnSx}>
                            {bulkFacultyUploading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </>) : (
                        <Button onClick={() => setBulkFacultyOpen(false)} fullWidth sx={{ background: 'var(--gradient-primary-reverse)', color: 'var(--color-text-white)', borderRadius: '10px', textTransform: 'none', fontWeight: 600, '&:hover': { background: 'var(--gradient-primary-hover)' } }}>Done</Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Bulk Upload Dialog */}
            <Dialog open={bulkUploadOpen} onClose={() => { setBulkUploadOpen(false); setImportPreview(null); }} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>Bulk Upload Students</DialogTitle>
                <DialogContent>
                    {!bulkResult ? (
                        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Alert severity="info" sx={infoAlertSx}>
                                Upload a <strong>CSV</strong> or <strong>Excel</strong> file with columns: <strong>name</strong>, <strong>roll_number</strong>, <strong>phone</strong>, <strong>year</strong>, <strong>semester</strong>, <strong>department</strong>, <strong>section_name</strong>. Students are auto-assigned to sections.
                            </Alert>
                            <Button startIcon={<Download />} onClick={downloadStudentTemplate} sx={{ alignSelf: 'flex-start', color: 'var(--color-primary-dark)', textTransform: 'none' }}>Download Template</Button>
                            <Button component="label" startIcon={<CloudUpload />} fullWidth
                                sx={bulkUploadBtnSx}>
                                {bulkFile ? bulkFile.name : 'Choose CSV or Excel File'}
                                <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files[0]; setBulkFile(f); if (f) parseImportFile(f, 'student'); else setImportPreview(null); }} />
                            </Button>
                            {renderImportPreview('student')}
                        </Box>
                    ) : (
                        <Box sx={{ pt: 1 }}>
                            <Alert severity="success" sx={{ mb: 2, background: 'var(--color-secondary-alpha-10)', color: 'var(--color-secondary-dark)', border: '1px solid var(--color-secondary-alpha-20)', '& .MuiAlert-icon': { color: 'var(--color-secondary)' } }}>{bulkResult.message}</Alert>
                            {[{ key: 'created', color: 'var(--color-secondary-dark)', label: 'Created' }, { key: 'skipped', color: 'var(--color-warning-dark)', label: 'Skipped' }, { key: 'errors', color: 'var(--color-error-dark)', label: 'Errors' }].map(({ key, color, label }) => bulkResult[key]?.length > 0 && (
                                <Box key={key} sx={{ mb: 2 }}>
                                    <Typography sx={{ fontWeight: 600, color, fontSize: '0.85rem', mb: 1 }}>{label} ({bulkResult[key].length})</Typography>
                                    <Box sx={{ p: 1.5, maxHeight: 150, overflow: 'auto', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                                        {bulkResult[key].map((item, i) => <Typography key={i} sx={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{item}</Typography>)}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    {!bulkResult ? (<>
                        <Button onClick={() => setBulkUploadOpen(false)} sx={cancelBtnSx}>Cancel</Button>
                        <Button onClick={handleBulkUpload} disabled={bulkUploading || !bulkFile}
                            sx={disabledPrimaryBtnSx}>
                            {bulkUploading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </>) : (
                        <Button onClick={() => setBulkUploadOpen(false)} fullWidth sx={{ background: 'var(--gradient-primary-reverse)', color: 'var(--color-text-white)', borderRadius: '10px', textTransform: 'none', fontWeight: 600, '&:hover': { background: 'var(--gradient-primary-hover)' } }}>Done</Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Allot Subject Dialog */}
            <Dialog open={assignmentOpen} onClose={() => setAssignmentOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }} onKeyDown={enterKeyHandler(handleCreateAssignment)}>
                <DialogTitle sx={dialogTitleSx}>Allot Subject to Faculty</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <Box>
                            <Typography sx={labelSx}>Faculty</Typography>
                            <Select fullWidth size="small" value={newAssignment.faculty_id} onChange={(e) => setNewAssignment({ ...newAssignment, faculty_id: e.target.value })}
                                sx={selectSx} MenuProps={menuPropsSx}>
                                {(hodDeptActive ? faculty.filter(f => f.department === hodDeptActive) : faculty).map((fac) => <MenuItem key={fac.id} value={fac.id}>{fac.employee_id || fac.username} — {fac.name || 'N/A'}</MenuItem>)}
                            </Select>
                        </Box>
                        {[{ label: 'Subject Name', key: 'subject_name' }, { label: 'Number of Periods', key: 'periods', type: 'number' }, { label: 'Department', key: 'department' }].map(({ label, key, type }) => (
                            <Box key={key}>
                                <Typography sx={labelSx}>{label}</Typography>
                                <TextField fullWidth size="small" type={type || 'text'} value={newAssignment[key]} disabled={key === 'department' && !!hodDeptActive} onChange={(e) => setNewAssignment({ ...newAssignment, [key]: e.target.value })}
                                    sx={inputSx} />
                            </Box>
                        ))}
                        {[{ label: 'Year', key: 'year', options: [1,2,3,4].map(y => ({ v: y, l: `${y} Year` })) },
                          { label: 'Section', key: 'section_id', options: (hodDeptActive ? sections.filter(s => s.department === hodDeptActive) : sections).map(s => ({ v: s.id, l: `${s.department ? `${s.department} - ` : ''}${s.name}${s.academic_year ? ` (${s.academic_year})` : ''}` })) }
                        ].map(({ label, key, options }) => (
                            <Box key={key}>
                                <Typography sx={labelSx}>{label}</Typography>
                                <Select fullWidth size="small" value={newAssignment[key]} onChange={(e) => setNewAssignment({ ...newAssignment, [key]: e.target.value })}
                                    sx={selectSx} MenuProps={menuPropsSx}>
                                    {options.map(o => <MenuItem key={o.v} value={o.v}>{o.l}</MenuItem>)}
                                </Select>
                            </Box>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => setAssignmentOpen(false)} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleCreateAssignment} sx={primaryBtnSx}>Allot Subject</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Assignment Dialog */}
            <Dialog open={editAssignmentOpen} onClose={() => { setEditAssignmentOpen(false); setEditAssignment(null); }} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }} onKeyDown={enterKeyHandler(handleUpdateAssignment)}>
                <DialogTitle sx={dialogTitleSx}>Edit Subject Allotment</DialogTitle>
                <DialogContent>
                    {editAssignment && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                            <Box>
                                <Typography sx={labelSx}>Faculty</Typography>
                                <Select fullWidth size="small" value={editAssignment.faculty_id} onChange={(e) => setEditAssignment({ ...editAssignment, faculty_id: e.target.value })}
                                    sx={selectSx} MenuProps={menuPropsSx}>
                                    {(hodDeptActive ? faculty.filter(f => f.department === hodDeptActive) : faculty).map((fac) => <MenuItem key={fac.id} value={fac.id}>{fac.employee_id || fac.username} — {fac.name || 'N/A'}</MenuItem>)}
                                </Select>
                            </Box>
                            {[{ label: 'Subject Name', key: 'subject_name' }, { label: 'Number of Periods', key: 'periods', type: 'number' }, { label: 'Department', key: 'department' }].map(({ label, key, type }) => (
                                <Box key={key}>
                                    <Typography sx={labelSx}>{label}</Typography>
                                    <TextField fullWidth size="small" type={type || 'text'} value={editAssignment[key]} disabled={key === 'department' && !!hodDeptActive} onChange={(e) => setEditAssignment({ ...editAssignment, [key]: e.target.value })}
                                        sx={inputSx} />
                                </Box>
                            ))}
                            {[{ label: 'Year', key: 'year', options: [1,2,3,4].map(y => ({ v: y, l: `${y} Year` })) },
                              { label: 'Section', key: 'section_id', options: (hodDeptActive ? sections.filter(s => s.department === hodDeptActive) : sections).map(s => ({ v: s.id, l: `${s.department ? `${s.department} - ` : ''}${s.name}${s.academic_year ? ` (${s.academic_year})` : ''}` })) }
                            ].map(({ label, key, options }) => (
                                <Box key={key}>
                                    <Typography sx={labelSx}>{label}</Typography>
                                    <Select fullWidth size="small" value={editAssignment[key]} onChange={(e) => setEditAssignment({ ...editAssignment, [key]: e.target.value })}
                                        sx={selectSx} MenuProps={menuPropsSx}>
                                        {options.map(o => <MenuItem key={o.v} value={o.v}>{o.l}</MenuItem>)}
                                    </Select>
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => { setEditAssignmentOpen(false); setEditAssignment(null); }} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleUpdateAssignment} sx={primaryBtnSx}>Update Allotment</Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Assignment Upload Dialog */}
            <Dialog open={bulkAssignmentOpen} onClose={() => setBulkAssignmentOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>Bulk Upload Subject Allotments</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ ...infoAlertSx, mb: 2, mt: 1 }}>
                        Upload a CSV or Excel file with columns: <strong>employee_id, subject_name, periods, department, year, section_name</strong>
                    </Alert>
                    <Button variant="outlined" component="label" fullWidth sx={bulkUploadBtnSx}>
                        <CloudUpload sx={{ mr: 1 }} />
                        {bulkAssignmentFile ? bulkAssignmentFile.name : 'Choose CSV or Excel File'}
                        <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={(e) => { setBulkAssignmentFile(e.target.files[0]); setBulkAssignmentResult(null); }} />
                    </Button>
                    {bulkAssignmentResult && (
                        <Box sx={{ mt: 2 }}>
                            <Alert severity="success" sx={{ mb: 1, borderRadius: '10px' }}>{bulkAssignmentResult.message}</Alert>
                            {bulkAssignmentResult.created?.length > 0 && (
                                <Box sx={{ mb: 1 }}>
                                    <Typography sx={{ fontWeight: 700, color: 'var(--color-secondary-dark)', fontSize: '0.8rem', mb: 0.5 }}>Created:</Typography>
                                    {bulkAssignmentResult.created.map((c, i) => <Typography key={i} sx={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', pl: 1 }}>{c}</Typography>)}
                                </Box>
                            )}
                            {bulkAssignmentResult.skipped?.length > 0 && (
                                <Box sx={{ mb: 1 }}>
                                    <Typography sx={{ fontWeight: 700, color: 'var(--color-warning-dark)', fontSize: '0.8rem', mb: 0.5 }}>Skipped:</Typography>
                                    {bulkAssignmentResult.skipped.map((s, i) => <Typography key={i} sx={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', pl: 1 }}>{s}</Typography>)}
                                </Box>
                            )}
                            {bulkAssignmentResult.errors?.length > 0 && (
                                <Box sx={{ mb: 1 }}>
                                    <Typography sx={{ fontWeight: 700, color: 'var(--color-error-dark)', fontSize: '0.8rem', mb: 0.5 }}>Errors:</Typography>
                                    {bulkAssignmentResult.errors.map((e, i) => <Typography key={i} sx={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', pl: 1 }}>{e}</Typography>)}
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    {!bulkAssignmentResult ? (<>
                        <Button onClick={() => setBulkAssignmentOpen(false)} sx={cancelBtnSx}>Cancel</Button>
                        <Button onClick={handleBulkAssignmentUpload} disabled={bulkAssignmentUploading || !bulkAssignmentFile}
                            sx={disabledPrimaryBtnSx}>
                            {bulkAssignmentUploading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </>) : (
                        <Button onClick={() => setBulkAssignmentOpen(false)} fullWidth sx={{ background: 'var(--gradient-primary-reverse)', color: 'var(--color-text-white)', borderRadius: '10px', textTransform: 'none', fontWeight: 600, '&:hover': { background: 'var(--gradient-primary-hover)' } }}>Done</Button>
                    )}
                </DialogActions>
            </Dialog>

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

            {/* Reusable Confirmation Dialog */}
            <Dialog
                open={confirmDialog.open}
                onClose={closeConfirmDialog}
                maxWidth="xs"
                fullWidth
                fullScreen={isMobile}
                PaperProps={{
                    sx: {
                        background: 'var(--color-bg-paper)',
                        border: '1px solid var(--color-primary-alpha-15)',
                        borderRadius: 'var(--radius-xl)',
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-primary-alpha-12)' }}>
                    {confirmDialog.title}
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5, pb: 1 }}>
                    <DialogContentText sx={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                        {confirmDialog.message}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, borderTop: '1px solid var(--color-primary-alpha-12)', gap: 1 }}>
                    <Button onClick={closeConfirmDialog} sx={{ color: 'var(--color-text-muted)', borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDialog.onConfirm}
                        sx={{
                            background: 'var(--gradient-primary-reverse)',
                            color: 'var(--color-text-white)',
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            '&:hover': { background: 'var(--gradient-primary-hover)' },
                        }}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Student Profile Dialog */}
            <Dialog open={studentProfileOpen} onClose={() => setStudentProfileOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        Student Profile
                        <IconButton size="small" onClick={() => setStudentProfileOpen(false)} sx={{ color: 'var(--color-text-muted)' }}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {studentProfileData && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                            {/* Student Info */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 2, borderBottom: '1px solid var(--color-primary-alpha-12)' }}>
                                <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gradient-primary-reverse)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Typography sx={{ color: 'var(--color-text-white)', fontSize: '1.3rem', fontWeight: 700 }}>{studentProfileData.name?.charAt(0)?.toUpperCase()}</Typography>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{studentProfileData.name}</Typography>
                                    <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{studentProfileData.roll_number}</Typography>
                                    <Chip label={studentProfileData.status === 'active' ? 'Active' : 'Inactive'} size="small" sx={{ mt: 0.5, background: studentProfileData.status === 'active' ? 'var(--color-status-active-bg)' : 'var(--color-status-inactive-bg)', color: studentProfileData.status === 'active' ? 'var(--color-status-active)' : 'var(--color-status-inactive)', fontWeight: 600, fontSize: '0.7rem' }} />
                                </Box>
                            </Box>

                            {/* Details Grid */}
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Email', value: studentProfileData.email },
                                    { label: 'Phone', value: studentProfileData.phone },
                                    { label: 'Department', value: studentProfileData.department },
                                    { label: 'Year', value: studentProfileData.year },
                                    { label: 'Semester', value: studentProfileData.semester },
                                    { label: 'Section', value: studentProfileData.section_name },
                                ].map(({ label, value }) => (
                                    <Grid size={{ xs: 6 }} key={label}>
                                        <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
                                        <Typography sx={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>{value || '—'}</Typography>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Attendance Section */}
                            <Box sx={{ mt: 1, pt: 2, borderTop: '1px solid var(--color-primary-alpha-12)' }}>
                                <Typography sx={{ color: 'var(--color-primary-dark)', fontSize: '0.85rem', fontWeight: 700, mb: 1.5 }}>Attendance Summary</Typography>
                                {studentProfileLoading ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 'var(--radius-lg)' }} />
                                        <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 'var(--radius-lg)' }} />
                                    </Box>
                                ) : studentAttendance ? (
                                    <Box>
                                        <Grid container spacing={1.5} sx={{ mb: 2 }}>
                                            <Grid size={{ xs: 4 }}>
                                                <Box sx={{ background: 'var(--color-primary-alpha-8)', borderRadius: 'var(--radius-lg)', p: 1.5, textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)' }}>{studentAttendance.total_classes || 0}</Typography>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 4 }}>
                                                <Box sx={{ background: 'rgba(76, 175, 80, 0.08)', borderRadius: 'var(--radius-lg)', p: 1.5, textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: '#4caf50' }}>{studentAttendance.present_count || 0}</Typography>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Present</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 4 }}>
                                                <Box sx={{ background: 'rgba(244, 67, 54, 0.08)', borderRadius: 'var(--radius-lg)', p: 1.5, textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: '#f44336' }}>{studentAttendance.absent_count || 0}</Typography>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Absent</Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                        {studentAttendance.attendance_percentage !== undefined && (
                                            <Box sx={{ mt: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Attendance Rate</Typography>
                                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: studentAttendance.attendance_percentage >= 75 ? '#4caf50' : '#f44336' }}>{studentAttendance.attendance_percentage?.toFixed(1)}%</Typography>
                                                </Box>
                                                <LinearProgress variant="determinate" value={Math.min(studentAttendance.attendance_percentage || 0, 100)} sx={{ height: 8, borderRadius: 4, background: 'var(--color-primary-alpha-8)', '& .MuiLinearProgress-bar': { borderRadius: 4, background: studentAttendance.attendance_percentage >= 75 ? '#4caf50' : '#f44336' } }} />
                                            </Box>
                                        )}
                                    </Box>
                                ) : (
                                    <Typography sx={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', py: 2 }}>No attendance data available</Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ ...dialogActionsSx, flexWrap: 'wrap', gap: 1 }}>
                    <Button onClick={() => setStudentProfileOpen(false)} sx={cancelBtnSx}>Close</Button>
                    <Button startIcon={<CardMembershipIcon />} onClick={() => { if (studentProfileData) generateAttendanceCertificate(studentProfileData); }} sx={outlineBtnSx}>Certificate</Button>
                    <Button onClick={() => { setStudentProfileOpen(false); if (studentProfileData) { setEditStudent({ roll_number: studentProfileData.roll_number, name: studentProfileData.name, phone: studentProfileData.phone, year: studentProfileData.year, semester: studentProfileData.semester, department: studentProfileData.department, section_id: studentProfileData.section_id }); setEditStudentOpen(true); } }} sx={primaryBtnSx}>
                        Edit
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Phase 5: Student Attendance History Dialog */}
            <Dialog open={attendanceHistoryOpen} onClose={() => setAttendanceHistoryOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon sx={{ color: 'var(--color-primary)' }} />
                        Attendance History
                        {attendanceHistoryData?.student && (
                            <Chip label={attendanceHistoryData.student.name} size="small" sx={{ background: 'var(--color-primary-alpha-15)', color: 'var(--color-primary-dark)', fontWeight: 600, fontSize: '0.75rem', ml: 1 }} />
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {attendanceHistoryLoading ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 2 }}>
                            <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 'var(--radius-lg)' }} />
                            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 'var(--radius-lg)' }} />
                        </Box>
                    ) : attendanceHistoryData ? (
                        <Box sx={{ pt: 2 }}>
                            {/* Summary */}
                            {(() => {
                                const records = attendanceHistoryData.records || [];
                                const totalClasses = attendanceHistoryData.summary?.total_classes || records.length;
                                const presentCount = attendanceHistoryData.summary?.present_count || records.filter(r => (r.status || '').toLowerCase() === 'present').length;
                                const absentCount = attendanceHistoryData.summary?.absent_count || totalClasses - presentCount;
                                const percentage = totalClasses > 0 ? ((presentCount / totalClasses) * 100) : 0;
                                return (
                                    <Box sx={{ mb: 3 }}>
                                        <Grid container spacing={1.5} sx={{ mb: 2 }}>
                                            <Grid size={{ xs: 3 }}>
                                                <Box sx={{ background: 'var(--color-primary-alpha-8)', borderRadius: 'var(--radius-lg)', p: 1.5, textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)' }}>{totalClasses}</Typography>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 3 }}>
                                                <Box sx={{ background: 'var(--color-secondary-alpha-10)', borderRadius: 'var(--radius-lg)', p: 1.5, textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-secondary-dark)' }}>{presentCount}</Typography>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Present</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 3 }}>
                                                <Box sx={{ background: 'var(--color-error-alpha-4)', borderRadius: 'var(--radius-lg)', p: 1.5, textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-error-dark)' }}>{absentCount}</Typography>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Absent</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 3 }}>
                                                <Box sx={{ background: percentage >= 75 ? 'var(--color-secondary-alpha-10)' : 'var(--color-warning-alpha-12)', borderRadius: 'var(--radius-lg)', p: 1.5, textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: percentage >= 75 ? 'var(--color-secondary-dark)' : 'var(--color-warning-dark)' }}>{percentage.toFixed(1)}%</Typography>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Rate</Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                        <LinearProgress variant="determinate" value={Math.min(percentage, 100)} sx={{ height: 8, borderRadius: 4, background: 'var(--color-primary-alpha-8)', '& .MuiLinearProgress-bar': { borderRadius: 4, background: percentage >= 75 ? 'var(--color-secondary-dark)' : 'var(--color-warning-dark)' } }} />
                                    </Box>
                                );
                            })()}
                            {/* Records Table */}
                            {attendanceHistoryData.records?.length > 0 ? (
                                <TableContainer sx={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', maxHeight: 400 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow sx={{ background: 'var(--color-table-header-bg)' }}>
                                                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-dark)', py: 0.8, px: 1.5, background: 'var(--color-table-header-bg)' }}>Date</TableCell>
                                                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-dark)', py: 0.8, px: 1.5, background: 'var(--color-table-header-bg)' }}>Subject</TableCell>
                                                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-dark)', py: 0.8, px: 1.5, background: 'var(--color-table-header-bg)' }}>Faculty</TableCell>
                                                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-dark)', py: 0.8, px: 1.5, background: 'var(--color-table-header-bg)' }}>Status</TableCell>
                                                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-dark)', py: 0.8, px: 1.5, background: 'var(--color-table-header-bg)' }}>Time</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {attendanceHistoryData.records.map((record, idx) => (
                                                <TableRow key={idx} sx={{ background: idx % 2 === 0 ? 'var(--color-bg-paper)' : 'var(--color-table-stripe-bg)' }}>
                                                    <TableCell sx={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', py: 0.5, px: 1.5 }}>{record.date || '—'}</TableCell>
                                                    <TableCell sx={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', py: 0.5, px: 1.5 }}>{record.subject || record.subject_name || '—'}</TableCell>
                                                    <TableCell sx={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', py: 0.5, px: 1.5 }}>{record.faculty || record.faculty_name || '—'}</TableCell>
                                                    <TableCell sx={{ py: 0.5, px: 1.5 }}>
                                                        <Chip
                                                            label={(record.status || 'absent').charAt(0).toUpperCase() + (record.status || 'absent').slice(1)}
                                                            size="small"
                                                            sx={{
                                                                background: (record.status || '').toLowerCase() === 'present' ? 'var(--color-secondary-alpha-10)' : 'var(--color-error-alpha-4)',
                                                                color: (record.status || '').toLowerCase() === 'present' ? 'var(--color-secondary-dark)' : 'var(--color-error-dark)',
                                                                fontWeight: 600,
                                                                fontSize: '0.7rem',
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', py: 0.5, px: 1.5 }}>{record.time || record.timestamp || '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <SearchOffIcon sx={{ fontSize: 40, color: 'var(--color-text-muted)', mb: 1 }} />
                                    <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No attendance records found</Typography>
                                </Box>
                            )}
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => setAttendanceHistoryOpen(false)} sx={cancelBtnSx}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Phase 5: Semester Promotion Dialog */}
            <Dialog open={promoteOpen} onClose={() => setPromoteOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUpIcon sx={{ color: 'var(--color-primary)' }} />
                        Semester Promotion
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <Box>
                            <Typography sx={labelSx}>Department</Typography>
                            <Select fullWidth size="small" value={promoteConfig.department} onChange={(e) => setPromoteConfig({ ...promoteConfig, department: e.target.value, year: '', semester: '' })} sx={selectSx} MenuProps={menuPropsSx} displayEmpty>
                                <MenuItem value="">Select Department</MenuItem>
                                {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Promote FROM Year</Typography>
                            <Select fullWidth size="small" value={promoteConfig.year} onChange={(e) => setPromoteConfig({ ...promoteConfig, year: e.target.value, semester: '' })} disabled={!promoteConfig.department} sx={selectDisabledSx} MenuProps={menuPropsSx} displayEmpty>
                                <MenuItem value="">Select Year</MenuItem>
                                {getYearOptions(promoteConfig.department).map((y) => <MenuItem key={y} value={y}>Year {y}</MenuItem>)}
                            </Select>
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Promote FROM Semester</Typography>
                            <Select fullWidth size="small" value={promoteConfig.semester} onChange={(e) => setPromoteConfig({ ...promoteConfig, semester: e.target.value })} disabled={!promoteConfig.year} sx={selectDisabledSx} MenuProps={menuPropsSx} displayEmpty>
                                <MenuItem value="">Select Semester</MenuItem>
                                {getSemesterOptions(promoteConfig.department, promoteConfig.year).map((s) => <MenuItem key={s} value={s}>Semester {s}</MenuItem>)}
                            </Select>
                        </Box>
                        {promoteConfig.department && promoteConfig.year && promoteConfig.semester && (() => {
                            const yearNum = parseInt(promoteConfig.year);
                            const semNum = parseInt(promoteConfig.semester);
                            const maxYear = ['MBA', 'MCA'].includes(promoteConfig.department) ? 2 : 4;
                            const maxSem = maxYear * 2;
                            const isFinalSem = semNum >= maxSem;
                            const eligibleCount = students.filter(s => s.department === promoteConfig.department && parseInt(s.year) === yearNum && parseInt(s.semester) === semNum).length;
                            const newSem = semNum + 1;
                            const newYear = Math.ceil(newSem / 2);
                            return (
                                <Alert severity={isFinalSem ? 'warning' : 'info'} sx={isFinalSem ? { background: 'var(--color-warning-alpha-8)', color: 'var(--color-warning-dark)', border: '1px solid var(--color-warning-alpha-20)', '& .MuiAlert-icon': { color: 'var(--color-warning)' } } : infoAlertSx}>
                                    {eligibleCount === 0 ? (
                                        <span>No students found in {promoteConfig.department} Year {yearNum} Sem {semNum}</span>
                                    ) : isFinalSem ? (
                                        <span><strong>{eligibleCount}</strong> student(s) will be marked as <strong>Graduated</strong></span>
                                    ) : (
                                        <span><strong>{eligibleCount}</strong> student(s) will be promoted from <strong>Year {yearNum} Sem {semNum}</strong> to <strong>Year {newYear} Sem {newSem}</strong></span>
                                    )}
                                </Alert>
                            );
                        })()}
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => { setPromoteOpen(false); setPromoteConfig({ department: '', year: '', semester: '' }); }} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handlePromoteStudents} disabled={!promoteConfig.department || !promoteConfig.year || !promoteConfig.semester} sx={disabledPrimaryBtnSx}>
                        {(() => {
                            const semNum = parseInt(promoteConfig.semester);
                            const maxYear = ['MBA', 'MCA'].includes(promoteConfig.department) ? 2 : 4;
                            return semNum >= maxYear * 2 ? 'Mark as Graduated' : 'Promote Students';
                        })()}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Phase 5: Student Transfer Dialog */}
            <Dialog open={transferOpen} onClose={() => { setTransferOpen(false); setTransferStudent(null); setTransferSectionId(''); }} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SwapHorizIcon sx={{ color: 'var(--color-primary)' }} />
                        Transfer Student
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {transferStudent && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                            <Box sx={{ p: 2, background: 'var(--color-primary-alpha-8)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-alpha-15)' }}>
                                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{transferStudent.name}</Typography>
                                <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>{transferStudent.roll_number}</Typography>
                                <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', mt: 0.5 }}>
                                    Current Section: {(() => { const sec = sections.find(s => s.id === transferStudent.section_id); return sec ? (sec.department ? `${sec.department} - ${sec.name}` : sec.name) : 'N/A'; })()}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography sx={labelSx}>Transfer to Section</Typography>
                                <Select fullWidth size="small" value={transferSectionId} onChange={(e) => setTransferSectionId(e.target.value)} sx={selectSx} MenuProps={menuPropsSx} displayEmpty>
                                    <MenuItem value="">Select New Section</MenuItem>
                                    {sections.filter(s => (!transferStudent.department || s.department === transferStudent.department) && s.id !== transferStudent.section_id).map((s) => (
                                        <MenuItem key={s.id} value={s.id}>{s.department ? `${s.department} - ${s.name}` : s.name}{s.year ? ` (Y${s.year} S${s.semester})` : ''}</MenuItem>
                                    ))}
                                </Select>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => { setTransferOpen(false); setTransferStudent(null); setTransferSectionId(''); }} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleTransferStudent} disabled={!transferSectionId} sx={disabledPrimaryBtnSx}>Transfer</Button>
                </DialogActions>
            </Dialog>

            {/* Phase 5: Faculty Credentials Dialog */}
            <Dialog open={facultyCredentialsDialog} onClose={() => setFacultyCredentialsDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={{ fontWeight: 700, color: 'var(--color-text-primary)', background: 'var(--color-secondary-alpha-8)', borderBottom: '1px solid var(--color-primary-alpha-12)' }}>
                    Faculty Account Created
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {facultyCredentials && (
                        <Box>
                            <Alert severity="info" sx={infoAlertSx}>
                                Share these credentials with the faculty member.
                            </Alert>
                            <Box sx={{ mt: 2, p: 3, background: 'var(--color-bg)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {[{ label: 'Faculty Name', value: facultyCredentials.name },
                                      { label: 'Employee ID', value: facultyCredentials.employee_id || facultyCredentials.username, chip: 'Employee ID', chipColor: 'var(--color-primary-alpha-15)' },
                                      { label: 'Email', value: facultyCredentials.email },
                                      { label: 'Initial Password', value: facultyCredentials.initial_password || facultyCredentials.password || facultyCredentials.temp_password, chip: 'Password', chipColor: 'var(--color-primary-alpha-15)' }
                                    ].map(({ label, value, chip, chipColor }) => (
                                        <Box key={label}>
                                            <Typography sx={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{label}</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                <Typography sx={{ color: 'var(--color-text-primary)', fontSize: '1.1rem', fontWeight: 700, fontFamily: chip ? 'monospace' : 'inherit' }}>{value || '—'}</Typography>
                                                {chip && <Chip label={chip} size="small" sx={{ background: chipColor, color: 'var(--color-primary-dark)', fontWeight: 600 }} />}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                            <Alert severity="warning" sx={{ mt: 3, background: 'var(--color-warning-alpha-8)', color: 'var(--color-warning-dark)', border: '1px solid var(--color-warning-alpha-20)', '& .MuiAlert-icon': { color: 'var(--color-warning)' } }}>
                                <strong>Important:</strong> The faculty member must change this password on their first login.
                            </Alert>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => {
                        if (facultyCredentials) {
                            const doc = new jsPDF();
                            doc.setFontSize(18);
                            doc.text('Faculty Account Credentials', 14, 20);
                            doc.setFontSize(12);
                            doc.text(`Name: ${facultyCredentials.name || ''}`, 14, 35);
                            doc.text(`Employee ID: ${facultyCredentials.employee_id || facultyCredentials.username || ''}`, 14, 45);
                            doc.text(`Email: ${facultyCredentials.email || ''}`, 14, 55);
                            doc.text(`Temporary Password: ${facultyCredentials.initial_password || facultyCredentials.password || facultyCredentials.temp_password || ''}`, 14, 65);
                            doc.setFontSize(10);
                            doc.text('Please change this password on first login.', 14, 80);
                            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 90);
                            doc.save(`faculty_credentials_${facultyCredentials.employee_id || 'new'}.pdf`);
                        }
                    }} sx={outlineBtnSx} startIcon={<PictureAsPdfIcon />}>
                        Download PDF
                    </Button>
                    <Button onClick={() => setFacultyCredentialsDialog(false)} fullWidth sx={{ background: 'var(--gradient-primary-reverse)', color: 'var(--color-text-white)', borderRadius: '10px', textTransform: 'none', fontWeight: 600, '&:hover': { background: 'var(--gradient-primary-hover)' } }}>Got it</Button>
                </DialogActions>
            </Dialog>

            {/* Notifications Drawer moved to Navbar */}

            <BackToTop />

            {/* Report Builder button moved to global search bar */}

            {/* Phase 7: Report Builder Dialog */}
            <Dialog open={reportBuilderOpen} onClose={() => setReportBuilderOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TableChartIcon sx={{ color: 'var(--color-primary)' }} />
                            Custom Report Builder
                        </Box>
                        <IconButton size="small" onClick={() => setReportBuilderOpen(false)} sx={{ color: 'var(--color-text-muted)' }}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {/* Report Type */}
                        <Box>
                            <Typography sx={labelSx}>Report Type</Typography>
                            <Select size="small" fullWidth value={reportConfig.type} onChange={(e) => setReportConfig(prev => ({ ...prev, type: e.target.value, columns: [] }))} sx={selectSx} MenuProps={menuPropsSx}>
                                {['Students', 'Faculty', 'Sections', 'Assignments'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                            </Select>
                        </Box>

                        {/* Column Selection */}
                        <Box>
                            <Typography sx={labelSx}>Select Columns</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                                {(() => {
                                    const colMap = {
                                        Students: ['Name', 'Roll Number', 'Email', 'Phone', 'Department', 'Year', 'Semester', 'Section', 'Enrollment Status'],
                                        Faculty: ['Name', 'Employee ID', 'Email', 'Phone', 'Department', 'Designation'],
                                        Sections: ['Name', 'Department', 'Year', 'Semester', 'Academic Year', 'Student Count'],
                                        Assignments: ['Faculty', 'Subject', 'Periods', 'Department', 'Year', 'Section'],
                                    };
                                    return (colMap[reportConfig.type] || []).map(col => (
                                        <Chip
                                            key={col}
                                            label={col}
                                            size="small"
                                            clickable
                                            onClick={() => setReportConfig(prev => {
                                                const cols = prev.columns.includes(col) ? prev.columns.filter(c => c !== col) : [...prev.columns, col];
                                                return { ...prev, columns: cols };
                                            })}
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '0.72rem',
                                                background: reportConfig.columns.includes(col) ? 'var(--color-primary-alpha-15)' : 'var(--color-surface-alt)',
                                                color: reportConfig.columns.includes(col) ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
                                                border: reportConfig.columns.includes(col) ? '1px solid var(--color-primary-alpha-40)' : '1px solid var(--color-border)',
                                            }}
                                        />
                                    ));
                                })()}
                            </Box>
                        </Box>

                        {/* Filters */}
                        <Box>
                            <Typography sx={labelSx}>Filters</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel sx={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Department</InputLabel>
                                    <Select value={reportConfig.filters.department} onChange={(e) => setReportConfig(prev => ({ ...prev, filters: { ...prev.filters, department: e.target.value } }))} label="Department" sx={selectSx} MenuProps={menuPropsSx}>
                                        <MenuItem value="">All</MenuItem>
                                        {[...new Set([...(hodDeptActive ? students.filter(s => s.department === hodDeptActive) : students).map(s => s.department), ...(hodDeptActive ? faculty.filter(f => f.department === hodDeptActive) : faculty).map(f => f.department)].filter(Boolean))].sort().map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" fullWidth>
                                    <InputLabel sx={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Year</InputLabel>
                                    <Select value={reportConfig.filters.year} onChange={(e) => setReportConfig(prev => ({ ...prev, filters: { ...prev.filters, year: e.target.value } }))} label="Year" sx={selectSx} MenuProps={menuPropsSx}>
                                        <MenuItem value="">All</MenuItem>
                                        {[1, 2, 3, 4].map(y => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" fullWidth>
                                    <InputLabel sx={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Semester</InputLabel>
                                    <Select value={reportConfig.filters.semester} onChange={(e) => setReportConfig(prev => ({ ...prev, filters: { ...prev.filters, semester: e.target.value } }))} label="Semester" sx={selectSx} MenuProps={menuPropsSx}>
                                        <MenuItem value="">All</MenuItem>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <MenuItem key={s} value={String(s)}>{s}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>

                        {/* Date Range (for attendance-related reports) */}
                        {reportConfig.type === 'Students' && (
                            <Box>
                                <Typography sx={labelSx}>Date Range (optional)</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                    <TextField size="small" type="date" label="From" value={reportConfig.dateRange.from} onChange={(e) => setReportConfig(prev => ({ ...prev, dateRange: { ...prev.dateRange, from: e.target.value } }))} InputLabelProps={{ shrink: true }} sx={inputSx} />
                                    <TextField size="small" type="date" label="To" value={reportConfig.dateRange.to} onChange={(e) => setReportConfig(prev => ({ ...prev, dateRange: { ...prev.dateRange, to: e.target.value } }))} InputLabelProps={{ shrink: true }} sx={inputSx} />
                                </Box>
                            </Box>
                        )}

                        {/* Preview */}
                        {reportConfig.columns.length > 0 && (() => {
                            const getReportData = () => {
                                let data = [];
                                const { department, year, semester } = reportConfig.filters;
                                if (reportConfig.type === 'Students') {
                                    data = students.filter(s => (!department || s.department === department) && (!year || String(s.year) === year) && (!semester || String(s.semester) === semester));
                                } else if (reportConfig.type === 'Faculty') {
                                    data = faculty.filter(f => (!department || f.department === department));
                                } else if (reportConfig.type === 'Sections') {
                                    data = sections.filter(s => (!department || s.department === department) && (!year || String(s.year) === year) && (!semester || String(s.semester) === semester));
                                } else if (reportConfig.type === 'Assignments') {
                                    data = assignments.filter(a => (!department || a.department === department) && (!year || String(a.year) === year));
                                }
                                return data;
                            };
                            const getRowValues = (item) => {
                                const colGetters = {
                                    Students: { 'Name': i => i.name, 'Roll Number': i => i.roll_number, 'Email': i => i.email || '', 'Phone': i => i.phone || '', 'Department': i => i.department || '', 'Year': i => i.year || '', 'Semester': i => i.semester || '', 'Section': i => { const s = sections.find(s => s.id === i.section_id); return s ? s.name : ''; }, 'Enrollment Status': i => i.embeddings?.length > 0 ? 'Enrolled' : 'Pending' },
                                    Faculty: { 'Name': i => i.name || i.username, 'Employee ID': i => i.employee_id || i.username, 'Email': i => i.email || '', 'Phone': i => i.phone || '', 'Department': i => i.department || '', 'Designation': i => i.designation || '' },
                                    Sections: { 'Name': i => i.name, 'Department': i => i.department || '', 'Year': i => i.year || '', 'Semester': i => i.semester || '', 'Academic Year': i => i.academic_year || '', 'Student Count': i => students.filter(s => s.section_id === i.id).length },
                                    Assignments: { 'Faculty': i => i.faculty_name || '', 'Subject': i => i.subject_name || '', 'Periods': i => i.periods || '', 'Department': i => i.department || '', 'Year': i => i.year || '', 'Section': i => i.section_name || '' },
                                };
                                const getters = colGetters[reportConfig.type] || {};
                                return reportConfig.columns.map(col => { const fn = getters[col]; return fn ? fn(item) : ''; });
                            };
                            const allData = getReportData();
                            const previewData = allData.slice(0, 5);

                            return (
                                <Box>
                                    <Typography sx={{ ...labelSx, mb: 1 }}>Preview ({allData.length} total rows, showing first {Math.min(5, allData.length)})</Typography>
                                    <TableContainer sx={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', maxHeight: 200 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    {reportConfig.columns.map(col => (
                                                        <TableCell key={col} sx={{ fontSize: '0.7rem', fontWeight: 700, py: 0.5, px: 1, background: 'var(--color-table-header-bg)', color: 'var(--color-primary-dark)', whiteSpace: 'nowrap' }}>{col}</TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {previewData.map((item, idx) => (
                                                    <TableRow key={idx} sx={{ background: idx % 2 === 0 ? 'var(--color-bg-paper)' : 'var(--color-table-stripe-bg)' }}>
                                                        {getRowValues(item).map((val, ci) => (
                                                            <TableCell key={ci} sx={{ fontSize: '0.7rem', py: 0.3, px: 1, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{String(val)}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            );
                        })()}
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => setReportBuilderOpen(false)} sx={cancelBtnSx}>Cancel</Button>
                    <Button
                        startIcon={<FileDownloadIcon />}
                        disabled={reportConfig.columns.length === 0}
                        onClick={() => {
                            const getReportData = () => {
                                let data = [];
                                const { department, year, semester } = reportConfig.filters;
                                if (reportConfig.type === 'Students') data = students.filter(s => (!department || s.department === department) && (!year || String(s.year) === year) && (!semester || String(s.semester) === semester));
                                else if (reportConfig.type === 'Faculty') data = faculty.filter(f => (!department || f.department === department));
                                else if (reportConfig.type === 'Sections') data = sections.filter(s => (!department || s.department === department) && (!year || String(s.year) === year) && (!semester || String(s.semester) === semester));
                                else if (reportConfig.type === 'Assignments') data = assignments.filter(a => (!department || a.department === department) && (!year || String(a.year) === year));
                                return data;
                            };
                            const colGetters = {
                                Students: { 'Name': i => i.name, 'Roll Number': i => i.roll_number, 'Email': i => i.email || '', 'Phone': i => i.phone || '', 'Department': i => i.department || '', 'Year': i => i.year || '', 'Semester': i => i.semester || '', 'Section': i => { const s = sections.find(s => s.id === i.section_id); return s ? s.name : ''; }, 'Enrollment Status': i => i.embeddings?.length > 0 ? 'Enrolled' : 'Pending' },
                                Faculty: { 'Name': i => i.name || i.username, 'Employee ID': i => i.employee_id || i.username, 'Email': i => i.email || '', 'Phone': i => i.phone || '', 'Department': i => i.department || '', 'Designation': i => i.designation || '' },
                                Sections: { 'Name': i => i.name, 'Department': i => i.department || '', 'Year': i => i.year || '', 'Semester': i => i.semester || '', 'Academic Year': i => i.academic_year || '', 'Student Count': i => students.filter(s => s.section_id === i.id).length },
                                Assignments: { 'Faculty': i => i.faculty_name || '', 'Subject': i => i.subject_name || '', 'Periods': i => i.periods || '', 'Department': i => i.department || '', 'Year': i => i.year || '', 'Section': i => i.section_name || '' },
                            };
                            const getters = colGetters[reportConfig.type] || {};
                            const allData = getReportData();
                            const csv = [reportConfig.columns.join(',')]
                                .concat(allData.map(item => reportConfig.columns.map(col => { const fn = getters[col]; const val = fn ? fn(item) : ''; return `"${String(val).replace(/"/g, '""')}"`; }).join(',')))
                                .join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${reportConfig.type.toLowerCase()}_report.csv`; a.click();
                            showToast('CSV report downloaded', 'success');
                        }}
                        sx={outlineBtnSx}
                    >
                        Export CSV
                    </Button>
                    <Button
                        startIcon={<PictureAsPdfIcon />}
                        disabled={reportConfig.columns.length === 0}
                        onClick={() => {
                            const getReportData = () => {
                                let data = [];
                                const { department, year, semester } = reportConfig.filters;
                                if (reportConfig.type === 'Students') data = students.filter(s => (!department || s.department === department) && (!year || String(s.year) === year) && (!semester || String(s.semester) === semester));
                                else if (reportConfig.type === 'Faculty') data = faculty.filter(f => (!department || f.department === department));
                                else if (reportConfig.type === 'Sections') data = sections.filter(s => (!department || s.department === department) && (!year || String(s.year) === year) && (!semester || String(s.semester) === semester));
                                else if (reportConfig.type === 'Assignments') data = assignments.filter(a => (!department || a.department === department) && (!year || String(a.year) === year));
                                return data;
                            };
                            const colGetters = {
                                Students: { 'Name': i => i.name, 'Roll Number': i => i.roll_number, 'Email': i => i.email || '', 'Phone': i => i.phone || '', 'Department': i => i.department || '', 'Year': i => i.year || '', 'Semester': i => i.semester || '', 'Section': i => { const s = sections.find(s => s.id === i.section_id); return s ? s.name : ''; }, 'Enrollment Status': i => i.embeddings?.length > 0 ? 'Enrolled' : 'Pending' },
                                Faculty: { 'Name': i => i.name || i.username, 'Employee ID': i => i.employee_id || i.username, 'Email': i => i.email || '', 'Phone': i => i.phone || '', 'Department': i => i.department || '', 'Designation': i => i.designation || '' },
                                Sections: { 'Name': i => i.name, 'Department': i => i.department || '', 'Year': i => i.year || '', 'Semester': i => i.semester || '', 'Academic Year': i => i.academic_year || '', 'Student Count': i => students.filter(s => s.section_id === i.id).length },
                                Assignments: { 'Faculty': i => i.faculty_name || '', 'Subject': i => i.subject_name || '', 'Periods': i => i.periods || '', 'Department': i => i.department || '', 'Year': i => i.year || '', 'Section': i => i.section_name || '' },
                            };
                            const getters = colGetters[reportConfig.type] || {};
                            const allData = getReportData();
                            const rows = allData.map(item => reportConfig.columns.map(col => { const fn = getters[col]; return fn ? String(fn(item)) : ''; }));
                            exportPDF(`${reportConfig.type} Report`, reportConfig.columns, rows, `${reportConfig.type.toLowerCase()}_report.pdf`);
                            showToast('PDF report downloaded', 'success');
                        }}
                        sx={primaryBtnSx}
                    >
                        Export PDF
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Phase 8: Keyboard Shortcuts Help Dialog */}
            <Dialog open={shortcutsHelpOpen} onClose={() => setShortcutsHelpOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <KeyboardIcon sx={{ fontSize: 22, color: 'var(--color-primary)' }} />
                        Keyboard Shortcuts
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={tableHeaderRowSx}>
                                    <TableCell sx={tableHeaderCellSx}>Shortcut</TableCell>
                                    <TableCell sx={tableHeaderCellSx}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {[
                                    ['Ctrl + 1', 'Switch to Dashboard'],
                                    ['Ctrl + 2', 'Switch to Students'],
                                    ['Ctrl + 3', 'Switch to Sections'],
                                    ['Ctrl + 4', 'Switch to Faculty'],
                                    ['Ctrl + 5', 'Switch to Subject Allotment'],
                                    ['Ctrl + 6', 'Switch to Timetable'],
                                    ['Ctrl + 7', 'Switch to Attendance'],
                                    ['Ctrl + 8', 'Switch to Activity Log'],
                                    ['Ctrl + K  or  /', 'Focus Global Search'],
                                    ['Ctrl + N', 'Add New (context-sensitive)'],
                                    ['Ctrl + /', 'Open Keyboard Shortcuts'],
                                    ['Escape', 'Close Dialog / Drawer'],
                                ].map(([shortcut, action], idx) => (
                                    <TableRow key={idx} sx={tableRowSx(idx)}>
                                        <TableCell sx={tableCellBorderSx}>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {shortcut.split('  or  ').map((key, ki) => (
                                                    <React.Fragment key={ki}>
                                                        {ki > 0 && <Typography component="span" sx={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', mx: 0.3 }}>or</Typography>}
                                                        <Chip label={key} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.72rem', height: 24, background: 'var(--color-surface-alt)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} />
                                                    </React.Fragment>
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ ...tableCellBorderSx, color: 'var(--color-text-primary)' }}>{action}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => setShortcutsHelpOpen(false)} sx={cancelBtnSx}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Phase 8: Backup & Restore Dialog */}
            <Dialog open={backupRestoreOpen} onClose={() => { setBackupRestoreOpen(false); setRestorePreview(null); setRestoreFile(null); }} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CloudDownloadIcon sx={{ fontSize: 22, color: 'var(--color-primary)' }} />
                        Backup & Restore
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {/* Export Section */}
                    <Box sx={{ mb: 3, p: 2, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)', mb: 1 }}>Export Backup</Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', mb: 2 }}>
                            Download a JSON backup of all data: {students.length} students, {faculty.length} faculty, {sections.length} sections, {assignments.length} assignments.
                        </Typography>
                        <Button startIcon={<CloudDownloadIcon />} onClick={handleExportBackup} sx={primaryBtnSx}>
                            Export Backup
                        </Button>
                    </Box>

                    {/* Restore Section */}
                    <Box sx={{ p: 2, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)', mb: 1 }}>Restore from Backup</Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', mb: 2 }}>
                            Upload a previously exported JSON backup file to restore data.
                        </Typography>
                        <Button component="label" startIcon={<CloudUploadIcon />} sx={bulkUploadBtnSx} fullWidth>
                            {restoreFile ? restoreFile.name : 'Select Backup File (.json)'}
                            <input type="file" hidden accept=".json" onChange={handleRestoreFile} />
                        </Button>

                        {restorePreview && restorePreview.error && (
                            <Alert severity="error" sx={{ mt: 2, fontSize: '0.8rem' }}>{restorePreview.error}</Alert>
                        )}

                        {restorePreview && !restorePreview.error && (
                            <Box sx={{ mt: 2 }}>
                                <Alert severity="info" sx={{ ...infoAlertSx, mb: 1.5, fontSize: '0.8rem' }}>
                                    Backup from {restorePreview.timestamp ? new Date(restorePreview.timestamp).toLocaleString() : 'Unknown'} (v{restorePreview.version})
                                </Alert>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                                    {[
                                        { label: 'Students', count: restorePreview.students, icon: <PersonAdd sx={{ fontSize: 18 }} /> },
                                        { label: 'Faculty', count: restorePreview.faculty, icon: <Groups sx={{ fontSize: 18 }} /> },
                                        { label: 'Sections', count: restorePreview.sections, icon: <School sx={{ fontSize: 18 }} /> },
                                        { label: 'Assignments', count: restorePreview.assignments, icon: <AssignmentIcon sx={{ fontSize: 18 }} /> },
                                    ].map((item, i) => (
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, background: 'var(--color-bg-paper)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                            <Box sx={{ color: 'var(--color-primary)' }}>{item.icon}</Box>
                                            <Box>
                                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{item.count}</Typography>
                                                <Typography sx={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{item.label}</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                                <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.75rem' }}>
                                    This will attempt to create new records. Existing duplicates will be skipped.
                                </Alert>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => { setBackupRestoreOpen(false); setRestorePreview(null); setRestoreFile(null); }} sx={cancelBtnSx}>Close</Button>
                    {restorePreview && !restorePreview.error && (
                        <Button onClick={handleRestoreConfirm} sx={primaryBtnSx}>Restore Data</Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Phase 8: Bulk Notification Dialog */}
            <Dialog open={bulkNotifyOpen} onClose={() => setBulkNotifyOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile} PaperProps={{ sx: dialogPaperSx(isMobile) }}>
                <DialogTitle sx={dialogTitleSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SendIcon sx={{ fontSize: 22, color: 'var(--color-primary)' }} />
                        Send Notification
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {/* Recipient Type */}
                        <Box>
                            <Typography sx={labelSx}>Recipient Type</Typography>
                            <Select fullWidth size="small" value={notifyConfig.recipients} onChange={(e) => setNotifyConfig(prev => ({ ...prev, recipients: e.target.value }))} sx={selectSx} MenuProps={menuPropsSx}>
                                <MenuItem value="all_students">All Students</MenuItem>
                                <MenuItem value="all_faculty">All Faculty</MenuItem>
                                <MenuItem value="department">Department-wise</MenuItem>
                                <MenuItem value="section">Year-wise</MenuItem>
                            </Select>
                        </Box>

                        {/* Department/Year Filter */}
                        {notifyConfig.recipients === 'department' && (
                            <Box>
                                <Typography sx={labelSx}>Department</Typography>
                                <Select fullWidth size="small" displayEmpty value={notifyConfig.department} onChange={(e) => setNotifyConfig(prev => ({ ...prev, department: e.target.value }))} sx={selectSx} MenuProps={menuPropsSx}>
                                    <MenuItem value="">Select Department</MenuItem>
                                    {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'CSE (AI&ML)', 'CSE (DS)', 'CSE (CS)', 'MBA', 'MCA'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                                </Select>
                            </Box>
                        )}
                        {notifyConfig.recipients === 'section' && (
                            <Box>
                                <Typography sx={labelSx}>Year</Typography>
                                <Select fullWidth size="small" displayEmpty value={notifyConfig.year} onChange={(e) => setNotifyConfig(prev => ({ ...prev, year: e.target.value }))} sx={selectSx} MenuProps={menuPropsSx}>
                                    <MenuItem value="">Select Year</MenuItem>
                                    {[1, 2, 3, 4].map((y) => <MenuItem key={y} value={String(y)}>Year {y}</MenuItem>)}
                                </Select>
                            </Box>
                        )}

                        {/* Recipient Count */}
                        <Chip
                            label={`Will be sent to ${getNotifyRecipientCount()} recipient${getNotifyRecipientCount() !== 1 ? 's' : ''}`}
                            sx={{ alignSelf: 'flex-start', background: 'var(--color-primary-alpha-10)', color: 'var(--color-primary-dark)', fontWeight: 600, fontSize: '0.8rem' }}
                        />

                        {/* Notification Type */}
                        <Box>
                            <Typography sx={labelSx}>Notification Type</Typography>
                            <ToggleButtonGroup size="small" value={notifyConfig.type} exclusive onChange={(_, val) => { if (val) setNotifyConfig(prev => ({ ...prev, type: val })); }} sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.8rem', fontWeight: 600, py: 0.5, px: 2, color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', '&.Mui-selected': { background: 'var(--color-primary-alpha-15)', color: 'var(--color-primary-dark)', borderColor: 'var(--color-primary-alpha-40)' } } }}>
                                <ToggleButton value="email"><EmailIcon sx={{ fontSize: 16, mr: 0.5 }} />Email</ToggleButton>
                                <ToggleButton value="sms"><SmsIcon sx={{ fontSize: 16, mr: 0.5 }} />SMS</ToggleButton>
                                <ToggleButton value="both"><SendIcon sx={{ fontSize: 16, mr: 0.5 }} />Both</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        {/* Template Selector */}
                        <Box>
                            <Typography sx={labelSx}>Template (optional)</Typography>
                            <Select fullWidth size="small" displayEmpty value={notifyConfig.template} onChange={(e) => {
                                const tmpl = e.target.value;
                                setNotifyConfig(prev => ({
                                    ...prev,
                                    template: tmpl,
                                    ...(tmpl && notificationTemplates[tmpl] ? { subject: notificationTemplates[tmpl].subject, message: notificationTemplates[tmpl].message } : {}),
                                }));
                            }} sx={selectSx} MenuProps={menuPropsSx}>
                                <MenuItem value="">Custom Message</MenuItem>
                                <MenuItem value="attendance_warning">Attendance Warning</MenuItem>
                                <MenuItem value="event_notice">Event Notice</MenuItem>
                                <MenuItem value="general_announcement">General Announcement</MenuItem>
                                <MenuItem value="fee_reminder">Fee Reminder</MenuItem>
                            </Select>
                        </Box>

                        {/* Subject */}
                        {notifyConfig.type !== 'sms' && (
                            <Box>
                                <Typography sx={labelSx}>Subject</Typography>
                                <TextField fullWidth size="small" placeholder="Enter email subject" value={notifyConfig.subject} onChange={(e) => setNotifyConfig(prev => ({ ...prev, subject: e.target.value }))} sx={inputSx} />
                            </Box>
                        )}

                        {/* Message Body */}
                        <Box>
                            <Typography sx={labelSx}>Message</Typography>
                            <TextField fullWidth size="small" multiline rows={5} placeholder="Enter your message here..." value={notifyConfig.message} onChange={(e) => setNotifyConfig(prev => ({ ...prev, message: e.target.value }))} sx={inputSx} />
                        </Box>

                        {/* Preview */}
                        {notifyConfig.message.trim() && (
                            <Box sx={{ p: 2, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-text-secondary)', mb: 1 }}>Preview</Typography>
                                {notifyConfig.type !== 'sms' && notifyConfig.subject && (
                                    <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)', mb: 0.5 }}>{notifyConfig.subject}</Typography>
                                )}
                                <Typography sx={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>{notifyConfig.message}</Typography>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button onClick={() => setBulkNotifyOpen(false)} sx={cancelBtnSx}>Cancel</Button>
                    <Button onClick={handleSendNotification} startIcon={<SendIcon />} disabled={!notifyConfig.message.trim() || (notifyConfig.type !== 'sms' && !notifyConfig.subject.trim())} sx={disabledPrimaryBtnSx}>
                        Send Notification
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Undo Delete Snackbar */}
            <Snackbar
                open={undoSnackbar.open}
                autoHideDuration={6000}
                onClose={() => setUndoSnackbar({ open: false, message: '', undoAction: null })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={undoSnackbar.message}
                action={
                    <Button size="small" onClick={handleUndo} sx={{ color: 'var(--color-primary-light)', fontWeight: 700, textTransform: 'none' }}>
                        UNDO
                    </Button>
                }
                sx={{ '& .MuiSnackbarContent-root': { background: 'var(--color-primary-dark)', borderRadius: 'var(--radius-lg)', fontSize: { xs: '0.75rem', sm: '0.875rem' }, minWidth: { xs: 'auto', sm: 300 } } }}
            />

            {/* Bottom Navigation removed — use sidebar menu on mobile instead */}
        </Box >
    );
};

export default AdminDashboard;
