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

type ReviewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Review'>;
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
            // Simulate AI analysis (replace with actual API call)
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Mock analysis result
            const mockResult: AIAnalysisResult = {
                items: [
                    {
                        name: 'Camiseta Casual',
                        category: 'Roupas',
                        subcategory: 'Camisetas',
                        brand: 'Marca não identificada',
                        size: 'M',
                        color: 'Azul',
                        condition: 'Bom estado',
                        estimatedPrice: 25.00,
                        description: 'Camiseta casual em algodão, cor azul, tamanho médio',
                        confidence: 0.85,
                    },
                    {
                        name: 'Calça Jeans',
                        category: 'Roupas',
                        subcategory: 'Calças',
                        brand: 'Levi\'s',
                        size: '38',
                        color: 'Azul escuro',
                        condition: 'Muito bom',
                        estimatedPrice: 80.00,
                        description: 'Calça jeans escura, marca Levi\'s, tamanho 38',
                        confidence: 0.92,
                    },
                ],
                suggestions: [
                    'Considere tirar fotos com melhor iluminação',
                    'Adicione mais detalhes sobre o estado de conservação',
                    'Verifique se há etiquetas com informações da marca',
                ],
            };

            setAnalysisResult(mockResult);
        } catch (error) {
            Alert.alert('Erro', 'Falha na análise das imagens');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSendToSystem = async () => {
        if (!analysisResult) return;

        setIsSending(true);

        try {
            // Simulate sending to backend (replace with actual API call)
            await new Promise(resolve => setTimeout(resolve, 2000));

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
                {(audioUri || description) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Informações Adicionais</Text>
                        {audioUri && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>🎤 Áudio gravado</Text>
                                <Text style={styles.infoValue}>Descrição em áudio disponível</Text>
                            </View>
                        )}
                        {description && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>📝 Descrição</Text>
                                <Text style={styles.infoValue}>{description}</Text>
                            </View>
                        )}
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
                        <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyze}>
                            <Text style={styles.analyzeButtonText}>Analisar Novamente</Text>
                        </TouchableOpacity>
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
});
