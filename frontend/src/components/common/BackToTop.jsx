/**
 * Floating action button that appears after scrolling down the page.
 * Smoothly scrolls the user back to the top when clicked.
 */
import React, { useState, useEffect } from 'react';
import { Fab, Zoom } from '@mui/material';
import { KeyboardArrowUp } from '@mui/icons-material';

const BackToTop = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Zoom in={visible}>
            <Fab
                size="small"
                onClick={scrollToTop}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    background: 'var(--gradient-primary)',
                    color: 'var(--color-text-white)',
                    zIndex: 1200,
                    '&:hover': {
                        background: 'var(--gradient-primary-hover)',
                    },
                }}
            >
                <KeyboardArrowUp />
            </Fab>
        </Zoom>
    );
};

export default BackToTop;
