import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Sales: React.FC = () => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Vendas
            </Typography>
            <Card>
                <CardContent>
                    <Typography variant="body1">
                        Gestão de vendas em desenvolvimento...
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Sales;
