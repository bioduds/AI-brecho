import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Stack,
    Avatar,
    Alert,
    Divider
} from '@mui/material';
import { Google, GitHub, Security } from '@mui/icons-material';
import { signInWithGoogle, signInWithGithub } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
    error?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ error }) => {
    const [loading, setLoading] = React.useState<string | null>(null);
    const { loginWithAudit } = useAuth();

    const handleGoogleLogin = async () => {
        setLoading('google');
        try {
            const result = await signInWithGoogle();

            // Registrar login com auditoria completa
            await loginWithAudit(result.user, 'oauth_google');

        } catch (error) {
            console.error('Google login error:', error);
        } finally {
            setLoading(null);
        }
    };

    const handleGithubLogin = async () => {
        setLoading('github');
        try {
            const result = await signInWithGithub();

            // Registrar login com auditoria completa
            await loginWithAudit(result.user, 'oauth_github');

        } catch (error) {
            console.error('GitHub login error:', error);
        } finally {
            setLoading(null);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2
            }}
        >
            <Card
                sx={{
                    maxWidth: 400,
                    width: '100%',
                    backdropFilter: 'blur(10px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)'
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Stack spacing={3} alignItems="center">
                        {/* Logo/Header */}
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                bgcolor: 'primary.main',
                                fontSize: '2rem'
                            }}
                        >
                            <Security />
                        </Avatar>

                        <Box textAlign="center">
                            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                                Brechó Manager
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Sistema de Gestão do Brechó
                            </Typography>
                        </Box>

                        {error && (
                            <Alert severity="error" sx={{ width: '100%' }}>
                                {error}
                            </Alert>
                        )}

                        <Typography variant="h6" color="text.primary" textAlign="center">
                            Faça login para continuar
                        </Typography>

                        <Stack spacing={2} sx={{ width: '100%' }}>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<Google />}
                                onClick={handleGoogleLogin}
                                disabled={loading === 'google'}
                                sx={{
                                    backgroundColor: '#4285f4',
                                    '&:hover': {
                                        backgroundColor: '#3367d6'
                                    }
                                }}
                            >
                                {loading === 'google' ? 'Conectando...' : 'Entrar com Google'}
                            </Button>

                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<GitHub />}
                                onClick={handleGithubLogin}
                                disabled={loading === 'github'}
                                sx={{
                                    backgroundColor: '#333',
                                    '&:hover': {
                                        backgroundColor: '#24292e'
                                    }
                                }}
                            >
                                {loading === 'github' ? 'Conectando...' : 'Entrar com GitHub'}
                            </Button>
                        </Stack>

                        <Divider sx={{ width: '100%' }} />

                        <Typography variant="caption" color="text.secondary" textAlign="center">
                            Acesso seguro via OAuth
                            <br />
                            Seus dados estão protegidos
                            <br />
                            <em>Sistema com auditoria completa de acessos</em>
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
};

export default LoginPage;
