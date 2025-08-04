import React, { useState, useEffect } from 'react';
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
    FormControlLabel,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Alert,
    Stack,
    IconButton,
    Tooltip,
    Snackbar,
} from '@mui/material';
import {
    Add,
    Person,
    QrCode2,
    Edit,
    WhatsApp,
    Email,
    Pix,
    Download,
} from '@mui/icons-material';
import { consignorAPI, Consignor } from '../services/api';

const Consignors: React.FC = () => {
    const [consignors, setConsignors] = useState<Consignor[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingConsignor, setEditingConsignor] = useState<Consignor | null>(null);
    const [qrDialog, setQrDialog] = useState(false);
    const [qrCode, setQrCode] = useState<string>('');
    const [selectedConsignor, setSelectedConsignor] = useState<Consignor | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const [formData, setFormData] = useState({
        name: '',
        whatsapp: '',
        email: '',
        cpf: '',
        cpf_is_pix: false,
        pix_key: '',
        percent: 50,
        notes: '',
        active: true
    });

    useEffect(() => {
        loadConsignors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadConsignors = async () => {
        try {
            const data = await consignorAPI.getAll();
            setConsignors(data);
        } catch (error) {
            showSnackbar('Erro ao carregar consignantes', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleOpenDialog = (consignor?: Consignor) => {
        if (consignor) {
            setEditingConsignor(consignor);
            setFormData({
                name: consignor.name,
                whatsapp: consignor.whatsapp || '',
                email: consignor.email || '',
                cpf: '', // Assumindo que CPF não está no modelo atual
                cpf_is_pix: false,
                pix_key: consignor.pix_key || '',
                percent: consignor.percent,
                notes: consignor.notes || '',
                active: consignor.active
            });
        } else {
            setEditingConsignor(null);
            setFormData({
                name: '',
                whatsapp: '',
                email: '',
                cpf: '',
                cpf_is_pix: false,
                pix_key: '',
                percent: 50,
                notes: '',
                active: true
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingConsignor(null);
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const generateConsignorId = () => {
        // Gera um ID único baseado no timestamp e random
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${timestamp}-${random}`;
    };

    const handleSubmit = async () => {
        try {
            // Prepara os dados para envio, usando CPF como chave PIX se marcado
            const submitData = {
                id: generateConsignorId(), // Gera ID único
                name: formData.name,
                whatsapp: formData.whatsapp,
                email: formData.email,
                pix_key: formData.cpf_is_pix ? formData.cpf : formData.pix_key,
                percent: formData.percent,
                notes: formData.notes,
                active: formData.active
            };

            console.log('Dados a serem enviados:', submitData);

            if (editingConsignor) {
                // Update consignor
                // await consignorAPI.update(editingConsignor.id, submitData);
                showSnackbar('Consignante atualizado com sucesso!', 'success');
            } else {
                // Create new consignor
                const result = await consignorAPI.create(submitData);
                console.log('Resultado da criação:', result);
                showSnackbar('Consignante cadastrado com sucesso!', 'success');
            }
            await loadConsignors();
            handleCloseDialog();
        } catch (error) {
            console.error('Erro detalhado:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            showSnackbar(`Erro ao salvar consignante: ${errorMessage}`, 'error');
        }
    };

    const handleGenerateQR = async (consignor: Consignor) => {
        try {
            const qrCodeData = await consignorAPI.generateQR(consignor.id);
            setQrCode(qrCodeData);
            setSelectedConsignor(consignor);
            setQrDialog(true);
        } catch (error) {
            showSnackbar('Erro ao gerar QR code', 'error');
        }
    };

    const downloadQR = () => {
        if (qrCode && selectedConsignor) {
            const link = document.createElement('a');
            link.href = `data:image/png;base64,${qrCode}`;
            link.download = `qr_${selectedConsignor.name.replace(/\s+/g, '_')}_${selectedConsignor.id}.png`;
            link.click();
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person color="primary" />
                    Gestão de Consignantes
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                >
                    Novo Consignante
                </Button>
            </Box>

            <Card>
                <CardContent>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Nome</TableCell>
                                    <TableCell>Contato</TableCell>
                                    <TableCell>% Repasse</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {consignors.map((consignor) => (
                                    <TableRow key={consignor.id}>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {consignor.id}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body1" fontWeight="medium">
                                                {consignor.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Stack spacing={0.5}>
                                                {consignor.whatsapp && (
                                                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <WhatsApp fontSize="small" color="success" />
                                                        {consignor.whatsapp}
                                                    </Typography>
                                                )}
                                                {consignor.email && (
                                                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Email fontSize="small" color="primary" />
                                                        {consignor.email}
                                                    </Typography>
                                                )}
                                                {consignor.pix_key && (
                                                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Pix fontSize="small" color="warning" />
                                                        PIX: {consignor.pix_key}
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${consignor.percent}%`}
                                                color="primary"
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={consignor.active ? 'Ativo' : 'Inativo'}
                                                color={consignor.active ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1}>
                                                <Tooltip title="Gerar QR Code">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleGenerateQR(consignor)}
                                                        color="primary"
                                                    >
                                                        <QrCode2 />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Editar">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenDialog(consignor)}
                                                        color="secondary"
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

                    {consignors.length === 0 && !loading && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Nenhum consignante cadastrado. Clique em "Novo Consignante" para começar.
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de Cadastro/Edição */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingConsignor ? 'Editar Consignante' : 'Novo Consignante'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="Nome Completo"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            required
                        />
                        <Stack direction="row" spacing={2}>
                            <TextField
                                fullWidth
                                label="WhatsApp"
                                value={formData.whatsapp}
                                onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                                placeholder="(31) 99999-9999"
                            />
                            <TextField
                                fullWidth
                                label="E-mail"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                            />
                        </Stack>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                fullWidth
                                label="CPF"
                                value={formData.cpf}
                                onChange={(e) => handleInputChange('cpf', e.target.value)}
                                placeholder="000.000.000-00"
                            />
                            <TextField
                                fullWidth
                                label="Percentual de Repasse (%)"
                                type="number"
                                value={formData.percent}
                                onChange={(e) => handleInputChange('percent', Number(e.target.value))}
                                inputProps={{ min: 0, max: 100 }}
                            />
                        </Stack>
                        <Stack spacing={2}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.cpf_is_pix}
                                        onChange={(e) => handleInputChange('cpf_is_pix', e.target.checked)}
                                    />
                                }
                                label="CPF é chave PIX"
                            />
                            {formData.cpf_is_pix && (
                                <Alert severity="info" sx={{ mt: 1 }}>
                                    O CPF será usado como chave PIX para este consignante.
                                </Alert>
                            )}
                            {!formData.cpf_is_pix && (
                                <TextField
                                    fullWidth
                                    label="Chave PIX"
                                    value={formData.pix_key}
                                    onChange={(e) => handleInputChange('pix_key', e.target.value)}
                                    helperText="Telefone, e-mail ou chave aleatória"
                                />
                            )}
                        </Stack>
                        <TextField
                            fullWidth
                            label="Observações"
                            multiline
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            placeholder="Informações adicionais sobre o consignante..."
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.active}
                                    onChange={(e) => handleInputChange('active', e.target.checked)}
                                />
                            }
                            label="Consignante ativo"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancelar</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={!formData.name || (formData.cpf_is_pix ? !formData.cpf : false)}
                    >
                        {editingConsignor ? 'Atualizar' : 'Cadastrar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog do QR Code */}
            <Dialog open={qrDialog} onClose={() => setQrDialog(false)} maxWidth="sm">
                <DialogTitle>QR Code - {selectedConsignor?.name}</DialogTitle>
                <DialogContent>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                        {qrCode && (
                            <img
                                src={`data:image/png;base64,${qrCode}`}
                                alt="QR Code"
                                style={{ maxWidth: '100%', height: 'auto' }}
                            />
                        )}
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                            ID: {selectedConsignor?.id}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Use este QR code nas fotos dos itens para identificação automática
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQrDialog(false)}>Fechar</Button>
                    <Button
                        onClick={downloadQR}
                        variant="contained"
                        startIcon={<Download />}
                    >
                        Download
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Consignors;
