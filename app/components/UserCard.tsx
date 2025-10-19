/**
 * User card component for bottom sheet preview
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NearbyUser } from '../types';

interface UserCardProps {
  user: NearbyUser;
  onViewProfile: () => void;
}

export default function UserCard({ user, onViewProfile }: UserCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={
        () => {
            console.info('Running for onViewProfile ', user);
            onViewProfile();
        }
    } activeOpacity={0.8}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user.display_name?.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{user.display_name}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>
            {user.distance_km.toFixed(1)} km away
          </Text>
        </View>
      </View>

      <View style={styles.arrow}>
        <Text style={styles.arrowText}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D3557',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  distanceBadge: {
    backgroundColor: '#A8DADC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D3557',
  },
  arrow: {
    paddingLeft: 8,
  },
  arrowText: {
    fontSize: 32,
    color: '#999',
  },
});
