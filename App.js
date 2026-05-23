import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, TouchableOpacity, StyleSheet, Animated, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

import { initDB } from './src/services/db';
import { UserProvider, useUser } from './src/context/UserContext';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import WalletManagerScreen from './src/screens/WalletManagerScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import GoalManagerScreen from './src/screens/GoalManagerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AIChatScreen from './src/screens/AIChatScreen';
import TransferScreen from './src/screens/TransferScreen';
import BudgetManagerScreen from './src/screens/BudgetManagerScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="Statistics" component={StatisticsScreen} options={{ title: 'Stats' }} />
        <Tab.Screen
          name="AddAction"
          component={EmptyTabScreen}
          options={{ title: 'Add' }}
        />
        <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Tab.Navigator>
  );
}

const TAB_META = {
  Home: { label: 'Home', icon: 'home' },
  Statistics: { label: 'Stats', icon: 'pulse' },
  AddAction: { label: 'Add', icon: 'add-circle' },
  History: { label: 'History', icon: 'server' },
  Settings: { label: 'Settings', icon: 'cog' },
};

function AppTabBar({ state, descriptors, navigation }) {
  return (
    <View pointerEvents="box-none" style={styles.tabBarOuter}>
      <View style={styles.tabBarShadow}>
        <BlurView intensity={82} tint="light" style={styles.tabBarBlur}>
          <View style={styles.tabBarContent}>
            {state.routes.map((route, index) => {
              const options = descriptors[route.key].options;
              const focused = state.index === index;
              const meta = TAB_META[route.name] || { label: options.title || route.name, icon: 'ellipse' };

              const onPress = () => {
                if (route.name === 'AddAction') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.getParent()?.navigate('AddTransaction');
                  return;
                }

                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  Haptics.selectionAsync();
                  navigation.navigate(route.name, route.params);
                }
              };

              return (
                <TabBarItem
                  key={route.key}
                  focused={focused}
                  icon={meta.icon}
                  label={meta.label}
                  isAction={route.name === 'AddAction'}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                />
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

function TabBarItem({ focused, icon, label, isAction, accessibilityLabel, testID, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const color = focused || isAction ? '#4F46E5' : '#8EA0BA';
  const iconName = focused ? icon : `${icon}-outline`;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel || label}
      testID={testID}
      activeOpacity={0.86}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive, { transform: [{ scale }] }]}>
        <Ionicons name={iconName} size={24} color={color} />
      </Animated.View>
      <Text style={[styles.tabLabel, (focused || isAction) && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function EmptyTabScreen() {
  return null;
}

function AppNavigator() {
  const { user } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => { initDB(); }, []);

  if (showOnboarding) {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <OnboardingScreen onFinish={() => setShowOnboarding(false)} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      {user ? (
        <Stack.Navigator key="app" screenOptions={{ headerShown: false, presentation: 'modal' }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
          <Stack.Screen name="Wallets" component={WalletManagerScreen} />
          <Stack.Screen name="Goals" component={GoalManagerScreen} />
          <Stack.Screen name="Transfer" component={TransferScreen} />
          <Stack.Screen name="Budget" component={BudgetManagerScreen} />
          <Stack.Screen name="AIChat" component={AIChatScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator key="auth" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppNavigator />
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    height: 76,
  },
  tabBarShadow: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { height: 8 },
    elevation: 18,
  },
  tabBarBlur: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
  },
  tabItem: {
    flex: 1,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrap: {
    width: 38,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabIconWrapActive: {
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    color: '#8EA0BA',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
  },
  tabLabelActive: {
    color: '#4F46E5',
  },
});
