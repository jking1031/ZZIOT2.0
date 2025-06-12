import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { createCommonStyles, DesignTokens } from '../styles/StyleGuide';

/**
 * 样式系统示例屏幕
 * 展示如何使用新的设计系统和样式组件
 */
const StyleExampleScreen = ({ navigation }) => {
  const { colors, isDarkMode, getStatusColor, withOpacity } = useTheme();
  const commonStyles = createCommonStyles(colors);

  const handleButtonPress = (type) => {
    Alert.alert('按钮点击', `您点击了${type}按钮`);
  };

  return (
    <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={commonStyles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 标题区域 */}
        <View style={[commonStyles.card, styles.titleSection]}>
          <Text style={[commonStyles.title, { color: colors.text }]}>
            样式系统示例
          </Text>
          <Text style={[commonStyles.subtitle, { color: colors.textSecondary }]}>
            展示新的设计系统组件
          </Text>
        </View>

        {/* 按钮示例 */}
        <View style={[commonStyles.card, styles.section]}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
            按钮样式
          </Text>
          
          <TouchableOpacity 
            style={[commonStyles.primaryButton, styles.buttonSpacing]}
            onPress={() => handleButtonPress('主要')}
          >
            <Text style={commonStyles.primaryButtonText}>主要按钮</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[commonStyles.secondaryButton, styles.buttonSpacing]}
            onPress={() => handleButtonPress('次要')}
          >
            <Text style={[commonStyles.secondaryButtonText, { color: colors.primary }]}>
              次要按钮
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[commonStyles.outlineButton, styles.buttonSpacing]}
            onPress={() => handleButtonPress('轮廓')}
          >
            <Text style={[commonStyles.outlineButtonText, { color: colors.primary }]}>
              轮廓按钮
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[commonStyles.textButton, styles.buttonSpacing]}
            onPress={() => handleButtonPress('文本')}
          >
            <Text style={[commonStyles.textButtonText, { color: colors.primary }]}>
              文本按钮
            </Text>
          </TouchableOpacity>
        </View>

        {/* 状态颜色示例 */}
        <View style={[commonStyles.card, styles.section]}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
            状态颜色
          </Text>
          
          <View style={styles.statusRow}>
            <View style={[styles.statusItem, { backgroundColor: colors.success }]}>
              <Text style={styles.statusText}>成功</Text>
            </View>
            <View style={[styles.statusItem, { backgroundColor: colors.warning }]}>
              <Text style={styles.statusText}>警告</Text>
            </View>
            <View style={[styles.statusItem, { backgroundColor: colors.error }]}>
              <Text style={styles.statusText}>错误</Text>
            </View>
            <View style={[styles.statusItem, { backgroundColor: colors.info }]}>
              <Text style={styles.statusText}>信息</Text>
            </View>
          </View>
        </View>

        {/* 卡片和列表示例 */}
        <View style={[commonStyles.card, styles.section]}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
            列表项
          </Text>
          
          <View style={[commonStyles.listItem, { borderBottomColor: colors.divider }]}>
            <Ionicons name="home" size={24} color={colors.primary} />
            <View style={commonStyles.listItemContent}>
              <Text style={[commonStyles.listItemTitle, { color: colors.text }]}>
                主页
              </Text>
              <Text style={[commonStyles.listItemSubtitle, { color: colors.textSecondary }]}>
                返回主页面
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>

          <View style={[commonStyles.listItem, { borderBottomColor: colors.divider }]}>
            <Ionicons name="settings" size={24} color={colors.primary} />
            <View style={commonStyles.listItemContent}>
              <Text style={[commonStyles.listItemTitle, { color: colors.text }]}>
                设置
              </Text>
              <Text style={[commonStyles.listItemSubtitle, { color: colors.textSecondary }]}>
                应用设置和偏好
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>
        </View>

        {/* 标签和徽章示例 */}
        <View style={[commonStyles.card, styles.section]}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
            标签和徽章
          </Text>
          
          <View style={styles.tagRow}>
            <View style={[commonStyles.tag, { backgroundColor: withOpacity(colors.primary, 0.1) }]}>
              <Text style={[commonStyles.tagText, { color: colors.primary }]}>主要标签</Text>
            </View>
            <View style={[commonStyles.tag, { backgroundColor: withOpacity(colors.success, 0.1) }]}>
              <Text style={[commonStyles.tagText, { color: colors.success }]}>成功标签</Text>
            </View>
            <View style={[commonStyles.tag, { backgroundColor: withOpacity(colors.warning, 0.1) }]}>
              <Text style={[commonStyles.tagText, { color: colors.warning }]}>警告标签</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.badgeContainer}>
              <Ionicons name="notifications" size={24} color={colors.text} />
              <View style={[commonStyles.badge, { backgroundColor: colors.error }]}>
                <Text style={commonStyles.badgeText}>3</Text>
              </View>
            </View>
            <View style={styles.badgeContainer}>
              <Ionicons name="mail" size={24} color={colors.text} />
              <View style={[commonStyles.badge, { backgroundColor: colors.primary }]}>
                <Text style={commonStyles.badgeText}>12</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 输入框示例 */}
        <View style={[commonStyles.card, styles.section]}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
            输入框
          </Text>
          
          <View style={commonStyles.inputContainer}>
            <Text style={[commonStyles.label, { color: colors.text }]}>用户名</Text>
            <View style={[commonStyles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
              <Text style={[commonStyles.inputText, { color: colors.textSecondary }]}>请输入用户名</Text>
            </View>
          </View>

          <View style={commonStyles.inputContainer}>
            <Text style={[commonStyles.label, { color: colors.text }]}>密码</Text>
            <View style={[commonStyles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
              <Text style={[commonStyles.inputText, { color: colors.textSecondary }]}>请输入密码</Text>
            </View>
          </View>
        </View>

        {/* 分隔线示例 */}
        <View style={[commonStyles.card, styles.section]}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
            分隔线
          </Text>
          
          <Text style={[commonStyles.body, { color: colors.textSecondary }]}>上方内容</Text>
          <View style={[commonStyles.divider, { backgroundColor: colors.divider }]} />
          <Text style={[commonStyles.body, { color: colors.textSecondary }]}>下方内容</Text>
        </View>

        {/* 加载和空状态示例 */}
        <View style={[commonStyles.card, styles.section]}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
            状态组件
          </Text>
          
          <View style={[commonStyles.emptyState, { backgroundColor: colors.surface }]}>
            <Ionicons name="document-outline" size={48} color={colors.textTertiary} />
            <Text style={[commonStyles.emptyStateTitle, { color: colors.text }]}>暂无数据</Text>
            <Text style={[commonStyles.emptyStateSubtitle, { color: colors.textSecondary }]}>
              当前没有可显示的内容
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: DesignTokens.spacing.md,
    paddingBottom: DesignTokens.spacing.xxl,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: DesignTokens.spacing.lg,
  },
  section: {
    marginBottom: DesignTokens.spacing.lg,
  },
  buttonSpacing: {
    marginBottom: DesignTokens.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: DesignTokens.spacing.sm,
  },
  statusItem: {
    flex: 1,
    paddingVertical: DesignTokens.spacing.sm,
    marginHorizontal: DesignTokens.spacing.xs,
    borderRadius: DesignTokens.borderRadius.sm,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: DesignTokens.spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: DesignTokens.spacing.lg,
    justifyContent: 'space-around',
  },
  badgeContainer: {
    position: 'relative',
    alignItems: 'center',
  },
});

export default StyleExampleScreen;