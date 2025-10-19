/**
 * User profile view screen
 */
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import Button from '../../components/Button';
import type { Profile } from '../../types';

export default function ProfileScreen({
    navigation,
}: {
    navigation: { navigate: (screen: string) => void };
}) {
    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile'],
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

    const handleSignOut = async () => {
        await supabase.auth.signOut();
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        {profile?.avatar_url ? (
                            <Image
                                source={{ uri: profile.avatar_url }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {profile?.display_name
                                        ?.charAt(0)
                                        .toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.displayName}>
                        {profile?.display_name}
                    </Text>
                    <Text style={styles.username}>@{profile?.username}</Text>
                    {profile?.pronouns && (
                        <Text style={styles.pronouns}>{profile.pronouns}</Text>
                    )}
                </View>

                {profile?.bio && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <Text style={styles.bio}>{profile.bio}</Text>
                    </View>
                )}

                <View style={styles.actions}>
                    <Button
                        title="Edit Profile"
                        onPress={() => navigation.navigate('EditProfile')}
                        variant="primary"
                    />
                    <Button
                        title="Preferences"
                        onPress={() => navigation.navigate('Preferences')}
                        variant="secondary"
                    />
                    <Button
                        title="Sign Out"
                        onPress={handleSignOut}
                        variant="outline"
                    />
                </View>
            </ScrollView>
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
    },
    avatarPlaceholder: {
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
        marginBottom: 4,
    },
    pronouns: {
        fontSize: 14,
        color: '#999',
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
    actions: {
        gap: 12,
    },
});
