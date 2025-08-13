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
    Paper,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Badge,
    Collapse,
    Switch,
    FormControlLabel,
    Tab,
    Tabs,
    CardMedia,
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
    ExpandMore,
    ViewColumn,
    Refresh,
    Settings,
    DynamicFeed,
    AutoAwesome,
    Label,
    Category,
    Palette,
    Straighten,
    MoreVert,
    Fullscreen,
    GetApp,
    ZoomIn,
    ZoomOut,
    NavigateBefore,
    NavigateNext,
    Delete,
    Save,
    Cancel,
} from '@mui/icons-material';
import api from '../services/api';

// Interfaces
interface DynamicField {
    key: string;
    value: any;
    type: 'text' | 'number' | 'boolean' | 'multiline';
    category: 'basic' | 'physical' | 'commercial' | 'content' | 'dynamic';
    displayName: string;
}

interface ItemWithDynamicFields {
    id: number;
    sku: string;
    name: string;
    brand?: string;
    category?: string;
    subcategory?: string;
    condition: string;
    size?: string;
    color?: string;
    price: number;
    cost_price?: number;
    status: string;
    location?: string;
    description?: string;
    tags?: string;
    photos?: string[];
    consigner_id?: number;
    dynamicFields?: DynamicField[];
}

// Categorias de campos
const FIELD_CATEGORIES = {
    basic: { label: 'Informações Básicas', icon: <Label />, color: '#2196f3' },
    physical: { label: 'Características Físicas', icon: <Straighten />, color: '#ff9800' },
    commercial: { label: 'Informações Comerciais', icon: <Palette />, color: '#4caf50' },
    content: { label: 'Conteúdo e Descrição', icon: <Category />, color: '#9c27b0' },
    dynamic: { label: 'Campos Dinâmicos', icon: <DynamicFeed />, color: '#f44336' }
};

