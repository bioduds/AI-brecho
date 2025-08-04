import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Alert,
    CircularProgress,
    Autocomplete,
    Paper,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Divider,
} from '@mui/material';
import {
    Inventory,
    Search,
    FilterList,
    Visibility,
    Edit,
    ShoppingCart,
    CheckCircle,
    Close,
} from '@mui/icons-material';
import { itemAPI, consignorAPI, Item, Consignor } from '../services/api';

const Items: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [consignors, setConsignors] = useState<Consignor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalItems, setTotalItems] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedConsignor, setSelectedConsignor] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Modal states
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [editableItem, setEditableItem] = useState<Item | null>(null);

    const categories = ['Blusa', 'Vestido', 'Calça', 'Saia', 'Casaco', 'Moletom', 'Tricot', 'Camisa', 'Outros'];

    const statusOptions = [
        { value: 'all', label: 'Todos' },
        { value: 'available', label: 'Disponível' },
        { value: 'sold', label: 'Vendido' },
        { value: 'pending', label: 'Pendente' },
    ];

    // Load data
    const loadItems = async () => {
        setLoading(true);
        try {
            const params: any = {
                skip: page * rowsPerPage,
                limit: rowsPerPage,
            };

            if (selectedCategory) params.category = selectedCategory;
            if (selectedConsignor) params.consignor_id = selectedConsignor;
            if (statusFilter !== 'all') {
                if (statusFilter === 'sold') params.active = false;
                else if (statusFilter === 'available') params.active = true;
            }

            const data = await itemAPI.getAll(params);
            setItems(data);
            setTotalItems(data.length); // In a real app, this would come from API
        } catch (err) {
            setError('Erro ao carregar itens');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadConsignors = async () => {
        try {
            const data = await consignorAPI.getAll();
            setConsignors(data);
        } catch (err) {
            console.error('Error loading consignors:', err);
        }
    };

    useEffect(() => {
        loadConsignors();
    }, []);

    useEffect(() => {
        loadItems();
    }, [page, rowsPerPage, selectedCategory, selectedConsignor, statusFilter]);

    // Filter items by search term (client-side)
    const filteredItems = items.filter(item =>
        !searchTerm ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title_ig?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getStatusChip = (item: Item) => {
        if (item.sold_at) {
            return <Chip label="Vendido" color="success" size="small" />;
        }
        if (item.listed_at) {
            return <Chip label="Disponível" color="primary" size="small" />;
        }
        return <Chip label="Pendente" color="warning" size="small" />;
    };

    const getConditionChip = (condition?: string) => {
        if (!condition) return null;

        const colors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
            'A': 'success',
            'A-': 'warning',
            'B': 'warning',
            'C': 'error',
        };

        return (
            <Chip
                label={condition}
                color={colors[condition] || 'default'}
                size="small"
                variant="outlined"
            />
        );
    };

    const formatPrice = (price?: number) => {
        if (!price) return '-';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(price);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getConsignorName = (consignorId?: string) => {
        if (!consignorId) return '-';
        const consignor = consignors.find(c => c.id === consignorId);
        return consignor?.name || consignorId;
    };

    const getFirstPhoto = (photos?: string) => {
        if (!photos) return null;
        const photoList = photos.split(',');
        return photoList[0]?.trim() || null;
    };

    const ItemThumbnail: React.FC<{ item: Item }> = ({ item }) => {
        const firstPhoto = getFirstPhoto(item.photos);
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

        // Build full URL for the image
        const imageUrl = firstPhoto ?
            (firstPhoto.startsWith('http') ? firstPhoto : `${API_BASE_URL}${firstPhoto}`)
            : null;

        return (
            <Box
                sx={{
                    width: 60,
                    height: 60,
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }
                }}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={`Item ${item.sku}`}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                        onError={(e) => {
                            // Fallback to placeholder on error
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement!;
                            parent.innerHTML = `
                                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #999;">
                                    <span style="font-size: 10px; font-weight: bold;">SEM</span>
                                    <span style="font-size: 10px; font-weight: bold;">FOTO</span>
                                </div>
                                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 8px; padding: 2px 4px; text-align: center;">
                                    ${item.sku}
                                </div>
                            `;
                        }}
                    />
                ) : (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                    }}>
                        <Typography variant="caption" color="textSecondary" sx={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            lineHeight: 1
                        }}>
                            SEM<br />FOTO
                        </Typography>
                    </Box>
                )}
                {/* SKU overlay */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        fontSize: '8px',
                        padding: '2px 4px',
                        textAlign: 'center',
                        fontWeight: 'bold'
                    }}
                >
                    {item.sku}
                </Box>
            </Box>
        );
    };

    // Modal functions
    const handleViewItem = (item: Item) => {
        setSelectedItem(item);
        setViewModalOpen(true);
    };

    const handleEditItem = (item: Item) => {
        setEditableItem({ ...item });
        setEditModalOpen(true);
    };

    const handleCloseModals = () => {
        setViewModalOpen(false);
        setEditModalOpen(false);
        setSelectedItem(null);
        setEditableItem(null);
    };

    const handleSaveEdit = async () => {
        if (!editableItem) return;

        try {
            // TODO: Implement item update API
            // await itemAPI.update(editableItem.sku, editableItem);

            // Update the item in the local state
            setItems(prev => prev.map(item =>
                item.sku === editableItem.sku ? editableItem : item
            ));

            handleCloseModals();
            // You can add a success message here
        } catch (err) {
            setError('Erro ao atualizar item');
            console.error(err);
        }
    };

    const handleEditChange = (field: keyof Item, value: any) => {
        if (!editableItem) return;
        setEditableItem(prev => prev ? { ...prev, [field]: value } : null);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inventory color="primary" />
                Gestão de Itens
            </Typography>

            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                Visualize e gerencie todos os itens cadastrados no sistema.
            </Typography>

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FilterList />
                        Filtros
                    </Typography>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Buscar"
                            placeholder="SKU, marca, título..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                        />

                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Categoria</InputLabel>
                            <Select
                                value={selectedCategory}
                                label="Categoria"
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <MenuItem value="">Todas</MenuItem>
                                {categories.map(category => (
                                    <MenuItem key={category} value={category}>
                                        {category}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Autocomplete
                            size="small"
                            sx={{ minWidth: 200 }}
                            options={consignors}
                            getOptionLabel={(option) => option.name}
                            value={consignors.find(c => c.id === selectedConsignor) || null}
                            onChange={(_, newValue) => setSelectedConsignor(newValue?.id || '')}
                            renderInput={(params) => (
                                <TextField {...params} label="Consignante" />
                            )}
                        />

                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                {statusOptions.map(option => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </CardContent>
            </Card>

            {/* Results */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Itens ({filteredItems.length})
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table size="medium">
                                    <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>Foto</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', minWidth: '180px' }}>Título</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>Categoria</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Marca</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>Tamanho</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Condição</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '130px' }}>Consignante</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Preço</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '110px' }}>Cadastrado</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>Ações</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredItems
                                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                            .map((item) => (
                                                <TableRow
                                                    key={item.sku}
                                                    hover
                                                    sx={{
                                                        '&:hover': {
                                                            backgroundColor: '#f5f5f5'
                                                        },
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => handleViewItem(item)}
                                                >
                                                    <TableCell sx={{ padding: 2 }}>
                                                        <ItemThumbnail item={item} />
                                                    </TableCell>
                                                    <TableCell sx={{ padding: 2 }}>
                                                        <Typography variant="body2" sx={{
                                                            fontWeight: 500,
                                                            color: '#1976d2',
                                                            cursor: 'pointer'
                                                        }}>
                                                            {item.summary_title || item.title_ig || `Item ${item.sku}`}
                                                        </Typography>
                                                        <Typography variant="caption" color="textSecondary">
                                                            SKU: {item.sku}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ padding: 2 }}>
                                                        {item.category && (
                                                            <Chip
                                                                label={item.category}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{
                                                                    backgroundColor: '#e3f2fd',
                                                                    borderColor: '#1976d2'
                                                                }}
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ padding: 2 }}>
                                                        <Typography variant="body2">
                                                            {item.brand || '-'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ padding: 2 }}>
                                                        <Typography variant="body2" fontWeight={item.size ? 'medium' : 'normal'}>
                                                            {item.size || '-'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ padding: 2 }}>
                                                        {getConditionChip(item.condition)}
                                                    </TableCell>
                                                    <TableCell sx={{ padding: 2 }}>
                                                        <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                                                            {getConsignorName(item.consignor_id)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ padding: 2 }}>
                                                        <Typography variant="body2" fontWeight="medium" color="primary">
                                                            {formatPrice(item.list_price || item.cost)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ padding: 2 }}>
                                                        {getStatusChip(item)}
                                                    </TableCell>
                                                    <TableCell sx={{ padding: 2 }}>
                                                        <Typography variant="body2" color="textSecondary">
                                                            {formatDate(item.acquired_at)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ padding: 2 }}>
                                                        <Stack direction="row" spacing={0.5}>
                                                            <Tooltip title="Visualizar">
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleViewItem(item);
                                                                    }}
                                                                    sx={{
                                                                        backgroundColor: '#e3f2fd',
                                                                        '&:hover': { backgroundColor: '#bbdefb' }
                                                                    }}
                                                                >
                                                                    <Visibility fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Editar">
                                                                <IconButton
                                                                    size="small"
                                                                    color="secondary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditItem(item);
                                                                    }}
                                                                    sx={{
                                                                        backgroundColor: '#f3e5f5',
                                                                        '&:hover': { backgroundColor: '#e1bee7' }
                                                                    }}
                                                                >
                                                                    <Edit fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            {!item.sold_at && (
                                                                <Tooltip title="Marcar como vendido">
                                                                    <IconButton
                                                                        size="small"
                                                                        color="success"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            // TODO: Implementar função de marcar como vendido
                                                                        }}
                                                                        sx={{
                                                                            backgroundColor: '#e8f5e8',
                                                                            '&:hover': { backgroundColor: '#c8e6c9' }
                                                                        }}
                                                                    >
                                                                        <ShoppingCart fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <TablePagination
                                rowsPerPageOptions={[10, 25, 50, 100]}
                                component="div"
                                count={filteredItems.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                                labelRowsPerPage="Itens por página:"
                                labelDisplayedRows={({ from, to, count }) =>
                                    `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                                }
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Visualização */}
            <Dialog
                open={viewModalOpen}
                onClose={handleCloseModals}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                        Detalhes do Item - {selectedItem?.sku}
                    </Typography>
                    <IconButton onClick={handleCloseModals}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {selectedItem && (
                        <Box>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                                <Box flex={1}>
                                    <Typography variant="h6" gutterBottom>
                                        Informações Básicas
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="subtitle2" color="textSecondary">SKU</Typography>
                                            <Typography variant="body1">{selectedItem.sku}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="textSecondary">Categoria</Typography>
                                            <Typography variant="body1">{selectedItem.category || '-'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="textSecondary">Subcategoria</Typography>
                                            <Typography variant="body1">{selectedItem.subcategory || '-'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="textSecondary">Marca</Typography>
                                            <Typography variant="body1">{selectedItem.brand || '-'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="textSecondary">Gênero</Typography>
                                            <Typography variant="body1">{selectedItem.gender || '-'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="textSecondary">Tamanho</Typography>
                                            <Typography variant="body1">{selectedItem.size || '-'}</Typography>
                                        </Box>
                                    </Stack>
                                </Box>

                                <Box flex={1}>
                                    <Typography variant="h6" gutterBottom>
                                        Detalhes do Produto
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="subtitle2" color="textSecondary">Cor</Typography>
                                            <Typography variant="body1">{selectedItem.color || '-'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="textSecondary">Tecido</Typography>
                                            <Typography variant="body1">{selectedItem.fabric || '-'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="textSecondary">Condição</Typography>
                                            <Typography variant="body1">{getConditionChip(selectedItem.condition)}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="textSecondary">Defeitos</Typography>
                                            <Typography variant="body1">{selectedItem.flaws || 'Nenhum'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                                            <Typography variant="body1">{getStatusChip(selectedItem)}</Typography>
                                        </Box>
                                    </Stack>
                                </Box>
                            </Stack>

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="h6" gutterBottom>
                                Informações Comerciais
                            </Typography>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <Box flex={1}>
                                    <Typography variant="subtitle2" color="textSecondary">Consignante</Typography>
                                    <Typography variant="body1">{getConsignorName(selectedItem.consignor_id)}</Typography>
                                </Box>
                                <Box flex={1}>
                                    <Typography variant="subtitle2" color="textSecondary">Preço de Custo</Typography>
                                    <Typography variant="body1">{formatPrice(selectedItem.cost)}</Typography>
                                </Box>
                                <Box flex={1}>
                                    <Typography variant="subtitle2" color="textSecondary">Preço de Venda</Typography>
                                    <Typography variant="body1">{formatPrice(selectedItem.list_price)}</Typography>
                                </Box>
                            </Stack>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
                                <Box flex={1}>
                                    <Typography variant="subtitle2" color="textSecondary">Data de Aquisição</Typography>
                                    <Typography variant="body1">{formatDate(selectedItem.acquired_at)}</Typography>
                                </Box>
                                <Box flex={1}>
                                    <Typography variant="subtitle2" color="textSecondary">Data de Listagem</Typography>
                                    <Typography variant="body1">{formatDate(selectedItem.listed_at)}</Typography>
                                </Box>
                                <Box flex={1}>
                                    <Typography variant="subtitle2" color="textSecondary">Data de Venda</Typography>
                                    <Typography variant="body1">{formatDate(selectedItem.sold_at)}</Typography>
                                </Box>
                            </Stack>

                            {selectedItem.title_ig && (
                                <>
                                    <Divider sx={{ my: 3 }} />
                                    <Typography variant="h6" gutterBottom>
                                        Título Instagram
                                    </Typography>
                                    <Typography variant="body1">{selectedItem.title_ig}</Typography>
                                </>
                            )}

                            {selectedItem.tags && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="h6" gutterBottom>
                                        Tags
                                    </Typography>
                                    <Typography variant="body1">{selectedItem.tags}</Typography>
                                </>
                            )}

                            {selectedItem.photos && (
                                <>
                                    <Divider sx={{ my: 3 }} />
                                    <Typography variant="h6" gutterBottom>
                                        Fotos do Item
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                            gap: 2
                                        }}
                                    >
                                        {selectedItem.photos.split(',').map((photo, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    position: 'relative',
                                                    paddingBottom: '100%', // Aspecto 1:1
                                                    overflow: 'hidden',
                                                    borderRadius: 1,
                                                    border: '1px solid #e0e0e0',
                                                }}
                                            >
                                                <img
                                                    src={photo.trim()}
                                                    alt={`Foto ${index + 1} do item ${selectedItem.sku}`}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => window.open(photo.trim(), '_blank')}
                                                />
                                            </Box>
                                        ))}
                                    </Box>
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModals}>Fechar</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            handleCloseModals();
                            if (selectedItem) handleEditItem(selectedItem);
                        }}
                    >
                        Editar Item
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Edição */}
            <Dialog
                open={editModalOpen}
                onClose={handleCloseModals}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                        Editar Item - {editableItem?.sku}
                    </Typography>
                    <IconButton onClick={handleCloseModals}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {editableItem && (
                        <Box sx={{ mt: 1 }}>
                            <Stack spacing={3}>
                                <Typography variant="h6" gutterBottom>
                                    Informações Básicas
                                </Typography>

                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Categoria</InputLabel>
                                        <Select
                                            value={editableItem.category || ''}
                                            label="Categoria"
                                            onChange={(e) => handleEditChange('category', e.target.value)}
                                        >
                                            {categories.map(cat => (
                                                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Subcategoria"
                                        value={editableItem.subcategory || ''}
                                        onChange={(e) => handleEditChange('subcategory', e.target.value)}
                                    />
                                </Stack>

                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Marca"
                                        value={editableItem.brand || ''}
                                        onChange={(e) => handleEditChange('brand', e.target.value)}
                                    />
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Gênero</InputLabel>
                                        <Select
                                            value={editableItem.gender || ''}
                                            label="Gênero"
                                            onChange={(e) => handleEditChange('gender', e.target.value)}
                                        >
                                            <MenuItem value="Feminino">Feminino</MenuItem>
                                            <MenuItem value="Masculino">Masculino</MenuItem>
                                            <MenuItem value="Unissex">Unissex</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Stack>

                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Tamanho"
                                        value={editableItem.size || ''}
                                        onChange={(e) => handleEditChange('size', e.target.value)}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Cor"
                                        value={editableItem.color || ''}
                                        onChange={(e) => handleEditChange('color', e.target.value)}
                                    />
                                </Stack>

                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Tecido"
                                        value={editableItem.fabric || ''}
                                        onChange={(e) => handleEditChange('fabric', e.target.value)}
                                    />
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Condição</InputLabel>
                                        <Select
                                            value={editableItem.condition || ''}
                                            label="Condição"
                                            onChange={(e) => handleEditChange('condition', e.target.value)}
                                        >
                                            <MenuItem value="A">A</MenuItem>
                                            <MenuItem value="A-">A-</MenuItem>
                                            <MenuItem value="B">B</MenuItem>
                                            <MenuItem value="C">C</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Stack>

                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Defeitos"
                                    multiline
                                    rows={2}
                                    value={editableItem.flaws || ''}
                                    onChange={(e) => handleEditChange('flaws', e.target.value)}
                                />

                                <Divider />

                                <Typography variant="h6" gutterBottom>
                                    Informações Comerciais
                                </Typography>

                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Preço de Custo (R$)"
                                        type="number"
                                        value={editableItem.cost || ''}
                                        onChange={(e) => handleEditChange('cost', parseFloat(e.target.value) || 0)}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Preço de Venda (R$)"
                                        type="number"
                                        value={editableItem.list_price || ''}
                                        onChange={(e) => handleEditChange('list_price', parseFloat(e.target.value) || 0)}
                                    />
                                </Stack>

                                <Divider />

                                <Typography variant="h6" gutterBottom>
                                    Conteúdo para Redes Sociais
                                </Typography>

                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Título Instagram"
                                    multiline
                                    rows={2}
                                    value={editableItem.title_ig || ''}
                                    onChange={(e) => handleEditChange('title_ig', e.target.value)}
                                />

                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Tags"
                                    value={editableItem.tags || ''}
                                    onChange={(e) => handleEditChange('tags', e.target.value)}
                                    helperText="Tags separadas por vírgula"
                                />

                                {editableItem.photos && (
                                    <>
                                        <Divider />

                                        <Typography variant="h6" gutterBottom>
                                            Fotos do Item
                                        </Typography>

                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                                gap: 1.5
                                            }}
                                        >
                                            {editableItem.photos.split(',').map((photo, index) => (
                                                <Box
                                                    key={index}
                                                    sx={{
                                                        position: 'relative',
                                                        paddingBottom: '100%', // Aspecto 1:1
                                                        overflow: 'hidden',
                                                        borderRadius: 1,
                                                        border: '1px solid #e0e0e0',
                                                    }}
                                                >
                                                    <img
                                                        src={photo.trim()}
                                                        alt={`Foto ${index + 1} do item ${editableItem.sku}`}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => window.open(photo.trim(), '_blank')}
                                                    />
                                                </Box>
                                            ))}
                                        </Box>

                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="URLs das Fotos"
                                            value={editableItem.photos || ''}
                                            onChange={(e) => handleEditChange('photos', e.target.value)}
                                            helperText="URLs separadas por vírgula"
                                            multiline
                                            rows={2}
                                        />
                                    </>
                                )}
                            </Stack>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModals}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveEdit}
                        color="primary"
                    >
                        Salvar Alterações
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Items;
