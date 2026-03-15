/**
 * Notification bell icon with a badge showing unread count.
 * Opens a dropdown menu listing recent notifications with mark-as-read support.
 */
import React, { useState, useEffect } from 'react';
import {
  IconButton, Badge, Menu, MenuItem, Typography, Box, Divider, Button,
  ListItemText, ListItemIcon
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import api from '../../api/axios';

const typeIcons = {
  info: <InfoIcon fontSize="small" color="info" />,
  warning: <WarningIcon fontSize="small" color="warning" />,
  error: <ErrorIcon fontSize="small" color="error" />,
  success: <CheckCircleIcon fontSize="small" color="success" />,
};

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications/', { params: { limit: 20 } }),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(notifRes.data ?? []);
      setUnreadCount(countRes.data?.count ?? 0);
    } catch (_) { /* API unavailable */ }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => setAnchorEl(null);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (_) { /* API unavailable */ }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
    } catch (_) { /* API unavailable */ }
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen} aria-label="View notifications">
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: { xs: 'calc(100vw - 32px)', sm: 360 },
            maxWidth: 400,
            maxHeight: { xs: 'calc(100vh - 100px)', sm: 480 },
            background: 'var(--color-bg-paper)',
            border: '1px solid var(--color-border)',
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllRead} sx={{ color: 'var(--color-primary)', textTransform: 'none' }}>Mark all read</Button>
          )}
        </Box>
        <Divider sx={{ borderColor: 'var(--color-border)' }} />
        {notifications.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>No notifications</Typography>
          </MenuItem>
        ) : (
          notifications.map((n) => (
            <MenuItem
              key={n.id}
              onClick={() => { if (!n.read) markAsRead(n.id); }}
              sx={{
                opacity: n.read ? 0.6 : 1,
                whiteSpace: 'normal',
                py: 1.5,
                bgcolor: n.read ? 'transparent' : 'var(--color-primary-alpha-8)',
                '&:hover': { bgcolor: 'var(--color-primary-alpha-12)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {typeIcons[n.type] || typeIcons.info}
              </ListItemIcon>
              <ListItemText
                primary={<Typography variant="body2" sx={{ fontWeight: n.read ? 400 : 600, color: 'var(--color-text-primary)' }}>{n.title}</Typography>}
                secondary={
                  <Box>
                    <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)', display: 'block' }}>
                      {n.message}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
                      {formatTime(n.created_at)}
                    </Typography>
                  </Box>
                }
              />
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}
