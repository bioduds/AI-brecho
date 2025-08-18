import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from './LoginPage';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { user, loading, error } = useAuth();

    if (loading) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
            >
                <CircularProgress size={60} sx={{ color: 'white', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'white' }}>
                    Verificando autenticação...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return <LoginPage error={error.message} />;
    }

    if (!user) {
        return <LoginPage />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
