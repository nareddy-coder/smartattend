/**
 * Empty state placeholder displayed when a list or view has no data.
 * Shows an icon, message, and optional action button.
 */
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

const EmptyState = ({
    icon: Icon = InboxIcon,
    title = 'No data found',
    description = '',
    action = null
}) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: { xs: 4, sm: 8 },
                px: 2,
                textAlign: 'center',
            }}
        >
            <Icon sx={{ fontSize: { xs: 48, sm: 64 }, color: 'var(--color-text-muted)', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', mb: 0.5 }}>
                {title}
            </Typography>
            {description && (
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 3, maxWidth: 400 }}>
                    {description}
                </Typography>
            )}
            {action}
        </Box>
    );
};

export default EmptyState;
