import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Consignors: React.FC = () => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Consignantes
            </Typography>
            <Card>
                <CardContent>
                    <Typography variant="body1">
                        Gestão de consignantes em desenvolvimento...
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Consignors;
