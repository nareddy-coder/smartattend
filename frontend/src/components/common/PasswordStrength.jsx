/**
 * Password strength indicator that evaluates a password against length,
 * complexity, and character-variety rules and displays a color-coded progress bar.
 */
import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: 'inherit' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 25, label: 'Weak', color: 'error' };
  if (score <= 3) return { score: 50, label: 'Fair', color: 'warning' };
  if (score <= 4) return { score: 75, label: 'Good', color: 'info' };
  return { score: 100, label: 'Strong', color: 'success' };
}

export default function PasswordStrength({ password }) {
  const { score, label, color } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <LinearProgress
        variant="determinate"
        value={score}
        color={color}
        sx={{ height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" color={`${color}.main`} sx={{ mt: 0.5, display: 'block' }}>
        Password strength: {label}
      </Typography>
    </Box>
  );
}
