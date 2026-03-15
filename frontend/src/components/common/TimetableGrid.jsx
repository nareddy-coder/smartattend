/**
 * Timetable display grid - weekly schedule with responsive layout.
 * Desktop: table. Mobile: day cards. Supports PDF/CSV export.
 */
import React from 'react';
import { Box, Typography, IconButton, Tooltip, Chip, useMediaQuery, useTheme } from '@mui/material';
import { PictureAsPdf as PdfIcon } from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const COLUMNS = [
    { dbPeriod: 1, label: 'Period 1', shortLabel: 'P1', time: '9:30-10:20' },
    { dbPeriod: 2, label: 'Period 2', shortLabel: 'P2', time: '10:20-11:10' },
    { dbPeriod: 3, label: 'Period 3', shortLabel: 'P3', time: '11:10-12:00' },
    { dbPeriod: null, label: 'Lunch', shortLabel: 'Lunch', time: '12:00-1:00', isLunch: true },
    { dbPeriod: 5, label: 'Period 4', shortLabel: 'P4', time: '1:00-1:50' },
    { dbPeriod: 6, label: 'Period 5', shortLabel: 'P5', time: '1:50-2:40' },
    { dbPeriod: 7, label: 'Period 6', shortLabel: 'P6', time: '2:40-3:30' },
];
const TEACHING_PERIODS = COLUMNS.filter(c => !c.isLunch).map(c => c.dbPeriod);

