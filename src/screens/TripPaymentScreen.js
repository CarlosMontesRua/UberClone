import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';
import { tripService } from '../services/tripService';
import { earningsService } from '../services/earningsService';
import { paymentService } from '../services/paymentService';
import { useRegistration } from '../hooks/useRegistration';
import { useTrip } from '../context/TripContext';
import { PRICING } from '../config/pricing';

/**
 * Cobro: efectivo o Mercado Pago Checkout Pro (backend + WebBrowser).
 */
export const TripPaymentScreen = ({ navigation, route }) => {
  const tripFromParams = route?.params?.trip;
  const { lastCompletedTrip, clearPaymentTrip } = useTrip();
  const { activeDriverId } = useRegistration();
  const trip = tripFromParams || lastCompletedTrip;
  const [busy, setBusy] = useState(false);

  if (!trip) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={commonStyles.center}>
          <Text style={commonStyles.subtitle}>No hay viaje para cobrar.</Text>
          <AppButton title="Volver" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const recordPaid = async (paymentMethod, paymentId) => {
    await tripService.changeTripStatus(trip.id, 'paid', {
      paymentMethod,
      paymentStatus: 'paid',
      paymentId: paymentId || `PAY-${Date.now()}`,
    });
    await earningsService.recordEarnings({
      driverId: activeDriverId,
      tripId: trip.id,
      fare: trip.fare,
      commission: trip.commission,
      tip: trip.tip || 0,
      paymentMethod,
    });
    clearPaymentTrip();
  };

  const handleCashReceived = async () => {
    setBusy(true);
    try {
      await recordPaid('cash', `CASH-${Date.now()}`);
      Alert.alert(
        'Cobro en efectivo registrado',
        `Comisión (${Math.round(PRICING.commissionRate * 100)}%) descontada del saldo.`,
      );
      navigation.navigate('Home');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleMercadoPago = async () => {
    setBusy(true);
    try {
      const result = await paymentService.startMercadoPagoCheckout({
        tripId: trip.id,
        amount: trip.fare,
        title: `Viaje ${trip.origin?.address || ''} → ${trip.destination?.address || ''}`,
      });

      if (result.approved || result.browserResult?.type === 'success') {
        await recordPaid('mercadopago', result.preferenceId || `MP-${Date.now()}`);
        Alert.alert('Pago Mercado Pago', 'Cobro registrado como Aprobado (prueba).');
        navigation.navigate('Home');
        return;
      }

      if (result.browserResult?.type === 'cancel') {
        Alert.alert('Checkout cerrado', 'No se completó el pago. Puedes reintentar.');
        return;
      }

      // En Expo Go a veces vuelve dismiss sin URL: pedir confirmación manual
      Alert.alert(
        '¿Completaste el pago de prueba?',
        'Si pagaste con la tarjeta de prueba en Mercado Pago, confirma para marcar el viaje como pagado.',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Sí, pagado',
            onPress: async () => {
              await recordPaid('mercadopago', result.preferenceId || `MP-${Date.now()}`);
              navigation.navigate('Home');
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert(
        'Error Mercado Pago',
        `${err.message}\n\n¿Está corriendo el backend?\nnpm run server\nAPI: ${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const paymentLabel =
    trip.paymentStatus === 'paid'
      ? 'Aprobado'
      : trip.paymentMethod === 'cash'
        ? 'Efectivo (pendiente de confirmar)'
        : 'Pendiente';

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={commonStyles.title}>Cobro y resumen</Text>
        <Text style={commonStyles.subtitle}>
          {trip.origin?.address} → {trip.destination?.address}
        </Text>

        <View style={styles.card}>
          <Row label="Tarifa final" value={`$${Number(trip.fare || 0).toLocaleString('es-CO')} COP`} />
          <Row
            label={`Comisión (${Math.round((trip.commissionRate || PRICING.commissionRate) * 100)}%)`}
            value={`-$${Number(trip.commission || 0).toLocaleString('es-CO')} COP`}
            danger
          />
          <Row
            label="Propina"
            value={`+$${Number(trip.tip || 0).toLocaleString('es-CO')} COP`}
            accent
          />
          <Row
            label="Ganancia neta"
            value={`$${Number(trip.driverEarnings || 0).toLocaleString('es-CO')} COP`}
            bold
          />
          <Row label="Estado del pago" value={paymentLabel} />
          <Row label="Método preferido" value={trip.paymentMethod || 'cash'} />
        </View>

        {trip.paymentStatus !== 'paid' ? (
          <>
            <AppButton
              title={busy ? 'Procesando...' : 'Pagar con Mercado Pago (prueba)'}
              onPress={handleMercadoPago}
              disabled={busy}
            />
            <AppButton
              title={busy ? 'Procesando...' : 'Confirmar cobro en efectivo'}
              variant="outline"
              onPress={handleCashReceived}
              disabled={busy}
            />
          </>
        ) : (
          <Text style={{ textAlign: 'center', color: colors.accent, fontWeight: '700' }}>
            ✓ Pago registrado
          </Text>
        )}

        <AppButton title="Volver al inicio" variant="outline" onPress={() => navigation.navigate('Home')} />
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({ label, value, danger, accent, bold }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text
      style={[
        styles.value,
        danger && { color: colors.danger },
        accent && { color: colors.accent },
        bold && { fontWeight: '800' },
      ]}
    >
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { ...typography.caption, color: colors.textMuted, flex: 1 },
  value: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.text },
});

export default TripPaymentScreen;
