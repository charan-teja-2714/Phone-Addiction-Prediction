import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HomeScreen } from '../screens/HomeScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { QuestionnaireScreen } from '../screens/QuestionnaireScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Colors } from '../theme';

const Tab = createBottomTabNavigator();

/**
 * Tab icon mapping — uses only verified MaterialCommunityIcons names.
 * Each tab has a distinct filled (focused) and outlined (unfocused) variant.
 */
const TAB_CONFIG = {
  Home: {
    focused: 'home-variant',
    unfocused: 'home-variant-outline',
    label: 'Home',
  },
  Insights: {
    focused: 'chart-areaspline',
    unfocused: 'chart-areaspline-variant',
    label: 'Insights',
  },
  Questionnaire: {
    focused: 'clipboard-check',
    unfocused: 'clipboard-check-outline',
    label: 'Check-in',
  },
  Profile: {
    focused: 'account-circle',
    unfocused: 'account-circle-outline',
    label: 'Profile',
  },
};

export const AppNavigator = () => (
  <NavigationContainer>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const config = TAB_CONFIG[route.name];
          return (
            <Icon
              name={focused ? config.focused : config.unfocused}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: TAB_CONFIG.Home.label }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ tabBarLabel: TAB_CONFIG.Insights.label }}
      />
      <Tab.Screen
        name="Questionnaire"
        component={QuestionnaireScreen}
        options={{ tabBarLabel: TAB_CONFIG.Questionnaire.label }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: TAB_CONFIG.Profile.label }}
      />
    </Tab.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.divider,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 6,
    paddingTop: 4,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
