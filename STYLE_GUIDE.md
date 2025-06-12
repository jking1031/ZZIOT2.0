# 样式系统优化指南

## 概述

本项目已经完成了全面的样式系统优化，引入了现代化的设计系统和统一的样式管理。新的样式系统提供了更好的一致性、可维护性和用户体验。

## 主要改进

### 1. 设计令牌 (Design Tokens)

引入了统一的设计令牌系统，包括：

- **间距系统**: 从 4px 到 64px 的标准化间距
- **字体系统**: 标准化的字体大小和行高
- **圆角系统**: 统一的边框圆角规范
- **阴影系统**: 分层的阴影效果
- **动画系统**: 标准化的动画时长和缓动函数

```javascript
import { DesignTokens } from '../styles/StyleGuide';

// 使用间距
marginTop: DesignTokens.spacing.md, // 16px
padding: DesignTokens.spacing.lg,   // 20px

// 使用字体
...DesignTokens.typography.h1,      // 标题样式
...DesignTokens.typography.body1,   // 正文样式

// 使用圆角
borderRadius: DesignTokens.borderRadius.lg, // 12px

// 使用阴影
...DesignTokens.shadows.medium,
```

### 2. 现代化颜色系统

全新的颜色系统支持：

- **主色调**: 主要和次要颜色及其变体
- **语义化颜色**: 成功、警告、错误、信息状态色
- **界面颜色**: 背景、表面、文本、边框等
- **深色模式**: 完整的深色主题支持

```javascript
const { colors } = useTheme();

// 使用主色调
backgroundColor: colors.primary,
color: colors.onPrimary,

// 使用状态色
backgroundColor: colors.success,
borderColor: colors.error,

// 使用界面色
backgroundColor: colors.surface,
color: colors.text,
borderColor: colors.border,
```

### 3. 通用样式组件

提供了丰富的预定义样式组件：

#### 容器和布局
```javascript
const commonStyles = createCommonStyles(colors);

// 基础容器
style={commonStyles.container}
style={commonStyles.scrollView}
style={commonStyles.card}

// 布局组件
style={commonStyles.row}
style={commonStyles.column}
style={commonStyles.center}
```

#### 按钮样式
```javascript
// 主要按钮
style={commonStyles.primaryButton}
style={commonStyles.primaryButtonText}

// 次要按钮
style={commonStyles.secondaryButton}
style={commonStyles.secondaryButtonText}

// 轮廓按钮
style={commonStyles.outlineButton}
style={commonStyles.outlineButtonText}
```

#### 文本样式
```javascript
// 标题
style={commonStyles.title}
style={commonStyles.subtitle}
style={commonStyles.sectionTitle}

// 正文
style={commonStyles.body}
style={commonStyles.caption}
```

#### 输入框样式
```javascript
// 输入容器
style={commonStyles.inputContainer}
style={commonStyles.input}
style={commonStyles.inputText}

// 标签
style={commonStyles.label}
style={commonStyles.requiredLabel}
```

#### 列表和卡片
```javascript
// 列表项
style={commonStyles.listItem}
style={commonStyles.listItemContent}
style={commonStyles.listItemTitle}
style={commonStyles.listItemSubtitle}

// 分隔线
style={commonStyles.divider}
```

#### 状态组件
```javascript
// 加载状态
style={commonStyles.loadingContainer}
style={commonStyles.loadingText}

// 空状态
style={commonStyles.emptyState}
style={commonStyles.emptyStateTitle}
style={commonStyles.emptyStateSubtitle}

// 错误状态
style={commonStyles.errorContainer}
style={commonStyles.errorText}
```

#### 标签和徽章
```javascript
// 标签
style={commonStyles.tag}
style={commonStyles.tagText}

// 徽章
style={commonStyles.badge}
style={commonStyles.badgeText}
```

### 4. 主题系统增强

