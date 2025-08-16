import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Alert,
    CircularProgress,
    Autocomplete,
    InputAdornment,
    Fab,
    Grid,
    Divider,
    Avatar,
    ListItemText,
    ListItemAvatar,
    MenuItem,
    FormControl,
    InputLabel,
    Select
} from '@mui/material';
import {
    Add,
    Search,
    AttachMoney,
    Person,
    CalendarToday,
    Receipt,
    TrendingUp,
    Delete,
    Edit,
    Visibility,
    ShoppingCart,
    FilterList
} from '@mui/icons-material';

interface Item {
    id: number;
    sku: string;
    description: string;
    title_ig: string;
    list_price: number;
    consignor_id: string;
    consignor_name?: string;
    active: boolean;
    photos?: string[];
}

interface Sale {
    id: string;
    sku: string;
    sale_price: number;
    date: string;
    customer_name?: string;
    payment_method?: string;
    notes?: string;
    item?: Item;
}

interface Consignor {
    id: string;
    name: string;
    whatsapp?: string;
    email?: string;
}

const Sales: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Parse URL parameters
    const searchParams = new URLSearchParams(location.search);
    const urlAction = searchParams.get('action');
    const urlView = searchParams.get('view');
    const urlEdit = searchParams.get('edit');
    const urlFilter = searchParams.get('filter');
    const urlConsignor = searchParams.get('consignor');

    const [sales, setSales] = useState<Sale[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [consignors, setConsignors] = useState<Consignor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog states - initialize from URL params
    const [openDialog, setOpenDialog] = useState(urlAction === 'add');
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [viewingSale, setViewingSale] = useState<Sale | null>(null);

    // Filter states
    const [filterConsignor, setFilterConsignor] = useState<string>(urlConsignor || '');
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');

    // Form states
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [salePrice, setSalePrice] = useState<string>('');
    const [customerName, setCustomerName] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    // Filter states
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterPayment, setFilterPayment] = useState<string>('');
    const [filterPeriod, setFilterPeriod] = useState<string>('');

    const paymentMethods = ['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Transferência'];

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const [salesRes, itemsRes, consignorsRes] = await Promise.all([
                fetch('http://localhost:8000/api/v1/sales/'),
                fetch('http://localhost:8000/api/v1/items/'),
                fetch('http://localhost:8000/api/v1/consignors/')
            ]);

            if (!salesRes.ok || !itemsRes.ok || !consignorsRes.ok) {
                throw new Error('Erro ao carregar dados');
            }

            const salesData = await salesRes.json();
            const itemsData = await itemsRes.json();
            const consignorsData = await consignorsRes.json();

            // Enriquecer vendas com dados dos itens e consignantes
            const enrichedSales = salesData.map((sale: Sale) => {
                const item = itemsData.find((item: Item) => item.sku === sale.sku);
                const consignor = consignorsData.find((c: Consignor) => c.id === item?.consignor_id);

                return {
                    ...sale,
                    item: item ? {
                        ...item,
                        consignor_name: consignor?.name
                    } : undefined
                };
            });

            setSales(enrichedSales);
            setItems(itemsData.filter((item: Item) => item.active)); // Apenas itens ativos para venda
            setConsignors(consignorsData);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handle URL parameters
    useEffect(() => {
        if (urlView && sales.length > 0) {
            const saleToView = sales.find(sale => sale.id === urlView);
            if (saleToView) {
                setViewingSale(saleToView);
            }
        }

        if (urlEdit && sales.length > 0) {
            const saleToEdit = sales.find(sale => sale.id === urlEdit);
            if (saleToEdit) {
                handleOpenDialog(saleToEdit);
            }
        }
    }, [urlView, urlEdit, sales]);

    // Handle monthly filter
    useEffect(() => {
        if (urlFilter === 'current-month') {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            setFilterDateFrom(firstDay.toISOString().split('T')[0]);
            setFilterDateTo(lastDay.toISOString().split('T')[0]);
        }
    }, [urlFilter]);

    const handleOpenDialog = (sale?: Sale) => {
        if (sale) {
            setEditingSale(sale);
            const item = items.find(i => i.sku === sale.sku);
            setSelectedItem(item || null);
            setSalePrice(sale.sale_price.toString());
            setCustomerName(sale.customer_name || '');
            setPaymentMethod(sale.payment_method || '');
            setNotes(sale.notes || '');
        } else {
            setEditingSale(null);
            setSelectedItem(null);
            setSalePrice('');
            setCustomerName('');
            setPaymentMethod('');
            setNotes('');
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingSale(null);
        setSelectedItem(null);
        setSalePrice('');
        setCustomerName('');
        setPaymentMethod('');
        setNotes('');
    };

    const handleSubmit = async () => {
        if (!selectedItem || !salePrice) {
            setError('Selecione um item e informe o preço');
            return;
        }

        try {
            const saleData = {
                id: editingSale ? editingSale.id : crypto.randomUUID(),
                sku: selectedItem.sku,
                consignor_id: selectedItem.consignor_id,
                date: new Date().toISOString(),
                sale_price: parseFloat(salePrice),
                discount_value: 0,
                channel: 'loja',
                customer_name: customerName || null,
                customer_whatsapp: null,
                payment_method: paymentMethod || null,
                notes: notes || null
            };

            const url = editingSale
                ? `http://localhost:8000/api/v1/sales/${editingSale.id}`
                : 'http://localhost:8000/api/v1/sales/';

            const method = editingSale ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            });

            if (!response.ok) {
                throw new Error('Erro ao salvar venda');
            }

            await fetchData(); // Recarregar dados
            handleCloseDialog();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar venda');
        }
    };

    const handleDelete = async (saleId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta venda?')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/api/v1/sales/${saleId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir venda');
            }

            await fetchData();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao excluir venda');
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getNormalizedPhotosWithUrls = (photos: string[] | undefined): string[] => {
        if (!photos || photos.length === 0) return [];

        return photos.map(photo => {
            if (photo.startsWith('http://') || photo.startsWith('https://')) {
                return photo;
            }

            if (photo.startsWith('/static/') || photo.startsWith('static/')) {
                const cleanPath = photo.startsWith('/') ? photo.substring(1) : photo;
                return `http://localhost:8000/${cleanPath}`;
            }

            return `http://localhost:8000/static/images/${photo}`;
        });
    };

    const getFilteredSales = () => {
        return sales.filter(sale => {
            const matchesSearch = !searchTerm ||
                sale.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sale.item?.title_ig?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesPayment = !filterPayment || sale.payment_method === filterPayment;

            // Filter by consignor from URL parameter
            const matchesConsignor = !filterConsignor ||
                (sale.item?.consignor_name &&
                    sale.item.consignor_name.toLowerCase().includes(filterConsignor.toLowerCase()));

            // Filter by date range
            const matchesDateRange = (() => {
                if (!filterDateFrom && !filterDateTo) return true;

                const saleDate = new Date(sale.date);
                const fromDate = filterDateFrom ? new Date(filterDateFrom) : null;
                const toDate = filterDateTo ? new Date(filterDateTo) : null;

                if (fromDate && saleDate < fromDate) return false;
                if (toDate && saleDate > toDate) return false;

                return true;
            })();

            const matchesPeriod = !filterPeriod || (() => {
                const saleDate = new Date(sale.date);
                const now = new Date();

                switch (filterPeriod) {
                    case 'today':
                        return saleDate.toDateString() === now.toDateString();
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return saleDate >= weekAgo;
                    case 'month':
                        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
                    default:
                        return true;
                }
            })();

            return matchesSearch && matchesPayment && matchesConsignor && matchesDateRange && matchesPeriod;
        });
    };

    const getTotalRevenue = () => {
        return getFilteredSales().reduce((sum, sale) => sum + sale.sale_price, 0);
    };

    if (loading) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Carregando vendas...</Typography>
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
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ShoppingCart sx={{ mr: 1, fontSize: 'inherit' }} />
                    Vendas
                </Typography>
                <Fab
                    color="secondary"
                    onClick={() => handleOpenDialog()}
                    sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                >
                    <Add />
                </Fab>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Stats Cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
                gap: 3,
                mb: 4
            }}>
                <Card sx={{
                    background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                    {getFilteredSales().length}
                                </Typography>
                                <Typography variant="subtitle1">Total de Vendas</Typography>
                            </Box>
                            <Receipt sx={{ fontSize: 48, opacity: 0.7 }} />
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                    {formatCurrency(getTotalRevenue())}
                                </Typography>
                                <Typography variant="subtitle1">Receita Total</Typography>
                            </Box>
                            <AttachMoney sx={{ fontSize: 48, opacity: 0.7 }} />
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
                                    {getFilteredSales().length > 0 ? formatCurrency(getTotalRevenue() / getFilteredSales().length) : 'R$ 0,00'}
                                </Typography>
                                <Typography variant="subtitle1">Ticket Médio</Typography>
                            </Box>
                            <TrendingUp sx={{ fontSize: 48, opacity: 0.7 }} />
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
                                    {sales.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).length}
                                </Typography>
                                <Typography variant="subtitle1">Vendas Hoje</Typography>
                            </Box>
                            <CalendarToday sx={{ fontSize: 48, opacity: 0.7 }} />
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Filters */}
            <Card sx={{ mb: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <CardContent>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr' },
                        gap: 2,
                        alignItems: 'center'
                    }}>
                        <TextField
                            fullWidth
                            placeholder="Buscar por SKU, cliente ou produto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                )
                            }}
                        />

                        <FormControl fullWidth>
                            <InputLabel>Método de Pagamento</InputLabel>
                            <Select
                                value={filterPayment}
                                label="Método de Pagamento"
                                onChange={(e) => setFilterPayment(e.target.value)}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                {paymentMethods.map(method => (
                                    <MenuItem key={method} value={method}>{method}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Período</InputLabel>
                            <Select
                                value={filterPeriod}
                                label="Período"
                                onChange={(e) => setFilterPeriod(e.target.value)}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="today">Hoje</MenuItem>
                                <MenuItem value="week">Última semana</MenuItem>
                                <MenuItem value="month">Este mês</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </CardContent>
            </Card>

            {/* Sales Table */}
            <Card sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <Receipt sx={{ mr: 1 }} />
                        Lista de Vendas
                    </Typography>

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>SKU</TableCell>
                                    <TableCell>Produto</TableCell>
                                    <TableCell>Consignante</TableCell>
                                    <TableCell>Cliente</TableCell>
                                    <TableCell>Valor</TableCell>
                                    <TableCell>Pagamento</TableCell>
                                    <TableCell>Data</TableCell>
                                    <TableCell>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {getFilteredSales().map((sale) => (
                                    <TableRow key={sale.id} hover>
                                        <TableCell>
                                            <Chip label={sale.sku} size="small" color="primary" />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                {sale.item?.title_ig || sale.item?.description || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {sale.item?.consignor_name || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {sale.customer_name || (
                                                <Chip label="Não informado" size="small" variant="outlined" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: 'success.main',
                                                    fontWeight: 'bold',
                                                    fontSize: '1.1rem'
                                                }}
                                            >
                                                {formatCurrency(sale.sale_price)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {sale.payment_method ? (
                                                <Chip
                                                    label={sale.payment_method}
                                                    size="small"
                                                    color="secondary"
                                                />
                                            ) : (
                                                <Chip label="N/A" size="small" variant="outlined" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(sale.date)}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => setViewingSale(sale)}
                                                >
                                                    <Visibility />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="warning"
                                                    onClick={() => handleOpenDialog(sale)}
                                                >
                                                    <Edit />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(sale.id)}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {getFilteredSales().length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            <Typography color="text.secondary" sx={{ py: 4 }}>
                                                Nenhuma venda encontrada
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Add/Edit Sale Dialog */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{
                    background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    color: 'white'
                }}>
                    {editingSale ? 'Editar Venda' : 'Nova Venda'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Autocomplete
                            options={items}
                            getOptionLabel={(item) => `${item.sku} - ${item.title_ig || item.description}`}
                            value={selectedItem}
                            onChange={(_, newValue) => {
                                setSelectedItem(newValue);
                                if (newValue) {
                                    setSalePrice(newValue.list_price?.toString() || '');
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Selecionar Item"
                                    placeholder="Digite o SKU ou descrição..."
                                    required
                                />
                            )}
                            renderOption={(props, item) => (
                                <Box component="li" {...props}>
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                                            {item.sku.slice(-2)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={`${item.sku} - ${item.title_ig || item.description}`}
                                        secondary={`Preço: ${formatCurrency(item.list_price || 0)} | Consignante: ${item.consignor_name || 'N/A'}`}
                                    />
                                </Box>
                            )}
                        />

                        <TextField
                            label="Preço de Venda"
                            type="number"
                            value={salePrice}
                            onChange={(e) => setSalePrice(e.target.value)}
                            required
                            InputProps={{
                                startAdornment: <InputAdornment position="start">R$</InputAdornment>
                            }}
                        />

                        <TextField
                            label="Nome do Cliente"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Nome do cliente (opcional)"
                        />

                        <FormControl fullWidth>
                            <InputLabel>Método de Pagamento</InputLabel>
                            <Select
                                value={paymentMethod}
                                label="Método de Pagamento"
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                {paymentMethods.map(method => (
                                    <MenuItem key={method} value={method}>{method}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Observações"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            multiline
                            rows={3}
                            placeholder="Observações sobre a venda (opcional)"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleCloseDialog}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={!selectedItem || !salePrice}
                    >
                        {editingSale ? 'Atualizar' : 'Registrar Venda'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Sale Dialog */}
            <Dialog
                open={!!viewingSale}
                onClose={() => setViewingSale(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{
                    background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    color: 'white'
                }}>
                    Detalhes da Venda
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {viewingSale && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="h6">
                                Venda #{viewingSale.id}
                            </Typography>
                            <Divider />

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">SKU:</Typography>
                                <Chip label={viewingSale.sku} size="small" color="primary" />
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Produto:</Typography>
                                <Typography variant="body1">
                                    {viewingSale.item?.title_ig || viewingSale.item?.description || 'N/A'}
                                </Typography>
                            </Box>

                            {/* Fotos do Produto */}
                            {viewingSale.item?.photos && viewingSale.item.photos.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                        Fotos do Produto:
                                    </Typography>
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: 'repeat(2, 1fr)',
                                            sm: 'repeat(3, 1fr)',
                                            md: 'repeat(4, 1fr)'
                                        },
                                        gap: 2,
                                        mb: 2
                                    }}>
                                        {getNormalizedPhotosWithUrls(viewingSale.item.photos).map((photo, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    position: 'relative',
                                                    paddingBottom: '100%', // Aspect ratio 1:1
                                                    overflow: 'hidden',
                                                    borderRadius: 2,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        transform: 'scale(1.05)',
                                                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                                                        zIndex: 10
                                                    }
                                                }}
                                                onClick={() => window.open(photo, '_blank')}
                                            >
                                                <Box
                                                    component="img"
                                                    src={photo}
                                                    alt={`Foto ${index + 1} - ${viewingSale.item?.title_ig || viewingSale.sku}`}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        backgroundColor: '#f5f5f5'
                                                    }}
                                                    onError={(e) => {
                                                        console.log('Erro ao carregar imagem:', photo);
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                                {/* Overlay com número da foto */}
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 8,
                                                        right: 8,
                                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                                        color: 'white',
                                                        borderRadius: 1,
                                                        px: 1,
                                                        py: 0.5,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    {index + 1}/{viewingSale.item?.photos?.length || 0}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        Clique nas fotos para visualizar em tamanho completo
                                    </Typography>
                                </Box>
                            )}
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Consignante:</Typography>
                                <Typography variant="body1">
                                    {viewingSale.item?.consignor_name || 'N/A'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Valor da Venda:</Typography>
                                <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold' }}>
                                    {formatCurrency(viewingSale.sale_price)}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Cliente:</Typography>
                                <Typography variant="body1">
                                    {viewingSale.customer_name || 'Não informado'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Método de Pagamento:</Typography>
                                <Typography variant="body1">
                                    {viewingSale.payment_method || 'Não informado'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Data da Venda:</Typography>
                                <Typography variant="body1">
                                    {formatDate(viewingSale.date)}
                                </Typography>
                            </Box>

                            {viewingSale.notes && (
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">Observações:</Typography>
                                    <Typography variant="body1">
                                        {viewingSale.notes}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewingSale(null)}>
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Sales;
