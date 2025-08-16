import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
    const navigation = useNavigation<HomeScreenNavigationProp>();

    const handleStartIntake = () => {
        navigation.navigate('Camera');
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <Image
                        source={require('../../assets/favicon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Brecho AI Intake</Text>
                    <Text style={styles.subtitle}>
                        Fotografe seus itens e deixe a IA cuidar do resto!
                    </Text>
                </View>

                {/* Features */}
                <View style={styles.featuresSection}>
                    <Text style={styles.sectionTitle}>Como funciona:</Text>

                    <View style={styles.feature}>
                        <View style={styles.featureIcon}>
                            <Text style={styles.featureIconText}>📸</Text>
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>1. Fotografe</Text>
                            <Text style={styles.featureDescription}>
                                Tire fotos dos itens que deseja cadastrar
                            </Text>
                        </View>
                    </View>

                    <View style={styles.feature}>
                        <View style={styles.featureIcon}>
                            <Text style={styles.featureIconText}>🎤</Text>
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>2. Descreva</Text>
                            <Text style={styles.featureDescription}>
                                Grave uma descrição em áudio ou digite observações
                            </Text>
                        </View>
                    </View>

                    <View style={styles.feature}>
                        <View style={styles.featureIcon}>
                            <Text style={styles.featureIconText}>🤖</Text>
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>3. IA Processa</Text>
                            <Text style={styles.featureDescription}>
                                Nossa IA analisa e categoriza automaticamente
                            </Text>
                        </View>
                    </View>

                    <View style={styles.feature}>
                        <View style={styles.featureIcon}>
                            <Text style={styles.featureIconText}>✅</Text>
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>4. Revise</Text>
                            <Text style={styles.featureDescription}>
                                Confirme as informações e adicione ao estoque
                            </Text>
                        </View>
                    </View>
                </View>

                {/* CTA Button */}
                <TouchableOpacity style={styles.startButton} onPress={handleStartIntake}>
                    <Text style={styles.startButtonText}>Começar Intake</Text>
                </TouchableOpacity>

                {/* Statistics */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Estatísticas</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>0</Text>
                            <Text style={styles.statLabel}>Itens processados hoje</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>0</Text>
                            <Text style={styles.statLabel}>Total esta semana</Text>
                        </View>
                    </View>
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
    heroSection: {
        alignItems: 'center',
        marginBottom: 30,
        paddingVertical: 20,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1976d2',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    featuresSection: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
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
    featureIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#e3f2fd',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    featureIconText: {
        fontSize: 24,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    startButton: {
        backgroundColor: '#1976d2',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#1976d2',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    startButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statsSection: {
        marginBottom: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        flex: 0.48,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    statNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1976d2',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
});
