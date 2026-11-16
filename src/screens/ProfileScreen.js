import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { SelectField } from '../components/SelectField';
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';
import { useRegistration } from '../hooks/useRegistration';
import { driverService } from '../services/driverService';
import { vehicleService } from '../services/vehicleService';
import { documentService } from '../services/documentService';

const LANGUAGES = [
  { label: 'Español', value: 'es' },
  { label: 'English', value: 'en' },
];

const STATUS_LABEL = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

const PhotoPreview = ({ label, uri }) => (
  <View style={styles.photoBlock}>
    <Text style={styles.photoLabel}>{label}</Text>
    {uri ? (
      <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
    ) : (
      <View style={styles.photoEmpty}>
        <Text style={styles.photoEmptyText}>Sin foto</Text>
      </View>
    )}
  </View>
);

export const ProfileScreen = ({ navigation }) => {
  const { activeDriverId, registrationData, resetRegistration } = useRegistration();
  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [docs, setDocs] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('es');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeDriverId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const unsubscribe = driverService.subscribeToDriver(activeDriverId, (data) => {
      if (cancelled) return;
      setDriver(data);
      setFullName(data?.fullName || registrationData?.fullName || '');
      setPhone(data?.phone || registrationData?.phone || '');
      setLanguage(data?.language || registrationData?.language || 'es');
      setLoading(false);
    });

    (async () => {
      try {
        const [v, d] = await Promise.all([
          vehicleService.getPrimaryVehicleByDriverId(activeDriverId),
          documentService.getPrimaryDocumentByDriverId(activeDriverId),
        ]);
        if (cancelled) return;
        setVehicle(v);
        setDocs(d);
      } catch (err) {
        console.warn('Perfil: no se pudieron cargar vehículo/documentos', err.message);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeDriverId]);

  const profilePhoto = driver?.profilePhoto || registrationData?.profilePhoto || '';
  const vehiclePhoto = vehicle?.vehiclePhoto || registrationData?.vehiclePhoto || '';
  const licensePhoto = docs?.licensePhoto || registrationData?.licensePhoto || '';
  const soatPhoto = docs?.soatPhoto || registrationData?.soatPhoto || '';
  const techPhoto =
    docs?.technicalInspectionPhoto || registrationData?.techInspectionPhoto || '';

  const handleSave = async () => {
    if (!activeDriverId) return;
    setSaving(true);
    try {
      await driverService.updateDriver(activeDriverId, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        language,
      });
      Alert.alert('Perfil actualizado', 'Los cambios se guardaron correctamente.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Reiniciar el registro local de este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await resetRegistration();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={commonStyles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={commonStyles.title}>Perfil y configuración</Text>
        <Text style={commonStyles.subtitle}>
          Estado: {STATUS_LABEL[driver?.status] || driver?.status || 'Pendiente'} ·{' '}
          {driver?.email || registrationData?.email || 'Sin correo'}
        </Text>

        <View style={styles.hero}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Text style={styles.avatarInitial}>
                {(fullName || 'C').trim().charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.heroText}>
            <Text style={styles.heroName}>{fullName || 'Conductor'}</Text>
            <Text style={styles.heroMeta}>
              C.C. {driver?.documentNumber || registrationData?.documentNumber || '—'}
            </Text>
          </View>
        </View>

        <AppInput label="Nombre completo" value={fullName} onChangeText={setFullName} />
        <AppInput label="Celular" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <AppInput
          label="Correo"
          value={driver?.email || registrationData?.email || ''}
          editable={false}
        />
        <AppInput
          label="Documento"
          value={driver?.documentNumber || registrationData?.documentNumber || ''}
          editable={false}
        />
        <AppInput
          label="Fecha de nacimiento"
          value={driver?.birthDate || registrationData?.birthDate || ''}
          editable={false}
        />
        <AppInput
          label="Género"
          value={driver?.gender || registrationData?.gender || ''}
          editable={false}
        />
        <SelectField
          label="Idioma"
          value={language}
          options={LANGUAGES}
          onChange={setLanguage}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Foto de perfil</Text>
          <PhotoPreview label="Tu foto" uri={profilePhoto} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehículo</Text>
          <Text style={styles.cardText}>
            {(vehicle?.brand || registrationData?.brand || '—') +
              ' ' +
              (vehicle?.model || registrationData?.model || '')}
          </Text>
          <Text style={styles.cardText}>
            Placa: {vehicle?.plate || registrationData?.plate || '—'} · Color:{' '}
            {vehicle?.color || registrationData?.color || '—'}
          </Text>
          <Text style={styles.cardText}>
            Año: {vehicle?.year || registrationData?.year || '—'} · Cupos:{' '}
            {vehicle?.passengerCapacity || registrationData?.passengerCapacity || '—'}
          </Text>
          <PhotoPreview label="Foto del vehículo" uri={vehiclePhoto} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Documentos</Text>
          <Text style={styles.cardText}>
            Licencia: {docs?.licenseNumber || registrationData?.licenseNumber || '—'}
          </Text>
          <Text style={styles.cardText}>
            Vence: {docs?.licenseExpiration || registrationData?.licenseExpiry || '—'}
          </Text>
          <PhotoPreview label="Licencia" uri={licensePhoto} />
          <PhotoPreview label="SOAT" uri={soatPhoto} />
          <PhotoPreview label="Revisión técnico-mecánica" uri={techPhoto} />
        </View>

        <AppButton
          title="Abrir registro"
          variant="outline"
          onPress={() => navigation.navigate('MiRegistro')}
        />
        <AppButton
          title={saving ? 'Guardando...' : 'Guardar cambios'}
          onPress={handleSave}
          disabled={saving}
        />
        <AppButton title="Cerrar sesión" variant="danger" onPress={handleLogout} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceStrong,
  },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...typography.title, fontSize: 28 },
  heroText: { flex: 1, gap: 2 },
  heroName: { ...typography.title, fontSize: 20 },
  heroMeta: { ...typography.caption, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.label },
  cardText: { ...typography.caption, color: colors.textMuted },
  photoBlock: { gap: spacing.xs },
  photoLabel: { ...typography.caption, color: colors.textMuted },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceStrong,
  },
  photoEmpty: {
    width: '100%',
    height: 100,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyText: { ...typography.caption, color: colors.textSubtle },
});

export default ProfileScreen;
