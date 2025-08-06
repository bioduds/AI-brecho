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
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Autocomplete,
} from '@mui/material';
import {
    PhotoCamera,
    Upload,
    AutoAwesome,
    Mic,
    Stop,
    Delete,
    PlayArrow,
    Pause,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { aiAPI, consignorAPI, AIIntakeResponse, Consignor } from '../services/api';

// Constantes para os campos de seleção
const categorias = [
    'Blusa', 'Vestido', 'Calça', 'Saia', 'Casaco', 'Moletom', 'Tricot', 'Camisa',
    'Iluminação', 'Luminária', 'Abajur', 'Decoração', 'Móveis', 'Quadros',
    'Eletrônicos', 'Eletrodomésticos', 'Bolsas', 'Sapatos', 'Cintos', 'Joias', 'Óculos',
    'Livros', 'CDs', 'DVDs', 'Brinquedos', 'Esportes', 'Instrumentos', 'Outros'
];

const generos = ['Feminino', 'Masculino', 'Unissex'];

const tamanhos = [
    'PP', 'P', 'M', 'G', 'GG', 'XGG', '34', '36', '38', '40', '42', '44', '46',
    'Pequeno', 'Médio', 'Grande', 'Extra Grande', 'Único', 'Variado'
];

const condicoes = ['A', 'A-', 'B', 'C'];

const AIIntake: React.FC = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiResponse, setAiResponse] = useState<AIIntakeResponse | null>(null);
    const [editableData, setEditableData] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedConsignor, setSelectedConsignor] = useState<string>('');
    const [dynamicFields, setDynamicFields] = useState<any[]>([]);
    const [dynamicFieldsValues, setDynamicFieldsValues] = useState<Record<string, any>>({});

    // Manual field addition states
    const [showAddField, setShowAddField] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState<'text' | 'select' | 'multiline' | 'number'>('text');
    const [newFieldOptions, setNewFieldOptions] = useState('');

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
        maxFiles: 10,
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
        if (selectedFiles.length < 1) return;

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

            // Inicializar dados editáveis de forma DINÂMICA
            // A IA agora retorna campos personalizados baseados no tipo de item
            const dynamicData: any = {};

            // Processar todos os campos que a IA retornou
            if (response.proposal.cadastro) {
                Object.keys(response.proposal.cadastro).forEach(key => {
                    dynamicData[key] = response.proposal.cadastro[key as keyof typeof response.proposal.cadastro] || '';
                });
            }

            // Processar campos de preço se disponíveis na estrutura antiga
            if (response.proposal.price?.Faixa) {
                const faixa = response.proposal.price.Faixa;
                dynamicData.precoMin = faixa.split('–')[0]?.replace('R$', '').trim() || '';
                dynamicData.precoMax = faixa.split('–')[1]?.replace('R$', '').trim() || '';
                dynamicData.motivoPreco = response.proposal.price.Motivo || '';
            }

            // Se a IA retornou os novos campos de preço estruturados, use esses
            if ((response.proposal.cadastro as any).preco_minimo) {
                dynamicData.preco_minimo = (response.proposal.cadastro as any).preco_minimo;
            }
            if ((response.proposal.cadastro as any).preco_maximo) {
                dynamicData.preco_maximo = (response.proposal.cadastro as any).preco_maximo;
            }
            if ((response.proposal.cadastro as any).preco_sugerido) {
                dynamicData.preco_sugerido = (response.proposal.cadastro as any).preco_sugerido;
            }
            if ((response.proposal.cadastro as any).motivo_preco) {
                dynamicData.motivo_preco = (response.proposal.cadastro as any).motivo_preco;
            }

            setEditableData(dynamicData);            // Abrir edição automaticamente
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
            // NÃO esconder os campos após salvar - manter visíveis para mais edições
            // setIsEditing(false);
        }
    };

    const renderEditableFields = () => {
        if (!editableData || !isEditing) return null;

        // Função para adicionar campo manual
        const handleAddCustomField = () => {
            if (!newFieldName.trim()) return;

            const fieldKey = newFieldName.toLowerCase().replace(/\s+/g, '_');
            setEditableData((prev: any) => ({
                ...prev,
                [fieldKey]: ''
            }));

            // Reset form
            setNewFieldName('');
            setNewFieldType('text');
            setNewFieldOptions('');
            setShowAddField(false);
        };

        // Função para converter camelCase para título
        const camelToTitle = (str: string) => {
            return str
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/_/g, ' ');
        };

        // Função para determinar o tipo de campo baseado na chave
        const getFieldType = (key: string, value: any) => {
            const lowerKey = key.toLowerCase();

            if (lowerKey.includes('categoria')) {
                return {
                    type: 'select',
                    options: categorias
                };
            }
            if (lowerKey.includes('condicao') || lowerKey.includes('condição')) {
                return { type: 'select', options: condicoes };
            }
            if (lowerKey.includes('genero') || lowerKey.includes('gênero')) {
                return { type: 'select', options: generos };
            }
            if (lowerKey.includes('tamanho')) {
                return { type: 'select', options: tamanhos };
            }
            if (lowerKey.includes('descricao') || lowerKey.includes('relatorio') || lowerKey.includes('defeitos') || lowerKey.includes('motivo')) {
                return { type: 'multiline' };
            }
            if (lowerKey.includes('preco') || lowerKey.includes('preço') || lowerKey.includes('valor')) {
                return { type: 'text', inputProps: { type: 'number' } };
            }

            return { type: 'text' };
        };

        // Separar campos obrigatórios dos campos dinâmicos
        const obrigatoriosOrder = ['categoria', 'cor', 'condicao', 'descricao_completa'];
        const precosOrder = ['preco_minimo', 'preco_maximo', 'preco_sugerido'];

        const fieldEntries = Object.entries(editableData);
        const camposObrigatorios = fieldEntries.filter(([key]) =>
            obrigatoriosOrder.some(campo => key.toLowerCase().includes(campo))
        );
        const camposPrecos = fieldEntries.filter(([key]) =>
            precosOrder.some(campo => key.toLowerCase().includes(campo)) ||
            key.toLowerCase().includes('motivo_preco') ||
            key.toLowerCase().includes('precomin') ||
            key.toLowerCase().includes('precomax') ||
            key.toLowerCase().includes('motivopreco')
        );
        const camposDinamicos = fieldEntries.filter(([key]) =>
            !obrigatoriosOrder.some(campo => key.toLowerCase().includes(campo)) &&
            !precosOrder.some(campo => key.toLowerCase().includes(campo)) &&
            !key.toLowerCase().includes('motivo_preco') &&
            !key.toLowerCase().includes('precomin') &&
            !key.toLowerCase().includes('precomax') &&
            !key.toLowerCase().includes('motivopreco')
        );

        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Dados do Item - Verificar e Corrigir
                </Typography>

                {/* Campo de Consignante - SEMPRE primeiro */}
                <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        👤 Consignante (Obrigatório)
                    </Typography>
                    <Autocomplete
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
                                label="Buscar Consignante"
                                placeholder="Digite nome ou ID do consignante"
                                helperText="Este campo é obrigatório para cadastrar o item"
                                required
                                size="small"
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

                <Stack spacing={2}>
                    {/* Campos Obrigatórios */}
                    {camposObrigatorios.length > 0 && (
                        <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                📋 Informações Básicas
                            </Typography>
                            {camposObrigatorios.map(([key, value]) => {
                                const fieldConfig = getFieldType(key, value);
                                const label = camelToTitle(key);

                                if (fieldConfig.type === 'select') {
                                    return (
                                        <FormControl key={key} fullWidth size="small">
                                            <InputLabel>{label}</InputLabel>
                                            <Select
                                                value={String(value || '')}
                                                label={label}
                                                onChange={(e) => handleEditChange(key, e.target.value)}
                                            >
                                                {fieldConfig.options?.map(option => (
                                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    );
                                } else if (fieldConfig.type === 'multiline') {
                                    return (
                                        <TextField
                                            key={key}
                                            fullWidth
                                            multiline
                                            rows={3}
                                            size="small"
                                            label={label}
                                            value={String(value || '')}
                                            onChange={(e) => handleEditChange(key, e.target.value)}
                                        />
                                    );
                                } else {
                                    return (
                                        <TextField
                                            key={key}
                                            fullWidth
                                            size="small"
                                            label={label}
                                            value={String(value || '')}
                                            onChange={(e) => handleEditChange(key, e.target.value)}
                                            {...(fieldConfig.inputProps || {})}
                                        />
                                    );
                                }
                            })}
                        </>
                    )}

                    {/* Campos Dinâmicos */}
                    {camposDinamicos.length > 0 && (
                        <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary', mt: 2 }}>
                                🔧 Características Específicas
                            </Typography>
                            {camposDinamicos.map(([key, value]) => {
                                const fieldConfig = getFieldType(key, value);
                                const label = camelToTitle(key);

                                if (fieldConfig.type === 'select') {
                                    return (
                                        <FormControl key={key} fullWidth size="small">
                                            <InputLabel>{label}</InputLabel>
                                            <Select
                                                value={String(value || '')}
                                                label={label}
                                                onChange={(e) => handleEditChange(key, e.target.value)}
                                            >
                                                {fieldConfig.options?.map(option => (
                                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    );
                                } else if (fieldConfig.type === 'multiline') {
                                    return (
                                        <TextField
                                            key={key}
                                            fullWidth
                                            multiline
                                            rows={3}
                                            size="small"
                                            label={label}
                                            value={String(value || '')}
                                            onChange={(e) => handleEditChange(key, e.target.value)}
                                        />
                                    );
                                } else {
                                    return (
                                        <TextField
                                            key={key}
                                            fullWidth
                                            size="small"
                                            label={label}
                                            value={String(value || '')}
                                            onChange={(e) => handleEditChange(key, e.target.value)}
                                            {...(fieldConfig.inputProps || {})}
                                        />
                                    );
                                }
                            })}
                        </>
                    )}

                    {/* Seção de Adicionar Campo Manual */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        {!showAddField ? (
                            <Button
                                variant="outlined"
                                onClick={() => setShowAddField(true)}
                                size="small"
                                startIcon={<span>➕</span>}
                            >
                                Adicionar Campo Personalizado
                            </Button>
                        ) : (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Adicionar Novo Campo
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="flex-end">
                                    <TextField
                                        size="small"
                                        label="Nome do Campo"
                                        value={newFieldName}
                                        onChange={(e) => setNewFieldName(e.target.value)}
                                        placeholder="Ex: Estilo, Material, Época..."
                                    />
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>Tipo</InputLabel>
                                        <Select
                                            value={newFieldType}
                                            label="Tipo"
                                            onChange={(e) => setNewFieldType(e.target.value as any)}
                                        >
                                            <MenuItem value="text">Texto</MenuItem>
                                            <MenuItem value="number">Número</MenuItem>
                                            <MenuItem value="multiline">Texto Longo</MenuItem>
                                            <MenuItem value="select">Lista de Opções</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Button
                                        variant="contained"
                                        onClick={handleAddCustomField}
                                        size="small"
                                        disabled={!newFieldName.trim()}
                                    >
                                        Adicionar
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => setShowAddField(false)}
                                        size="small"
                                    >
                                        Cancelar
                                    </Button>
                                </Stack>
                            </Box>
                        )}
                    </Box>

                    {/* Campos de Preço - seção destacada */}
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                            💰 Precificação
                        </Typography>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Preço Mínimo (R$)"
                                type="number"
                                value={editableData.preco_minimo || editableData.precoMin || ''}
                                onChange={(e) => {
                                    handleEditChange('preco_minimo', e.target.value);
                                    handleEditChange('precoMin', e.target.value); // backward compatibility
                                }}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                label="Preço Máximo (R$)"
                                type="number"
                                value={editableData.preco_maximo || editableData.precoMax || ''}
                                onChange={(e) => {
                                    handleEditChange('preco_maximo', e.target.value);
                                    handleEditChange('precoMax', e.target.value); // backward compatibility
                                }}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                label="⭐ Preço Sugerido (R$)"
                                type="number"
                                value={editableData.preco_sugerido || ''}
                                onChange={(e) => handleEditChange('preco_sugerido', e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'warning.50' } }}
                            />
                        </Stack>

                        {/* Motivo do preço */}
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            size="small"
                            label="Justificativa da Precificação"
                            value={editableData.motivo_preco || editableData.motivoPreco || ''}
                            onChange={(e) => {
                                handleEditChange('motivo_preco', e.target.value);
                                handleEditChange('motivoPreco', e.target.value); // backward compatibility
                            }}
                            placeholder="Ex: Marca reconhecida, boa qualidade, estado perfeito..."
                        />
                    </Box>
                </Stack>

                {/* Botões de ação */}
                <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
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
                                const dynamicData: any = {};
                                if (aiResponse.proposal.cadastro) {
                                    Object.keys(aiResponse.proposal.cadastro).forEach(key => {
                                        dynamicData[key] = aiResponse.proposal.cadastro[key as keyof typeof aiResponse.proposal.cadastro] || '';
                                    });
                                }
                                setEditableData(dynamicData);
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

    // Load dynamic fields when category changes
    const loadDynamicFields = async (category: string, subcategory?: string, brand?: string) => {
        try {
            const base64Images = await Promise.all(
                selectedFiles.map(file => convertToBase64(file))
            );

            const response = await aiAPI.getDynamicFields(category, subcategory, brand, base64Images);
            if (response.success) {
                setDynamicFields(response.fields || []);
                setDynamicFieldsValues({}); // Reset values
            }
        } catch (error) {
            console.error('Error loading dynamic fields:', error);
            setDynamicFields([]);
        }
    };

    // Handle dynamic field changes
    const handleDynamicFieldChange = (fieldName: string, value: any) => {
        setDynamicFieldsValues(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    // Render dynamic field component
    const renderDynamicField = (field: any, index: number) => {
        const value = dynamicFieldsValues[field.name] || '';

        switch (field.type) {
            case 'select':
                return (
                    <FormControl key={field.name} fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>{field.label}</InputLabel>
                        <Select
                            value={value}
                            label={field.label}
                            onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
                        >
                            {field.options?.map((option: string) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                );

            case 'text':
                return (
                    <TextField
                        key={field.name}
                        fullWidth
                        size="small"
                        label={field.label}
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
                        sx={{ mb: 2 }}
                        required={field.required}
                    />
                );

            case 'number':
                return (
                    <TextField
                        key={field.name}
                        fullWidth
                        size="small"
                        type="number"
                        label={field.label}
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(e) => handleDynamicFieldChange(field.name, parseFloat(e.target.value) || 0)}
                        sx={{ mb: 2 }}
                        required={field.required}
                    />
                );

            default:
                return null;
        }
    };

    // Load dynamic fields when AI response changes
    useEffect(() => {
        if (aiResponse?.proposal?.cadastro?.Categoria) {
            loadDynamicFields(
                aiResponse.proposal.cadastro.Categoria,
                aiResponse.proposal.cadastro.Subcategoria,
                aiResponse.proposal.cadastro.Marca
            );
        }
    }, [aiResponse]);

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

            // Adicionar consignante e campos dinâmicos à proposta
            const proposalWithConsignor = {
                ...aiResponse.proposal,
                consignor_id: selectedConsignor,
                cadastro: {
                    ...aiResponse.proposal.cadastro,
                    ConsignanteId: selectedConsignor,
                    ...dynamicFieldsValues  // Add dynamic fields values
                },
                dynamic_fields: dynamicFieldsValues  // Also store separately for reference
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
                Envie 1-10 fotos dos itens para análise inteligente. A IA identifica automaticamente categoria, marca,
                tamanho, condição e sugere preços. Inclua o QR do consignante nas fotos e use o áudio para fornecer
                informações adicionais sobre tecido, defeitos, história do item ou qualquer detalhe relevante.
            </Typography>

            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: aiResponse ? 'column' : 'row' },
                gap: 3,
                transition: 'all 0.3s ease-in-out'
            }}>
                {/* Upload Area */}
                <Box sx={{
                    flex: 1,
                    display: aiResponse ? 'none' : 'block',
                    transition: 'all 0.3s ease-in-out'
                }}>
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
                                    Máximo 10 fotos (JPEG, PNG, WebP)
                                </Typography>
                            </Paper>

                            {/* Image Previews */}
                            {previews.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Fotos Selecionadas ({previews.length}/10):
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
                                    Grave informações adicionais: tecido, defeitos, história do item, detalhes sobre
                                    o consignante, ou qualquer informação que possa ajudar na análise inteligente.
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
                                disabled={selectedFiles.length < 1 || loading || isRecording}
                                sx={{ mt: 2 }}
                                startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesome />}
                            >
                                {isRecording ? 'Gravação em andamento...' :
                                    loading ? 'Analisando com IA...' : 'Analisar com IA'}
                            </Button>
                        </CardContent>
                    </Card>
                </Box>

                {/* Results Area */}
                <Box sx={{
                    flex: aiResponse ? 1 : 1,
                    width: aiResponse ? '100%' : 'auto',
                    transition: 'all 0.3s ease-in-out'
                }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AutoAwesome color="primary" />
                                Cadastro Inteligente
                                {aiResponse && (
                                    <Chip
                                        label="IA Ativa"
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                    />
                                )}
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

                                    {/* Dynamic Fields Section */}
                                    {dynamicFields.length > 0 && (
                                        <Box sx={{ mt: 3 }}>
                                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <AutoAwesome color="secondary" />
                                                Campos Inteligentes
                                                <Chip
                                                    label={`${dynamicFields.length} campos`}
                                                    size="small"
                                                    color="secondary"
                                                    variant="outlined"
                                                />
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                                Campos adicionais gerados com base na categoria e análise do item
                                            </Typography>

                                            <Box sx={{
                                                display: 'grid',
                                                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                                gap: 2
                                            }}>
                                                {dynamicFields.map((field, index) => renderDynamicField(field, index))}
                                            </Box>
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
