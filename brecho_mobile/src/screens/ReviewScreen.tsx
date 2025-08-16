import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { APIService } from '../services/api'; type ReviewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Review'>;
type ReviewScreenRouteProp = RouteProp<RootStackParamList, 'Review'>;

interface AIAnalysisResult {
    items: Array<{
        name: string;
        category: string;
        subcategory?: string;
        brand?: string;
        size?: string;
        color?: string;
        condition: string;
        estimatedPrice: number;
        description: string;
        confidence: number;
    }>;
    suggestions: string[];
}

export default function ReviewScreen() {
    const navigation = useNavigation<ReviewScreenNavigationProp>();
    const route = useRoute<ReviewScreenRouteProp>();
    const { photos, audioUri, description } = route.params;

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        // Auto-start analysis when screen loads
        handleAnalyze();
    }, []);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);

        try {
            // Call real AI API - apenas fotos e áudio
            const analysisRequest = {
                photos,
                audioUri: audioUri || undefined,
            };

            const response = await APIService.analyzeItems(analysisRequest);

            if (response.success && response.data) {
                setAnalysisResult(response.data);
            } else {
                Alert.alert(
                    'Erro na Análise da IA',
                    response.error || 'Não foi possível analisar as imagens. Verifique se o servidor de IA está funcionando e tente novamente.',
                    [
                        { text: 'Tentar Novamente', onPress: handleAnalyze },
                        { text: 'Cancelar', style: 'cancel' }
                    ]
                );
            }
        } catch (error) {
            Alert.alert(
                'Erro de Conexão',
                'Não foi possível conectar com o servidor de IA. Verifique sua conexão de internet e se o servidor está rodando.',
                [
                    { text: 'Tentar Novamente', onPress: handleAnalyze },
                    { text: 'Cancelar', style: 'cancel' }
                ]
            );
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSendToSystem = async () => {
        if (!analysisResult) {
            return;
        }

        setIsSending(true);

        try {
            // Send to real API with photos
            const response = await APIService.createItems(analysisResult.items, photos);

            if (response.success) {
                Alert.alert(
                    'Sucesso!',
                    `${analysisResult.items.length} item(ns) adicionado(s) ao estoque com sucesso!`,
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.navigate('Home'),
                        },
                    ]
                );
            } else {
                Alert.alert('Erro', response.error || 'Falha ao enviar para o sistema');
            }
        } catch (error) {
            Alert.alert('Erro', 'Falha ao enviar para o sistema');
        } finally {
            setIsSending(false);
        }
    };

    const handleRetake = () => {
        navigation.navigate('Camera');
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return '#4caf50';
        if (confidence >= 0.6) return '#ff9800';
        return '#f44336';
    };

    const getConfidenceText = (confidence: number) => {
        if (confidence >= 0.8) return 'Alta';
        if (confidence >= 0.6) return 'Média';
        return 'Baixa';
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                {/* Photos Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Fotos Analisadas</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.photosContainer}
                    >
                        {photos.map((uri, index) => (
                            <Image key={index} source={{ uri }} style={styles.photo} />
                        ))}
                    </ScrollView>
                </View>

                {/* Additional Info */}
                {audioUri && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Informações Adicionais</Text>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>🎤 Áudio gravado</Text>
                            <Text style={styles.infoValue}>Descrição em áudio disponível</Text>
                        </View>
                    </View>
                )}

                {/* Analysis Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Análise da IA</Text>

                    {isAnalyzing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#1976d2" />
                            <Text style={styles.loadingText}>Analisando imagens...</Text>
                            <Text style={styles.loadingSubtext}>
                                Nossa IA está identificando e categorizando os itens
                            </Text>
                        </View>
                    ) : analysisResult ? (
                        <View>
                            {/* Items Found */}
                            <View style={styles.itemsContainer}>
                                <Text style={styles.itemsTitle}>
                                    Itens Identificados ({analysisResult.items.length})
                                </Text>

                                {analysisResult.items.map((item, index) => (
                                    <View key={index} style={styles.itemCard}>
                                        <View style={styles.itemHeader}>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <View style={[
                                                styles.confidenceBadge,
                                                { backgroundColor: getConfidenceColor(item.confidence) }
                                            ]}>
                                                <Text style={styles.confidenceText}>
                                                    {getConfidenceText(item.confidence)}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.itemDetails}>
                                            <Text style={styles.itemDetail}>
                                                📂 {item.category} • {item.subcategory}
                                            </Text>
                                            {item.brand && (
                                                <Text style={styles.itemDetail}>🏷️ {item.brand}</Text>
                                            )}
                                            <Text style={styles.itemDetail}>
                                                📏 Tamanho: {item.size} • 🎨 Cor: {item.color}
                                            </Text>
                                            <Text style={styles.itemDetail}>
                                                ⭐ Estado: {item.condition}
                                            </Text>
                                            <Text style={styles.itemPrice}>
                                                💰 Preço estimado: R$ {item.estimatedPrice.toFixed(2)}
                                            </Text>
                                        </View>

                                        <Text style={styles.itemDescription}>{item.description}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Suggestions */}
                            {analysisResult.suggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    <Text style={styles.suggestionsTitle}>💡 Sugestões</Text>
                                    {analysisResult.suggestions.map((suggestion, index) => (
                                        <Text key={index} style={styles.suggestion}>
                                            • {suggestion}
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.noResultsContainer}>
                            <Text style={styles.noResultsTitle}>❌ Nenhum item identificado</Text>
                            <Text style={styles.noResultsMessage}>
                                A análise da IA não conseguiu identificar nenhum item nas fotos enviadas.
                            </Text>

                            <View style={styles.debugInfo}>
                                <Text style={styles.debugTitle}>📊 Dados enviados para análise:</Text>
                                <Text style={styles.debugItem}>📸 Fotos: {photos.length}</Text>
                                {audioUri && <Text style={styles.debugItem}>🎤 Áudio: Sim</Text>}
                            </View>

                            <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyze}>
                                <Text style={styles.analyzeButtonText}>Tentar Analisar Novamente</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                        <Text style={styles.retakeButtonText}>Tirar Novas Fotos</Text>
                    </TouchableOpacity>

                    {analysisResult && (
                        <TouchableOpacity
                            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                            onPress={handleSendToSystem}
                            disabled={isSending}
                        >
                            {isSending ? (
                                <View style={styles.sendingContainer}>
                                    <ActivityIndicator size="small" color="white" />
                                    <Text style={styles.sendButtonText}>Enviando...</Text>
                                </View>
                            ) : (
                                <Text style={styles.sendButtonText}>
                                    Adicionar ao Estoque
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    photosContainer: {
        marginBottom: 10,
    },
    photo: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginRight: 10,
    },
    infoItem: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        color: '#666',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
    },
    loadingSubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 20,
    },
    itemsContainer: {
        marginBottom: 20,
    },
    itemsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    itemCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    confidenceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    confidenceText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    itemDetails: {
        marginBottom: 8,
    },
    itemDetail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1976d2',
        marginTop: 4,
    },
    itemDescription: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    suggestionsContainer: {
        backgroundColor: '#fff3cd',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
    },
    suggestionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#856404',
        marginBottom: 8,
    },
    suggestion: {
        fontSize: 14,
        color: '#856404',
        marginBottom: 4,
    },
    analyzeButton: {
        backgroundColor: '#1976d2',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
    },
    analyzeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    actionsContainer: {
        marginTop: 20,
    },
    retakeButton: {
        backgroundColor: '#6c757d',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    retakeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    sendButton: {
        backgroundColor: '#28a745',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#28a745',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    sendButtonDisabled: {
        opacity: 0.7,
    },
    sendingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sendButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    noResultsContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    noResultsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f44336',
        marginBottom: 8,
        textAlign: 'center',
    },
    noResultsMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    debugInfo: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        width: '100%',
        marginBottom: 16,
    },
    debugTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    debugItem: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
});
