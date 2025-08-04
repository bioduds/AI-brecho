import React, { useState, useCallback, useEffect, useRef } from 'react';
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
    Autocomplete,
    IconButton,
} from '@mui/material';
import {
    PhotoCamera,
    Upload,
    AutoAwesome,
    CheckCircle,
    Warning,
    Edit,
    ExpandMore,
    Mic,
    Stop,
    Delete,
    PlayArrow,
    Pause,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { aiAPI, consignorAPI, AIIntakeResponse, Consignor } from '../services/api';

const AIIntake: React.FC = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiResponse, setAiResponse] = useState<AIIntakeResponse | null>(null);
    const [editableData, setEditableData] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedConsignor, setSelectedConsignor] = useState<string>('');

    // Audio recording states
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Consignor search states
    const [consignors, setConsignors] = useState<Consignor[]>([]);
    const [consignorLoading, setConsignorLoading] = useState(false);
    const [selectedConsignorObj, setSelectedConsignorObj] = useState<Consignor | null>(null); const onDrop = useCallback((acceptedFiles: File[]) => {
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

    // Audio recording functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioURL(url);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            setError('Erro ao iniciar gravação de áudio');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    const clearAudio = () => {
        setAudioBlob(null);
        setAudioURL(null);
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
    };

    // Load consignors for autocomplete
    const loadConsignors = async () => {
        setConsignorLoading(true);
        try {
            const data = await consignorAPI.getAll();
            setConsignors(data);
        } catch (error) {
            console.error('Error loading consignors:', error);
        } finally {
            setConsignorLoading(false);
        }
    };

    useEffect(() => {
        loadConsignors();
    }, []);

    const handleAIAnalysis = async () => {
        if (selectedFiles.length < 2) return;

        setLoading(true);
        setError(null);

        try {
            const base64Images = await Promise.all(
                selectedFiles.map(file => convertToBase64(file))
            );

            // Convert audio to base64 if present
            let audioBase64: string | undefined = undefined;
            if (audioBlob) {
                audioBase64 = await convertToBase64(audioBlob as any);
            }

            const response = await aiAPI.intakeAutoregister(base64Images, audioBase64);
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

            // Abrir edição automaticamente
            setIsEditing(true);

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
                    Dados do Item - Verificar e Corrigir
                </Typography>

                <Stack spacing={2}>
                    {/* Campo de Consignante com Autocomplete */}
                    <Autocomplete
                        fullWidth
                        size="small"
                        options={consignors}
                        getOptionLabel={(option) => `${option.name} (${option.id})`}
                        value={selectedConsignorObj}
                        onChange={(_, newValue) => {
                            setSelectedConsignorObj(newValue);
                            setSelectedConsignor(newValue?.id || '');
                        }}
                        loading={consignorLoading}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Consignante"
                                placeholder="Busque por nome ou ID"
                                helperText="Obrigatório para gerar etiqueta com QR code"
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {consignorLoading ? <CircularProgress size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                    />

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
                        color="primary"
                    >
                        Aplicar Alterações
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            // Reset para dados originais da IA
                            if (aiResponse) {
                                setEditableData({
                                    categoria: aiResponse.proposal.cadastro.Categoria || '',
                                    subcategoria: aiResponse.proposal.cadastro.Subcategoria || '',
                                    marca: aiResponse.proposal.cadastro.Marca || '',
                                    genero: aiResponse.proposal.cadastro.Gênero || '',
                                    tamanho: aiResponse.proposal.cadastro.Tamanho || '',
                                    modelagem: aiResponse.proposal.cadastro.Modelagem || '',
                                    cor: aiResponse.proposal.cadastro.Cor || '',
                                    tecido: aiResponse.proposal.cadastro.Tecido || '',
                                    condicao: aiResponse.proposal.cadastro.Condição || '',
                                    defeitos: aiResponse.proposal.cadastro.Defeitos || '',
                                    tituloIG: aiResponse.proposal.cadastro.TituloIG || '',
                                    tags: aiResponse.proposal.cadastro.Tags || '',
                                    descricaoCompleta: aiResponse.proposal.descricao_completa || '',
                                    relatorioDetalhado: aiResponse.proposal.relatorio_detalhado || '',
                                    valorEstimado: aiResponse.proposal.valor_estimado || '',
                                    precoMin: aiResponse.proposal.price.Faixa?.split('–')[0]?.replace('R$', '') || '',
                                    precoMax: aiResponse.proposal.price.Faixa?.split('–')[1]?.replace('R$', '') || '',
                                    motivoPreco: aiResponse.proposal.price.Motivo || ''
                                });
                            }
                        }}
                        size="small"
                    >
                        Restaurar Original
                    </Button>
                </Box>
            </Box>
        );
    };

    const handleConfirmIntake = async () => {
        if (!aiResponse) return;
        if (!selectedConsignor) {
            setError('ID do consignante é obrigatório para cadastrar o item');
            return;
        }

        try {
            const base64Images = await Promise.all(
                selectedFiles.map(file => convertToBase64(file))
            );

            // Adicionar consignante à proposta
            const proposalWithConsignor = {
                ...aiResponse.proposal,
                consignor_id: selectedConsignor,
                cadastro: {
                    ...aiResponse.proposal.cadastro,
                    ConsignanteId: selectedConsignor
                }
            };

            await aiAPI.confirmIntake(
                aiResponse.proposal.sku,
                proposalWithConsignor,
                base64Images
            );

            // Reset form
            setSelectedFiles([]);
            setPreviews([]);
            setAiResponse(null);
            setEditableData(null);
            setIsEditing(false);
            setSelectedConsignor('');
            setSelectedConsignorObj(null);

            // Reset audio
            clearAudio();

            alert('Item cadastrado com sucesso! Etiqueta com QR code pode ser impressa.');
        } catch (err) {
            setError('Erro ao confirmar cadastro');
            console.error('Erro detalhado:', err);
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

                            {/* Audio Recording Section */}
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Gravação de Áudio (Opcional)
                                </Typography>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                    Grave detalhes sobre o produto em português
                                </Typography>

                                <Stack direction="row" spacing={2} alignItems="center">
                                    {!audioBlob ? (
                                        <Button
                                            variant={isRecording ? "contained" : "outlined"}
                                            color={isRecording ? "secondary" : "primary"}
                                            startIcon={isRecording ? <Stop /> : <Mic />}
                                            onClick={isRecording ? stopRecording : startRecording}
                                        >
                                            {isRecording ? 'Parar Gravação' : 'Gravar Áudio'}
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                variant="outlined"
                                                startIcon={isPlaying ? <Pause /> : <PlayArrow />}
                                                onClick={togglePlayback}
                                            >
                                                {isPlaying ? 'Pausar' : 'Reproduzir'}
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                startIcon={<Delete />}
                                                onClick={clearAudio}
                                            >
                                                Excluir
                                            </Button>
                                            <Typography variant="body2" color="textSecondary">
                                                ✓ Áudio gravado
                                            </Typography>
                                        </>
                                    )}
                                </Stack>

                                {/* Hidden audio element for playback */}
                                {audioURL && (
                                    <audio
                                        ref={audioRef}
                                        src={audioURL}
                                        onEnded={handleAudioEnded}
                                        style={{ display: 'none' }}
                                    />
                                )}
                            </Box>

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

                                    {/* Formulário de edição dos dados */}
                                    {renderEditableFields()}

                                    {/* Seção do Consignante quando não está editando */}
                                    {!isEditing && (
                                        <Box sx={{ mt: 2, mb: 2 }}>
                                            <Typography variant="h6" gutterBottom>
                                                Consignante
                                            </Typography>
                                            {selectedConsignorObj ? (
                                                <Alert severity="success" sx={{ mb: 2 }}>
                                                    <Typography variant="body1">
                                                        <strong>{selectedConsignorObj.name}</strong> (ID: {selectedConsignorObj.id})
                                                    </Typography>
                                                </Alert>
                                            ) : (
                                                <Box sx={{ mb: 2 }}>
                                                    <Autocomplete
                                                        fullWidth
                                                        size="small"
                                                        options={consignors}
                                                        getOptionLabel={(option) => `${option.name} (${option.id})`}
                                                        value={selectedConsignorObj}
                                                        onChange={(_, newValue) => {
                                                            setSelectedConsignorObj(newValue);
                                                            setSelectedConsignor(newValue?.id || '');
                                                        }}
                                                        loading={consignorLoading}
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                label="Selecione o Consignante"
                                                                placeholder="Busque por nome ou ID"
                                                                helperText="Obrigatório para cadastrar o item"
                                                                InputProps={{
                                                                    ...params.InputProps,
                                                                    endAdornment: (
                                                                        <>
                                                                            {consignorLoading ? <CircularProgress size={20} /> : null}
                                                                            {params.InputProps.endAdornment}
                                                                        </>
                                                                    ),
                                                                }}
                                                            />
                                                        )}
                                                    />
                                                </Box>
                                            )}
                                        </Box>
                                    )}

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        color="success"
                                        size="large"
                                        onClick={handleConfirmIntake}
                                        sx={{ mt: 2 }}
                                        disabled={!selectedConsignor}
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
