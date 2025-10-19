/**
 * User preferences screen
 */
import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import Button from '../../components/Button';
import type { Preferences, Sex } from '../../types';

const SEX_OPTIONS: Sex[] = ['male', 'female', 'nonbinary', 'other'];
const DISTANCE_OPTIONS = [1, 3, 5, 10, 25, 50];

export default function PreferencesScreen({
    navigation,
}: {
    navigation: { goBack: () => void };
}) {
    const queryClient = useQueryClient();

    const { data: preferences } = useQuery({
        queryKey: ['preferences'],
        queryFn: async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('preferences')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            return data as Preferences;
        },
    });

    const [preferredSex, setPreferredSex] = useState<Sex[]>(
        preferences?.preferred_sex || []
    );
    const [maxDistance, setMaxDistance] = useState(
        preferences?.max_distance_km || 5
    );
    const [isVisible, setIsVisible] = useState(preferences?.is_visible ?? true);

    const updateMutation = useMutation({
        mutationFn: async (updates: Partial<Preferences>) => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('preferences')
                .update(updates)
                .eq('user_id', user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['preferences'] });
            Alert.alert('Success', 'Preferences updated successfully');
            navigation.goBack();
        },
        onError: (error) => {
            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'Failed to update preferences'
            );
        },
    });

    const toggleSex = (sex: Sex) => {
        setPreferredSex((current) =>
            current.includes(sex)
                ? current.filter((s) => s !== sex)
                : [...current, sex]
        );
    };

    const handleSave = () => {
        if (preferredSex.length === 0) {
            Alert.alert('Error', 'Please select at least one preference');
            return;
        }

        updateMutation.mutate({
            preferred_sex: preferredSex,
            max_distance_km: maxDistance,
            is_visible: isVisible,
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Preferences</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>I'm interested in</Text>
                    <View style={styles.options}>
                        {SEX_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.option,
                                    preferredSex.includes(option) &&
                                        styles.optionSelected,
                                ]}
                                onPress={() => toggleSex(option)}
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        preferredSex.includes(option) &&
                                            styles.optionTextSelected,
                                    ]}
                                >
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Maximum distance: {maxDistance} km
                    </Text>
                    <View style={styles.distances}>
                        {DISTANCE_OPTIONS.map((distance) => (
                            <TouchableOpacity
                                key={distance}
                                style={[
                                    styles.distanceOption,
                                    maxDistance === distance &&
                                        styles.distanceSelected,
                                ]}
                                onPress={() => setMaxDistance(distance)}
                            >
                                <Text
                                    style={[
                                        styles.distanceText,
                                        maxDistance === distance &&
                                            styles.distanceTextSelected,
                                    ]}
                                >
                                    {distance}km
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.switchRow}>
                        <View style={styles.switchLabel}>
                            <Text style={styles.sectionTitle}>
                                Visible to others
                            </Text>
                            <Text style={styles.switchDescription}>
                                When off, you won't appear on the map
                            </Text>
                        </View>
                        <Switch
                            value={isVisible}
                            onValueChange={setIsVisible}
                            trackColor={{ false: '#E0E0E0', true: '#A8DADC' }}
                            thumbColor={isVisible ? '#E63946' : '#f4f3f4'}
                        />
                    </View>
                </View>

                <View style={styles.actions}>
                    <Button
                        title="Save Preferences"
                        onPress={handleSave}
                        loading={updateMutation.isPending}
                    />
                    <Button
                        title="Cancel"
                        onPress={() => navigation.goBack()}
                        variant="outline"
                        disabled={updateMutation.isPending}
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
    content: {
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1D3557',
        marginBottom: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1D3557',
        marginBottom: 12,
    },
    options: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    option: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
    },
    optionSelected: {
        backgroundColor: '#E63946',
        borderColor: '#E63946',
    },
    optionText: {
        fontSize: 16,
        color: '#666',
        textTransform: 'capitalize',
    },
    optionTextSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    distances: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    distanceOption: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
    },
    distanceSelected: {
        backgroundColor: '#A8DADC',
        borderColor: '#A8DADC',
    },
    distanceText: {
        fontSize: 14,
        color: '#666',
    },
    distanceTextSelected: {
        color: '#1D3557',
        fontWeight: '600',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switchLabel: {
        flex: 1,
        marginRight: 16,
    },
    switchDescription: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    actions: {
        gap: 12,
        marginTop: 16,
    },
});
