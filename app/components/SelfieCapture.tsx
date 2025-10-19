/**
 * Selfie Capture Component
 * Handles camera permissions, selfie capture, image compression, and upload
 */
import { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import Button from './Button';

interface SelfieCaptureProps {
    onSelfieUploaded: (rating: number) => void;
    onSkip?: () => void;
    userId: string;
}

export default function SelfieCapture({
    onSelfieUploaded,
    onSkip,
    userId,
}: SelfieCaptureProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [isCapturing, setIsCapturing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    // Request camera permission on mount
    useEffect(() => {
        if (permission && !permission.granted && permission.canAskAgain) {
            requestPermission();
        }
    }, [permission]);

    /**
     * Compress and convert image to base64
     */
    const compressImage = async (uri: string): Promise<string> => {
        try {
            // Compress image to max 800px width, maintaining aspect ratio
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 800 } }],
                {
                    compress: 0.8,
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true,
                }
            );

            if (!manipulatedImage.base64) {
                throw new Error('Failed to generate base64 image');
            }

            return manipulatedImage.base64;
        } catch (error) {
            console.error('Image compression error:', error);
            throw new Error('Failed to compress image');
        }
    };

    /**
     * Upload selfie to backend for Gemini rating
     */
    const uploadSelfie = async (base64Image: string): Promise<number> => {
        try {
            const apiUrl =
                process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

            const response = await fetch(`${apiUrl}/api/v1/selfie/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    imageBase64: base64Image,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to upload selfie');
            }

            const data = await response.json();

            if (
                typeof data.rating !== 'number' ||
                data.rating < 1 ||
                data.rating > 10
            ) {
                throw new Error('Invalid rating received from server');
            }

            return data.rating;
        } catch (error) {
            console.error('Upload error:', error);
            if (error instanceof Error && error.name === 'TimeoutError') {
                throw new Error('Upload timed out. Please try again.');
            }
            throw error;
        }
    };

    /**
     * Capture selfie from camera
     */
    const handleCapture = async () => {
        if (!cameraRef.current) {
            Alert.alert('Error', 'Camera not ready');
            return;
        }

        setIsCapturing(true);

        try {
            // Take picture
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                skipProcessing: false,
            });

            if (!photo || !photo.uri) {
                throw new Error('Failed to capture photo');
            }

            setIsCapturing(false);
            setIsUploading(true);

            // Compress image
            const base64Image = await compressImage(photo.uri);

            // Upload and get rating
            const rating = await uploadSelfie(base64Image);

            // Success!
            setIsUploading(false);
            onSelfieUploaded(rating);
        } catch (error) {
            setIsCapturing(false);
            setIsUploading(false);

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Failed to process selfie';

            Alert.alert('Error', errorMessage, [
                { text: 'Try Again' },
                {
                    text: 'Skip',
                    onPress: onSkip,
                    style: 'cancel',
                },
            ]);
        }
    };

    // Loading state while requesting permissions
    if (!permission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#E63946" />
            </View>
        );
    }

    // Permission denied
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <View style={styles.permissionContainer}>
                    <Text style={styles.title}>Camera Access Required</Text>
                    <Text style={styles.message}>
                        We need access to your camera to take a selfie for your
                        profile.
                    </Text>
                    <Button
                        title="Grant Camera Permission"
                        onPress={requestPermission}
                        style={styles.button}
                    />
                    {onSkip && (
                        <Button
                            title="Skip for Now"
                            onPress={onSkip}
                            variant="outline"
                            style={styles.button}
                        />
                    )}
                </View>
            </View>
        );
    }

    // Camera view
    return (
        <View style={styles.container}>
            <View style={styles.cameraContainer}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing="front"
                    animateShutter={false}
                >
                    {/* Camera overlay with face guide */}
                    <View style={styles.overlay}>
                        <View style={styles.header}>
                            <Text style={styles.headerText}>
                                Take Your Selfie
                            </Text>
                            <Text style={styles.subHeaderText}>
                                Position your face in the circle
                            </Text>
                        </View>

                        <View style={styles.faceGuide}>
                            <View style={styles.faceCircle} />
                        </View>

                        <View style={styles.footer}>
                            {isCapturing || isUploading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator
                                        size="large"
                                        color="#FFFFFF"
                                    />
                                    <Text style={styles.loadingText}>
                                        {isCapturing
                                            ? 'Capturing...'
                                            : 'Processing...'}
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    <Button
                                        title="Capture"
                                        onPress={handleCapture}
                                        style={styles.captureButton}
                                    />
                                    {onSkip && (
                                        <Button
                                            title="Skip"
                                            onPress={onSkip}
                                            variant="outline"
                                            style={styles.skipButton}
                                        />
                                    )}
                                </>
                            )}
                        </View>
                    </View>
                </CameraView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#F1FAEE',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1D3557',
        marginBottom: 16,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    button: {
        width: '100%',
        marginBottom: 12,
    },
    cameraContainer: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    subHeaderText: {
        fontSize: 16,
        color: '#FFFFFF',
        marginTop: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    faceGuide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceCircle: {
        width: 280,
        height: 280,
        borderRadius: 140,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        borderStyle: 'dashed',
        opacity: 0.6,
    },
    footer: {
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        marginTop: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    captureButton: {
        width: '100%',
        marginBottom: 12,
    },
    skipButton: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderColor: '#FFFFFF',
    },
});
