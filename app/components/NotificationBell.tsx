/**
 * Notification bell component with badge counter
 */
import { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { socketClient } from '../lib/socket';

interface NotificationBellProps {
    onPress: () => void;
}

export default function NotificationBell({ onPress }: NotificationBellProps) {
    const queryClient = useQueryClient();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const { data: incomingThrows = [] } = useQuery({
        queryKey: ['incoming-throws'],
        queryFn: () => apiClient.getIncomingThrows(),
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Listen for socket events to refresh notification count
    useEffect(() => {
        const handleIncomingThrow = () => {
            queryClient.invalidateQueries({ queryKey: ['incoming-throws'] });
        };

        const handleThrowResult = () => {
            queryClient.invalidateQueries({ queryKey: ['incoming-throws'] });
        };

        socketClient.onThrowIncoming(handleIncomingThrow);
        socketClient.onThrowResult(handleThrowResult);

        // Note: cleanup is handled by parent component's removeAllListeners
    }, [queryClient]);

    const count = incomingThrows.length;

    // Pulse animation when notifications are present
    useEffect(() => {
        if (count > 0) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [count, pulseAnim]);

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <LinearGradient
                colors={count > 0 ? ['#667eea', '#764ba2'] : ['#4A5568', '#2D3748']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bellContainer}
            >
                <FontAwesome
                    name="bell"
                    size={20}
                    color="#FFFFFF"
                    style={styles.bellIcon}
                />
            </LinearGradient>
            {count > 0 && (
                <Animated.View
                    style={[
                        styles.badge,
                        { transform: [{ scale: pulseAnim }] }
                    ]}
                >
                    <LinearGradient
                        colors={['#FF6B6B', '#EE5A6F']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.badgeGradient}
                    >
                        <Text style={styles.badgeText}>
                            {count > 9 ? '9+' : count}
                        </Text>
                    </LinearGradient>
                </Animated.View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        padding: 4,
    },
    bellContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    bellIcon: {
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        shadowColor: '#FF6B6B',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.5,
        shadowRadius: 3,
        elevation: 6,
    },
    badgeGradient: {
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
});
