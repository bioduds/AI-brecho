import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Fab,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Menu,
    MenuItem,
    CardActionArea
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
    Analytics,
    Add,
    Edit,
    Visibility,
    MoreVert,
    FilterList,
    Assessment,
    Receipt,
    PersonAdd,
    ShoppingBag,
    Search,
    Delete,
    Archive
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
    const navigate = useNavigate();
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
    const [quickActionsOpen, setQuickActionsOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedSale, setSelectedSale] = useState<RecentSale | null>(null);

    // Action handlers
    const handleViewAllItems = () => navigate('/itens');
    const handleViewActiveItems = () => navigate('/itens?filter=active');
    const handleViewSoldItems = () => navigate('/vendas');
    const handleViewConsignors = () => navigate('/consignantes');
    const handleAddNewItem = () => navigate('/itens?action=add');
    const handleAddNewConsignor = () => navigate('/consignantes?action=add');
    const handleCreateSale = () => navigate('/vendas?action=add');
    const handleViewReports = () => navigate('/dashboard?view=reports');

    const handleSaleAction = (sale: RecentSale, action: string) => {
        switch (action) {
            case 'view':
                navigate(`/vendas?view=${sale.id}`);
                break;
            case 'edit':
                navigate(`/vendas?edit=${sale.id}`);
                break;
            case 'receipt':
                // Lógica para gerar recibo
                window.open(`/api/v1/sales/${sale.id}/receipt`, '_blank');
                break;
            case 'refund':
                // Lógica para estorno
                if (window.confirm('Tem certeza que deseja estornar esta venda?')) {
                    // Implementar estorno
                }
                break;
        }
        setAnchorEl(null);
    };

    const handleConsignorAction = (consignorName: string, action: string) => {
        switch (action) {
            case 'view':
                navigate(`/consignantes?search=${encodeURIComponent(consignorName)}`);
                break;
            case 'items':
                navigate(`/itens?consignor=${encodeURIComponent(consignorName)}`);
                break;
            case 'sales':
                navigate(`/vendas?consignor=${encodeURIComponent(consignorName)}`);
                break;
            case 'report':
                navigate(`/repasses?consignor=${encodeURIComponent(consignorName)}`);
                break;
        }
    };

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
            {/* Header with Quick Actions */}
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

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Adicionar Item">
                        <Fab
                            size="small"
                            color="secondary"
                            onClick={handleAddNewItem}
                        >
                            <Add />
                        </Fab>
                    </Tooltip>

                    <Tooltip title="Nova Venda">
                        <Fab
                            size="small"
                            color="success"
                            onClick={handleCreateSale}
                        >
                            <ShoppingBag />
                        </Fab>
                    </Tooltip>

                    <Tooltip title="Novo Consignante">
                        <Fab
                            size="small"
                            color="info"
                            onClick={handleAddNewConsignor}
                        >
                            <PersonAdd />
                        </Fab>
                    </Tooltip>

                    <Tooltip title="Atualizar Dados">
                        <Fab
                            size="small"
                            color="primary"
                            onClick={fetchDashboardData}
                            disabled={loading}
                        >
                            <Refresh />
                        </Fab>
                    </Tooltip>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* KPIs Grid - Now Clickable */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
                gap: 3,
                mb: 4
            }}>
                <Card sx={{
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
                    }
                }}>
                    <CardActionArea onClick={handleViewAllItems}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {stats.totalItems}
                                    </Typography>
                                    <Typography variant="subtitle1">
                                        Total de Itens
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        Clique para ver todos
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Inventory sx={{ fontSize: 48, opacity: 0.7 }} />
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                                        <Tooltip title="Adicionar Item">
                                            <IconButton
                                                size="small"
                                                sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddNewItem();
                                                }}
                                            >
                                                <Add fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Buscar Item">
                                            <IconButton
                                                size="small"
                                                sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/itens?action=search');
                                                }}
                                            >
                                                <Search fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </CardActionArea>
                </Card>

                <Card sx={{
                    background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
                    }
                }}>
                    <CardActionArea onClick={handleViewActiveItems}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {stats.activeItems}
                                    </Typography>
                                    <Typography variant="subtitle1">
                                        Itens Ativos
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        Clique para filtrar
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Star sx={{ fontSize: 48, opacity: 0.7 }} />
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                                        <Tooltip title="Editar Itens">
                                            <IconButton
                                                size="small"
                                                sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/itens?filter=active&action=edit');
                                                }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Arquivar Itens">
                                            <IconButton
                                                size="small"
                                                sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/itens?filter=active&action=archive');
                                                }}
                                            >
                                                <Archive fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </CardActionArea>
                </Card>

                <Card sx={{
                    background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
                    }
                }}>
                    <CardActionArea onClick={handleViewSoldItems}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {stats.soldItems}
                                    </Typography>
                                    <Typography variant="subtitle1">
                                        Itens Vendidos
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        Ver todas as vendas
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <ShoppingCart sx={{ fontSize: 48, opacity: 0.7 }} />
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                                        <Tooltip title="Nova Venda">
                                            <IconButton
                                                size="small"
                                                sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCreateSale();
                                                }}
                                            >
                                                <Add fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Relatório de Vendas">
                                            <IconButton
                                                size="small"
                                                sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/vendas?view=report');
                                                }}
                                            >
                                                <Assessment fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </CardActionArea>
                </Card>

                <Card sx={{
                    background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
                    }
                }}>
                    <CardActionArea onClick={handleViewConsignors}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {stats.totalConsignors}
                                    </Typography>
                                    <Typography variant="subtitle1">
                                        Consignantes
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        Gerenciar consignantes
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <People sx={{ fontSize: 48, opacity: 0.7 }} />
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                                        <Tooltip title="Novo Consignante">
                                            <IconButton
                                                size="small"
                                                sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddNewConsignor();
                                                }}
                                            >
                                                <Add fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Relatório de Repasses">
                                            <IconButton
                                                size="small"
                                                sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/repasses');
                                                }}
                                            >
                                                <Receipt fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </CardActionArea>
                </Card>
            </Box>

            {/* Revenue Cards - Now with Actions */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
                gap: 3,
                mb: 4
            }}>
                <Card sx={{
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                    }
                }}>
                    <CardActionArea onClick={() => navigate('/vendas?view=revenue-total')}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <AttachMoney color="success" sx={{ mr: 1 }} />
                                <Typography variant="h6">Receita Total</Typography>
                                <Box sx={{ flexGrow: 1 }} />
                                <Tooltip title="Ver detalhes">
                                    <IconButton size="small">
                                        <Visibility fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Gerar relatório">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/vendas?report=revenue');
                                        }}
                                    >
                                        <Assessment fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                                {formatCurrency(stats.totalRevenue)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Clique para ver breakdown detalhado
                            </Typography>
                        </CardContent>
                    </CardActionArea>
                </Card>

                <Card sx={{
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                    }
                }}>
                    <CardActionArea onClick={() => navigate('/vendas?filter=current-month')}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <TrendingUp color="primary" sx={{ mr: 1 }} />
                                <Typography variant="h6">Receita do Mês</Typography>
                                <Box sx={{ flexGrow: 1 }} />
                                <Tooltip title="Comparar com mês anterior">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/dashboard?compare=monthly');
                                        }}
                                    >
                                        <TrendingUp fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Metas do mês">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/dashboard?goals=monthly');
                                        }}
                                    >
                                        <Star fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                {formatCurrency(stats.monthlyRevenue)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Vendas do mês atual
                            </Typography>
                        </CardContent>
                    </CardActionArea>
                </Card>

                <Card sx={{
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                    }
                }}>
                    <CardActionArea onClick={() => navigate('/vendas?analytics=ticket-medio')}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Analytics color="secondary" sx={{ mr: 1 }} />
                                <Typography variant="h6">Ticket Médio</Typography>
                                <Box sx={{ flexGrow: 1 }} />
                                <Tooltip title="Estratégias para aumentar">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/analytics?focus=ticket-improvement');
                                        }}
                                    >
                                        <TrendingUp fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Análise detalhada">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/analytics?type=conversion');
                                        }}
                                    >
                                        <Assessment fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 'bold' }}>
                                {formatCurrency(stats.averagePrice)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Taxa de conversão: {stats.conversionRate.toFixed(1)}%
                            </Typography>
                        </CardContent>
                    </CardActionArea>
                </Card>
            </Box>

            {/* Charts and Tables Row */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
                gap: 3
            }}>
                {/* Recent Sales - Enhanced with Actions */}
                <Card sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                                <Schedule sx={{ mr: 1 }} />
                                Vendas Recentes
                            </Typography>
                            <Box>
                                <Tooltip title="Ver todas as vendas">
                                    <IconButton onClick={() => navigate('/vendas')}>
                                        <Visibility />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Nova venda">
                                    <IconButton onClick={() => navigate('/vendas?action=add')}>
                                        <Add />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Filtros avançados">
                                    <IconButton onClick={() => navigate('/vendas?filters=advanced')}>
                                        <FilterList />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>SKU</TableCell>
                                        <TableCell>Produto</TableCell>
                                        <TableCell>Consignante</TableCell>
                                        <TableCell>Preço</TableCell>
                                        <TableCell>Data</TableCell>
                                        <TableCell align="center">Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recentSales.map((sale) => (
                                        <TableRow
                                            key={sale.id}
                                            sx={{
                                                '&:hover': {
                                                    bgcolor: 'action.hover',
                                                    cursor: 'pointer'
                                                }
                                            }}
                                            onClick={() => navigate(`/vendas?view=${sale.id}`)}
                                        >
                                            <TableCell>
                                                <Chip
                                                    label={sale.sku}
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/itens?search=${sale.sku}`);
                                                    }}
                                                    sx={{ cursor: 'pointer' }}
                                                />
                                            </TableCell>
                                            <TableCell>{sale.title}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="text"
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleConsignorAction(sale.consignor, 'view');
                                                    }}
                                                >
                                                    {sale.consignor}
                                                </Button>
                                            </TableCell>
                                            <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                                {formatCurrency(sale.sale_price)}
                                            </TableCell>
                                            <TableCell>{formatDate(sale.date)}</TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSale(sale);
                                                        setAnchorEl(e.currentTarget);
                                                    }}
                                                >
                                                    <MoreVert />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {recentSales.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">
                                                <Box sx={{ p: 2 }}>
                                                    <Typography color="text.secondary" gutterBottom>
                                                        Nenhuma venda registrada
                                                    </Typography>
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<Add />}
                                                        onClick={() => navigate('/vendas?action=add')}
                                                    >
                                                        Fazer primeira venda
                                                    </Button>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>

                {/* Top Consignors - Enhanced with Actions */}
                <Card sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                                <Star sx={{ mr: 1 }} />
                                Top Consignantes
                            </Typography>
                            <Box>
                                <Tooltip title="Ver todos">
                                    <IconButton onClick={() => navigate('/consignantes')}>
                                        <People />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Novo consignante">
                                    <IconButton onClick={() => navigate('/consignantes?action=add')}>
                                        <PersonAdd />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Relatório de repasses">
                                    <IconButton onClick={() => navigate('/repasses')}>
                                        <Receipt />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                        <List>
                            {topConsignors.map((consignor, index) => (
                                <React.Fragment key={consignor.name}>
                                    <ListItem
                                        sx={{
                                            cursor: 'pointer',
                                            borderRadius: 1,
                                            '&:hover': {
                                                bgcolor: 'action.hover'
                                            }
                                        }}
                                        onClick={() => handleConsignorAction(consignor.name, 'view')}
                                    >
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
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {consignor.name}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <Tooltip title="Ver itens">
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleConsignorAction(consignor.name, 'items');
                                                                }}
                                                            >
                                                                <Inventory fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Ver vendas">
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleConsignorAction(consignor.name, 'sales');
                                                                }}
                                                            >
                                                                <ShoppingCart fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Gerar repasse">
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleConsignorAction(consignor.name, 'report');
                                                                }}
                                                            >
                                                                <Receipt fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </Box>
                                            }
                                            secondary={
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">
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
                                        primary={
                                            <Box sx={{ textAlign: 'center', p: 2 }}>
                                                <Typography color="text.secondary" gutterBottom>
                                                    Nenhum consignante encontrado
                                                </Typography>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<PersonAdd />}
                                                    onClick={() => navigate('/consignantes?action=add')}
                                                >
                                                    Cadastrar primeiro consignante
                                                </Button>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            )}
                        </List>
                    </CardContent>
                </Card>
            </Box>

            {/* Menu de ações para vendas */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem onClick={() => selectedSale && handleSaleAction(selectedSale, 'view')}>
                    <Visibility sx={{ mr: 1 }} />
                    Ver detalhes
                </MenuItem>
                <MenuItem onClick={() => selectedSale && handleSaleAction(selectedSale, 'edit')}>
                    <Edit sx={{ mr: 1 }} />
                    Editar venda
                </MenuItem>
                <MenuItem onClick={() => selectedSale && handleSaleAction(selectedSale, 'receipt')}>
                    <Receipt sx={{ mr: 1 }} />
                    Gerar recibo
                </MenuItem>
                <Divider />
                <MenuItem
                    onClick={() => selectedSale && handleSaleAction(selectedSale, 'refund')}
                    sx={{ color: 'error.main' }}
                >
                    <Delete sx={{ mr: 1 }} />
                    Estornar venda
                </MenuItem>
            </Menu>

            {/* Quick Actions Dialog */}
            <Dialog open={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ações Rápidas</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<Add />}
                            onClick={() => {
                                setQuickActionsOpen(false);
                                handleAddNewItem();
                            }}
                        >
                            Novo Item
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<ShoppingBag />}
                            onClick={() => {
                                setQuickActionsOpen(false);
                                handleCreateSale();
                            }}
                        >
                            Nova Venda
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<PersonAdd />}
                            onClick={() => {
                                setQuickActionsOpen(false);
                                handleAddNewConsignor();
                            }}
                        >
                            Novo Consignante
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Assessment />}
                            onClick={() => {
                                setQuickActionsOpen(false);
                                handleViewReports();
                            }}
                        >
                            Relatórios
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQuickActionsOpen(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Dashboard;
