/**
 * Home screen with map and nearby users
 */
import { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Text,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { socketClient } from '../lib/socket';
import { useAppStore } from '../lib/store';
import { useLocation } from '../hooks/useLocation';
import { useDirectionalBuzzer } from '../hooks/useDirectionalBuzzer';
import LocationToggle from '../components/LocationToggle';
import UserMarker from '../components/UserMarker';
import UserCard from '../components/UserCard';
import NotificationBell from '../components/NotificationBell';
import ProfileButton from '../components/ProfileButton';
import type { NearbyUser } from '../types';
import { supabase } from '../lib/supabase';

export default function HomeScreen({
    navigation,
}: {
    navigation: { navigate: (screen: string, params?: object) => void };
}) {
    const {
        currentLocation,
        isSharingLocation,
        selectedUserId,
        setSelectedUserId,
        isBuzzerEnabled,
        setIsBuzzerEnabled,
        buzzerTargetUserId,
        setBuzzerTargetUserId,
    } = useAppStore();

    const { requestPermission } = useLocation();
    const [region, setRegion] = useState<Region>({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Fetch nearby users
    const { data: nearbyUsers = [], refetch } = useQuery({
        queryKey: ['nearby-users', currentLocation],
        queryFn: async () => {
            if (!currentLocation) return [];
            return apiClient.getNearbyUsers(
                currentLocation.lat,
                currentLocation.lng
            );
        },
        enabled: isSharingLocation && !!currentLocation,
        refetchInterval: 15000, // Refresh every 15 seconds
    });

    // Update map region when current location changes
    useEffect(() => {
        if (currentLocation) {
            setRegion({
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            });
        }
    }, [currentLocation]);

    // Setup socket listeners
    useEffect(() => {
        if (!isSharingLocation) return;

        socketClient.connect();

        socketClient.onNearbyUpdate(() => {
            // Optimistically refresh nearby users when locations update
            refetch();
        });

        return () => {
            socketClient.removeAllListeners();
        };
    }, [isSharingLocation, refetch]);

    // Request permission on mount
    useEffect(() => {
        requestPermission();
    }, [requestPermission]);

    useEffect(() => {
        let isActive = true;

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (isActive) {
                setCurrentUserId(user?.id ?? null);
            }
        });

        return () => {
            isActive = false;
        };
    }, []);

    const selectedUser = nearbyUsers.find((u) => u.user_id === selectedUserId);
    const buzzerTargetUser = nearbyUsers.find((u) => u.user_id === buzzerTargetUserId);

    // Initialize directional buzzer
    const buzzerState = useDirectionalBuzzer({
        enabled: isBuzzerEnabled,
        targetUser: buzzerTargetUser || null,
        currentLocation,
    });

    const handleMarkerPress = (user: NearbyUser) => {
        if (currentUserId && user.user_id === currentUserId) {
            return;
        }

        setSelectedUserId(user.user_id);
    };

    const handleViewProfile = () => {
        if (selectedUser) {
            navigation.navigate('PersonDetail', {
                userId: selectedUser.user_id,
            });
            setSelectedUserId(null);
        }
    };

    const handleToggleBuzzer = () => {
        if (!selectedUser) return;

        if (isBuzzerEnabled && buzzerTargetUserId === selectedUser.user_id) {
            // Disable buzzer
            setIsBuzzerEnabled(false);
            setBuzzerTargetUserId(null);
        } else {
            // Enable buzzer for selected user
            setIsBuzzerEnabled(true);
            setBuzzerTargetUserId(selectedUser.user_id);
        }
    };

    const isBuzzerActiveForSelected =
        isBuzzerEnabled &&
        selectedUser &&
        buzzerTargetUserId === selectedUser.user_id;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <MapView
                style={styles.map}
                region={region}
                onRegionChangeComplete={setRegion}
                showsUserLocation={isSharingLocation}
                showsMyLocationButton={isSharingLocation}
            >
                {nearbyUsers.filter(
                    (user) => user.user_id !== currentUserId
                ).map((user) => (
                    <UserMarker
                        key={user.user_id}
                        user={user}
                        onPress={handleMarkerPress}
                    />
                ))}
            </MapView>

            {/* Top controls */}
            <View style={styles.topControls}>
                {!isSharingLocation && <LocationToggle />}

                <View style={styles.rightButtons}>
                    <NotificationBell
                        onPress={() => navigation.navigate('Notifications')}
                    />
                    <ProfileButton
                        onPress={() => navigation.navigate('Profile')}
                    />
                </View>
            </View>

            {/* Bottom sheet with selected user */}
            {selectedUser && (
                <View style={styles.bottomSheet}>
                    <ScrollView contentContainerStyle={styles.sheetContent}>
                        <UserCard
                            user={selectedUser}
                            onViewProfile={handleViewProfile}
                        />

                        {/* Directional Buzzer Toggle */}
                        <TouchableOpacity
                            style={[
                                styles.buzzerButton,
                                isBuzzerActiveForSelected && styles.buzzerButtonActive,
                            ]}
                            onPress={handleToggleBuzzer}
                        >
                            <Text
                                style={[
                                    styles.buzzerButtonText,
                                    isBuzzerActiveForSelected && styles.buzzerButtonTextActive,
                                ]}
                            >
                                {isBuzzerActiveForSelected ? '📍 Buzzer Active' : '🧭 Start Buzzer'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            )}

            {/* Info banner when not sharing location */}
            {!isSharingLocation && (
                <View style={styles.infoBanner}>
                    <Text style={styles.infoBannerText}>
                        Enable location sharing to see nearby users
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1FAEE',
    },
    map: {
        flex: 1,
    },
    topControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 8,
    },
    rightButtons: {
        position: 'absolute',
        top: 80,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '40%',
        backgroundColor: '#F1FAEE',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    sheetContent: {
        padding: 16,
    },
    infoBanner: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(29, 53, 87, 0.9)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    infoBannerText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    buzzerButton: {
        backgroundColor: '#457B9D',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginTop: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buzzerButtonActive: {
        backgroundColor: '#1D3557',
    },
    buzzerButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    buzzerButtonTextActive: {
        color: '#A8DADC',
    },
    buzzerStats: {
        backgroundColor: '#E8F4F8',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        gap: 6,
    },
    buzzerStatsText: {
        color: '#1D3557',
        fontSize: 13,
        fontWeight: '500',
        fontFamily: 'monospace',
    },
});
