import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

if (__DEV__ && Platform.OS === 'web') {
  // React Grab: hold Cmd/Ctrl + C and click any element to copy file/line context for AI coding agents
  import('react-grab');
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

