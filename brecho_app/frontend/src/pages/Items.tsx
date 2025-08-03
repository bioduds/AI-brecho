import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Items: React.FC = () => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Itens
            </Typography>
            <Card>
                <CardContent>
                    <Typography variant="body1">
                        Gestão de itens em desenvolvimento...
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Items;
