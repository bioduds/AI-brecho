import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Image,
    TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

type AudioScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Audio'>;
type AudioScreenRouteProp = RouteProp<RootStackParamList, 'Audio'>;

export default function AudioScreen() {
    const navigation = useNavigation<AudioScreenNavigationProp>();
    const route = useRoute<AudioScreenRouteProp>();
    const { photos } = route.params;

    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);

    // Limpar gravação ao sair da tela
    useFocusEffect(
        React.useCallback(() => {
            return () => {
                // Quando sair da tela, parar gravação se ainda estiver ativa
                if (isRecording && recording) {
                    recording.stopAndUnloadAsync().catch(() => { });
                    setIsRecording(false);
                    setRecording(null);
                }
                // Limpar som se estiver tocando
                if (sound) {
                    sound.unloadAsync().catch(() => { });
                    setSound(null);
                    setIsPlaying(false);
                }
            };
        }, [isRecording, recording, sound])
    );

    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Erro', 'Permissão para usar o microfone é necessária');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            setRecordingDuration(0);

            // Update duration every second
            const interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

            // Store interval reference for cleanup
            (recording as any).durationInterval = interval;
        } catch (err) {
            Alert.alert('Erro', 'Falha ao iniciar gravação');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            setIsRecording(false);
            clearInterval((recording as any).durationInterval);

            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setAudioUri(uri);
            setRecording(null);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao parar gravação');
        }
    };

    const playAudio = async () => {
        if (!audioUri) return;

        try {
            if (sound) {
                await sound.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri });
            setSound(newSound);
            setIsPlaying(true);

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                }
            });

            await newSound.playAsync();
        } catch (err) {
            Alert.alert('Erro', 'Falha ao reproduzir áudio');
        }
    };

    const stopAudio = async () => {
        if (sound) {
            await sound.stopAsync();
            setIsPlaying(false);
        }
    };

    const deleteRecording = () => {
        if (sound) {
            sound.unloadAsync();
            setSound(null);
        }
        setAudioUri(null);
        setRecordingDuration(0);
    };

    const handleContinue = async () => {
        let finalAudioUri = audioUri;

        // Se ainda estiver gravando, parar a gravação automaticamente
        if (isRecording && recording) {
            try {
                setIsRecording(false);
                clearInterval((recording as any).durationInterval);
                await recording.stopAndUnloadAsync();

                // Pequeno delay para garantir que o arquivo foi processado
                await new Promise(resolve => setTimeout(resolve, 100));

                const uri = recording.getURI();
                setAudioUri(uri);
                setRecording(null);
                finalAudioUri = uri; // Usar o URI recém-criado

                console.log('Áudio gravado e parado com sucesso:', uri);
            } catch (error) {
                console.warn('Erro ao parar gravação:', error);
                // Continuar mesmo com erro
            }
        }

        console.log('Navegando para Review com áudio:', finalAudioUri);
        navigation.navigate('Review', {
            photos,
            audioUri: finalAudioUri || undefined,
            description: '' // Removido - sem descrição texto
        });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                {/* Photos Preview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Fotos Selecionadas ({photos.length})</Text>
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

                {/* Audio Recording */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Gravação de Áudio (Opcional)</Text>
                    <Text style={styles.sectionDescription}>
                        Grave uma descrição dos itens para ajudar a IA a categorizar melhor
                    </Text>

                    {!audioUri ? (
                        <View style={styles.recordingContainer}>
                            {!isRecording ? (
                                <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                                    <View style={styles.recordButtonInner}>
                                        <Text style={styles.recordButtonText}>🎤</Text>
                                    </View>
                                    <Text style={styles.recordButtonLabel}>Iniciar Gravação</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.recordingActive}>
                                    <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                                        <View style={styles.stopButtonInner} />
                                    </TouchableOpacity>
                                    <Text style={styles.recordingTime}>
                                        Gravando... {formatDuration(recordingDuration)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.audioControls}>
                            <View style={styles.audioInfo}>
                                <Text style={styles.audioLabel}>Gravação concluída</Text>
                                <Text style={styles.audioDuration}>{formatDuration(recordingDuration)}</Text>
                            </View>
                            <View style={styles.audioButtons}>
                                <TouchableOpacity
                                    style={styles.playButton}
                                    onPress={isPlaying ? stopAudio : playAudio}
                                >
                                    <Text style={styles.playButtonText}>
                                        {isPlaying ? '⏸️' : '▶️'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteButton} onPress={deleteRecording}>
                                    <Text style={styles.deleteButtonText}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Continue Button */}
                <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                    <Text style={styles.continueButtonText}>
                        Continuar para Revisão
                    </Text>
                </TouchableOpacity>
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
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        lineHeight: 20,
    },
    photosContainer: {
        marginBottom: 10,
    },
    photo: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 10,
    },
    recordingContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    recordButton: {
        alignItems: 'center',
    },
    recordButtonInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ff4444',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    recordButtonText: {
        fontSize: 30,
    },
    recordButtonLabel: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    },
    recordingActive: {
        alignItems: 'center',
    },
    stopButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ff4444',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    stopButtonInner: {
        width: 30,
        height: 30,
        backgroundColor: 'white',
        borderRadius: 4,
    },
    recordingTime: {
        fontSize: 18,
        color: '#ff4444',
        fontWeight: 'bold',
    },
    audioControls: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    audioInfo: {
        marginBottom: 12,
    },
    audioLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    audioDuration: {
        fontSize: 14,
        color: '#666',
    },
    audioButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    playButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#1976d2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playButtonText: {
        fontSize: 20,
    },
    deleteButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ff4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonText: {
        fontSize: 20,
    },
    textInput: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        minHeight: 100,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    continueButton: {
        backgroundColor: '#1976d2',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#1976d2',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    continueButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
