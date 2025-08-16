import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import AudioScreen from './src/screens/AudioScreen';
import ReviewScreen from './src/screens/ReviewScreen';

export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Audio: { photos: string[] };
  Review: { photos: string[]; audioUri?: string; description?: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1976d2',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Brecho AI Intake' }}
          />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{ title: 'Fotografar Itens' }}
          />
          <Stack.Screen
            name="Audio"
            component={AudioScreen}
            options={{ title: 'Gravar Descrição' }}
          />
          <Stack.Screen
            name="Review"
            component={ReviewScreen}
            options={{ title: 'Revisar e Enviar' }}
          />
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
