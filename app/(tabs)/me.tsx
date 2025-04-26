import { StyleSheet, Text, TextInput, View, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

export default function MeScreen() {
  const [aboutMe, setAboutMe] = useState('');
  const [allowDirectMessages, setAllowDirectMessages] = useState(false);
  const [sharePosition, setSharePosition] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>About Me</Text>
          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={6}
            placeholder="Tell other pilgrims about yourself..."
            value={aboutMe}
            onChangeText={setAboutMe}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.toggleContainer}>
            <Text style={styles.label}>Allow Direct Messages</Text>
            <Switch
              value={allowDirectMessages}
              onValueChange={setAllowDirectMessages}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={allowDirectMessages ? '#007AFF' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.toggleDescription}>
            When enabled, other pilgrims can send you direct messages
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.toggleContainer}>
            <Text style={styles.label}>Share my position</Text>
            <Switch
              value={sharePosition}
              onValueChange={setSharePosition}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={sharePosition ? '#007AFF' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.toggleDescription}>
            When enabled, other pilgrims can see your current location on the map
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 120,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
  },
}); 