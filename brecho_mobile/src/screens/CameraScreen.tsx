import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Image,
    Dimensions,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import * as MediaLibrary from 'expo-media-library';

type CameraScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Camera'>;

const { width: screenWidth } = Dimensions.get('window');

export default function CameraScreen() {
    const navigation = useNavigation<CameraScreenNavigationProp>();
    const cameraRef = useRef<CameraView>(null);

    const [permission, requestPermission] = useCameraPermissions();
    const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState<boolean | null>(null);
    const [cameraType, setCameraType] = useState<CameraType>('back');
    const [flashMode, setFlashMode] = useState<FlashMode>('off');
    const [photos, setPhotos] = useState<string[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);

    useEffect(() => {
        (async () => {
            const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
            setHasMediaLibraryPermission(mediaLibraryPermission.status === 'granted');
        })();
    }, []);

    const takePicture = async () => {
        if (cameraRef.current && !isCapturing) {
            try {
                setIsCapturing(true);
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: false,
                    skipProcessing: false,
                });

                if (hasMediaLibraryPermission && photo) {
                    await MediaLibrary.saveToLibraryAsync(photo.uri);
                }

                if (photo) {
                    setPhotos(prev => [...prev, photo.uri]);
                }
            } catch (error) {
                Alert.alert('Erro', 'Não foi possível tirar a foto');
            } finally {
                setIsCapturing(false);
            }
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const toggleCameraType = () => {
        setCameraType(current =>
            current === 'back' ? 'front' : 'back'
        );
    };

    const toggleFlash = () => {
        setFlashMode(current =>
            current === 'off' ? 'on' : 'off'
        );
    };

    const handleContinue = () => {
        if (photos.length === 0) {
            Alert.alert('Atenção', 'Tire pelo menos uma foto antes de continuar');
            return;
        }
        navigation.navigate('Audio', { photos });
    };

    if (!permission) {
        return <View style={styles.container}><Text>Solicitando permissões...</Text></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.permissionText}>
                    Permissão para usar a câmera é necessária
                </Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Conceder Permissão</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={cameraType}
                flash={flashMode}
            >
                <View style={styles.cameraOverlay}>
                    {/* Top Controls */}
                    <View style={styles.topControls}>
                        <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
                            <Text style={styles.controlButtonText}>
                                {flashMode === 'off' ? '⚡️' : '🔦'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
                            <Text style={styles.controlButtonText}>🔄</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Controls */}
                    <View style={styles.bottomControls}>
                        <TouchableOpacity
                            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                            onPress={takePicture}
                            disabled={isCapturing}
                        >
                            <View style={styles.captureButtonInner} />
                        </TouchableOpacity>
                    </View>
                </View>
            </CameraView>

            {/* Photo Gallery */}
            {photos.length > 0 && (
                <View style={styles.galleryContainer}>
                    <Text style={styles.galleryTitle}>
                        Fotos tiradas ({photos.length})
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.gallery}
                    >
                        {photos.map((uri, index) => (
                            <View key={index} style={styles.photoContainer}>
                                <Image source={{ uri }} style={styles.photo} />
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => removePhoto(index)}
                                >
                                    <Text style={styles.removeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                        <Text style={styles.continueButtonText}>
                            Continuar com {photos.length} foto{photos.length !== 1 ? 's' : ''}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    controlButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlButtonText: {
        fontSize: 24,
    },
    bottomControls: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 5,
        borderColor: '#1976d2',
    },
    captureButtonDisabled: {
        opacity: 0.5,
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1976d2',
    },
    galleryContainer: {
        backgroundColor: 'white',
        padding: 15,
        maxHeight: 200,
    },
    galleryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    gallery: {
        marginBottom: 15,
    },
    photoContainer: {
        position: 'relative',
        marginRight: 10,
    },
    photo: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    removeButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#ff4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    continueButton: {
        backgroundColor: '#1976d2',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    continueButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    permissionText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        padding: 20,
    },
    permissionButton: {
        backgroundColor: '#1976d2',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 20,
    },
    permissionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
