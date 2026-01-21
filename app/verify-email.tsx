import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { emailVerificationAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [success, setSuccess] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCodeChange = (text: string, index: number) => {
    // Si on colle un code complet (6 chiffres)
    if (text.length === 6) {
      const digits = text.split('').slice(0, 6);
      setCode(digits);
      inputRefs.current[5]?.focus();
      
      // Vérifier automatiquement si tous les chiffres sont présents
      if (digits.every(d => d !== '')) {
        verifyCode(digits.join(''));
      }
      return;
    }
    
    // Sinon, comportement normal (un seul chiffre)
    if (text.length > 1) text = text[0];
    
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every(digit => digit !== '')) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (fullCode: string) => {
    setLoading(true);
    try {
      await emailVerificationAPI.verifyCode(fullCode);
      setSuccess(true);
      await refreshUser();
      
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Code incorrect');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setSendingCode(true);
    try {
      const result = await emailVerificationAPI.resendCode();
      setCountdown(result.wait_time || 60);
      setCodeSent(true);
      Alert.alert('Succès', 'Code envoyé par email');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer le code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    try {
      const result = await emailVerificationAPI.resendCode();
      setCountdown(result.wait_time || 60);
      Alert.alert('Succès', 'Code renvoyé par email');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de renvoyer le code');
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={64} color="#10b981" strokeWidth={2} />
          </View>
          <Text style={styles.successTitle}>Email vérifié !</Text>
          <Text style={styles.successText}>Votre compte est maintenant actif</Text>
        </View>
      </View>
    );
  }

  // Écran d'accueil - Demande de vérification
  if (!codeSent) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Mail size={64} color="#000" strokeWidth={1.5} />
          </View>

          <Text style={styles.title}>{t('verifyYourAccount')}</Text>
          <Text style={styles.subtitle}>
            {t('toVerifyEmail')}{'\n'}
            <Text style={styles.email}>{user?.email}</Text>
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📧 {t('codeWillBeSent')}
            </Text>
            <Text style={styles.infoText}>
              ⏰ {t('codeValidFor24h')}
            </Text>
            <Text style={styles.infoText}>
              ✉️ {t('checkSpamFolder')}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.sendButton, sendingCode && styles.sendButtonDisabled]}
            onPress={handleSendCode}
            disabled={sendingCode}
          >
            {sendingCode ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>{t('sendVerificationCode')}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.helpText}>
            {t('youWillReceiveEmail')}
          </Text>
        </View>
      </View>
    );
  }

  // Écran de saisie du code
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setCodeSent(false)} style={styles.backButton}>
        <ArrowLeft size={24} color="#000" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Mail size={64} color="#000" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>{t('enterTheCode')}</Text>
        <Text style={styles.subtitle}>
          {t('codeSentTo')}{'\n'}
          <Text style={styles.email}>{user?.email}</Text>
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => inputRefs.current[index] = ref}
              style={[styles.codeInput, digit && styles.codeInputFilled]}
              value={digit}
              onChangeText={text => handleCodeChange(text, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        {loading && (
          <ActivityIndicator size="large" color="#000" style={styles.loader} />
        )}

        <TouchableOpacity
          onPress={handleResend}
          disabled={countdown > 0}
          style={styles.resendButton}
        >
          <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
            {countdown > 0 ? `Renvoyer dans ${countdown}s` : 'Renvoyer le code'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Le code expire dans 24 heures
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  email: {
    fontWeight: '700',
    color: '#000',
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
    paddingHorizontal: 5,
  },
  codeInput: {
    width: 52,
    height: 70,
    borderWidth: 2.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000',
    backgroundColor: '#fff',
  },
  codeInputFilled: {
    borderColor: '#000',
    backgroundColor: '#f9fafb',
  },
  loader: {
    marginVertical: 20,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  resendTextDisabled: {
    color: '#9ca3af',
  },
  helpText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000',
    marginBottom: 12,
  },
  successText: {
    fontSize: 18,
    color: '#6b7280',
  },
  infoBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 20,
    marginVertical: 30,
    gap: 12,
    width: '100%',
  },
  infoText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  sendButton: {
    backgroundColor: '#000',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
