import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors, ColorUtils } from '../styles/StyleGuide';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
  colors: {},
  isDarkMode: false
});

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [followSystem, setFollowSystem] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setFollowSystem(false);
    // 保存用户偏好
    AsyncStorage.setItem('theme_preference', JSON.stringify({
      isDarkMode: !isDarkMode,
      followSystem: false
    }));
  };

  const toggleFollowSystem = () => {
    const newFollowSystem = !followSystem;
    setFollowSystem(newFollowSystem);
    if (newFollowSystem) {
      const systemColorScheme = Appearance.getColorScheme();
      setIsDarkMode(systemColorScheme === 'dark');
    }
    // 保存用户偏好
    AsyncStorage.setItem('theme_preference', JSON.stringify({
      isDarkMode: newFollowSystem ? (Appearance.getColorScheme() === 'dark') : isDarkMode,
      followSystem: newFollowSystem
    }));
  };

  // 初始化主题设置
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem('theme_preference');
        if (savedPreference) {
          const { isDarkMode: savedDarkMode, followSystem: savedFollowSystem } = JSON.parse(savedPreference);
          setFollowSystem(savedFollowSystem);
          if (savedFollowSystem) {
            const systemColorScheme = Appearance.getColorScheme();
            setIsDarkMode(systemColorScheme === 'dark');
          } else {
            setIsDarkMode(savedDarkMode);
          }
        } else {
          // 默认跟随系统
          const systemColorScheme = Appearance.getColorScheme();
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
        // 回退到系统主题
        const systemColorScheme = Appearance.getColorScheme();
        setIsDarkMode(systemColorScheme === 'dark');
      }
    };

    initializeTheme();
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (followSystem) {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setIsDarkMode(colorScheme === 'dark');
      });
      return () => subscription?.remove();
    }
  }, [followSystem]);

  // 获取当前主题颜色
  const colors = getThemeColors(isDarkMode);

  const theme = {
    isDarkMode,
    toggleTheme,
    followSystem,
    toggleFollowSystem,
    colors,
    // 颜色工具函数
    ColorUtils,
    // 便捷方法
    getStatusColor: (status) => ColorUtils.getStatusColor(status, colors),
    withOpacity: (color, opacity) => ColorUtils.withOpacity(color, opacity),
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// 导出主题相关工具
export { getThemeColors, ColorUtils };