// 20 vibrant, clearly DISTINCT colors — no two similar shades, no blue (reserved for header)
const SUBJECT_COLORS = [
    { bg: '#fee2e2', text: '#991b1b', border: '#f87171' },   // 1  Red
    { bg: '#dcfce7', text: '#166534', border: '#4ade80' },   // 2  Green
    { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' },   // 3  Purple
    { bg: '#ffedd5', text: '#9a3412', border: '#fb923c' },   // 4  Orange
    { bg: '#fef9c3', text: '#854d0e', border: '#facc15' },   // 5  Yellow
    { bg: '#fce7f3', text: '#9d174d', border: '#f472b6' },   // 6  Pink
    { bg: '#ccfbf1', text: '#115e59', border: '#2dd4bf' },   // 7  Teal
    { bg: '#fdf4ff', text: '#a21caf', border: '#e879f9' },   // 8  Magenta
    { bg: '#ecfeff', text: '#0e7490', border: '#22d3ee' },   // 9  Cyan
    { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },   // 10 Amber
    { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8' },   // 11 Indigo
    { bg: '#fff1f2', text: '#be123c', border: '#fb7185' },   // 12 Rose
    { bg: '#d5f5f6', text: '#0d6e6e', border: '#45c7c8' },   // 13 Aqua
    { bg: '#fde68a', text: '#78350f', border: '#eab308' },   // 14 Gold
    { bg: '#e8d5f5', text: '#581c87', border: '#a855f7' },   // 15 Violet
    { bg: '#ffe4c9', text: '#7c2d12', border: '#f97316' },   // 16 Tangerine
    { bg: '#d1fae5', text: '#065f46', border: '#34d399' },   // 17 Emerald
    { bg: '#fce4ec', text: '#880e4f', border: '#f06292' },   // 18 Coral
    { bg: '#e6f4ea', text: '#1b5e20', border: '#66bb6a' },   // 19 Sage
    { bg: '#fff3e0', text: '#bf360c', border: '#ff8a65' },   // 20 Peach
];

const FILLER_STYLE = { bg: '#f1f5f9', text: '#94a3b8', border: '#e2e8f0' };
const FREE_STYLE = { bg: '#f0f4f8', text: '#64748b', border: '#cbd5e1' };  // Unique silver/gray for "No Class"

const isFiller = (name) => name === 'FIP' || name === 'Seminar';

const ordinal = (n) => {
    const num = Number(n);
    if (!num) return '';
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const mod100 = num % 100;
    return `${num}${suffixes[(mod100 - 20) % 10] || suffixes[mod100] || suffixes[0]}`;
};

const buildFileName = (sectionName, department, year, semester, slots) => {
    const parts = ['Timetable'];
    if (year) parts.push(`${ordinal(year)}_Year`);
    if (department) parts.push(department.replace(/\s+/g, '_'));
    if (semester) parts.push(`${ordinal(semester)}_Sem`);
    if (sectionName) parts.push(`Section_${sectionName.replace(/\s+/g, '_')}`);
    if (parts.length === 1 && slots.length > 0) {
        const subjects = [...new Set(slots.map((s) => s.subject_name))].slice(0, 3);
        parts.push(subjects.join('_').replace(/\s+/g, '_'));
    }
    return parts.join('_');
};

const TimetableGrid = ({ slots = [], highlightFacultyId, highlightToday = false, sectionName = '', department = '', year = '', semester = '' }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    // Build grid
    const grid = {};
    DAY_NAMES.forEach((_, dayIdx) => { grid[dayIdx] = {}; });
    slots.forEach((slot) => {
        grid[slot.day_of_week] = grid[slot.day_of_week] || {};
        grid[slot.day_of_week][slot.period_number] = slot;
    });

    const realSubjects = [...new Set(slots.filter(s => !isFiller(s.subject_name)).map(s => s.subject_name))];
    const subjectColorMap = {};
    realSubjects.forEach((sub, idx) => { subjectColorMap[sub] = SUBJECT_COLORS[idx % SUBJECT_COLORS.length]; });

    const today = new Date().getDay();
    const todayIdx = today === 0 ? -1 : today - 1;
    const activeDays = DAY_NAMES.map((_, idx) => idx).filter(
        (dayIdx) => TEACHING_PERIODS.some((p) => grid[dayIdx]?.[p])
    );

    // Merge consecutive same-subject periods (e.g., 3-period labs → single cell)
    const getMergedCells = (dayIdx, periodCols) => {
        const cells = [];
        let i = 0;
        while (i < periodCols.length) {
            const col = periodCols[i];
            const slot = grid[dayIdx]?.[col.dbPeriod];
            if (!slot) {
                cells.push({ slot: null, span: 1, cols: [col] });
                i++;
                continue;
            }
            let span = 1;
            while (i + span < periodCols.length) {
                const nextCol = periodCols[i + span];
                const nextSlot = grid[dayIdx]?.[nextCol.dbPeriod];
                if (!nextSlot || nextSlot.subject_name !== slot.subject_name) break;
                // Must be same section (by section_id or faculty_id match)
                const sameSection = (slot.section_id && nextSlot.section_id)
                    ? slot.section_id === nextSlot.section_id
                    : slot.faculty_id === nextSlot.faculty_id;
                if (!sameSection) break;
                span++;
            }
            cells.push({ slot, span, cols: periodCols.slice(i, i + span) });
            i += span;
        }
        return cells;
    };

    // Build merged row for desktop (handles lunch column)
    const getMergedRow = (dayIdx) => {
        const result = [];
        const beforeLunch = COLUMNS.filter(c => !c.isLunch).slice(0, 3);
        const afterLunch = COLUMNS.filter(c => !c.isLunch).slice(3);
        getMergedCells(dayIdx, beforeLunch).forEach(c => result.push(c));
        result.push({ type: 'lunch' });
        getMergedCells(dayIdx, afterLunch).forEach(c => result.push(c));
        return result;
    };

    // Build full title for exports
    const buildTitle = () => {
        const parts = [];
        if (year) parts.push(`${ordinal(year)} Year`);
        if (department) parts.push(department);
        if (semester) parts.push(`${ordinal(semester)} Sem`);
        if (sectionName) parts.push(`Section ${sectionName}`);
        return parts.length > 0 ? `Timetable — ${parts.join(' | ')}` : 'Timetable';
    };

    // Determine if this is a faculty view (has highlightFacultyId) or student view
    const isFacultyView = !!highlightFacultyId;

    // Get cell text for export (subject + context info)
    const getCellText = (slot, lineBreak = '\n') => {
        if (!slot) return '';
        const sub = slot.subject_name || '';
        if (isFacultyView && slot.section_name && slot.section_department && slot.section_year) {
            // Faculty view: show class label (year-section)
            const y = slot.section_year;
            const suffix = y == 1 ? 'st' : y == 2 ? 'nd' : y == 3 ? 'rd' : 'th';
            return `${sub}${lineBreak}${y}${suffix} Year ${slot.section_department}-${slot.section_name}`;
        }
        // Student view: show faculty name
        if (slot.faculty_name) return `${sub}${lineBreak}${slot.faculty_name}`;
        return sub;
    };

    // Build merged export rows (handles lab merging)
    const buildExportRows = (lineBreak = '\n') => {
        const periodCols = COLUMNS.filter(c => !c.isLunch);
        const lunchIdx = COLUMNS.findIndex(c => c.isLunch);

        return activeDays.map((dayIdx) => {
            // Build merged cells for before and after lunch
            const beforeLunch = periodCols.slice(0, lunchIdx);
            const afterLunch = periodCols.slice(lunchIdx);
            const beforeMerged = getMergedCells(dayIdx, beforeLunch);
            const afterMerged = getMergedCells(dayIdx, afterLunch);

            // Build the row with proper column spans
            const row = [DAY_NAMES[dayIdx]];
            const spans = [1]; // Day column span

            beforeMerged.forEach(cell => {
                row.push(cell.slot ? getCellText(cell.slot, lineBreak) : '—');
                spans.push(cell.span);
            });
            row.push('LUNCH');
            spans.push(1);
            afterMerged.forEach(cell => {
                row.push(cell.slot ? getCellText(cell.slot, lineBreak) : '—');
                spans.push(cell.span);
            });

            return { row, spans };
        });
    };

    // Excel export with merged cells for labs
    const handleDownloadExcel = () => {
        const periodCols = COLUMNS.filter(c => !c.isLunch);
        const lunchIdx = COLUMNS.findIndex(c => c.isLunch);
        const beforeLunchCols = periodCols.slice(0, lunchIdx);
        const afterLunchCols = periodCols.slice(lunchIdx);

        // Header row
        const header = ['Day', ...COLUMNS.map(c => c.isLunch ? `Lunch\n${c.time}` : `${c.shortLabel}\n${c.time}`)];
        const totalCols = header.length; // Day + columns

        const wsData = [header];
        const merges = [];

        activeDays.forEach((dayIdx, rowOffset) => {
            const rowNum = rowOffset + 1; // +1 for header
            const row = new Array(totalCols).fill('');
            row[0] = DAY_NAMES[dayIdx];

            let colIdx = 1; // start after Day column

            // Before lunch
            const beforeMerged = getMergedCells(dayIdx, beforeLunchCols);
            beforeMerged.forEach(cell => {
                const text = cell.slot ? getCellText(cell.slot, '\n') : '-';
                row[colIdx] = cell.span > 1 ? `${text}\n(Lab)` : text;
                if (cell.span > 1) {
                    merges.push({ s: { r: rowNum, c: colIdx }, e: { r: rowNum, c: colIdx + cell.span - 1 } });
                }
                colIdx += cell.span;
            });

            // Lunch column
            row[colIdx] = 'LUNCH';
            colIdx++;

            // After lunch
            const afterMerged = getMergedCells(dayIdx, afterLunchCols);
            afterMerged.forEach(cell => {
                const text = cell.slot ? getCellText(cell.slot, '\n') : '-';
                row[colIdx] = cell.span > 1 ? `${text}\n(Lab)` : text;
                if (cell.span > 1) {
                    merges.push({ s: { r: rowNum, c: colIdx }, e: { r: rowNum, c: colIdx + cell.span - 1 } });
                }
                colIdx += cell.span;
            });

            wsData.push(row);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!merges'] = merges;

        // Set column widths
        ws['!cols'] = [{ wch: 12 }, ...COLUMNS.map(c => ({ wch: c.isLunch ? 10 : 22 }))];

        XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
        XLSX.writeFile(wb, `${buildFileName(sectionName, department, year, semester, slots)}.xlsx`);
    };

    // PDF export
    const handleDownloadPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.setFontSize(14); doc.setTextColor(70, 123, 240);
        doc.text(buildTitle(), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

        const lunchColIdx = COLUMNS.findIndex(c => c.isLunch) + 1; // +1 for Day column
        const head = [['Day', ...COLUMNS.map(c => c.isLunch ? `Lunch\n${c.time}` : `${c.shortLabel}\n${c.time}`)]];

        // Build body rows using colSpan objects for merged lab cells
        const periodCols = COLUMNS.filter(c => !c.isLunch);
        const lunchIdx = COLUMNS.findIndex(c => c.isLunch);
        const beforeLunchCols = periodCols.slice(0, lunchIdx);
        const afterLunchCols = periodCols.slice(lunchIdx);

        const body = activeDays.map((dayIdx) => {
            const rowCells = [];
            // Day name
            rowCells.push({ content: DAY_NAMES[dayIdx], styles: { fontStyle: 'bold' } });

            const addPdfCells = (cells) => {
                cells.forEach(cell => {
                    if (!cell.slot) {
                        rowCells.push('—');
                        return;
                    }
                    const text = getCellText(cell.slot, '\n');
                    if (cell.span > 1) {
                        rowCells.push({ content: text, colSpan: cell.span });
                    } else {
                        rowCells.push(text);
                    }
                });
            };

            // Before lunch
            addPdfCells(getMergedCells(dayIdx, beforeLunchCols));

            // Lunch
            rowCells.push({ content: 'LUNCH', styles: { fillColor: [107, 150, 245], textColor: [255, 255, 255], fontStyle: 'italic' } });

            // After lunch
            addPdfCells(getMergedCells(dayIdx, afterLunchCols));

            return rowCells;
        });

        autoTable(doc, {
            head, body, startY: 22, theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 2.5, halign: 'center', valign: 'middle', lineWidth: 0.3 },
            headStyles: { fillColor: [70, 123, 240], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 22 },
                [lunchColIdx]: { fillColor: [107, 150, 245], textColor: [255, 255, 255], fontStyle: 'italic', cellWidth: 18 },
            },
        });

        const pdfFileName = `${buildFileName(sectionName, department, year, semester, slots)}.pdf`;
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = pdfFileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            try { document.body.removeChild(a); } catch (_) {}
            URL.revokeObjectURL(pdfUrl);
        }, 5000);
    };

    if (slots.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>No timetable generated yet</Typography>
            </Box>
        );
    }

    // Render one cell (spanCount > 1 for merged labs)
    const renderCell = (slot, compact = false, spanCount = 1) => {
        if (!slot) {
            return (
                <Box sx={{
                    background: FREE_STYLE.bg, borderRadius: '6px', p: compact ? 0.3 : 0.4,
                    height: compact ? 52 : 56, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    border: `1.5px dashed ${FREE_STYLE.border}`,
                }}>
                    <Typography sx={{ fontSize: compact ? '0.6rem' : '0.68rem', color: FREE_STYLE.text, fontWeight: 600 }}>
                        No Class
                    </Typography>
                </Box>
            );
        }

        const filler = isFiller(slot.subject_name);
        const colors = filler ? FILLER_STYLE : (subjectColorMap[slot.subject_name] || SUBJECT_COLORS[0]);
        const isDimmed = highlightFacultyId && slot.faculty_id !== highlightFacultyId;

        // Full class label: "1st Year CSE-A"
        let classLabel = '';
        if (slot.section_name && slot.section_department && slot.section_year) {
            const y = slot.section_year;
            const suffix = y == 1 ? 'st' : y == 2 ? 'nd' : y == 3 ? 'rd' : 'th';
            classLabel = `${y}${suffix} Year ${slot.section_department}-${slot.section_name}`;
        }

        return (
            <Box sx={{
                background: isDimmed ? '#f8fafc' : colors.bg,
                border: `1.5px solid ${isDimmed ? '#e2e8f0' : colors.border}`,
                borderRadius: '6px',
                p: compact ? 0.4 : { xs: 0.4, sm: 0.5 },
                height: compact ? 52 : 56,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.2,
                opacity: isDimmed ? 0.35 : 1,
            }}>
                {/* Subject name */}
                <Typography sx={{
                    fontWeight: filler ? 400 : 700,
                    fontSize: compact
                        ? (spanCount > 1 ? '0.68rem' : '0.65rem')
                        : { xs: '0.65rem', sm: spanCount > 1 ? '0.76rem' : '0.72rem' },
                    color: isDimmed ? '#94a3b8' : colors.text,
                    lineHeight: 1.2,
                    textAlign: 'center',
                    fontStyle: filler ? 'italic' : 'normal',
                }}>
                    {slot.subject_name}
                </Typography>

                {/* Faculty name */}
                {slot.faculty_name && !filler ? (
                    <Typography sx={{
                        fontSize: compact ? '0.52rem' : { xs: '0.52rem', sm: '0.6rem' },
                        color: isDimmed ? '#cbd5e1' : '#64748b',
                        lineHeight: 1,
                        textAlign: 'center',
                    }}>
                        {slot.faculty_name}
                    </Typography>
                ) : null}

            </Box>
        );
    };

    // Download buttons
    const downloadBtns = (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, gap: 0.8 }}>
            <Tooltip title="Download PDF">
                <IconButton onClick={handleDownloadPDF} size="small" sx={{
                    color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', px: 1, py: 0.4, gap: 0.4,
                }}>
                    <PdfIcon sx={{ fontSize: 16 }} />
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700 }}>Download</Typography>
                </IconButton>
            </Tooltip>
            {/* <Tooltip title="Download Excel">
                <IconButton onClick={handleDownloadExcel} size="small" sx={{
                    color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '8px', px: 1, py: 0.4, gap: 0.4,
                }}>
                    <ExcelIcon sx={{ fontSize: 16 }} />
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700 }}>Excel</Typography>
                </IconButton>
            </Tooltip> */}
        </Box>
    );

    // ========== MOBILE ==========
    if (isMobile) {
        return (
            <Box sx={{ width: '100%' }}>
                {downloadBtns}
                {activeDays.map((dayIdx) => {
                    const isToday = highlightToday && dayIdx === todayIdx;
                    return (
                        <Box key={dayIdx} sx={{
                            mb: 1.5, borderRadius: '12px', overflow: 'hidden',
                            border: isToday ? '2px solid #467bf0' : '1px solid #e2e8f0',
                            background: '#fff',
                            boxShadow: isToday ? '0 0 0 3px rgba(70,123,240,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                        }}>
                            {/* Day header */}
                            <Box sx={{
                                px: 1.5, py: 0.7,
                                background: isToday
                                    ? 'linear-gradient(135deg, #467bf0, #467bf0)'
                                    : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <Typography sx={{
                                    fontWeight: 800, fontSize: '0.8rem',
                                    color: isToday ? '#fff' : '#334155',
                                }}>
                                    {DAY_NAMES[dayIdx]}
                                </Typography>
                                {isToday && (
                                    <Chip label="TODAY" size="small" sx={{
                                        height: 20, fontSize: '0.62rem', fontWeight: 800,
                                        background: 'rgba(255,255,255,0.3)', color: '#fff',
                                        '& .MuiChip-label': { px: 0.8 },
                                    }} />
                                )}
                            </Box>

                            {/* 3-column period grid (before lunch) */}
                            {(() => {
                                const beforeLunch = COLUMNS.filter(c => !c.isLunch).slice(0, 3);
                                const merged = getMergedCells(dayIdx, beforeLunch);
                                return (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', p: 0.8 }}>
                                        {merged.map((cell, ci) => (
                                            <Box key={ci} sx={{ gridColumn: `span ${cell.span}` }}>
                                                <Typography sx={{
                                                    fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8',
                                                    textAlign: 'center', mb: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {cell.span > 1
                                                        ? `${cell.cols[0].shortLabel}-${cell.cols[cell.cols.length - 1].shortLabel}`
                                                        : cell.cols[0].shortLabel} · {cell.span > 1
                                                        ? `${cell.cols[0].time.split('-')[0]}-${cell.cols[cell.cols.length - 1].time.split('-')[1]}`
                                                        : cell.cols[0].time}
                                                </Typography>
                                                {renderCell(cell.slot, true, cell.span)}
                                            </Box>
                                        ))}
                                    </Box>
                                );
                            })()}

                            {/* Lunch divider */}
                            <Box sx={{ mx: 0.8, my: 0.3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ flex: 1, height: '1px', background: '#6b96f5' }} />
                                <Typography sx={{ fontSize: '0.58rem', color: '#467bf0', fontWeight: 700, fontStyle: 'italic', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                                    LUNCH · 12-1
                                </Typography>
                                <Box sx={{ flex: 1, height: '1px', background: '#6b96f5' }} />
                            </Box>

                            {/* 3-column period grid (after lunch) */}
                            {(() => {
                                const afterLunch = COLUMNS.filter(c => !c.isLunch).slice(3);
                                const merged = getMergedCells(dayIdx, afterLunch);
                                return (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', p: 0.8, pt: 0.3 }}>
                                        {merged.map((cell, ci) => (
                                            <Box key={ci} sx={{ gridColumn: `span ${cell.span}` }}>
                                                <Typography sx={{
                                                    fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8',
                                                    textAlign: 'center', mb: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {cell.span > 1
                                                        ? `${cell.cols[0].shortLabel}-${cell.cols[cell.cols.length - 1].shortLabel}`
                                                        : cell.cols[0].shortLabel} · {cell.span > 1
                                                        ? `${cell.cols[0].time.split('-')[0]}-${cell.cols[cell.cols.length - 1].time.split('-')[1]}`
                                                        : cell.cols[0].time}
                                                </Typography>
                                                {renderCell(cell.slot, true, cell.span)}
                                            </Box>
                                        ))}
                                    </Box>
                                );
                            })()}
                        </Box>
                    );
                })}
            </Box>
        );
    }

    // ========== DESKTOP / TABLET ==========
    return (
        <Box sx={{ width: '100%' }}>
            {downloadBtns}
            <Box
                component="table"
                sx={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: '8px 6px',
                    tableLayout: 'fixed',
                }}
            >
                <thead>
                    <tr>
                        <Box component="th" sx={{
                            p: 0.4, fontWeight: 800, fontSize: isTablet ? '0.65rem' : '0.72rem',
                            color: '#475569', textAlign: 'center', width: isTablet ? 70 : 90,
                        }}>
                            Day
                        </Box>
                        {COLUMNS.map((col) => (
                            <Box component="th" key={col.dbPeriod ?? 'lunch'} sx={{
                                p: 0.4, fontWeight: 700,
                                fontSize: isTablet ? '0.6rem' : '0.68rem',
                                color: col.isLunch ? '#467bf0' : '#3560c8',
                                textAlign: 'center',
                                background: col.isLunch ? 'rgba(70, 123, 240, 0.12)' : 'rgba(70, 123, 240, 0.12)',
                                borderRadius: '6px',
                                fontStyle: col.isLunch ? 'italic' : 'normal',
                                width: col.isLunch ? (isTablet ? 48 : 60) : 'auto',
                            }}>
                                {col.isLunch ? null : (isTablet ? col.shortLabel : col.label)}
                                <Typography sx={{
                                    fontSize: isTablet ? '0.56rem' : '0.62rem',
                                    color: col.isLunch ? '#467bf0' : '#94a3b8', fontWeight: col.isLunch ? 600 : 500, lineHeight: 1, mt: col.isLunch ? 0 : 0.2,
                                }}>
                                    {col.time}
                                </Typography>
                            </Box>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {activeDays.map((dayIdx, rowIndex) => {
                        const isToday = highlightToday && dayIdx === todayIdx;
                        const mergedRow = getMergedRow(dayIdx);
                        return (
                            <tr key={dayIdx}>
                                <Box component="td" sx={{
                                    p: 0.4, fontWeight: 800,
                                    fontSize: isTablet ? '0.65rem' : '0.72rem',
                                    color: isToday ? '#fff' : '#334155',
                                    textAlign: 'center',
                                    background: isToday ? '#467bf0' : '#f8fafc',
                                    borderRadius: '6px',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {isTablet ? DAY_SHORT[dayIdx] : DAY_NAMES[dayIdx]}
                                </Box>
                                {mergedRow.map((cell, ci) => {
                                    if (cell.type === 'lunch') {
                                        if (rowIndex === 0) {
                                            return (
                                                <Box component="td" key="lunch" rowSpan={activeDays.length} sx={{
                                                    textAlign: 'center', background: 'rgba(70, 123, 240, 0.12)', borderRadius: '6px',
                                                    verticalAlign: 'middle', width: isTablet ? 48 : 60,
                                                }}>
                                                    <Typography sx={{
                                                        fontSize: isTablet ? '0.6rem' : '0.7rem', color: '#467bf0',
                                                        fontStyle: 'italic', fontWeight: 700, letterSpacing: 2,
                                                        writingMode: 'vertical-rl', textOrientation: 'mixed',
                                                        mx: 'auto',
                                                    }}>
                                                        LUNCH
                                                    </Typography>
                                                </Box>
                                            );
                                        }
                                        return null; // Skip lunch cell for subsequent rows
                                    }
                                    return (
                                        <Box component="td" key={ci} colSpan={cell.span} sx={{ p: 0, verticalAlign: 'middle' }}>
                                            {renderCell(cell.slot, false, cell.span)}
                                        </Box>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </Box>
        </Box>
    );
};

export default TimetableGrid;
