import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

type Props = {
  goTo: (route: string) => void;
};

export default function MainMenu({ goTo }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Main Menu</Text>
      <View style={styles.buttonRow}>
        <Button title="Open Second Page" onPress={() => goTo('SecondPage')} />
      </View>
      <View style={styles.buttonRow}>
        <Button title="Refresh" onPress={() => goTo('MainMenu')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  buttonRow: {
    width: '100%',
    marginVertical: 8,
  },
});
