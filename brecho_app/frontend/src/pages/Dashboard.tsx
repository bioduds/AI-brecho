import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Dashboard: React.FC = () => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Dashboard
            </Typography>
            <Card>
                <CardContent>
                    <Typography variant="h6">
                        Bem-vindo ao Sistema de Gestão do Brechó
                    </Typography>
                    <Typography variant="body1">
                        Dashboard em desenvolvimento...
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Dashboard;
