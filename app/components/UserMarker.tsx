/**
 * Custom marker for users on map
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Marker } from 'react-native-maps';
import type { NearbyUser } from '../types';

interface UserMarkerProps {
  user: NearbyUser;
  onPress: (user: NearbyUser) => void;
}

export default function UserMarker({ user, onPress }: UserMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: user.lat, longitude: user.lng }}
      onPress={() => onPress(user)}
    >
      <TouchableOpacity style={styles.marker} activeOpacity={0.8}>
        <View style={styles.avatar}>
          <Text style={styles.initial}>
            {user.display_name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.pulse} />
      </TouchableOpacity>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  initial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(230, 57, 70, 0.2)',
    zIndex: 1,
  },
});