#### 颜色工具函数
```javascript
const { ColorUtils, getStatusColor, withOpacity } = useTheme();

// 添加透明度
backgroundColor: withOpacity(colors.primary, 0.1),

// 获取状态颜色
color: getStatusColor('success', colors),

// 使用颜色工具
color: ColorUtils.getStatusColor('online', colors),
backgroundColor: ColorUtils.withOpacity('#FF6700', 0.2),
```

#### 主题持久化
新的主题系统支持：
- 自动保存用户主题偏好
- 跟随系统主题设置
- 平滑的主题切换动画

## 使用指南

### 1. 在新组件中使用

```javascript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { createCommonStyles, DesignTokens } from '../styles/StyleGuide';

const MyComponent = () => {
  const { colors, isDarkMode } = useTheme();
  const commonStyles = createCommonStyles(colors);

  return (
    <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={commonStyles.card}>
        <Text style={[commonStyles.title, { color: colors.text }]}>
          标题
        </Text>
        <Text style={[commonStyles.body, { color: colors.textSecondary }]}>
          内容描述
        </Text>
        <TouchableOpacity style={commonStyles.primaryButton}>
          <Text style={commonStyles.primaryButtonText}>操作按钮</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

### 2. 迁移现有组件

#### 步骤 1: 导入新的样式系统
```javascript
// 添加导入
import { createCommonStyles, DesignTokens } from '../styles/StyleGuide';

// 在组件中获取通用样式
const { colors } = useTheme();
const commonStyles = createCommonStyles(colors);
```

#### 步骤 2: 替换硬编码值
```javascript
// 旧的方式
marginTop: 16,
padding: 20,
fontSize: 18,
borderRadius: 8,

// 新的方式
marginTop: DesignTokens.spacing.md,
padding: DesignTokens.spacing.lg,
...DesignTokens.typography.h4,
borderRadius: DesignTokens.borderRadius.md,
```

#### 步骤 3: 使用语义化颜色
```javascript
// 旧的方式
backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
color: isDarkMode ? '#FFFFFF' : '#1A1A1A',

// 新的方式
backgroundColor: colors.surface,
color: colors.text,
```

#### 步骤 4: 使用通用样式组件
```javascript
// 旧的方式
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF6700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

// 新的方式
style={commonStyles.primaryButton}
style={commonStyles.primaryButtonText}
```

### 3. 自定义样式

当需要自定义样式时，仍然使用设计令牌：

```javascript
const styles = StyleSheet.create({
  customContainer: {
    padding: DesignTokens.spacing.lg,
    marginVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.lg,
    ...DesignTokens.shadows.medium,
  },
  customText: {
    ...DesignTokens.typography.body1,
    fontWeight: '500',
  },
});
```

## 最佳实践

### 1. 优先使用通用样式
- 首先检查是否有合适的通用样式组件
- 避免重复定义相似的样式
- 保持样式的一致性

### 2. 使用语义化命名
- 使用 `colors.text` 而不是具体的颜色值
- 使用 `colors.success` 表示成功状态
- 使用 `colors.surface` 表示卡片背景

### 3. 响应式设计
- 使用相对单位和比例
- 考虑不同屏幕尺寸的适配
- 测试深色和浅色主题

### 4. 性能优化
- 避免在渲染函数中创建样式对象
- 使用 `StyleSheet.create` 缓存样式
- 合理使用 `useMemo` 优化动态样式

## 示例屏幕

查看 `StyleExampleScreen.js` 文件，了解如何使用新的样式系统的完整示例。

## 迁移检查清单

- [ ] 导入新的样式系统
- [ ] 替换硬编码的间距值
- [ ] 替换硬编码的颜色值
- [ ] 使用通用样式组件
- [ ] 测试深色和浅色主题
- [ ] 验证响应式布局
- [ ] 检查性能影响

## 支持和反馈

如果在使用新样式系统时遇到问题，请：
1. 查看本指南和示例代码
2. 检查 `StyleGuide.js` 中的可用组件
3. 参考 `StyleExampleScreen.js` 的实现
4. 联系开发团队获取支持

---

通过使用这个现代化的样式系统，我们可以：
- 提高开发效率
- 保证设计一致性
- 简化主题管理
- 提升用户体验
- 降低维护成本