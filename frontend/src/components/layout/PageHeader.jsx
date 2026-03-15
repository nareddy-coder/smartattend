/**
 * Reusable page header component that renders a title, optional subtitle,
 * and an optional action element in a consistent layout.
 */
import React from 'react';
import { Box, Container, Typography } from '@mui/material';

const PageHeader = ({ title, subtitle, action }) => {
    return (
        <Box
            sx={{
                backgroundColor: 'var(--color-bg-paper)',
                borderBottom: '1px solid var(--color-border)',
                py: 3,
            }}
        >
            <Container maxWidth="xl">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'var(--color-text-primary)', fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    {action && <Box>{action}</Box>}
                </Box>
            </Container>
        </Box>
    );
};

export default PageHeader;
