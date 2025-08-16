import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    Paper,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Badge,
    Avatar,
    Skeleton,
    Fab,
    InputAdornment,
    Menu,
    ListItemIcon,
    ListItemText,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    Inventory,
    Search,
    FilterList,
    Visibility,
    Edit,
    Close,
    Add,
    PhotoLibrary,
    ViewColumn,
    Refresh,
    MoreVert,
    Delete,
    Download,
    Upload,
    Settings,
    TrendingUp,
    AttachMoney,
    ShoppingCart,
    LocalOffer,
    Category,
    Star,
    StarBorder,
    GridView,
    TableRows,
} from '@mui/icons-material';
import api from '../services/api';

// Placeholder image for items without photos
const DEFAULT_PLACEHOLDER = 'https://via.placeholder.com/200x200?text=Sem+Foto';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Interfaces simplificadas
interface Item {
    id: number;
    sku: string;
    name: string;
    title_ig?: string;
    brand?: string;
    category?: string;
    subcategory?: string;
    condition: string;
    size?: string;
    color?: string;
    fabric?: string;
    gender?: string;
    fit?: string;
    acquisition_type?: string;
    consignor_id?: string;
    list_price?: number;
    cost?: number;
    price: number; // Mantém para compatibilidade
    status: string;
    location?: string;
    description?: string;
    photos?: string[] | string;
    flaws?: string;
    bust?: number;
    waist?: number;
    length?: number;
    active?: boolean;
    created_at?: string;
    updated_at?: string;
}

const ItemsPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Parse URL parameters
    const searchParams = new URLSearchParams(location.search);
    const urlFilter = searchParams.get('filter');
    const urlAction = searchParams.get('action');
    const urlSearch = searchParams.get('search');
    const urlConsignor = searchParams.get('consignor');

    // Estados básicos
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    // Estados de busca e filtros - initialize from URL params
    const [searchTerm, setSearchTerm] = useState(urlSearch || '');
    const [statusFilter, setStatusFilter] = useState(urlFilter === 'active' ? 'true' : '');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [conditionFilter, setConditionFilter] = useState('');
    const [consignorFilter, setConsignorFilter] = useState(urlConsignor || '');

    // Estados de visualização
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [imageViewerOpen, setImageViewerOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(urlAction === 'add');

    // Menu de ações
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // Carregar itens
    const fetchItems = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/items');
            // Normalize the data to ensure prices are numbers
            const normalizedItems = response.data.map((item: any) => ({
                ...item,
                price: typeof item.price === 'string' ? parseFloat(item.price) || 0 : (item.price || 0)
            }));

            // Debug: log first few items to check data structure
            console.log('Items loaded:', normalizedItems.length);
            if (normalizedItems.length > 0) {
                console.log('Sample item:', normalizedItems[0]);
            }

            setItems(normalizedItems);
        } catch (error) {
            console.error('Erro ao carregar itens:', error);
            setError('Erro ao carregar itens. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    // Helper function to normalize photos
    const normalizePhotos = (photos?: string[] | string): string[] => {
        if (!photos) {
            return [];
        }

        if (typeof photos === 'string') {
            // Handle string photos - could be JSON, comma-separated, base64, or single URL
            try {
                // Try to parse as JSON first (from database)
                const parsed = JSON.parse(photos);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
                // If parsed but not array, treat as single item
                return [String(parsed)];
            } catch {
                // If not JSON, check if it's base64 data
                if (photos.startsWith('data:') ||
                    photos.includes('base64,') ||
                    (photos.length > 100 && /^[A-Za-z0-9+/=]+$/.test(photos))) {
                    return [photos];
                }
                // If not base64, treat as comma-separated or single URL
                return photos.includes(',') ? photos.split(',').map(p => p.trim()) : [photos];
            }
        }

        return Array.isArray(photos) ? photos : [];
    };

    // Helper function to get full image URL
    const getImageUrl = (photoPath: string): string => {
        if (!photoPath) {
            return DEFAULT_PLACEHOLDER;
        }

        // Check if it's already a data URL (base64)
        if (photoPath.startsWith('data:')) {
            return photoPath;
        }

        // Check if it's base64 without data prefix
        if (photoPath.includes('base64,') ||
            (photoPath.length > 100 && /^[A-Za-z0-9+/=]+$/.test(photoPath))) {
            // If it looks like base64 but doesn't have data prefix, add it
            if (!photoPath.startsWith('data:')) {
                return `data:image/jpeg;base64,${photoPath}`;
            }
            return photoPath;
        }

        // Check if it's a full HTTP URL
        if (photoPath.startsWith('http')) {
            return photoPath;
        }

        // Remove leading slash if present and add base URL for file paths
        const cleanPath = photoPath.startsWith('/') ? photoPath.substring(1) : photoPath;
        return `${API_BASE_URL}/${cleanPath}`;
    };

    // Helper function to get normalized photos with full URLs
    const getNormalizedPhotosWithUrls = (photos?: string[] | string): string[] => {
        const normalizedPhotos = normalizePhotos(photos);
        return normalizedPhotos.map(photo => getImageUrl(photo));
    };

    // Helper function to get item display title
    const getItemTitle = (item: Item): string => {
        return item.title_ig || item.name || `Item ${item.sku}` || 'Sem título';
    };

    // Helper function to get item price
    const getItemPrice = (item: Item): number => {
        return item.list_price || item.price || 0;
    };

    // Helper function to get item status for display
    const getItemStatus = (item: Item): string => {
        if (!item.active) {
            return 'arquivado';
        }
        if (item.status) {
            return item.status;
        }
        return 'disponivel';
    };

    // Filtrar itens
    const filteredItems = items.filter(item => {
        // Se o filtro for 'active', mostrar apenas itens ativos
        if (urlFilter === 'active' && !item.active) {
            return false;
        }

        // Caso contrário, excluir apenas itens arquivados (active === false)
        if (!urlFilter && item.active === false) {
            return false;
        }

        const searchFields = [
            getItemTitle(item),
            item.sku,
            item.title_ig,
            item.name,
            item.brand,
            item.category,
            item.description
        ].filter(Boolean).join(' ').toLowerCase();

        const matchesSearch = !searchTerm || searchFields.includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || (statusFilter === 'true' ? item.active : item.status === statusFilter);
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        const matchesCondition = !conditionFilter || item.condition === conditionFilter;

        // Filter by consignor if specified
        const matchesConsignor = !consignorFilter || (item.consignor_id &&
            item.consignor_id.toLowerCase().includes(consignorFilter.toLowerCase()));

        return matchesSearch && matchesStatus && matchesCategory && matchesCondition && matchesConsignor;
    });

    // Handlers
    const handleViewItem = (item: Item) => {
        setSelectedItem(item);
        setViewModalOpen(true);
    };

    const handleImageClick = (photos: string[], index = 0) => {
        if (photos && photos.length > 0) {
            setSelectedItem({ ...selectedItem!, photos });
            setCurrentImageIndex(index);
            setImageViewerOpen(true);
        }
    };

    const handleEditItem = (item: Item) => {
        // For now, just show an alert - you can implement full edit functionality later
        alert(`Editar item: ${getItemTitle(item)} (SKU: ${item.sku})`);
    };

    const handleDeleteItem = (item: Item) => {
        setSelectedItem(item);
        setDeleteModalOpen(true);
    };

    const confirmDeleteItem = async () => {
        if (!selectedItem) {
            return;
        }

        try {
            setLoading(true);
            // Arquivar o item (não deletar) - apenas marcar como inactive
            await fetch(`${API_BASE_URL}/api/v1/items/${selectedItem.sku}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ active: false })
            });

            // Remover da lista local
            setItems(prevItems => prevItems.filter(item => item.sku !== selectedItem.sku));
            setDeleteModalOpen(false);
            setSelectedItem(null);
        } catch (error) {
            console.error('Erro ao arquivar item:', error);
            setError('Erro ao arquivar item');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNewItem = () => {
        // For now, just show an alert - you can implement full add functionality later
        alert('Adicionar novo item - funcionalidade em desenvolvimento');
    };

    // Componente de foto otimizado
    const PhotoDisplay: React.FC<{
        photos?: string[];
        alt: string;
        size?: number;
        onClick?: () => void;
        showBadge?: boolean;
    }> = ({ photos, alt, size = 48, onClick, showBadge = true }) => {
        if (!photos || photos.length === 0) {
            return (
                <Avatar
                    sx={{
                        width: size,
                        height: size,
                        bgcolor: 'grey.200',
                        cursor: onClick ? 'pointer' : 'default'
                    }}
                    onClick={onClick}
                >
                    <PhotoLibrary sx={{ color: 'grey.500' }} />
                </Avatar>
            );
        }

        const photo = (
            <Avatar
                src={photos[0] || DEFAULT_PLACEHOLDER}
                alt={alt}
                sx={{
                    width: size,
                    height: size,
                    cursor: onClick ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    '&:hover': onClick ? {
                        transform: 'scale(1.05)',
                        boxShadow: 2
                    } : {}
                }}
                onClick={onClick}
            >
                <PhotoLibrary />
            </Avatar>
        );

        if (showBadge && photos.length > 1) {
            return (
                <Badge
                    badgeContent={photos.length}
                    color="primary"
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    {photo}
                </Badge>
            );
        }

        return photo;
    };

    // Componente de status
    const StatusChip: React.FC<{ status: string }> = ({ status }) => {
        const getStatusColor = (status: string) => {
            if (!status) {
                return 'default';
            }
            switch (status.toLowerCase()) {
                case 'disponivel': return 'success';
                case 'vendido': return 'error';
                case 'reservado': return 'warning';
                default: return 'default';
            }
        };

        return (
            <Chip
                label={status || 'N/A'}
                size="small"
                color={getStatusColor(status) as any}
                variant="filled"
            />
        );
    };

    // Componente de condição
    const ConditionChip: React.FC<{ condition: string }> = ({ condition }) => {
        const getConditionColor = (condition: string) => {
            if (!condition) {
                return 'default';
            }
            switch (condition.toLowerCase()) {
                case 'novo': return 'success';
                case 'seminovo': return 'warning';
                case 'usado': return 'info';
                default: return 'default';
            }
        };

        return (
            <Chip
                label={condition || 'N/A'}
                size="small"
                color={getConditionColor(condition) as any}
                variant="outlined"
            />
        );
    };

    if (loading && items.length === 0) {
        return (
            <Box sx={{ p: 3 }}>
                <Card>
                    <CardContent>
                        <Stack spacing={2}>
                            <Skeleton variant="rectangular" height={60} />
                            <Skeleton variant="rectangular" height={40} />
                            {Array.from(new Array(5)).map((_, index) => (
                                <Stack key={index} direction="row" spacing={2} alignItems="center">
                                    <Skeleton variant="circular" width={48} height={48} />
                                    <Stack spacing={1} sx={{ flex: 1 }}>
                                        <Skeleton variant="text" width="60%" />
                                        <Skeleton variant="text" width="40%" />
                                    </Stack>
                                    <Skeleton variant="text" width={80} />
                                    <Skeleton variant="text" width={100} />
                                </Stack>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>
            {/* Header moderno */}
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    mb: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: 2
                }}
            >
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    spacing={2}
                >
                    <Box>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                            <Inventory sx={{ mr: 2, fontSize: '1.2em' }} />
                            Inventário
                        </Typography>
                        <Stack direction="row" spacing={3} sx={{ opacity: 0.9 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingUp fontSize="small" />
                                <Typography variant="body2">
                                    {filteredItems.length} itens
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AttachMoney fontSize="small" />
                                <Typography variant="body2">
                                    R$ {filteredItems.reduce((acc, item) => acc + getItemPrice(item), 0).toFixed(2)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ShoppingCart fontSize="small" />
                                <Typography variant="body2">
                                    {filteredItems.filter(item => getItemStatus(item) === 'disponivel').length} disponíveis
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="contained"
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                            }}
                            startIcon={<Add />}
                            onClick={handleAddNewItem}
                        >
                            Novo Item
                        </Button>
                        <Button
                            variant="outlined"
                            sx={{
                                borderColor: 'rgba(255,255,255,0.5)',
                                color: 'white',
                                '&:hover': { borderColor: 'rgba(255,255,255,0.8)' }
                            }}
                            startIcon={<Upload />}
                        >
                            Importar
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Filtros modernos */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                            <TextField
                                placeholder="Buscar por título, SKU, marca..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{ flex: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                                size="small"
                            />

                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    label="Status"
                                >
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="disponivel">Disponível</MenuItem>
                                    <MenuItem value="vendido">Vendido</MenuItem>
                                    <MenuItem value="reservado">Reservado</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Condição</InputLabel>
                                <Select
                                    value={conditionFilter}
                                    onChange={(e) => setConditionFilter(e.target.value)}
                                    label="Condição"
                                >
                                    <MenuItem value="">Todas</MenuItem>
                                    <MenuItem value="novo">Novo</MenuItem>
                                    <MenuItem value="seminovo">Semi-novo</MenuItem>
                                    <MenuItem value="usado">Usado</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                Mostrando {filteredItems.length} de {items.length} itens
                            </Typography>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <Tooltip title="Atualizar">
                                    <IconButton onClick={fetchItems} disabled={loading}>
                                        <Refresh />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title={viewMode === 'table' ? 'Visualização em cards' : 'Visualização em tabela'}>
                                    <IconButton
                                        onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                                        color={viewMode === 'cards' ? 'primary' : 'default'}
                                    >
                                        {viewMode === 'table' ? <GridView /> : <TableRows />}
                                    </IconButton>
                                </Tooltip>

                                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                                    <MoreVert />
                                </IconButton>

                                <Menu
                                    anchorEl={anchorEl}
                                    open={Boolean(anchorEl)}
                                    onClose={() => setAnchorEl(null)}
                                >
                                    <MenuItem>
                                        <ListItemIcon><Download /></ListItemIcon>
                                        <ListItemText>Exportar</ListItemText>
                                    </MenuItem>
                                    <MenuItem>
                                        <ListItemIcon><Settings /></ListItemIcon>
                                        <ListItemText>Configurações</ListItemText>
                                    </MenuItem>
                                </Menu>
                            </Stack>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>            {/* Conteúdo Principal */}
            {viewMode === 'table' ? (
                <Card>
                    <TableContainer>
                        <Table sx={{ minWidth: 650 }}>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell width={60}>Foto</TableCell>
                                    <TableCell>Produto</TableCell>
                                    <TableCell width={100}>Condição</TableCell>
                                    <TableCell width={120} align="right">Preço</TableCell>
                                    <TableCell width={120} align="center">Ações</TableCell>
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
                                                '&:hover': { bgcolor: 'action.hover' },
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <TableCell onClick={() => handleViewItem(item)}>
                                                <PhotoDisplay
                                                    photos={getNormalizedPhotosWithUrls(item.photos)}
                                                    alt={getItemTitle(item)}
                                                    onClick={() => handleImageClick(getNormalizedPhotosWithUrls(item.photos))}
                                                />
                                            </TableCell>

                                            <TableCell onClick={() => handleViewItem(item)}>
                                                <Box>
                                                    <Typography variant="body1" fontWeight="medium" sx={{ mb: 0.5 }}>
                                                        {getItemTitle(item)}
                                                    </Typography>
                                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                                        {item.brand && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {item.brand}
                                                            </Typography>
                                                        )}
                                                        <Typography variant="caption" color="text.secondary">
                                                            SKU: {item.sku}
                                                        </Typography>
                                                        {item.category && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                • {item.category}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </Box>
                                            </TableCell>

                                            <TableCell>
                                                <ConditionChip condition={item.condition} />
                                            </TableCell>

                                            <TableCell align="right">
                                                <Typography variant="body1" fontWeight="bold" color="primary">
                                                    R$ {getItemPrice(item).toFixed(2)}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="center">
                                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    <Tooltip title="Visualizar">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewItem(item);
                                                            }}
                                                        >
                                                            <Visibility fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Editar">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditItem(item);
                                                            }}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Arquivar">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteItem(item);
                                                            }}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
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
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(event) => {
                            setRowsPerPage(parseInt(event.target.value, 10));
                            setPage(0);
                        }}
                        labelRowsPerPage="Itens por página:"
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}-${to} de ${count !== -1 ? count : `mais que ${to}`}`
                        }
                    />
                </Card>
            ) : (
                // Vista em Cards
                <Box sx={{ mb: 3 }}>
                    <Stack
                        direction="row"
                        spacing={3}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, 1fr)',
                                md: 'repeat(3, 1fr)',
                                lg: 'repeat(4, 1fr)'
                            },
                            gap: 3
                        }}
                    >
                        {filteredItems
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((item) => (
                                <Card
                                    key={item.sku}
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 4
                                        }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            height: 200,
                                            overflow: 'hidden',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => handleImageClick(getNormalizedPhotosWithUrls(item.photos))}
                                    >
                                        {getNormalizedPhotosWithUrls(item.photos).length > 0 ? (
                                            <Box
                                                component="img"
                                                src={getNormalizedPhotosWithUrls(item.photos)[0] || DEFAULT_PLACEHOLDER}
                                                alt={getItemTitle(item)}
                                                sx={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    transition: 'transform 0.2s',
                                                    '&:hover': { transform: 'scale(1.05)' }
                                                }}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    if (target.parentElement) {
                                                        target.parentElement.innerHTML = `
                                                            <div style="
                                                                width: 100%; 
                                                                height: 100%; 
                                                                background: #f5f5f5; 
                                                                display: flex; 
                                                                align-items: center; 
                                                                justify-content: center;
                                                                flex-direction: column;
                                                            ">
                                                                <svg width="48" height="48" fill="#ccc" viewBox="0 0 24 24">
                                                                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                                                                </svg>
                                                                <span style="color: #999; font-size: 12px; margin-top: 8px;">Sem foto</span>
                                                            </div>
                                                        `;
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <Box
                                                sx={{
                                                    width: '100%',
                                                    height: '100%',
                                                    bgcolor: 'grey.100',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'grey.400'
                                                }}
                                            >
                                                <PhotoLibrary sx={{ fontSize: 48, mb: 1 }} />
                                                <Typography variant="caption">Sem foto</Typography>
                                            </Box>
                                        )}

                                        {getNormalizedPhotosWithUrls(item.photos).length > 1 && (
                                            <Badge
                                                badgeContent={getNormalizedPhotosWithUrls(item.photos).length}
                                                color="primary"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8
                                                }}
                                            />
                                        )}

                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                left: 8
                                            }}
                                        >
                                            <StatusChip status={item.status} />
                                        </Box>
                                    </Box>

                                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <Typography
                                            variant="h6"
                                            noWrap
                                            sx={{ mb: 1, fontWeight: 'bold' }}
                                            title={getItemTitle(item)}
                                        >
                                            {getItemTitle(item)}
                                        </Typography>

                                        <Stack spacing={1} sx={{ mb: 2 }}>
                                            {item.brand && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {item.brand}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" color="text.secondary">
                                                SKU: {item.sku} {item.category && ` • ${item.category}`}
                                            </Typography>
                                        </Stack>

                                        <Box sx={{ mb: 2 }}>
                                            <ConditionChip condition={item.condition} />
                                        </Box>

                                        <Box sx={{ mt: 'auto' }}>
                                            <Typography variant="h6" color="primary" fontWeight="bold" sx={{ mb: 2 }}>
                                                R$ {getItemPrice(item).toFixed(2)}
                                            </Typography>

                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<Visibility />}
                                                    onClick={() => handleViewItem(item)}
                                                    sx={{ flex: 1 }}
                                                >
                                                    Ver
                                                </Button>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleEditItem(item)}
                                                >
                                                    <Edit />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteItem(item)}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </Stack>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                    </Stack>

                    {/* Paginação para Cards */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <TablePagination
                            rowsPerPageOptions={[8, 16, 32]}
                            component="div"
                            count={filteredItems.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={(_, newPage) => setPage(newPage)}
                            onRowsPerPageChange={(event) => {
                                setRowsPerPage(parseInt(event.target.value, 10));
                                setPage(0);
                            }}
                            labelRowsPerPage="Cards por página:"
                            labelDisplayedRows={({ from, to, count }) =>
                                `${from}-${to} de ${count !== -1 ? count : `mais que ${to}`}`
                            }
                        />
                    </Box>
                </Box>
            )}

            {/* Modal de Visualização Moderno */}
            <Dialog
                open={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                    }
                }}
            >
                {selectedItem && (
                    <>
                        <DialogTitle>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                    <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                                        {getItemTitle(selectedItem)}
                                    </Typography>
                                    <Typography variant="subtitle1" color="text.secondary">
                                        SKU: {selectedItem.sku} • {selectedItem.brand} • {selectedItem.category}
                                    </Typography>
                                </Box>
                                <IconButton
                                    onClick={() => setViewModalOpen(false)}
                                    sx={{
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                                    }}
                                >
                                    <Close />
                                </IconButton>
                            </Stack>
                        </DialogTitle>

                        <DialogContent dividers sx={{ bgcolor: 'transparent' }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                                {/* Galeria de Fotos */}
                                <Box sx={{ flex: 1 }}>
                                    <Paper
                                        elevation={4}
                                        sx={{
                                            p: 3,
                                            borderRadius: 2,
                                            background: 'white'
                                        }}
                                    >
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <PhotoLibrary sx={{ mr: 1, color: 'primary.main' }} />
                                            Fotos do Produto
                                        </Typography>

                                        {selectedItem && getNormalizedPhotosWithUrls(selectedItem.photos).length > 0 ? (
                                            <Box>
                                                <Box
                                                    component="img"
                                                    src={getNormalizedPhotosWithUrls(selectedItem.photos)[0] || DEFAULT_PLACEHOLDER}
                                                    alt="Foto principal"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        if (target.parentElement) {
                                                            target.parentElement.innerHTML = `
                                                                <div style="
                                                                    width: 100%; 
                                                                    height: 250px; 
                                                                    background: #f5f5f5; 
                                                                    display: flex; 
                                                                    align-items: center; 
                                                                    justify-content: center;
                                                                    border-radius: 8px;
                                                                    flex-direction: column;
                                                                ">
                                                                    <svg width="48" height="48" fill="#ccc" viewBox="0 0 24 24">
                                                                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                                                                    </svg>
                                                                    <span style="color: #999; font-size: 14px; margin-top: 8px;">Foto não disponível</span>
                                                                </div>
                                                            `;
                                                        }
                                                    }}
                                                    sx={{
                                                        width: '100%',
                                                        height: 250,
                                                        objectFit: 'cover',
                                                        borderRadius: 2,
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.2s',
                                                        '&:hover': { transform: 'scale(1.02)' }
                                                    }}
                                                    onClick={() => handleImageClick(normalizePhotos(selectedItem.photos), 0)}
                                                />

                                                {getNormalizedPhotosWithUrls(selectedItem.photos).length > 1 && (
                                                    <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
                                                        {getNormalizedPhotosWithUrls(selectedItem.photos).slice(1, 5).map((photo: string, index: number) => (
                                                            <Box
                                                                key={index + 1}
                                                                component="img"
                                                                src={photo}
                                                                alt={`Foto ${index + 2}`}
                                                                sx={{
                                                                    width: 60,
                                                                    height: 60,
                                                                    objectFit: 'cover',
                                                                    borderRadius: 1,
                                                                    cursor: 'pointer',
                                                                    border: '2px solid transparent',
                                                                    '&:hover': { borderColor: 'primary.main' },
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onClick={() => handleImageClick(getNormalizedPhotosWithUrls(selectedItem.photos), index + 1)}
                                                            />
                                                        ))}
                                                        {getNormalizedPhotosWithUrls(selectedItem.photos).length > 5 && (
                                                            <Box
                                                                sx={{
                                                                    width: 60,
                                                                    height: 60,
                                                                    bgcolor: 'grey.200',
                                                                    borderRadius: 1,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    cursor: 'pointer',
                                                                    '&:hover': { bgcolor: 'grey.300' }
                                                                }}
                                                                onClick={() => handleImageClick(getNormalizedPhotosWithUrls(selectedItem.photos), 0)}
                                                            >
                                                                <Typography variant="caption" fontWeight="bold">
                                                                    +{getNormalizedPhotosWithUrls(selectedItem.photos).length - 5}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Stack>
                                                )}
                                            </Box>
                                        ) : (
                                            <Box
                                                sx={{
                                                    height: 250,
                                                    bgcolor: 'grey.100',
                                                    borderRadius: 2,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '2px dashed',
                                                    borderColor: 'grey.300'
                                                }}
                                            >
                                                <PhotoLibrary sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                                                <Typography color="text.secondary">
                                                    Nenhuma foto disponível
                                                </Typography>
                                            </Box>
                                        )}
                                    </Paper>
                                </Box>

                                {/* Informações do Produto */}
                                <Box sx={{ flex: 1 }}>
                                    <Stack spacing={3}>
                                        {/* Informações Principais */}
                                        <Paper
                                            elevation={4}
                                            sx={{
                                                p: 3,
                                                borderRadius: 2,
                                                background: 'white'
                                            }}
                                        >
                                            <Typography variant="h6" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                                                <Inventory sx={{ mr: 1, color: 'primary.main' }} />
                                                Informações do Produto
                                            </Typography>

                                            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                                                <Box sx={{ flex: 1, textAlign: 'center' }}>
                                                    <Typography variant="h4" color="primary" fontWeight="bold">
                                                        R$ {getItemPrice(selectedItem).toFixed(2)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Preço de Venda
                                                    </Typography>
                                                </Box>
                                                <Divider orientation="vertical" flexItem />
                                                <Box sx={{ flex: 1, textAlign: 'center' }}>
                                                    <StatusChip status={selectedItem.status} />
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                                        Status Atual
                                                    </Typography>
                                                </Box>
                                                <Divider orientation="vertical" flexItem />
                                                <Box sx={{ flex: 1, textAlign: 'center' }}>
                                                    <Typography variant="h6" fontWeight="bold">
                                                        {selectedItem.sku}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        SKU
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            <Divider sx={{ my: 2 }} />

                                            <Stack spacing={2}>
                                                {/* Linha 1 */}
                                                <Stack direction="row" spacing={3}>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography color="text.secondary" variant="body2">Condição:</Typography>
                                                        <ConditionChip condition={selectedItem.condition} />
                                                    </Box>
                                                    {selectedItem.category && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Categoria:</Typography>
                                                            <Typography fontWeight="medium">{selectedItem.category}</Typography>
                                                        </Box>
                                                    )}
                                                    {selectedItem.brand && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Marca:</Typography>
                                                            <Typography fontWeight="medium">{selectedItem.brand}</Typography>
                                                        </Box>
                                                    )}
                                                </Stack>

                                                {/* Linha 2 */}
                                                <Stack direction="row" spacing={3}>
                                                    {selectedItem.size && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Tamanho:</Typography>
                                                            <Typography fontWeight="medium">{selectedItem.size}</Typography>
                                                        </Box>
                                                    )}
                                                    {selectedItem.color && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Cor:</Typography>
                                                            <Typography fontWeight="medium">{selectedItem.color}</Typography>
                                                        </Box>
                                                    )}
                                                    {selectedItem.location && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Localização:</Typography>
                                                            <Typography fontWeight="medium">{selectedItem.location}</Typography>
                                                        </Box>
                                                    )}
                                                </Stack>

                                                {/* Linha 3 - Campos dinâmicos do banco */}
                                                <Stack direction="row" spacing={3}>
                                                    {(selectedItem as any).subcategory && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Subcategoria:</Typography>
                                                            <Typography fontWeight="medium">{(selectedItem as any).subcategory}</Typography>
                                                        </Box>
                                                    )}
                                                    {(selectedItem as any).gender && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Gênero:</Typography>
                                                            <Typography fontWeight="medium">{(selectedItem as any).gender}</Typography>
                                                        </Box>
                                                    )}
                                                    {(selectedItem as any).fabric && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Tecido:</Typography>
                                                            <Typography fontWeight="medium">{(selectedItem as any).fabric}</Typography>
                                                        </Box>
                                                    )}
                                                </Stack>

                                                {/* Linha 4 - Mais campos */}
                                                <Stack direction="row" spacing={3}>
                                                    {(selectedItem as any).fit && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Modelagem:</Typography>
                                                            <Typography fontWeight="medium">{(selectedItem as any).fit}</Typography>
                                                        </Box>
                                                    )}
                                                    {(selectedItem as any).acquisition_type && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Aquisição:</Typography>
                                                            <Typography fontWeight="medium">{(selectedItem as any).acquisition_type}</Typography>
                                                        </Box>
                                                    )}
                                                    {(selectedItem as any).consignor_id && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Consignante:</Typography>
                                                            <Typography fontWeight="medium">{(selectedItem as any).consignor_id}</Typography>
                                                        </Box>
                                                    )}
                                                </Stack>

                                                {/* Medidas se disponíveis */}
                                                {((selectedItem as any).bust || (selectedItem as any).waist || (selectedItem as any).length) && (
                                                    <>
                                                        <Divider sx={{ my: 1 }} />
                                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                                            Medidas (cm):
                                                        </Typography>
                                                        <Stack direction="row" spacing={3}>
                                                            {(selectedItem as any).bust && (
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Typography color="text.secondary" variant="body2">Busto:</Typography>
                                                                    <Typography fontWeight="medium">{(selectedItem as any).bust} cm</Typography>
                                                                </Box>
                                                            )}
                                                            {(selectedItem as any).waist && (
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Typography color="text.secondary" variant="body2">Cintura:</Typography>
                                                                    <Typography fontWeight="medium">{(selectedItem as any).waist} cm</Typography>
                                                                </Box>
                                                            )}
                                                            {(selectedItem as any).length && (
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Typography color="text.secondary" variant="body2">Comprimento:</Typography>
                                                                    <Typography fontWeight="medium">{(selectedItem as any).length} cm</Typography>
                                                                </Box>
                                                            )}
                                                        </Stack>
                                                    </>
                                                )}

                                                {/* Defeitos se disponíveis */}
                                                {(selectedItem as any).flaws && (
                                                    <>
                                                        <Divider sx={{ my: 1 }} />
                                                        <Box>
                                                            <Typography color="text.secondary" variant="body2">Defeitos:</Typography>
                                                            <Typography fontWeight="medium" color="warning.main">
                                                                {(selectedItem as any).flaws}
                                                            </Typography>
                                                        </Box>
                                                    </>
                                                )}
                                            </Stack>
                                        </Paper>

                                        {/* Descrição e Notas */}
                                        <Paper
                                            elevation={4}
                                            sx={{
                                                p: 3,
                                                borderRadius: 2,
                                                background: 'white'
                                            }}
                                        >
                                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                <Edit sx={{ mr: 1, color: 'primary.main' }} />
                                                Descrições e Observações
                                            </Typography>

                                            <Stack spacing={2}>
                                                {selectedItem.description && (
                                                    <Box>
                                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                            Descrição:
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ lineHeight: 1.6, bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                                                            {selectedItem.description}
                                                        </Typography>
                                                    </Box>
                                                )}

                                                {(selectedItem as any).notes && (
                                                    <Box>
                                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                            Observações:
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ lineHeight: 1.6, bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                                                            {(selectedItem as any).notes}
                                                        </Typography>
                                                    </Box>
                                                )}

                                                {(selectedItem as any).tags && (
                                                    <Box>
                                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                            Tags:
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ lineHeight: 1.6, bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                                                            {(selectedItem as any).tags}
                                                        </Typography>
                                                    </Box>
                                                )}

                                                {/* Datas importantes */}
                                                <Divider />
                                                <Stack direction="row" spacing={3}>
                                                    {(selectedItem as any).created_at && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Cadastrado em:</Typography>
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {new Date((selectedItem as any).created_at).toLocaleDateString('pt-BR')}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {(selectedItem as any).listed_at && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Listado em:</Typography>
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {new Date((selectedItem as any).listed_at).toLocaleDateString('pt-BR')}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {(selectedItem as any).sold_at && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography color="text.secondary" variant="body2">Vendido em:</Typography>
                                                            <Typography variant="body2" fontWeight="medium" color="success.main">
                                                                {new Date((selectedItem as any).sold_at).toLocaleDateString('pt-BR')}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    </Stack>
                                </Box>
                            </Stack>
                        </DialogContent>

                        <DialogActions sx={{ p: 3 }}>
                            <Button onClick={() => setViewModalOpen(false)} variant="outlined">
                                Fechar
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<Edit />}
                                onClick={() => selectedItem && handleEditItem(selectedItem)}
                            >
                                Editar Item
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Visualizador de Imagens */}
            <Dialog
                open={imageViewerOpen}
                onClose={() => setImageViewerOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: { bgcolor: 'black', color: 'white' }
                }}
            >
                <DialogTitle sx={{ bgcolor: 'rgba(0,0,0,0.8)' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography color="white">
                            Foto {currentImageIndex + 1} de {selectedItem ? getNormalizedPhotosWithUrls(selectedItem.photos).length : 0}
                        </Typography>
                        <IconButton onClick={() => setImageViewerOpen(false)} sx={{ color: 'white' }}>
                            <Close />
                        </IconButton>
                    </Stack>
                </DialogTitle>

                <DialogContent sx={{ bgcolor: 'black', p: 0, textAlign: 'center' }}>
                    {selectedItem && getNormalizedPhotosWithUrls(selectedItem.photos).length > 0 && (
                        <Box sx={{ position: 'relative' }}>
                            <Box
                                component="img"
                                src={getNormalizedPhotosWithUrls(selectedItem.photos)[currentImageIndex] || DEFAULT_PLACEHOLDER}
                                alt={`Foto ${currentImageIndex + 1}`}
                                sx={{
                                    maxWidth: '100%',
                                    maxHeight: '70vh',
                                    objectFit: 'contain'
                                }}
                            />

                            {/* Controles de navegação */}
                            <Stack
                                direction="row"
                                justifyContent="center"
                                spacing={2}
                                sx={{
                                    position: 'absolute',
                                    bottom: 20,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    bgcolor: 'rgba(0,0,0,0.7)',
                                    borderRadius: 2,
                                    p: 1
                                }}
                            >
                                <IconButton
                                    onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                                    disabled={currentImageIndex === 0}
                                    sx={{ color: 'white' }}
                                >
                                    ←
                                </IconButton>
                                <IconButton
                                    onClick={() => setCurrentImageIndex(Math.min(getNormalizedPhotosWithUrls(selectedItem!.photos).length - 1, currentImageIndex + 1))}
                                    disabled={currentImageIndex === getNormalizedPhotosWithUrls(selectedItem!.photos).length - 1}
                                    sx={{ color: 'white' }}
                                >
                                    →
                                </IconButton>
                            </Stack>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Exclusão */}
            <Dialog
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Delete color="error" />
                        <Typography variant="h6">
                            Arquivar Item
                        </Typography>
                    </Stack>
                </DialogTitle>

                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Tem certeza que deseja arquivar este item?
                    </Typography>

                    {selectedItem && (
                        <Box sx={{
                            p: 2,
                            bgcolor: 'grey.50',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200'
                        }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {getItemTitle(selectedItem)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                SKU: {selectedItem.sku}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Preço: R$ {getItemPrice(selectedItem).toFixed(2)}
                            </Typography>
                        </Box>
                    )}

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        <strong>Nota:</strong> O item será arquivado e não aparecerá mais na lista,
                        mas permanecerá no sistema para consultas futuras.
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ p: 3 }}>
                    <Button
                        onClick={() => setDeleteModalOpen(false)}
                        variant="outlined"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={confirmDeleteItem}
                        variant="contained"
                        color="error"
                        startIcon={<Delete />}
                        disabled={loading}
                    >
                        {loading ? 'Arquivando...' : 'Arquivar Item'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* FAB para adicionar novo item */}
            <Fab
                color="primary"
                aria-label="add"
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    boxShadow: 4
                }}
                onClick={handleAddNewItem}
            >
                <Add />
            </Fab>
        </Box>
    );
};

export default ItemsPage;