const ItemsPage: React.FC = () => {
    // Estados básicos
    const [items, setItems] = useState<ItemWithDynamicFields[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Estados de filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [conditionFilter, setConditionFilter] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Estados de visualização
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [selectedItem, setSelectedItem] = useState<ItemWithDynamicFields | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [imageViewerOpen, setImageViewerOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Estados de edição
    const [editableItem, setEditableItem] = useState<ItemWithDynamicFields | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldValue, setNewFieldValue] = useState('');

    // Carregar itens
    const fetchItems = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/items');
            const itemsWithDynamic = response.data.map((item: any) => ({
                ...item,
                dynamicFields: extractDynamicFields(item)
            }));
            setItems(itemsWithDynamic);
        } catch (error) {
            console.error('Erro ao carregar itens:', error);
            setError('Erro ao carregar itens');
        } finally {
            setLoading(false);
        }
    };

    // Extrair campos dinâmicos
    const extractDynamicFields = (item: any): DynamicField[] => {
        const staticFields = [
            'id', 'sku', 'name', 'brand', 'category', 'subcategory', 'condition',
            'size', 'color', 'price', 'cost_price', 'status', 'location',
            'description', 'tags', 'photos', 'consigner_id', 'created_at', 'updated_at'
        ];

        const dynamicFields: DynamicField[] = [];

        Object.keys(item).forEach(key => {
            if (!staticFields.includes(key) && item[key] !== null && item[key] !== undefined && item[key] !== '') {
                dynamicFields.push({
                    key,
                    value: item[key],
                    type: getFieldType(item[key], key),
                    category: getFieldCategory(key),
                    displayName: formatFieldName(key)
                });
            }
        });

        return dynamicFields;
    };

    // Determinar tipo do campo
    const getFieldType = (value: any, key: string): 'text' | 'number' | 'boolean' | 'multiline' => {
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'string') {
            if (value.length > 100) return 'multiline';
            if (key.toLowerCase().includes('descricao') || key.toLowerCase().includes('relatorio')) return 'multiline';
        }
        return 'text';
    };

    // Determinar categoria do campo
    const getFieldCategory = (key: string): 'basic' | 'physical' | 'commercial' | 'content' | 'dynamic' => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('nome') || lowerKey.includes('marca') || lowerKey.includes('categoria')) return 'basic';
        if (lowerKey.includes('preco') || lowerKey.includes('valor') || lowerKey.includes('custo')) return 'commercial';
        if (lowerKey.includes('descricao') || lowerKey.includes('titulo') || lowerKey.includes('tag')) return 'content';
        if (lowerKey.includes('tamanho') || lowerKey.includes('cor') || lowerKey.includes('tecido')) return 'physical';
        return 'dynamic';
    };

    // Formatar nome do campo
    const formatFieldName = (key: string) => {
        return key.replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .toLowerCase()
            .replace(/^\w/, c => c.toUpperCase());
    };

    // Filtrar itens
    const filteredItems = items.filter(item => {
        if (searchTerm && !item.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !item.sku?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (statusFilter && item.status !== statusFilter) return false;
        if (categoryFilter && item.category !== categoryFilter) return false;
        if (conditionFilter && item.condition !== conditionFilter) return false;
        return true;
    });

    // Componente de thumbnail de imagem
    const ImageThumbnail: React.FC<{ photos?: string[]; size?: number }> = ({ photos, size = 60 }) => {
        const photoArray = photos || [];
        if (!photoArray.length) {
            return (
                <Box
                    sx={{
                        width: size,
                        height: size,
                        backgroundColor: 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.300'
                    }}
                >
                    <PhotoLibrary sx={{ color: 'grey.500', fontSize: size * 0.4 }} />
                </Box>
            );
        }

        return (
            <Badge
                badgeContent={photoArray.length > 1 ? photoArray.length : null}
                color="primary"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Box
                    component="img"
                    src={photoArray[0]}
                    alt="Item"
                    sx={{
                        width: size,
                        height: size,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.300',
                        cursor: 'pointer',
                        '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: 2
                        },
                        transition: 'all 0.2s'
                    }}
                    onClick={() => {
                        setSelectedItem({ ...selectedItem!, photos: photoArray });
                        setCurrentImageIndex(0);
                        setImageViewerOpen(true);
                    }}
                />
            </Badge>
        );
    };

    useEffect(() => {
        fetchItems();
    }, []);

    // Handlers
    const handleViewItem = (item: ItemWithDynamicFields) => {
        setSelectedItem(item);
        setViewModalOpen(true);
    };

    const handleEditItem = (item: ItemWithDynamicFields) => {
        setEditableItem({ ...item });
        setSelectedItem(item);
        setEditModalOpen(true);
        setTabValue(0);
    };

    const handleAddField = () => {
        if (!editableItem || !newFieldName.trim()) return;

        const newField: DynamicField = {
            key: newFieldName.toLowerCase().replace(/\s+/g, '_'),
            value: newFieldValue,
            type: getFieldType(newFieldValue, newFieldName),
            category: 'dynamic',
            displayName: newFieldName
        };

        setEditableItem({
            ...editableItem,
            dynamicFields: [...(editableItem.dynamicFields || []), newField]
        });

        setNewFieldName('');
        setNewFieldValue('');
    };

    const renderFieldsByCategory = (fields: DynamicField[] = []) => {
        const categorizedFields = fields.reduce((acc, field) => {
            if (!acc[field.category]) acc[field.category] = [];
            acc[field.category].push(field);
            return acc;
        }, {} as Record<string, DynamicField[]>);

        return Object.keys(FIELD_CATEGORIES).map(categoryKey => {
            const categoryFields = categorizedFields[categoryKey as keyof typeof FIELD_CATEGORIES] || [];
            if (categoryFields.length === 0) return null;

            const category = FIELD_CATEGORIES[categoryKey as keyof typeof FIELD_CATEGORIES];

            return (
                <Box key={categoryKey} sx={{ mb: 3 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            color: category.color,
                            mb: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        {category.icon}
                        {category.label}
                    </Typography>
                    <Stack spacing={2}>
                        {categoryFields.map((field, index) => (
                            <Box key={field.key}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    {field.displayName}
                                </Typography>
                                {field.type === 'multiline' ? (
                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {field.value}
                                    </Typography>
                                ) : (
                                    <Typography variant="body1">
                                        {field.type === 'boolean' ? (field.value ? 'Sim' : 'Não') : field.value}
                                    </Typography>
                                )}
                            </Box>
                        ))}
                    </Stack>
                </Box>
            );
        });
    };

    if (loading && items.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                p: 3,
                mb: 3,
                color: 'white'
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                            <Inventory sx={{ mr: 1, fontSize: '1.2em' }} />
                            Gestão de Itens
                        </Typography>
                        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                            Sistema avançado de gestão com campos dinâmicos inteligentes
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                            icon={<DynamicFeed />}
                            label="Campos Dinâmicos"
                            variant="outlined"
                            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                        />
                        <Chip
                            icon={<AutoAwesome />}
                            label="IA Integrada"
                            variant="outlined"
                            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                        />
                    </Stack>
                </Stack>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Filtros */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                            <TextField
                                placeholder="Buscar por nome ou SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />
                                }}
                                sx={{ minWidth: 250 }}
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

                            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={showAdvancedFilters}
                                            onChange={(e) => setShowAdvancedFilters(e.target.checked)}
                                        />
                                    }
                                    label="Filtros Avançados"
                                />
                                <Tooltip title={viewMode === 'table' ? 'Visualização em Grade' : 'Visualização em Tabela'}>
                                    <IconButton onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}>
                                        <ViewColumn />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Atualizar">
                                    <IconButton onClick={fetchItems} disabled={loading}>
                                        <Refresh />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            {/* Conteúdo */}
            {viewMode === 'table' ? (
                <Card>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Foto</TableCell>
                                    <TableCell>SKU</TableCell>
                                    <TableCell>Nome</TableCell>
                                    <TableCell>Categoria</TableCell>
                                    <TableCell>Condição</TableCell>
                                    <TableCell>Preço</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Campos Dinâmicos</TableCell>
                                    <TableCell>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredItems
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((item) => (
                                        <TableRow key={item.sku} hover>
                                            <TableCell>
                                                <ImageThumbnail photos={item.photos} />
                                            </TableCell>
                                            <TableCell>{item.sku}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {item.name}
                                                </Typography>
                                                {item.brand && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.brand}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>{item.category}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={item.condition}
                                                    size="small"
                                                    color={
                                                        item.condition === 'novo' ? 'success' :
                                                            item.condition === 'seminovo' ? 'warning' : 'default'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>R$ {item.price?.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={item.status}
                                                    size="small"
                                                    color={
                                                        item.status === 'disponivel' ? 'success' :
                                                            item.status === 'vendido' ? 'error' : 'warning'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {item.dynamicFields && item.dynamicFields.length > 0 && (
                                                    <Badge badgeContent={item.dynamicFields.length} color="primary">
                                                        <Chip
                                                            icon={<DynamicFeed />}
                                                            label="Campos+"
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1}>
                                                    <Tooltip title="Visualizar">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleViewItem(item)}
                                                        >
                                                            <Visibility />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Editar">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEditItem(item)}
                                                        >
                                                            <Edit />
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
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={filteredItems.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                    />
                </Card>
            ) : (
                // Grid View
                <Stack spacing={3}>
                    {Array.from({ length: Math.ceil(filteredItems.length / 4) }).map((_, rowIndex) => (
                        <Stack key={rowIndex} direction="row" spacing={3} flexWrap="wrap">
                            {filteredItems
                                .slice(rowIndex * 4, (rowIndex + 1) * 4)
                                .map((item) => (
                                    <Card key={item.sku} sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' } }}>
                                        <Box sx={{ position: 'relative' }}>
                                            <CardMedia
                                                component="img"
                                                height="200"
                                                image={item.photos?.[0] || '/api/placeholder/300/200'}
                                                alt={item.name}
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:hover': { transform: 'scale(1.02)' },
                                                    transition: 'transform 0.2s'
                                                }}
                                                onClick={() => handleViewItem(item)}
                                            />
                                            {item.photos && item.photos.length > 1 && (
                                                <Badge
                                                    badgeContent={item.photos.length}
                                                    color="primary"
                                                    sx={{ position: 'absolute', top: 8, right: 8 }}
                                                />
                                            )}
                                        </Box>
                                        <CardContent>
                                            <Typography variant="h6" noWrap>{item.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                SKU: {item.sku}
                                            </Typography>
                                            <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1 }}>
                                                <Chip label={item.condition} size="small" />
                                                <Chip label={item.status} size="small" color="primary" />
                                            </Stack>
                                            <Typography variant="h6" color="primary">
                                                R$ {item.price?.toFixed(2)}
                                            </Typography>
                                            {item.dynamicFields && item.dynamicFields.length > 0 && (
                                                <Chip
                                                    icon={<DynamicFeed />}
                                                    label={`${item.dynamicFields.length} campos+`}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ mt: 1 }}
                                                />
                                            )}
                                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                                <Button
                                                    size="small"
                                                    startIcon={<Visibility />}
                                                    onClick={() => handleViewItem(item)}
                                                >
                                                    Ver
                                                </Button>
                                                <Button
                                                    size="small"
                                                    startIcon={<Edit />}
                                                    onClick={() => handleEditItem(item)}
                                                >
                                                    Editar
                                                </Button>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                ))}
                        </Stack>
                    ))}
                </Stack>
            )}

            {/* Modal de Visualização */}
            <Dialog
                open={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h5">{selectedItem?.name}</Typography>
                        <IconButton onClick={() => setViewModalOpen(false)}>
                            <Close />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedItem && (
                        <Stack spacing={3}>
                            {/* Informações Básicas */}
                            <Stack direction="row" spacing={2} flexWrap="wrap">
                                <Typography><strong>SKU:</strong> {selectedItem.sku}</Typography>
                                <Typography><strong>Marca:</strong> {selectedItem.brand || 'N/A'}</Typography>
                                <Typography><strong>Categoria:</strong> {selectedItem.category || 'N/A'}</Typography>
                            </Stack>

                            {/* Fotos */}
                            {selectedItem.photos && selectedItem.photos.length > 0 && (
                                <Box>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Fotos</Typography>
                                    <Stack direction="row" spacing={2} flexWrap="wrap">
                                        {selectedItem.photos.map((photo, index) => (
                                            <Box
                                                key={index}
                                                component="img"
                                                src={photo}
                                                alt={`Foto ${index + 1}`}
                                                sx={{
                                                    width: 100,
                                                    height: 100,
                                                    objectFit: 'cover',
                                                    borderRadius: 1,
                                                    cursor: 'pointer',
                                                    '&:hover': { transform: 'scale(1.05)' }
                                                }}
                                                onClick={() => {
                                                    setCurrentImageIndex(index);
                                                    setImageViewerOpen(true);
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            {/* Campos Dinâmicos */}
                            {selectedItem.dynamicFields && selectedItem.dynamicFields.length > 0 && (
                                <Box>
                                    <Typography variant="h6" sx={{ mb: 2 }}>
                                        <DynamicFeed sx={{ mr: 1 }} />
                                        Campos Dinâmicos
                                    </Typography>
                                    {renderFieldsByCategory(selectedItem.dynamicFields)}
                                </Box>
                            )}
                        </Stack>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Edição */}
            <Dialog
                open={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h5">Editar Item</Typography>
                        <IconButton onClick={() => setEditModalOpen(false)}>
                            <Close />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                        <Tab label="Informações Básicas" />
                        <Tab label="Campos Dinâmicos" />
                    </Tabs>

                    <Box sx={{ mt: 3 }}>
                        {tabValue === 0 && (
                            <Stack spacing={3}>
                                <TextField
                                    label="Nome"
                                    fullWidth
                                    value={editableItem?.name || ''}
                                    onChange={(e) => setEditableItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                                />
                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        label="SKU"
                                        value={editableItem?.sku || ''}
                                        disabled
                                        sx={{ flex: 1 }}
                                    />
                                    <TextField
                                        label="Preço"
                                        type="number"
                                        value={editableItem?.price || ''}
                                        onChange={(e) => setEditableItem(prev => prev ? { ...prev, price: parseFloat(e.target.value) } : null)}
                                        sx={{ flex: 1 }}
                                    />
                                </Stack>
                            </Stack>
                        )}

                        {tabValue === 1 && editableItem && (
                            <Stack spacing={3}>
                                {/* Adicionar novo campo */}
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2 }}>Adicionar Campo</Typography>
                                        <Stack direction="row" spacing={2}>
                                            <TextField
                                                label="Nome do Campo"
                                                value={newFieldName}
                                                onChange={(e) => setNewFieldName(e.target.value)}
                                                sx={{ flex: 1 }}
                                            />
                                            <TextField
                                                label="Valor"
                                                value={newFieldValue}
                                                onChange={(e) => setNewFieldValue(e.target.value)}
                                                sx={{ flex: 1 }}
                                            />
                                            <Button
                                                variant="contained"
                                                onClick={handleAddField}
                                                startIcon={<Add />}
                                            >
                                                Adicionar
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>

                                {/* Campos existentes */}
                                {renderFieldsByCategory(editableItem.dynamicFields)}
                            </Stack>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditModalOpen(false)} startIcon={<Cancel />}>
                        Cancelar
                    </Button>
                    <Button variant="contained" startIcon={<Save />}>
                        Salvar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Visualizador de Imagens */}
            <Dialog
                open={imageViewerOpen}
                onClose={() => setImageViewerOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography>
                            Foto {currentImageIndex + 1} de {selectedItem?.photos?.length || 0}
                        </Typography>
                        <IconButton onClick={() => setImageViewerOpen(false)}>
                            <Close />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {selectedItem?.photos && (
                        <Box sx={{ textAlign: 'center' }}>
                            <Box
                                component="img"
                                src={selectedItem.photos[currentImageIndex]}
                                alt={`Foto ${currentImageIndex + 1}`}
                                sx={{
                                    maxWidth: '100%',
                                    maxHeight: '70vh',
                                    objectFit: 'contain'
                                }}
                            />
                            <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 2 }}>
                                <IconButton
                                    onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                                    disabled={currentImageIndex === 0}
                                >
                                    <NavigateBefore />
                                </IconButton>
                                <IconButton
                                    onClick={() => setCurrentImageIndex(Math.min(selectedItem.photos!.length - 1, currentImageIndex + 1))}
                                    disabled={currentImageIndex === selectedItem.photos!.length - 1}
                                >
                                    <NavigateNext />
                                </IconButton>
                            </Stack>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default ItemsPage;
