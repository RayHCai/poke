/**
 * Edit profile screen
 */
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import Button from '../../components/Button';
import type { Profile, Sex } from '../../types';

const SEX_OPTIONS: Sex[] = ['male', 'female', 'nonbinary', 'other'];

export default function EditProfileScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [sex, setSex] = useState<Sex | undefined>(profile?.sex);
  const [pronouns, setPronouns] = useState(profile?.pronouns || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [instagramUsername, setInstagramUsername] = useState(profile?.instagram_username || '');

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    },
    onError: (error) => {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile');
    },
  });

  /**
   * Handle avatar upload
   * TODO: Implement actual image upload to Supabase Storage
   */
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      // TODO: Upload to Supabase Storage and get URL
      // For now, just set the local URI as placeholder
      setAvatarUrl(result.assets[0].uri);
      Alert.alert('Info', 'Image upload will be implemented in the next phase');
    }
  };

  const handleSave = () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return;
    }

    updateMutation.mutate({
      display_name: displayName.trim(),
      bio: bio.trim() || undefined,
      sex,
      pronouns: pronouns.trim() || undefined,
      avatar_url: avatarUrl || undefined,
      instagram_username: instagramUsername.trim() || undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <TouchableOpacity style={styles.avatarButton} onPress={handlePickImage}>
          <Text style={styles.avatarButtonText}>
            {avatarUrl ? 'Change Photo' : 'Add Photo'}
          </Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Display Name *</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="How should we call you?"
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              multiline
              numberOfLines={4}
              maxLength={300}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Sex</Text>
            <View style={styles.options}>
              {SEX_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.option,
                    sex === option && styles.optionSelected,
                  ]}
                  onPress={() => setSex(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      sex === option && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Pronouns</Text>
            <TextInput
              style={styles.input}
              value={pronouns}
              onChangeText={setPronouns}
              placeholder="e.g., she/her, he/him, they/them"
              maxLength={30}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Instagram Username</Text>
            <TextInput
              style={styles.input}
              value={instagramUsername}
              onChangeText={(text) => setInstagramUsername(text.replace('@', ''))}
              placeholder="username (without @)"
              maxLength={30}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helpText}>
              Will be shared with people you match with
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Save Changes"
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D3557',
  },
  avatarButton: {
    backgroundColor: '#A8DADC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D3557',
  },
  form: {
    gap: 20,
    marginBottom: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D3557',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 16,
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
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
});
