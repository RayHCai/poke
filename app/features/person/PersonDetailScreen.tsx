/**
 * Person detail screen with throw button
 */
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    TouchableOpacity,
    Linking,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { haversineDistance } from '../../lib/geo';
import Button from '../../components/Button';
import type { Profile } from '../../types';

interface PersonDetailScreenProps {
    route: {
        params: {
            userId: string;
        };
    };
    navigation: {
        goBack: () => void;
    };
}

export default function PersonDetailScreen({
    route,
    navigation,
}: PersonDetailScreenProps) {
    const { userId } = route.params;
    const queryClient = useQueryClient();
    const { currentLocation, canThrow, setLastThrowTime } = useAppStore();

    // Animation state
    const [isAnimating, setIsAnimating] = useState(false);
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const rotate = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            return data as Profile;
        },
    });

    // Fetch current user's profile to check their rating
    const { data: currentUserProfile } = useQuery({
        queryKey: ['currentUserProfile'],
        queryFn: async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            return data as Profile;
        },
    });

    const { data: sighting } = useQuery({
        queryKey: ['sighting', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sightings')
                .select('lat, lng')
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            return data;
        },
    });

    // Check if current user has matched with this person
    const { data: hasMatched } = useQuery({
        queryKey: ['match-status', userId],
        queryFn: async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return false;

            const { data, error } = await supabase
                .from('matches')
                .select('id')
                .or(
                    `and(u1.eq.${user.id},u2.eq.${userId}),and(u1.eq.${userId},u2.eq.${user.id})`
                )
                .maybeSingle();

            if (error) throw error;
            return !!data;
        },
    });

    const playThrowAnimation = () => {
        setIsAnimating(true);

        // Reset animation values
        translateX.setValue(0);
        translateY.setValue(0);
        rotate.setValue(0);
        scale.setValue(0);
        opacity.setValue(1);

        // Create the throw animation sequence
        Animated.parallel([
            // Pokeball arcs from bottom-center to top-right
            Animated.timing(translateX, {
                toValue: 300,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.sequence([
                // Goes up first (arc trajectory)
                Animated.timing(translateY, {
                    toValue: -400,
                    duration: 500,
                    useNativeDriver: true,
                }),
                // Then comes down a bit
                Animated.timing(translateY, {
                    toValue: -300,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
            // Spin the pokeball
            Animated.timing(rotate, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            // Scale animation - grows then shrinks (simulating distance)
            Animated.sequence([
                Animated.timing(scale, {
                    toValue: 1.5,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    toValue: 0.3,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
            // Fade out at the end
            Animated.sequence([
                Animated.delay(700),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            setIsAnimating(false);
        });
    };

    const throwMutation = useMutation({
        mutationFn: async () => {
            if (!currentLocation || !sighting) {
                throw new Error('Location not available');
            }

            // Validate distance
            const distance = haversineDistance(
                currentLocation.lat,
                currentLocation.lng,
                sighting.lat,
                sighting.lng
            );

            const { data: prefs } = await supabase
                .from('preferences')
                .select('max_distance_km')
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                .single();

            const maxDistance = prefs?.max_distance_km || 5;

            if (distance > maxDistance) {
                throw new Error('User is too far away');
            }

            // Play the throw animation
            playThrowAnimation();

            // Wait a bit for the animation to start before making the API call
            await new Promise((resolve) => setTimeout(resolve, 300));

            return apiClient.throwBall(userId);
        },
        onSuccess: () => {
            setLastThrowTime(Date.now());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Delay the alert until after animation completes
            setTimeout(() => {
                Alert.alert(
                    'Pokeball Thrown!',
                    "Your throw has been sent. If they catch it too, you'll match!",
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }, 1000);

            // Invalidate queries to update UI
            queryClient.invalidateQueries({ queryKey: ['throws'] });
            queryClient.invalidateQueries({ queryKey: ['nearby-users'] });
        },
        onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to throw'
            );
        },
    });

    const handleThrow = () => {
        if (!canThrow()) {
            Alert.alert('Cooldown', 'Please wait before throwing again');
            return;
        }

        // Check rating difference
        const currentRating = currentUserProfile?.face_rating || 5;
        const targetRating = profile?.face_rating || 5;
        const ratingDifference = targetRating - currentRating;

        // If target has significantly higher rating, show warning first
        if (ratingDifference > 2) {
            Alert.alert(
                'Hey! Re-consider this one. Take your time to choose wisely.',
                `This person has a higher rating than you (${targetRating} vs ${currentRating}). You will have a lower chance of matching. Do you still want to throw?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Throw Anyway',
                        style: 'default',
                        onPress: () => showThrowConfirmation(),
                    },
                ]
            );
        } else {
            showThrowConfirmation();
        }
    };

    const showThrowConfirmation = () => {
        Alert.alert(
            'Throw Pokeball?',
            `Throw a pokeball at ${profile?.display_name}? If they accept, you\'ll match!`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Throw',
                    style: 'default',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        throwMutation.mutate();
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Text>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Text>User not found</Text>
                    <Button
                        title="Go Back"
                        onPress={() => navigation.goBack()}
                    />
                </View>
            </SafeAreaView>
        );
    }

    const distance =
        currentLocation && sighting
            ? haversineDistance(
                  currentLocation.lat,
                  currentLocation.lng,
                  sighting.lat,
                  sighting.lng
              )
            : null;

    const spin = rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '720deg'],
    });

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        {profile.avatar_url ? (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {profile.display_name
                                        ?.charAt(0)
                                        .toUpperCase()}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {profile.display_name
                                        ?.charAt(0)
                                        .toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.displayName}>
                        {profile.display_name}
                    </Text>
                    <Text style={styles.username}>@{profile.username}</Text>

                    {distance !== null && (
                        <View style={styles.distanceBadge}>
                            <Text style={styles.distanceText}>
                                {distance.toFixed(1)} km away
                            </Text>
                        </View>
                    )}
                </View>

                {profile.bio && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <Text style={styles.bio}>{profile.bio}</Text>
                    </View>
                )}

                {profile.pronouns && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Pronouns:</Text>
                        <Text style={styles.infoValue}>{profile.pronouns}</Text>
                    </View>
                )}

                {hasMatched && profile.instagram_username && (
                    <TouchableOpacity
                        style={styles.instagramButton}
                        onPress={() => {
                            const openInstagram = async (username: string) => {
                                const appUrl =
                                    Platform.OS === 'ios'
                                        ? `instagram://user?username=${username}`
                                        : `intent://instagram.com/_u/${username}/#Intent;package=com.instagram.android;scheme=https;end`;
                                const webUrl = `https://instagram.com/${username}`;

                                try {
                                    const supported = await Linking.canOpenURL(
                                        appUrl
                                    );
                                    if (supported) {
                                        await Linking.openURL(appUrl);
                                    } else {
                                        await Linking.openURL(webUrl);
                                    }
                                } catch (err) {
                                    Alert.alert(
                                        'Error',
                                        'Could not open Instagram'
                                    );
                                    console.error('Instagram open error:', err);
                                }
                            };

                            openInstagram(profile.instagram_username!);
                        }}
                    >
                        <Text style={styles.instagramIcon}>📷</Text>
                        <Text style={styles.instagramText}>
                            @{profile.instagram_username}
                        </Text>
                        <Text style={styles.instagramSubtext}>
                            Tap to open Instagram
                        </Text>
                    </TouchableOpacity>
                )}

                {!hasMatched && (
                    <View style={styles.actions}>
                        <Button
                            title={
                                canThrow() ? 'Throw Pokeball' : 'Cooldown...'
                            }
                            onPress={handleThrow}
                            loading={throwMutation.isPending}
                            disabled={!canThrow()}
                            variant="primary"
                        />
                        <Button
                            title="Back"
                            onPress={() => navigation.goBack()}
                            variant="outline"
                        />
                    </View>
                )}
            </ScrollView>

            {/* Pokeball throw animation overlay */}
            {isAnimating && (
                <View style={styles.animationOverlay} pointerEvents="none">
                    <Animated.Text
                        style={[
                            styles.pokeball,
                            {
                                transform: [
                                    { translateX },
                                    { translateY },
                                    { rotate: spin },
                                    { scale },
                                ],
                                opacity,
                            },
                        ]}
                    >
                        ⚾
                    </Animated.Text>
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    content: {
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E63946',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    displayName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1D3557',
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    distanceBadge: {
        backgroundColor: '#A8DADC',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    distanceText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1D3557',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1D3557',
        marginBottom: 8,
    },
    bio: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1D3557',
        marginRight: 8,
    },
    infoValue: {
        fontSize: 16,
        color: '#666',
    },
    instagramButton: {
        backgroundColor: '#E1306C',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    instagramIcon: {
        fontSize: 32,
        marginBottom: 4,
    },
    instagramText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    instagramSubtext: {
        fontSize: 12,
        color: '#FFFFFF',
        opacity: 0.9,
    },
    actions: {
        gap: 12,
        marginTop: 24,
    },
    animationOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 100,
    },
    pokeball: {
        fontSize: 80,
    },
});
