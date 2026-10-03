/**
 * Selfie Onboarding Screen
 * Shown after successful signup to capture user's selfie and get rating
 */
import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelfieCapture from '../../components/SelfieCapture';
import Button from '../../components/Button';

interface SelfieOnboardingScreenProps {
  userId: string;
  onComplete: () => void;
}

export default function SelfieOnboardingScreen({
  userId,
  onComplete,
}: SelfieOnboardingScreenProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const handleSelfieUploaded = (_rating: number) => {
    Alert.alert(
      'Success!',
      'Your profile is now complete. Get ready to meet amazing people nearby!',
      [{ text: 'Get Started', onPress: onComplete }]
    );
  };

  const handleSkip = async () => {
    Alert.alert(
      'Skip Selfie?',
      'You can always add a selfie later in your profile settings. However, profiles with selfies get more matches!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            setIsSkipping(true);
            // Continue without rating
            onComplete();
          },
        },
      ]
    );
  };

  if (showCamera) {
    return (
      <SelfieCapture
        userId={userId}
        onSelfieUploaded={handleSelfieUploaded}
        onSkip={handleSkip}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>📸</Text>
        <Text style={styles.title}>One More Step!</Text>
        <Text style={styles.subtitle}>
          Take a quick selfie to complete your profile and start matching with people
          nearby.
        </Text>

        <View style={styles.benefits}>
          <BenefitItem
            icon="✨"
            text="Profiles with photos get 10x more matches"
          />
          <BenefitItem
            icon="🔒"
            text="Your photo is securely stored and private"
          />
          <BenefitItem icon="⚡" text="Takes less than 30 seconds" />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Take Selfie"
            onPress={() => setShowCamera(true)}
            style={styles.button}
          />
          <Button
            title="Skip for Now"
            onPress={handleSkip}
            variant="outline"
            disabled={isSkipping}
          />
        </View>

        <Text style={styles.privacy}>
          We respect your privacy. Your photo will only be shown to potential matches
          you approve.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function BenefitItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.benefitItem}>
      <Text style={styles.benefitIcon}>{icon}</Text>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1FAEE',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1D3557',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
  },
  benefits: {
    marginBottom: 40,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  benefitText: {
    flex: 1,
    fontSize: 16,
    color: '#1D3557',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    marginBottom: 0,
  },
  privacy: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
  },
});
