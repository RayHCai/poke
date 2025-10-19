/**
 * Location sharing toggle component
 */
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { useAppStore } from '../lib/store';
import { useLocation } from '../hooks/useLocation';

export default function LocationToggle() {
  const { isSharingLocation, setIsSharingLocation } = useAppStore();
  const { permissionStatus, requestPermission } = useLocation();

  const handleToggle = async (value: boolean) => {
    if (value) {
      // Request permission if not granted
      if (permissionStatus !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return;
      }

      setIsSharingLocation(true);
      Alert.alert(
        'Location Sharing Enabled',
        'You will now appear on the map to nearby users',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Stop Sharing Location?',
        'You will no longer appear on the map and cannot see nearby users',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop Sharing',
            style: 'destructive',
            onPress: () => setIsSharingLocation(false),
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Share My Location</Text>
        <Text style={styles.description}>
          {isSharingLocation
            ? 'You are visible to nearby users'
            : 'Enable to see and match with nearby users'}
        </Text>
      </View>
      <Switch
        value={isSharingLocation}
        onValueChange={handleToggle}
        trackColor={{ false: '#E0E0E0', true: '#A8DADC' }}
        thumbColor={isSharingLocation ? '#E63946' : '#f4f3f4'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  labelContainer: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D3557',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#666',
  },
});
