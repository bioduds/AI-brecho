import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    LinearProgress,
    Avatar,
    IconButton,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    Fab
} from '@mui/material';
import {
    TrendingUp,
    AttachMoney,
    Inventory,
    People,
    ShoppingCart,
    Warning,
    Star,
    Schedule,
    Refresh,
    Analytics
} from '@mui/icons-material';

interface DashboardStats {
    totalItems: number;
    activeItems: number;
    soldItems: number;
    totalConsignors: number;
    totalRevenue: number;
    monthlyRevenue: number;
    averagePrice: number;
    conversionRate: number;
}

interface RecentSale {
    id: string;
    sku: string;
    title: string;
    sale_price: number;
    date: string;
    consignor: string;
}

interface TopConsignor {
    name: string;
    totalItems: number;
    totalSales: number;
    revenue: number;
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        totalItems: 0,
        activeItems: 0,
        soldItems: 0,
        totalConsignors: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        averagePrice: 0,
        conversionRate: 0
    });
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const [topConsignors, setTopConsignors] = useState<TopConsignor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Buscar dados dos endpoints
            const [itemsRes, consignorsRes, salesRes] = await Promise.all([
                fetch('http://localhost:8000/api/v1/items/'),
                fetch('http://localhost:8000/api/v1/consignors/'),
                fetch('http://localhost:8000/api/v1/sales/')
            ]);

            if (!itemsRes.ok || !consignorsRes.ok || !salesRes.ok) {
                throw new Error('Erro ao carregar dados do dashboard');
            }

            const items = await itemsRes.json();
            const consignors = await consignorsRes.json();
            const sales = await salesRes.json();

            // Calcular estatísticas
            const activeItems = items.filter((item: any) => item.active).length;
            const soldItems = sales.length;
            const totalRevenue = sales.reduce((sum: number, sale: any) => sum + (sale.sale_price || 0), 0);

            // Vendas do mês atual
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyRevenue = sales
                .filter((sale: any) => {
                    const saleDate = new Date(sale.date);
                    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
                })
                .reduce((sum: number, sale: any) => sum + (sale.sale_price || 0), 0);

            const averagePrice = soldItems > 0 ? totalRevenue / soldItems : 0;
            const conversionRate = items.length > 0 ? (soldItems / items.length) * 100 : 0;

            setStats({
                totalItems: items.length,
                activeItems,
                soldItems,
                totalConsignors: consignors.length,
                totalRevenue,
                monthlyRevenue,
                averagePrice,
                conversionRate
            });

            // Vendas recentes (últimas 5)
            const recentSalesData = sales
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((sale: any) => {
                    const item = items.find((item: any) => item.sku === sale.sku);
                    const consignor = consignors.find((c: any) => c.id === item?.consignor_id);
                    return {
                        id: sale.id,
                        sku: sale.sku,
                        title: item?.title_ig || item?.description || sale.sku,
                        sale_price: sale.sale_price,
                        date: sale.date,
                        consignor: consignor?.name || 'N/A'
                    };
                });

            setRecentSales(recentSalesData);

            // Top consignors
            const consignorStats = consignors.map((consignor: any) => {
                const consignorItems = items.filter((item: any) => item.consignor_id === consignor.id);
                const consignorSales = sales.filter((sale: any) => {
                    const item = items.find((item: any) => item.sku === sale.sku);
                    return item?.consignor_id === consignor.id;
                });
                const revenue = consignorSales.reduce((sum: number, sale: any) => sum + (sale.sale_price || 0), 0);

                return {
                    name: consignor.name,
                    totalItems: consignorItems.length,
                    totalSales: consignorSales.length,
                    revenue
                };
            })
                .sort((a: any, b: any) => b.revenue - a.revenue)
                .slice(0, 5);

            setTopConsignors(consignorStats);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>Dashboard</Typography>
                <LinearProgress />
                <Typography sx={{ mt: 2 }}>Carregando dados...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{
            p: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: '100vh'
        }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3
            }}>
                <Typography
                    variant="h3"
                    sx={{
                        color: 'white',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                    }}
                >
                    <Analytics sx={{ mr: 1, fontSize: 'inherit' }} />
                    Dashboard
                </Typography>
                <Fab
                    color="secondary"
                    onClick={fetchDashboardData}
                    disabled={loading}
                >
                    <Refresh />
                </Fab>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* KPIs Grid */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
                gap: 3,
                mb: 4
            }}>
                <Card sx={{
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                    {stats.totalItems}
                                </Typography>
                                <Typography variant="subtitle1">
                                    Total de Itens
                                </Typography>
                            </Box>
                            <Inventory sx={{ fontSize: 48, opacity: 0.7 }} />
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{
                    background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                    {stats.activeItems}
                                </Typography>
                                <Typography variant="subtitle1">
                                    Itens Ativos
                                </Typography>
                            </Box>
                            <Star sx={{ fontSize: 48, opacity: 0.7 }} />
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{
                    background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                    {stats.soldItems}
                                </Typography>
                                <Typography variant="subtitle1">
                                    Itens Vendidos
                                </Typography>
                            </Box>
                            <ShoppingCart sx={{ fontSize: 48, opacity: 0.7 }} />
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{
                    background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                    {stats.totalConsignors}
                                </Typography>
                                <Typography variant="subtitle1">
                                    Consignantes
                                </Typography>
                            </Box>
                            <People sx={{ fontSize: 48, opacity: 0.7 }} />
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Revenue Cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
                gap: 3,
                mb: 4
            }}>
                <Card sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <AttachMoney color="success" sx={{ mr: 1 }} />
                            <Typography variant="h6">Receita Total</Typography>
                        </Box>
                        <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(stats.totalRevenue)}
                        </Typography>
                    </CardContent>
                </Card>

                <Card sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <TrendingUp color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h6">Receita do Mês</Typography>
                        </Box>
                        <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(stats.monthlyRevenue)}
                        </Typography>
                    </CardContent>
                </Card>

                <Card sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Analytics color="secondary" sx={{ mr: 1 }} />
                            <Typography variant="h6">Ticket Médio</Typography>
                        </Box>
                        <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(stats.averagePrice)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Taxa de conversão: {stats.conversionRate.toFixed(1)}%
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Charts and Tables Row */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
                gap: 3
            }}>
                {/* Recent Sales */}
                <Card sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                            <Schedule sx={{ mr: 1 }} />
                            Vendas Recentes
                        </Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>SKU</TableCell>
                                        <TableCell>Produto</TableCell>
                                        <TableCell>Consignante</TableCell>
                                        <TableCell>Preço</TableCell>
                                        <TableCell>Data</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recentSales.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell>
                                                <Chip label={sale.sku} size="small" />
                                            </TableCell>
                                            <TableCell>{sale.title}</TableCell>
                                            <TableCell>{sale.consignor}</TableCell>
                                            <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                                {formatCurrency(sale.sale_price)}
                                            </TableCell>
                                            <TableCell>{formatDate(sale.date)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {recentSales.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Typography color="text.secondary">
                                                    Nenhuma venda registrada
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>

                {/* Top Consignors */}
                <Card sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                            <Star sx={{ mr: 1 }} />
                            Top Consignantes
                        </Typography>
                        <List>
                            {topConsignors.map((consignor, index) => (
                                <React.Fragment key={consignor.name}>
                                    <ListItem>
                                        <ListItemAvatar>
                                            <Avatar sx={{
                                                bgcolor: index === 0 ? 'gold' :
                                                    index === 1 ? 'silver' :
                                                        index === 2 ? '#CD7F32' : 'primary.main'
                                            }}>
                                                {index + 1}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={consignor.name}
                                            secondary={
                                                <Box>
                                                    <Typography variant="body2">
                                                        {consignor.totalItems} itens • {consignor.totalSales} vendas
                                                    </Typography>
                                                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                                                        {formatCurrency(consignor.revenue)}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    {index < topConsignors.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                            {topConsignors.length === 0 && (
                                <ListItem>
                                    <ListItemText
                                        primary="Nenhum consignante encontrado"
                                        secondary="Cadastre consignantes para ver o ranking"
                                    />
                                </ListItem>
                            )}
                        </List>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default Dashboard;
