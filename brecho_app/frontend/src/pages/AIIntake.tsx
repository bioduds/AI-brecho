import React, { useState, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Paper,
    Chip,
    Alert,
    CircularProgress,
    TextField,
    Stack,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
} from '@mui/material';
import {
    PhotoCamera,
    Upload,
    AutoAwesome,
    CheckCircle,
    Warning,
    Edit,
    ExpandMore,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { aiAPI, AIIntakeResponse } from '../services/api';

const AIIntake: React.FC = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiResponse, setAiResponse] = useState<AIIntakeResponse | null>(null);
    const [editableData, setEditableData] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Limit to 6 images
        const files = acceptedFiles.slice(0, 6);
        setSelectedFiles(files);

        // Create previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);

        // Clear previous results
        setAiResponse(null);
        setError(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.webp']
        },
        maxFiles: 6,
        multiple: true,
    });

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix to get just base64
                resolve(result.split(',')[1]);
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleAIAnalysis = async () => {
        if (selectedFiles.length < 2) return;

        setLoading(true);
        setError(null);

        try {
            const base64Images = await Promise.all(
                selectedFiles.map(file => convertToBase64(file))
            );

            const response = await aiAPI.intakeAutoregister(base64Images);
            setAiResponse(response);

            // Inicializar dados editáveis
            setEditableData({
                categoria: response.proposal.cadastro.Categoria || '',
                subcategoria: response.proposal.cadastro.Subcategoria || '',
                marca: response.proposal.cadastro.Marca || '',
                genero: response.proposal.cadastro.Gênero || '',
                tamanho: response.proposal.cadastro.Tamanho || '',
                modelagem: response.proposal.cadastro.Modelagem || '',
                cor: response.proposal.cadastro.Cor || '',
                tecido: response.proposal.cadastro.Tecido || '',
                condicao: response.proposal.cadastro.Condição || '',
                defeitos: response.proposal.cadastro.Defeitos || '',
                tituloIG: response.proposal.cadastro.TituloIG || '',
                tags: response.proposal.cadastro.Tags || '',
                descricaoCompleta: response.proposal.descricao_completa || '',
                relatorioDetalhado: response.proposal.relatorio_detalhado || '',
                valorEstimado: response.proposal.valor_estimado || '',
                precoMin: response.proposal.price.Faixa?.split('–')[0]?.replace('R$', '') || '',
                precoMax: response.proposal.price.Faixa?.split('–')[1]?.replace('R$', '') || '',
                motivoPreco: response.proposal.price.Motivo || ''
            });

        } catch (err) {
            setError('Erro ao analisar imagens com IA');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }; const handleEditChange = (field: string, value: string) => {
        setEditableData((prev: any) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleToggleEdit = () => {
        setIsEditing(!isEditing);
    };

    const handleSaveChanges = () => {
        if (aiResponse && editableData) {
            // Atualizar aiResponse com os dados editados
            const updatedResponse = {
                ...aiResponse,
                proposal: {
                    ...aiResponse.proposal,
                    cadastro: {
                        ...aiResponse.proposal.cadastro,
                        Categoria: editableData.categoria,
                        Subcategoria: editableData.subcategoria,
                        Marca: editableData.marca,
                        Gênero: editableData.genero,
                        Tamanho: editableData.tamanho,
                        Modelagem: editableData.modelagem,
                        Cor: editableData.cor,
                        Tecido: editableData.tecido,
                        Condição: editableData.condicao,
                        Defeitos: editableData.defeitos,
                        TituloIG: editableData.tituloIG,
                        Tags: editableData.tags,
                        DescricaoCompleta: editableData.descricaoCompleta,
                        RelatorioDetalhado: editableData.relatorioDetalhado,
                        ValorEstimado: editableData.valorEstimado,
                    },
                    price: {
                        Faixa: `R$${editableData.precoMin}–R$${editableData.precoMax}`,
                        Motivo: editableData.motivoPreco
                    },
                    descricao_completa: editableData.descricaoCompleta,
                    relatorio_detalhado: editableData.relatorioDetalhado,
                    valor_estimado: editableData.valorEstimado,
                }
            };
            setAiResponse(updatedResponse);
            setIsEditing(false);
        }
    };

    const renderEditableFields = () => {
        if (!editableData || !isEditing) return null;

        const categorias = ['Blusa', 'Vestido', 'Calça', 'Saia', 'Casaco', 'Moletom', 'Tricot', 'Camisa', 'Outros'];
        const condicoes = ['A', 'A-', 'B', 'C'];
        const generos = ['Feminino', 'Masculino', 'Unissex'];
        const tamanhos = ['PP', 'P', 'M', 'G', 'GG', 'XGG', '34', '36', '38', '40', '42', '44', '46'];

        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Editar Dados da IA
                </Typography>

                <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Categoria</InputLabel>
                            <Select
                                value={editableData.categoria}
                                label="Categoria"
                                onChange={(e) => handleEditChange('categoria', e.target.value)}
                            >
                                {categorias.map(cat => (
                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            size="small"
                            label="Subcategoria"
                            value={editableData.subcategoria}
                            onChange={(e) => handleEditChange('subcategoria', e.target.value)}
                        />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Marca"
                            value={editableData.marca}
                            onChange={(e) => handleEditChange('marca', e.target.value)}
                        />

                        <FormControl fullWidth size="small">
                            <InputLabel>Gênero</InputLabel>
                            <Select
                                value={editableData.genero}
                                label="Gênero"
                                onChange={(e) => handleEditChange('genero', e.target.value)}
                            >
                                {generos.map(gen => (
                                    <MenuItem key={gen} value={gen}>{gen}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Tamanho</InputLabel>
                            <Select
                                value={editableData.tamanho}
                                label="Tamanho"
                                onChange={(e) => handleEditChange('tamanho', e.target.value)}
                            >
                                {tamanhos.map(tam => (
                                    <MenuItem key={tam} value={tam}>{tam}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            size="small"
                            label="Cor"
                            value={editableData.cor}
                            onChange={(e) => handleEditChange('cor', e.target.value)}
                        />

                        <FormControl fullWidth size="small">
                            <InputLabel>Condição</InputLabel>
                            <Select
                                value={editableData.condicao}
                                label="Condição"
                                onChange={(e) => handleEditChange('condicao', e.target.value)}
                            >
                                {condicoes.map(cond => (
                                    <MenuItem key={cond} value={cond}>{cond}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    <TextField
                        fullWidth
                        size="small"
                        label="Tecido"
                        value={editableData.tecido}
                        onChange={(e) => handleEditChange('tecido', e.target.value)}
                    />

                    <TextField
                        fullWidth
                        size="small"
                        label="Defeitos"
                        value={editableData.defeitos}
                        onChange={(e) => handleEditChange('defeitos', e.target.value)}
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Preço Mínimo (R$)"
                            type="number"
                            value={editableData.precoMin}
                            onChange={(e) => handleEditChange('precoMin', e.target.value)}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            label="Preço Máximo (R$)"
                            type="number"
                            value={editableData.precoMax}
                            onChange={(e) => handleEditChange('precoMax', e.target.value)}
                        />
                    </Stack>

                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        label="Descrição Completa"
                        value={editableData.descricaoCompleta}
                        onChange={(e) => handleEditChange('descricaoCompleta', e.target.value)}
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        size="small"
                        label="Relatório Detalhado"
                        value={editableData.relatorioDetalhado}
                        onChange={(e) => handleEditChange('relatorioDetalhado', e.target.value)}
                    />
                </Stack>

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        onClick={handleSaveChanges}
                        size="small"
                    >
                        Salvar Alterações
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleToggleEdit}
                        size="small"
                    >
                        Cancelar
                    </Button>
                </Box>
            </Box>
        );
    };

    const handleConfirmIntake = async () => {
        if (!aiResponse) return;

        try {
            const base64Images = await Promise.all(
                selectedFiles.map(file => convertToBase64(file))
            );

            await aiAPI.confirmIntake(
                aiResponse.proposal.sku,
                aiResponse.proposal,
                base64Images
            );

            // Reset form
            setSelectedFiles([]);
            setPreviews([]);
            setAiResponse(null);

            alert('Item cadastrado com sucesso!');
        } catch (err) {
            setError('Erro ao confirmar cadastro');
            console.error(err);
        }
    };

    const renderConditionChip = (condition: string) => {
        const colors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
            'A': 'success',
            'A-': 'warning',
            'B': 'warning',
            'C': 'error',
        };
        return (
            <Chip
                label={`Condição: ${condition}`}
                color={colors[condition] || 'default'}
                size="small"
            />
        );
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesome color="primary" />
                AI Intake - Cadastro Inteligente
            </Typography>

            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                Envie 2-6 fotos dos itens. A IA irá identificar automaticamente a categoria, marca,
                tamanho, condição e sugerir preços. Certifique-se de incluir o QR do consignante nas fotos.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                {/* Upload Area */}
                <Box sx={{ flex: 1 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <PhotoCamera sx={{ mr: 1 }} />
                                Upload de Fotos
                            </Typography>

                            <Paper
                                {...getRootProps()}
                                sx={{
                                    p: 3,
                                    textAlign: 'center',
                                    border: '2px dashed',
                                    borderColor: isDragActive ? 'primary.main' : 'grey.300',
                                    bgcolor: isDragActive ? 'primary.50' : 'background.paper',
                                    cursor: 'pointer',
                                    mb: 2,
                                }}
                            >
                                <input {...getInputProps()} />
                                <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                <Typography variant="h6" gutterBottom>
                                    {isDragActive ? 'Solte as fotos aqui' : 'Arraste fotos ou clique para selecionar'}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Máximo 6 fotos (JPEG, PNG, WebP)
                                </Typography>
                            </Paper>

                            {/* Image Previews */}
                            {previews.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Fotos Selecionadas ({previews.length}/6):
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {previews.map((preview, index) => (
                                            <Box key={index} sx={{ width: 80, height: 80 }}>
                                                <img
                                                    src={preview}
                                                    alt={`Preview ${index + 1}`}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        borderRadius: '4px',
                                                    }}
                                                />
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={handleAIAnalysis}
                                disabled={selectedFiles.length < 2 || loading}
                                sx={{ mt: 2 }}
                                startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesome />}
                            >
                                {loading ? 'Analisando com IA...' : 'Analisar com IA'}
                            </Button>
                        </CardContent>
                    </Card>
                </Box>

                {/* AI Results */}
                <Box sx={{ flex: 1 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Resultado da Análise IA
                            </Typography>

                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            {aiResponse && (
                                <Box>
                                    {/* QR Detection */}
                                    {aiResponse.consignor_id ? (
                                        <Alert severity="success" sx={{ mb: 2 }}>
                                            <CheckCircle sx={{ mr: 1 }} />
                                            QR detectado: Consignante {aiResponse.consignor_id}
                                        </Alert>
                                    ) : (
                                        <Alert severity="warning" sx={{ mb: 2 }}>
                                            <Warning sx={{ mr: 1 }} />
                                            QR não detectado
                                        </Alert>
                                    )}

                                    {/* AI Suggestions */}
                                    <Typography variant="subtitle1" gutterBottom>
                                        Sugestões da IA:
                                    </Typography>

                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="textSecondary">
                                            SKU: <strong>{aiResponse.proposal.sku}</strong>
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                        {aiResponse.proposal.cadastro.Categoria && (
                                            <Chip label={aiResponse.proposal.cadastro.Categoria} color="primary" size="small" />
                                        )}
                                        {aiResponse.proposal.cadastro.Marca && (
                                            <Chip label={aiResponse.proposal.cadastro.Marca} variant="outlined" size="small" />
                                        )}
                                        {aiResponse.proposal.cadastro.Tamanho && (
                                            <Chip label={`Tam: ${aiResponse.proposal.cadastro.Tamanho}`} size="small" />
                                        )}
                                        {aiResponse.proposal.cadastro.Cor && (
                                            <Chip label={aiResponse.proposal.cadastro.Cor} size="small" />
                                        )}
                                        {aiResponse.proposal.cadastro.Condição &&
                                            renderConditionChip(aiResponse.proposal.cadastro.Condição)
                                        }
                                    </Box>

                                    {/* Price Suggestion */}
                                    {aiResponse.proposal.price.Faixa && (
                                        <Alert severity="info" sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2">
                                                Preço Sugerido: {aiResponse.proposal.price.Faixa}
                                            </Typography>
                                            {aiResponse.proposal.price.Motivo && (
                                                <Typography variant="body2">
                                                    {aiResponse.proposal.price.Motivo}
                                                </Typography>
                                            )}
                                        </Alert>
                                    )}

                                    {/* Similar Items */}
                                    {aiResponse.similar_items.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                Itens Similares Encontrados:
                                            </Typography>
                                            {aiResponse.similar_items.slice(0, 3).map((item, index) => (
                                                <Typography key={index} variant="body2" color="textSecondary">
                                                    • {item.id} (similaridade: {(1 - item.distance).toFixed(2)})
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}

                                    {/* Editar dados da IA */}
                                    <Box sx={{ mt: 2, mb: 2 }}>
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            size="medium"
                                            onClick={handleToggleEdit}
                                            fullWidth
                                        >
                                            {isEditing ? 'Cancelar Edição' : 'Editar Dados'}
                                        </Button>
                                    </Box>

                                    {/* Formulário de edição */}
                                    {isEditing && renderEditableFields()}

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        color="success"
                                        size="large"
                                        onClick={handleConfirmIntake}
                                        sx={{ mt: 2 }}
                                        disabled={isEditing}
                                    >
                                        Confirmar e Cadastrar Item
                                    </Button>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
};

export default AIIntake;
