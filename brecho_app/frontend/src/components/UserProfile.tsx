import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Avatar,
    Typography,
    Chip,
    Stack,
    Button,
    Divider
} from '@mui/material';
import { Person, Email, CalendarToday, ExitToApp } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../config/firebase';

const UserProfile: React.FC = () => {
    const { user } = useAuth();

    if (!user) {
        return null;
    }

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Extrair dados do usuário
    const userData = {
        uid: user.uid,
        name: user.displayName || 'Usuário',
        email: user.email || 'Email não disponível',
        photo: user.photoURL || '',
        provider: user.providerData[0]?.providerId || 'unknown',
        verified: user.emailVerified,
        createdAt: user.metadata.creationTime,
        lastLogin: user.metadata.lastSignInTime,
    };

    const getProviderName = (providerId: string) => {
        switch (providerId) {
            case 'google.com':
                return 'Google';
            case 'github.com':
                return 'GitHub';
            default:
                return 'Desconhecido';
        }
    };

    const getProviderColor = (providerId: string) => {
        switch (providerId) {
            case 'google.com':
                return '#4285f4';
            case 'github.com':
                return '#333';
            default:
                return '#gray';
        }
    };

    return (
        <Card sx={{ maxWidth: 400, margin: 'auto' }}>
            <CardContent>
                <Stack spacing={3}>
                    {/* Avatar e Nome */}
                    <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                            src={userData.photo}
                            sx={{ width: 64, height: 64 }}
                        >
                            <Person />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" fontWeight="bold">
                                {userData.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {userData.email}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider />

                    {/* Informações Detalhadas */}
                    <Stack spacing={2}>
                        {/* Provedor */}
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="medium">
                                Login via:
                            </Typography>
                            <Chip
                                label={getProviderName(userData.provider)}
                                size="small"
                                sx={{
                                    backgroundColor: getProviderColor(userData.provider),
                                    color: 'white'
                                }}
                            />
                        </Box>

                        {/* Email Verificado */}
                        <Box display="flex" alignItems="center" gap={1}>
                            <Email fontSize="small" />
                            <Typography variant="body2">
                                Email {userData.verified ? 'verificado' : 'não verificado'}
                            </Typography>
                            <Chip
                                label={userData.verified ? 'Verificado' : 'Pendente'}
                                size="small"
                                color={userData.verified ? 'success' : 'warning'}
                            />
                        </Box>

                        {/* Data de Criação */}
                        <Box display="flex" alignItems="center" gap={1}>
                            <CalendarToday fontSize="small" />
                            <Typography variant="body2">
                                Conta criada: {new Date(userData.createdAt!).toLocaleDateString('pt-BR')}
                            </Typography>
                        </Box>

                        {/* Último Login */}
                        <Box display="flex" alignItems="center" gap={1}>
                            <CalendarToday fontSize="small" />
                            <Typography variant="body2">
                                Último acesso: {new Date(userData.lastLogin!).toLocaleDateString('pt-BR')}
                            </Typography>
                        </Box>

                        {/* UID (para desenvolvedores) */}
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                ID: {userData.uid.substring(0, 20)}...
                            </Typography>
                        </Box>
                    </Stack>

                    <Divider />

                    {/* Botão de Logout */}
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<ExitToApp />}
                        onClick={handleLogout}
                        fullWidth
                    >
                        Sair
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default UserProfile;
