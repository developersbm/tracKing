import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import MainMenu from './screens/MainMenu';
import SecondPage from './screens/SecondPage';

type Route = 'MainMenu' | 'SecondPage';

export default function App() {
  const [route, setRoute] = useState<Route>('MainMenu');

  const renderRoute = () => {
    switch (route) {
      case 'SecondPage':
        return <SecondPage goTo={(r: Route | string) => setRoute(r as Route)} />;
      case 'MainMenu':
      default:
        return <MainMenu goTo={(r: Route | string) => setRoute(r as Route)} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderRoute()}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
