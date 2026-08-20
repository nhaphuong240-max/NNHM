import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BnplScreen } from '../screens/BnplScreen';
import { DealDetailScreen } from '../screens/DealDetailScreen';
import { DealsScreen } from '../screens/DealsScreen';
import { EsignScreen } from '../screens/EsignScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0F4C81' },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen name="Deals" component={DealsScreen} options={{ title: 'Buyer Deals' }} />
        <Stack.Screen name="DealDetail" component={DealDetailScreen} options={{ title: 'Deal' }} />
        <Stack.Screen name="Bnpl" component={BnplScreen} options={{ title: 'BNPL' }} />
        <Stack.Screen name="Esign" component={EsignScreen} options={{ title: 'E-sign' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
