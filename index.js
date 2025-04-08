import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './App';

// 确保同时使用两种方式注册应用程序入口点
AppRegistry.registerComponent('main', () => App);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
