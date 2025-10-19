/**
 * Incoming throw notification banner
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { socketClient } from '../lib/socket';
import { apiClient } from '../lib/api';

interface ThrowData {
  throwId: string;
  thrower: {
    username: string;
    avatarUrl?: string;
  };
}

export default function ThrowNotification() {
  const [throwData, setThrowData] = useState<ThrowData | null>(null);
  const [slideAnim] = useState(new Animated.Value(-200));

  useEffect(() => {
    socketClient.onThrowIncoming((data) => {
      setThrowData(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    });

    return () => {
      socketClient.removeAllListeners();
    };
  }, [slideAnim]);

  const handleAccept = async () => {
    if (!throwData) return;

    try {
      await apiClient.resolveThrow(throwData.throwId, 'hit');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      hideNotification();
    } catch (error) {
      console.error('Accept throw error:', error);
    }
  };

  const handleDecline = async () => {
    if (!throwData) return;

    try {
      await apiClient.resolveThrow(throwData.throwId, 'miss');
      hideNotification();
    } catch (error) {
      console.error('Decline throw error:', error);
    }
  };

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setThrowData(null);
    });
  };

  if (!throwData) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Incoming Pokeball!</Text>
        <Text style={styles.message}>
          @{throwData.thrower.username} threw a pokeball at you
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
            <Text style={styles.acceptText}>Catch!</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
            <Text style={styles.declineText}>Dodge</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E63946',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#1D3557',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#E63946',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
