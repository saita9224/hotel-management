import React from 'react';
import { View, Text, Image, StyleSheet, useColorScheme } from 'react-native';
import {Colors} from '../theme/colors';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Logo section */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/hoppers_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: theme.accent }]}>HOPPERS</Text>
        <Text style={[styles.subtitle, { color: theme.text }]}>HOTEL & BUTCHERY</Text>
        <Text style={[styles.motto, { color: theme.tabBarActive }]}>STAY. SAVOR. SMILE.</Text>
      </View>

      {/* Summary section (new addition) */}
      <View style={[styles.summaryCard, { borderColor: theme.accent }]}>
        <Text style={[styles.summaryTitle, { color: theme.accent }]}>TODAY'S OVERVIEW</Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryItem, { color: theme.text }]}>🧾 Orders:</Text>
          <Text style={[styles.summaryValue, { color: theme.tabBarActive }]}>24</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryItem, { color: theme.text }]}>📦 Inventory Checks:</Text>
          <Text style={[styles.summaryValue, { color: theme.tabBarActive }]}>5</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryItem, { color: theme.text }]}>💰 Expenses:</Text>
          <Text style={[styles.summaryValue, { color: theme.tabBarActive }]}>KSh 2,450</Text>
        </View>
      </View>

      {/* Reminders section */}
      <View style={[styles.reminderCard, { borderColor: theme.accent }]}>
        <Text style={[styles.reminderTitle, { color: theme.accent }]}>REMINDERS</Text>
        <Text style={[styles.reminderItem, { color: theme.text }]}>• Prepare morning tea</Text>
        <Text style={[styles.reminderItem, { color: theme.text }]}>• Stock check</Text>
        <Text style={[styles.reminderItem, { color: theme.text }]}>• Guest arrival at 3PM</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    letterSpacing: 1,
  },
  motto: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  summaryTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryItem: {
    fontSize: 14,
  },
  summaryValue: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  reminderCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    width: '100%',
  },
  reminderTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  reminderItem: {
    fontSize: 14,
    marginBottom: 4,
  },
});
