/**
 * Reusable Button component
 */
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const getVariantStyles = (): ViewStyle => {
    const base: ViewStyle = {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    };

    switch (variant) {
      case 'primary':
        return { ...base, backgroundColor: '#E63946' };
      case 'secondary':
        return { ...base, backgroundColor: '#A8DADC' };
      case 'outline':
        return { ...base, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E63946' };
      case 'danger':
        return { ...base, backgroundColor: '#DC2626' };
      default:
        return base;
    }
  };

  const getTextStyles = (): TextStyle => {
    const base: TextStyle = {
      fontSize: 16,
      fontWeight: '600',
    };

    if (variant === 'outline') {
      return { ...base, color: '#E63946' };
    }
    return { ...base, color: '#FFFFFF' };
  };

  return (
    <TouchableOpacity
      style={[
        getVariantStyles(),
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#E63946' : '#FFFFFF'} />
      ) : (
        <Text style={[getTextStyles(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
