/**
 * Custom hook for location tracking
 */
import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { useAppStore } from '../lib/store';
import { apiClient } from '../lib/api';

const UPDATE_INTERVAL = 10000; // 10 seconds

export function useLocation() {
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isSharingLocation, setCurrentLocation } = useAppStore();

  /**
   * Request location permissions
   */
  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'PokeDate needs location access to show you nearby users and enable matching.',
          [{ text: 'OK' }]
        );
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permission request failed');
      return false;
    }
  }, []);

  /**
   * Get current location and update server
   */
  const updateLocation = useCallback(async () => {
    if (!isSharingLocation) return;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, accuracy } = location.coords;

      // Update local state
      setCurrentLocation({ lat: latitude, lng: longitude });

      // Update server
      const res = await apiClient.updateLocation(latitude, longitude, accuracy || undefined);

      console.info('Location updated:', { lat: latitude, lng: longitude });
    } catch (err) {
      console.error('Location update error:', err);
      setError(err instanceof Error ? err.message : 'Location update failed');
    }
  }, [isSharingLocation, setCurrentLocation]);

  /**
   * Start location updates
   */
  useEffect(() => {
    if (!isSharingLocation || permissionStatus !== 'granted') return;

    // Initial update
    updateLocation();

    // Set up interval for periodic updates
    const interval = setInterval(updateLocation, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [isSharingLocation, permissionStatus, updateLocation]);

  return {
    permissionStatus,
    error,
    requestPermission,
    updateLocation,
  };
}
