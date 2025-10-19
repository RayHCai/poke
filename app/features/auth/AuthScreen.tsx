/**
 * Authentication screen with email magic link
 */
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import { supabase } from '../../lib/supabase';
import SelfieOnboardingScreen from './SelfieOnboardingScreen';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showSelfieOnboarding, setShowSelfieOnboarding] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);

  /**
   * Handle email/password sign in
   */
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle email/password sign up
   */
  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: undefined, // Skip email verification for now
        },
      });

      if (error) throw error;

      if (data.user) {
        // User created successfully - show selfie onboarding
        setNewUserId(data.user.id);
        setShowSelfieOnboarding(true);
      } else {
        Alert.alert(
          'Success',
          'Account created! Please check your email to verify your account.',
          [{ text: 'OK', onPress: () => setIsSignUp(false) }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelfieComplete = () => {
    // Selfie onboarding complete - user is now authenticated
    setShowSelfieOnboarding(false);
    setNewUserId(null);
    // The session will be detected by AppNavigator
  };

  // Show selfie onboarding after successful signup
  if (showSelfieOnboarding && newUserId) {
    return (
      <SelfieOnboardingScreen
        userId={newUserId}
        onComplete={handleSelfieComplete}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>PokeDate</Text>
        <Text style={styles.subtitle}>Find your match nearby</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />

          <Button
            title={isSignUp ? 'Sign Up' : 'Sign In'}
            onPress={isSignUp ? handleSignUp : handleSignIn}
            loading={loading}
            style={styles.button}
          />

          <Button
            title={isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            onPress={() => setIsSignUp(!isSignUp)}
            variant="outline"
            disabled={loading}
          />
        </View>

        <Text style={styles.footer}>
          By continuing, you agree to our Terms and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1FAEE',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#E63946',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#1D3557',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  button: {
    marginTop: 8,
  },
  footer: {
    marginTop: 32,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
