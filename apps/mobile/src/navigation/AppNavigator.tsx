import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { LeadsScreen } from '../screens/LeadsScreen';
import { BookingScreen } from '../screens/BookingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { brand } from '../theme/tokens';

export type RootTabParamList = {
  Home: undefined;
  Leads: undefined;
  Booking: { leadId?: string; leadName?: string } | undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 10, fontWeight: focused ? '700' : '500', color: focused ? brand.primary : brand.muted }}>
      {label}
    </Text>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: brand.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          tabBarActiveTintColor: brand.primary,
          tabBarInactiveTintColor: brand.muted,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'WEREAL Agent',
            tabBarLabel: 'Trang chủ',
            tabBarIcon: ({ focused }) => <TabIcon label="⌂" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Leads"
          component={LeadsScreen}
          options={{
            title: 'Leads',
            tabBarIcon: ({ focused }) => <TabIcon label="◎" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Booking"
          component={BookingScreen}
          options={{
            title: 'Giữ chỗ',
            tabBarIcon: ({ focused }) => <TabIcon label="✓" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Cá nhân',
            tabBarIcon: ({ focused }) => <TabIcon label="☺" focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
