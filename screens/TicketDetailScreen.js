import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, 
         Platform, StatusBar, Alert, TextInput, Modal, Image, Dimensions, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createCommonStyles } from '../styles/StyleGuide';
import { getTicketById, updateTicketStatus, addTicketComment, assignTicket } from '../api/ticketService';
import { EventRegister } from '../utils/EventEmitter';
import { getAuthToken, refreshToken } from '../api/storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { uploadFileToWebDAV, getFileList } from './FileUploadScreen';
import axios from 'axios';

// 定义API基础URL
const BASE_URL = 'https://nodered.jzz77.cn:9003';

const TicketDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params;
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const commonStyles = createCommonStyles(colors, isDarkMode);
  
  // 定义局部样式，以便能够访问isDarkMode
  const styles = StyleSheet.create({
    card: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    titleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      flex: 1,
      marginRight: 12,
    },
    statusContainer: {
      position: 'relative',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusText: {
      fontSize: 12,
      color: 'white',
      fontWeight: 'bold',
    },
    description: {
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 16,
    },
    metaContainer: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.05)',
      paddingTop: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    metaText: {
      fontSize: 14,
      marginLeft: 8,
    },
    actionCard: {
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 0, // 从16修改为0，与其他卡片保持一致的宽度
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2.5,
      elevation: 2,
    },
    actionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-evenly', // 从space-around改为space-evenly，使按钮分布更均匀
      flexWrap: 'wrap', // 添加flexWrap以支持在小屏幕上换行显示
      gap: 8, // 添加按钮之间的间距
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      minWidth: 110, // 略微减小最小宽度以适应更多按钮
      flex: 0, // 确保按钮不会自动拉伸
      margin: 4, // 添加外边距使按钮间距更合理
    },
    actionIcon: {
      marginRight: 8,
    },
    actionText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      marginBottom: 16,
    },
    timeline: {
      marginLeft: 4,
    },
    timelineItem: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    timelineIconContainer: {
      alignItems: 'center',
      width: 40,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      marginTop: 8,
      marginBottom: -8,
    },
    timelineContent: {
      flex: 1,
      paddingLeft: 8,
    },
    timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 4,
    },
    timelineAction: {
      fontSize: 14,
      fontWeight: '500',
    },
    timelineTime: {
      fontSize: 12,
    },
    timelineComment: {
      fontSize: 14,
      lineHeight: 20,
    },
    commentForm: {
      marginTop: 8,
    },
    commentInput: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    commentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FF6700',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignSelf: 'flex-end',
    },
    commentIcon: {
      marginRight: 8,
    },
    commentButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '85%',
      borderRadius: 12,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 20,
    },
    roleList: {
      marginBottom: 20,
    },
    roleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    roleRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#FF6700',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    roleRadioSelected: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#FF6700',
    },
    roleName: {
      fontSize: 16,
    },
    statusList: {
      marginBottom: 20,
    },
    statusItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    statusRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#FF6700',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    statusRadioSelected: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#FF6700',
    },
    statusInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    statusName: {
      fontSize: 16,
      flex: 1,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginLeft: 8,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      width: '48%',
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#666',
    },
    confirmButton: {
      backgroundColor: '#FF6700',
    },
    confirmButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    backButton: {
      backgroundColor: '#2196F3',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    backButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    statusOptions: {
      position: 'absolute',
      top: 30,
      right: 0,
      width: 100,
      borderRadius: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 4,
      zIndex: 100,
    },
    statusOption: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    statusOptionText: {
      fontSize: 14,
    },
    detailsContainer: {
      marginTop: 8,
      padding: 8,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: 4,
    },
    detailText: {
      fontSize: 12,
      marginBottom: 2,
    },
    emptyText: {
      textAlign: 'center',
      fontStyle: 'italic',
      fontSize: 14,
      padding: 12,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },
    loadingText: {
      marginLeft: 8,
    },
    infoSection: {
      marginBottom: 16,
    },
    imageContainer: {
      flexDirection: 'row',
    },
    imageWrapper: {
      marginRight: 8,
    },
    ticketImage: {
      width: 100,
      height: 100,
      borderRadius: 8,
    },
    retryButton: {
      position: 'absolute',
      top: 0,
      right: 0,
      padding: 4,
      borderRadius: 8,
    },
    retryText: {
      color: '#fff',
      fontSize: 12,
    },
    commentSection: {
      marginTop: 8,
    },
    imageButtonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    imageButton: {
      padding: 12,
      borderRadius: 8,
      marginRight: 8,
    },
    buttonIcon: {
      marginRight: 8,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    imagePreviewContainer: {
      marginBottom: 12,
    },
    imagePreview: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 8,
    },
    previewImage: {
      width: 80,
      height: 80,
      borderRadius: 4,
    },
    removeImageButton: {
      padding: 4,
    },
    modalCloseButton: {
      position: 'absolute',
      top: 20,
      right: 20,
      padding: 8,
      borderRadius: 8,
    },
    modalImageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    shareButton: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      padding: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    shareButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    workflowGuide: {
      padding: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#FF6700',
    },
    workflowTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    workflowText: {
      fontSize: 14,
      marginBottom: 8,
    },
    timelineImportantLine: {
      width: 3,
      backgroundColor: '#FF6700',
    },
    timelineImportantContent: {
      borderRadius: 8,
      padding: 12,
      marginLeft: 4,
    },
    timelineNotification: {
      fontSize: 14,
      fontStyle: 'italic',
      marginTop: 4,
    },
    statusLabel: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 8,
    },
    statusLabelText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    selectedOption: {
      backgroundColor: 'rgba(255, 103, 0, 0.08)',
    },
    recommendedOption: {
      borderLeftWidth: 3,
      borderLeftColor: '#4CAF50',
    },
    recommendedText: {
      fontSize: 12,
      color: '#4CAF50',
      fontWeight: 'bold',
      marginLeft: 8,
    },
    reviewCommentContainer: {
      marginTop: 16,
      marginBottom: 16,
    },
    reviewCommentLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
    },
    reviewCommentInput: {
      borderRadius: 8,
      padding: 12,
      minHeight: 80,
      textAlignVertical: 'top',
    },
  });
  
  // 工单状态
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // 图片状态
  const [ticketImages, setTicketImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  
  // 新评论图片状态
  const [commentImages, setCommentImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [showStatusOptions, setShowStatusOptions] = useState(false);
  const [assignComment, setAssignComment] = useState('');
  
  // 在函数组件内添加状态
  const [reviewComment, setReviewComment] = useState('');
  const [showCompletionApprovalModal, setShowCompletionApprovalModal] = useState(false);
  const [completionApprovalComment, setCompletionApprovalComment] = useState('');
  const [skipAdminApproval, setSkipAdminApproval] = useState(false);
  
  // 在函数组件内添加scrollViewRef
  const scrollViewRef = React.useRef(null);
  
  // 获取工单详情
  useEffect(() => {
    fetchTicketDetails();
  }, [id]);
  
  // 添加用户角色检查
  useEffect(() => {
    // 输出当前用户信息
    console.log("当前登录用户:", user);
    console.log("用户角色:", user?.is_admin, "类型:", typeof user?.is_admin);
    
    // 如果是布尔值true，记录特别提示
    if (typeof user?.is_admin === 'boolean' && user.is_admin === true) {
      console.log("⚠️ 注意: is_admin 是布尔值 true，系统将视为管理员角色");
    }
    
    // 检查用户是哪个角色
    for (let roleId = 1; roleId <= 9; roleId++) {
      if (checkUserRole(user, roleId)) {
        console.log(`用户角色识别结果: ${roleId} - ${getRoleName(roleId)}`);
        break;
      }
    }
  }, [user]);
  
  // 检查并自动处理管理员的工单状态
  useEffect(() => {
    if (!ticket || !user) return;
    
    // 使用新的角色检查函数
    const isAdmin = checkUserRole(user, 1);
    
    // 仅当用户是管理员且工单状态为待审核时
    if (isAdmin && ticket.status === 'pending') {
      console.log("管理员查看待审核工单，准备显示状态更新对话框");
      
      // 在短暂延迟后显示审核对话框
      // 延迟是为了确保组件完全渲染
      const timer = setTimeout(() => {
        setSelectedStatus('approved');
        setShowStatusModal(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [ticket, user]);
  
  // 检查会话有效性
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          notifySessionExpired();
          return;
        }
        
        // 解析令牌并检查是否过期
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            // 增强的Base64解码函数，处理可能包含非ASCII字符的令牌
            const base64Decode = (str) => {
              try {
                return atob(str);
              } catch (e) {
                try {
                  // 处理可能的URL安全base64编码
                  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
                  return atob(base64);
                } catch (error) {
                  console.error('解码令牌失败:', error);
                  return null;
                }
              }
            };
            
            // 解析载荷
            const decoded = base64Decode(parts[1]);
            if (!decoded) {
              notifySessionExpired();
              return;
            }
            
            const payload = JSON.parse(decoded);
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < currentTime) {
              console.log('令牌已过期，尝试刷新');
              
              // 尝试刷新令牌
              const refreshSuccessful = await refreshToken();
              if (!refreshSuccessful) {
                notifySessionExpired();
              }
            }
          } else {
            // 令牌格式不正确
            notifySessionExpired();
          }
        } catch (parseError) {
          console.error('解析令牌失败:', parseError);
          notifySessionExpired();
        }
      } catch (error) {
        console.error('会话检查失败:', error);
        notifySessionExpired();
      }
    };
    
    // 通知会话过期并显示提示
    const notifySessionExpired = () => {
      // 触发HomeScreen中的登录弹窗
      EventRegister.emit('SESSION_EXPIRED');
      Alert.alert(
        '会话已过期',
        '请重新登录以继续',
        [
          {
            text: '确定',
            onPress: () => {}  // 用户点击确定按钮后不做额外操作
          }
        ]
      );
    };
    
    // 启动时检查会话
    checkSession();
  }, []);
  
  const fetchTicketDetails = async () => {
    setLoading(true);
    try {
      const response = await getTicketById(id);
      console.log("获取到的工单详情:", response);
      console.log("当前用户角色:", user.is_admin, "用户ID:", user.id);
      
      if (response && response.success && response.ticket) {
        // 记录工单是否包含report_id字段
        console.log("工单是否包含report_id字段:", 
          response.ticket.report_id ? `是，值为: ${response.ticket.report_id}` : "否，未找到report_id");
        console.log("工单状态:", response.ticket.status);
        
        // 处理时间线数据，适配字段名称
        const adaptedTimeline = (response.timeline || []).map(item => ({
          id: item.id,
          action: item.action,
          comment: item.comment,
          // 适配用户信息
          user: {
            id: item.user_id,
            name: item.action_by_name
          },
          // 适配时间字段
          time: item.created_at,
          // 保留原始字段
          details: item.details,
          details_obj: item.details_obj
        }));
        
        // 创建适配后的工单对象
        const adaptedTicket = {
          ...response.ticket,
          // 添加适配字段
          createdAt: response.ticket.created_at,
          updatedAt: response.ticket.updated_at,
          // 适配创建者信息
          creator: {
            id: response.ticket.creator_id,
            name: response.ticket.creator_name
          },
          // 适配分配信息
          assignedTo: response.ticket.assigned_to_role ? {
            role: response.ticket.assigned_to_role,
            name: response.ticket.assigned_role_name
          } : null,
          // 使用已适配的时间线
          timeline: adaptedTimeline
        };
        
        setTicket(adaptedTicket);
        
        // 获取工单相关图片
        fetchTicketImages(adaptedTicket);
      } else {
        // 兼容直接返回工单对象的情况
        setTicket(response);
        console.warn("未预期的返回格式:", response);
      }
    } catch (error) {
      console.error('获取工单详情失败:', error);
      Alert.alert('获取失败', '无法加载工单详情，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 获取工单相关的图片
  const fetchTicketImages = async (ticketData) => {
    try {
      setLoadingImages(true);
      
      // 提取工单ID和用户ID
      const ticketId = ticketData.id;
      const userId = user?.id || '';
      
      console.log('开始获取工单图片，工单ID:', ticketId);
      
      // 首先检查工单是否有report_id字段
      if (ticketData.report_id) {
        try {
          console.log('使用工单中的report_id获取图片:', ticketData.report_id);
          const result = await getFileList('tickets', ticketData.report_id, userId);
          console.log(`获取到 ${result.length} 张图片`);
          
          if (result.length > 0) {
            setTicketImages(result);
            return;
          }
        } catch (error) {
          console.error('使用report_id获取图片失败:', error);
        }
      }
      
      // 如果report_id没有对应图片或出错，检查imagesurl字段
      console.log('检查工单数据中的图片URL');
      
      if (ticketData.images && Array.isArray(ticketData.images) && ticketData.images.length > 0) {
        console.log(`工单数据包含 ${ticketData.images.length} 张图片URL`);
        const imageUrls = ticketData.images;
        
        const dataFiles = imageUrls.map(url => ({
          url,
          filename: url.split('/').pop(),
          isImage: true,
          thumbnailUrl: url
        }));
        setTicketImages(dataFiles);
      } else if (ticketData.images_url || ticketData.imagesurl) {
        const imagesUrlString = ticketData.images_url || ticketData.imagesurl;
        if (imagesUrlString && typeof imagesUrlString === 'string') {
          const urls = imagesUrlString.split(',').filter(url => url.trim());
          console.log(`工单数据包含 ${urls.length} 张图片URL`);
          
          if (urls.length > 0) {
            const dataFiles = urls.map(url => ({
              url,
              filename: url.split('/').pop(),
              isImage: true,
              thumbnailUrl: url
            }));
            setTicketImages(dataFiles);
          } else {
            console.log('工单数据中的URLs为空');
            setTicketImages([]);
          }
        } else {
          console.log('工单数据中无有效的图片URL字符串');
          setTicketImages([]);
        }
      } else {
        console.log('工单数据中没有任何图片信息');
        setTicketImages([]);
      }
    } catch (error) {
      console.error('获取工单图片过程中发生错误:', error);
      setTicketImages([]);
    } finally {
      setLoadingImages(false);
    }
  };
  
  // 添加评论
  const handleAddComment = async () => {
    if (!newComment.trim() && commentImages.length === 0) {
      Alert.alert('错误', '请输入评论内容或添加图片');
      return;
    }
    
    if (submitting) return;
    setSubmitting(true);
    
    try {
      // 生成唯一的评论report_id
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const timestamp = Date.now();
      const reportId = `COMMENT_${id}_${date}_${timestamp}`;
      
      console.log('准备添加评论，使用report_id:', reportId);
      
      // 先上传图片（如果有的话）
      let imagesurl = '';
      if (commentImages.length > 0) {
        try {
          setUploadingImages(true);
          const imageUrls = await uploadCommentImages(id, reportId);
          console.log(`成功上传 ${imageUrls.length} 张评论图片`);
          
          // 将图片URL数组转换为逗号分隔的字符串
          imagesurl = imageUrls.join(',');
        } catch (error) {
          console.error('上传评论图片失败:', error);
          Alert.alert('警告', '图片上传失败，但将继续添加评论');
        } finally {
          setUploadingImages(false);
        }
      }
      
      // 构建评论数据
      const commentData = {
        comment: newComment.trim(),
        userId: user.id,
        report_id: reportId
      };
      
      // 如果有图片URL，添加到评论数据中
      if (imagesurl) {
        commentData.imagesurl = imagesurl;
      }
      
      // 添加评论
      const commentResponse = await addTicketComment(id, commentData);
      console.log('评论已添加，ID:', commentResponse.commentId);
      
      // 重新获取工单详情
      fetchTicketDetails();
      setNewComment('');
      setCommentImages([]);
    } catch (error) {
      console.error('添加评论失败:', error);
      Alert.alert('错误', '添加评论失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };
  
  // 上传评论相关图片
  const uploadCommentImages = async (ticketId, reportId) => {
    try {
      console.log('准备上传评论图片，使用report_id:', reportId);
      
      const uploadPromises = commentImages.map(async (uri, index) => {
        // 获取文件信息
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        // 检测文件类型
        let mimeType = 'image/jpeg'; // 默认假设为JPEG
        if (uri.toLowerCase().endsWith('.png')) {
          mimeType = 'image/png';
        } else if (uri.toLowerCase().endsWith('.gif')) {
          mimeType = 'image/gif';
        }
        
        // 使用评论ID生成唯一的图片文件名
        const timestamp = Date.now();
        const imageFileName = `COMMENT_IMAGE_${index + 1}_${timestamp}.jpg`;
        
        const file = {
          uri,
          name: imageFileName,
          type: mimeType,
          size: fileInfo.size || 0
        };
        
        // 确保 user?.id 不为 undefined，如果是，则使用空字符串
        const userId = user?.id || '';
        const username = user?.username || '';
        
        console.log(`上传评论图片 ${index + 1}/${commentImages.length}，使用report_id:`, reportId, 'userId:', userId);
        
        // 上传到 Nextcloud，使用标准格式的report_id
        return await uploadFileToWebDAV(file, 'tickets', reportId, userId, username);
      });

      const imageUrls = await Promise.all(uploadPromises);
      console.log(`成功上传 ${imageUrls.length} 张评论图片，图片URLs:`, imageUrls);
      
      return imageUrls;
    } catch (error) {
      console.error('上传评论图片失败:', error);
      throw error;
    }
  };
  
  // 处理图片点击，显示大图
  const handleImagePress = (uri) => {
    setSelectedImage(uri);
    setImageModalVisible(true);
  };

  // 从图库选择图片
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许访问相册以选择图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      // 检查文件大小
      const validImages = [];
      for (const asset of result.assets) {
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (fileInfo.size > 5 * 1024 * 1024) { // 限制5MB
          Alert.alert('图片过大', '图片大小不能超过5MB');
          continue;
        }
        validImages.push(asset.uri);
      }
      
      setCommentImages([...commentImages, ...validImages]);
    }
  };

  // 拍照
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许访问相机以拍摄照片');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
      if (fileInfo.size > 5 * 1024 * 1024) { // 限制5MB
        Alert.alert('图片过大', '图片大小不能超过5MB');
        return;
      }
      
      setCommentImages([...commentImages, result.assets[0].uri]);
    }
  };
  
  // 更新工单状态
  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    
    try {
      // 在操作开始时显示加载指示器
      setSubmitting(true);
      
      // 保存当前状态，用于后续判断是否从pending变为approved
      const previousStatus = ticket.status;
      
      // 构建评论内容
      let comment = `工单状态已更新为${getStatusName(selectedStatus)}`;
      
      // 如果是审核操作且有审核说明，则使用审核说明
      if (ticket.status === 'pending' && reviewComment.trim()) {
        if (selectedStatus === 'approved') {
          comment = `工单已审核通过。${reviewComment.trim()}`;
        } else if (selectedStatus === 'rejected') {
          comment = `工单已被拒绝。${reviewComment.trim()}`;
        }
      } else if (ticket.status === 'pending') {
        // 为审核操作添加默认说明
        if (selectedStatus === 'approved') {
          comment = '工单已审核通过';
        } else if (selectedStatus === 'rejected') {
          comment = '工单已被拒绝';
        }
      } else if (ticket.status === 'completed') {
        // 已完成工单审核说明
        if (completionApprovalComment.trim()) {
          comment = `工单处理结果已确认。${completionApprovalComment.trim()}`;
        } else {
          comment = '工单处理结果已确认';
        }
      }
      
      // 确定是否需要通知创建者
      const needNotifyCreator = selectedStatus === 'approved' || 
                               selectedStatus === 'rejected' || 
                               selectedStatus === 'closed';
      
      // 确定是否需要通知处理人
      const needNotifyHandler = selectedStatus === 'assigned';
      
      // 构建请求数据
      const updateData = {
        status: selectedStatus,
        comment: comment,
        // 添加通知相关参数
        notify: {
          creator: needNotifyCreator ? true : false,
          handler: needNotifyHandler ? (ticket.assignedTo?.role || null) : null,
          notifyType: selectedStatus
        }
      };
      
      console.log(`准备更新工单 ${id} 状态为 ${selectedStatus}`, updateData);
      
      // 尝试更新工单状态
      const result = await updateTicketStatus(id, updateData);
      console.log('工单状态更新成功:', result);
      
      // 刷新工单详情
      await fetchTicketDetails();
      setShowStatusModal(false);
      setShowCompletionApprovalModal(false);
      // 清除审核说明
      setReviewComment('');
      setCompletionApprovalComment('');
      
      // 显示成功消息
      Alert.alert('操作成功', `工单状态已更新为"${getStatusName(selectedStatus)}"`, [
        { text: '确定', onPress: () => {
          // 判断是否从待审核状态更新为已审核状态，并且用户有分配工单的权限
          if (previousStatus === 'pending' && selectedStatus === 'approved' && canAssignTicket()) {
            console.log('工单从待审核变为已审核，自动显示分配弹窗');
            // 延迟一下再显示分配弹窗，让用户有时间看到状态更新的提示
            setTimeout(() => {
              setShowAssignModal(true);
            }, 500);
          }
        } }
      ]);
    } catch (error) {
      console.error('更新状态失败:', error);
      let errorMessage = '更新工单状态过程中出现错误，请稍后重试';
      
      // 提供更具体的错误信息
      if (error.response) {
        console.error('错误状态码:', error.response.status);
        console.error('错误详情:', error.response.data);
        
        if (error.response.status === 404) {
          errorMessage = '找不到该工单，可能已被删除';
        } else if (error.response.status === 403) {
          errorMessage = '您没有权限执行此操作';
        } else if (error.response.status === 401) {
          errorMessage = '会话已过期，请重新登录';
          // 触发会话过期事件
          EventRegister.emit('SESSION_EXPIRED');
        }
      }
      
      Alert.alert('操作失败', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  
  // 分配工单给指定角色
  const handleAssignTicket = async (assignData) => {
    try {
      // 检查分配数据和角色ID
      if (!assignData || !assignData.roleId) {
        Alert.alert('分配错误', '请选择一个角色进行分配');
        return;
      }
      
      console.log(`开始分配工单，角色ID: ${assignData.roleId}, 备注: ${assignData.comment || '无'}`);
      setSubmitting(true);
      
      // 验证ticket对象
      if (!ticket || !ticket.id) {
        console.error('无效的工单数据:', ticket);
        Alert.alert('错误', '无法获取工单信息');
        setSubmitting(false);
        return;
      }
      
      // 获取token
      const token = await getAuthToken();
      console.log('获取到token:', token ? '有效' : '无效');
      
      if (!token) {
        console.error('未找到用户令牌');
        Alert.alert('错误', '您的登录会话已过期，请重新登录');
        EventRegister.emit('SESSION_EXPIRED');
        setSubmitting(false);
        return;
      }
      
      // 确保roleId是整数
      const roleId = parseInt(assignData.roleId);
      
      // 构建完整的请求数据，与之前成功的请求格式保持一致
      const requestData = {
        // 基本分配信息
        roleId: roleId,
        comment: assignData.comment || `工单已分配给${getRoleName(roleId)}`,
        
        // 确保包含status字段，对应后端需要的状态值
        status: "assigned",
        
        // 兼容后端处理的冗余字段
        role: roleId,
        role_id: roleId,
        assignedTo: roleId,
        
        // 通知设置
        notify: {
          creator: ticket.creator?.id ? true : false, // 通知工单创建者
          handler: roleId, // 通知被分配的角色
          notifyType: "assigned"
        },
        
        // 附加的详细信息，用于记录和调试
        ticketInfo: {
          id: ticket.id,
          title: ticket.title,
          currentStatus: ticket.status
        },
        
        assignmentDetails: {
          previousRole: ticket.assignedTo?.role || null,
          assignedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        }
      };
      
      // 构建API URL
      const assignUrl = `${BASE_URL}/api/tickets/${ticket.id}/assign`;
      
      console.log(`准备分配工单(PUT)，URL: ${assignUrl}, 数据:`, requestData);
      
      try {
        // 直接使用fetch发送PUT请求
        const response = await fetch(assignUrl, {
          method: 'PUT', 
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'is-admin': user.is_admin.toString(), // 确保发送用户权限信息
            'user-id': user.id.toString()         // 确保发送用户ID
          },
          body: JSON.stringify(requestData)
        });
        
        console.log(`分配响应状态: ${response.status}`);
        
        // 获取响应文本
        const responseText = await response.text();
        console.log('分配响应原始数据:', responseText);
        
        let result;
        try {
          // 尝试解析为JSON
          result = JSON.parse(responseText);
        } catch (error) {
          console.error('解析响应JSON失败:', error);
          if (response.ok) {
            // 如果请求成功但返回非JSON，创建一个成功结果
            result = { 
              success: true, 
              message: '工单分配成功，但服务器返回了非JSON数据' 
            };
          } else {
            // 请求失败且非JSON，抛出错误
            throw new Error(`服务器返回非JSON数据: ${responseText}`);
          }
        }
        
        if (response.ok) {
          console.log('工单分配成功:', result);
          Alert.alert('成功', `工单已成功分配给${getRoleName(roleId)}`);
          
          // 关闭模态框并清除状态
          setShowAssignModal(false);
          setSelectedRole(null);
          setAssignComment('');
          
          // 刷新工单详情
          fetchTicketDetails();
        } else {
          // 处理不同的错误状态码
          let errorMessage = result?.message || '工单分配失败';
          if (response.status === 404) {
            errorMessage = '找不到该工单或指定的角色不存在';
          } else if (response.status === 403) {
            errorMessage = '您没有权限执行此操作';
          } else if (response.status === 401) {
            errorMessage = '会话已过期，请重新登录';
            EventRegister.emit('SESSION_EXPIRED');
          } else if (response.status === 400) {
            errorMessage = result?.message || '请求数据无效';
          }
          
          console.log('工单分配失败:', errorMessage);
          Alert.alert('失败', errorMessage);
        }
      } catch (apiError) {
        console.error('API调用出错:', apiError);
        let errorMsg = '工单分配失败';
        
        if (apiError.response) {
          console.error('服务器错误详情:', apiError.response.data);
          errorMsg += ': ' + (apiError.response.data?.message || apiError.message || '服务器错误');
        } else if (apiError.message) {
          errorMsg += ': ' + apiError.message;
        }
        
        Alert.alert('分配失败', errorMsg);
      }
    } catch (error) {
      console.error('工单分配过程出错:', error);
      let errorMsg = '工单分配出错';
      if (error.message) {
        errorMsg += `: ${error.message}`;
      }
      Alert.alert('分配失败', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };
  
  // 获取状态名称
  const getStatusName = (status) => {
    const statusMap = {
      pending: '待审核',
      approved: '已审核',
      assigned: '已分配',
      inProgress: '处理中',
      completed: '已完成',
      completionReview: '部门审核通过',
      rejected: '已拒绝',
      closed: '已关闭'
    };
    return statusMap[status] || status;
  };
  
  // 获取状态颜色
  const getStatusColor = (status) => {
    const statusColors = {
      pending: '#FFA000',  // 黄色
      approved: '#2196F3', // 蓝色
      assigned: '#9C27B0', // 紫色
      inProgress: '#4CAF50', // 绿色
      completed: '#8BC34A', // 浅绿色
      completionReview: '#3F51B5', // 靛蓝色
      rejected: '#F44336', // 红色
      closed: '#9E9E9E',   // 灰色
    };
    return statusColors[status] || '#9E9E9E';
  };
  
  // 获取角色名称
  const getRoleName = (roleId) => {
    const roleMap = {
      1: '管理员',
      2: '部门管理员',
      3: '运行班组',
      4: '化验班组',
      5: '机电班组',
      6: '污泥车间',
      7: '5000吨处理站',
      8: '附属设施',
      9: '备用权限'
    };
    return roleMap[roleId] || '未知角色';
  };
  
  // 增加角色检查的辅助函数
  const checkUserRole = (user, roleId) => {
    if (!user) return false;
    
    // 管理员角色特殊处理
    if (roleId === 1) {
      return user.is_admin === 1 || (typeof user.is_admin === 'boolean' && user.is_admin === true);
    }
    // 部门管理员
    else if (roleId === 2) {
      return user.is_admin === 2;
    }
    // 其他角色 (3-9)
    else if (roleId >= 3 && roleId <= 9) {
      return user.is_admin === roleId;
    }
    
    return false;
  };
  
  // 可用角色列表 - 更新为包含所有角色
  const ROLES = [
    { id: 3, name: '运行班组' },
    { id: 4, name: '化验班组' },
    { id: 5, name: '机电班组' },
    { id: 6, name: '污泥车间' },
    { id: 7, name: '5000吨处理站' },
    { id: 8, name: '附属设施' },
    { id: 9, name: '备用权限' },
  ];
  
  // 可用状态列表(根据当前用户角色和工单状态)
  const getAvailableStatuses = () => {
    if (!ticket || !user) return [];
    
    // 使用新的角色检查函数
    const isAdmin = checkUserRole(user, 1);
    const isDeptAdmin = checkUserRole(user, 2);
    
    console.log("获取可用状态 - isAdmin:", isAdmin, "isDeptAdmin:", isDeptAdmin);
    
    // 管理员状态选项
    if (isAdmin) {
      // 根据工单当前状态，提供最相关的状态选项
      if (ticket.status === 'pending') {
        console.log("管理员处理待审核工单");
        return [
          { id: 'approved', name: '通过' },
          { id: 'rejected', name: '拒绝' },
        ];
      } else if (ticket.status === 'completed') {
        return [
          { id: 'closed', name: '已关闭' },
          { id: 'inProgress', name: '重新处理' },
        ];
      } else if (ticket.status === 'completionReview') {
        // 部门管理员已审核的完成工单
        return [
          { id: 'closed', name: '已关闭' },
          { id: 'inProgress', name: '重新处理' },
        ];
      }
      
      // 管理员可以将工单设置为任何状态
      return [
        { id: 'pending', name: '待审核' },
        { id: 'approved', name: '已审核' },
        { id: 'assigned', name: '已分配' },
        { id: 'inProgress', name: '处理中' },
        { id: 'completed', name: '已完成' },
        { id: 'rejected', name: '已拒绝' },
        { id: 'closed', name: '已关闭' },
      ];
    }
    
    // 部门管理员可用状态
    if (checkUserRole(user, 2)) {
      if (ticket.status === 'completed') {
        // 部门管理员对已完成工单进行初步审核
        return [
          { id: 'completionReview', name: '审核通过' },
          { id: 'inProgress', name: '需要修改' },
        ];
      } else if (ticket.status === 'pending') {
        return [
          { id: 'approved', name: '通过' },
          { id: 'rejected', name: '拒绝' },
        ];
      }
      return [
        { id: 'approved', name: '通过' },
        { id: 'assigned', name: '分配' },
        { id: 'rejected', name: '拒绝' },
      ];
    }
    
    // 处理人可用状态 (角色3-9)
    // 检查分配的角色是否与用户的角色匹配
    const assignedRole = ticket.assignedTo?.role;
    if (assignedRole && checkUserRole(user, parseInt(assignedRole))) {
      if (ticket.status === 'assigned' || ticket.status === 'inProgress') {
        return [
          { id: 'inProgress', name: '处理中' },
          { id: 'completed', name: '已完成' },
        ];
      }
    }
    
    return [];
  };
  
  // 检查用户是否可以编辑工单
  const canEditTicket = () => {
    if (!ticket || !user) return false;
    
    // 使用新的角色检查函数
    const isAdmin = checkUserRole(user, 1);
    const isDeptAdmin = checkUserRole(user, 2);
    
    if (isAdmin || isDeptAdmin) return true;
    
    // 处理人可以编辑分配给自己的工单
    if (ticket.assignedTo && checkUserRole(user, parseInt(ticket.assignedTo.role))) return true;
    
    // 创建者可以评论自己的工单
    if (ticket.creator && ticket.creator.id === user.id) return true;
    
    return false;
  };
  
  // 检查用户是否可以分配工单
  const canAssignTicket = () => {
    if (!ticket || !user) return false;
    
    // 只有管理员和部门管理员可以分配工单
    return checkUserRole(user, 1) || checkUserRole(user, 2);
  };
  
  // 检查用户是否可以更改工单状态
  const canChangeStatus = () => {
    if (!ticket || !user) return false;
    
    // 明确检查用户角色
    const isAdmin = checkUserRole(user, 1);
    const isDeptAdmin = checkUserRole(user, 2);
    
    console.log("角色检查 - isAdmin:", isAdmin, "isDeptAdmin:", isDeptAdmin);
    
    // 管理员可以更改任何工单状态
    if (isAdmin) return true;
    
    // 部门管理员可以更改部分工单状态
    if (isDeptAdmin) {
      // 部门管理员可以处理pending状态和completed状态的工单
      if (ticket.status === 'pending' || ticket.status === 'completed') {
        return true;
      }
      // 部门管理员可以分配工单
      if (ticket.status === 'approved') {
        return true;
      }
    }
    
    // 处理人可以更改分配给自己的工单的状态
    if (ticket.assignedTo) {
      const assignedRoleId = parseInt(ticket.assignedTo.role);
      if (checkUserRole(user, assignedRoleId)) {
        return ['assigned', 'inProgress'].includes(ticket.status);
      }
    }
    
    return false;
  };
  
  // 获取时间线项目图标
  const getTimelineIcon = (action) => {
    switch (action) {
      case 'created':
        return <Ionicons name="create-outline" size={20} color="#2196F3" />;
      case 'approved':
        return <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />;
      case 'rejected':
        return <Ionicons name="close-circle-outline" size={20} color="#F44336" />;
      case 'assigned':
        return <Ionicons name="person-outline" size={20} color="#9C27B0" />;
      case 'inProgress':
        return <Ionicons name="time-outline" size={20} color="#FF9800" />;
      case 'completed':
        return <Ionicons name="checkmark-done-outline" size={20} color="#8BC34A" />;
      case 'closed':
        return <Ionicons name="lock-closed-outline" size={20} color="#9E9E9E" />;
      case 'comment':
        return <Ionicons name="chatbubble-outline" size={20} color="#00BCD4" />;
      case 'notified':
        return <Ionicons name="notifications-outline" size={20} color="#607D8B" />;
      default:
        return <Ionicons name="ellipsis-horizontal" size={20} color="#9E9E9E" />;
    }
  };
  
  // 获取工单通知信息
  const getNotificationText = (item) => {
    if (item.action !== 'notified') return null;
    
    // 解析详情以获取通知类型
    const notifyType = item.details_obj?.notify_type || 'general';
    const targetRole = item.details_obj?.target_role || '';
    
    switch (notifyType) {
      case 'assigned':
        return `工单已分配给 ${getRoleName(targetRole)}`;
      case 'completed':
        return `工单已由 ${getRoleName(targetRole)} 处理完成`;
      case 'approved':
        return `工单已被审核通过`;
      case 'rejected':
        return `工单已被拒绝`;
      case 'closed':
        return `工单已关闭`;
      default:
        return `工单状态已更新`;
    }
  };
  
  // 判断时间线事件的重要性
  const isImportantEvent = (action) => {
    return ['approved', 'assigned', 'completed', 'closed', 'rejected'].includes(action);
  };
  
  // 标题栏组件 - 安卓平台使用
  const AndroidHeader = () => (
    <View style={commonStyles.androidHeader}>
      <TouchableOpacity 
        style={commonStyles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={commonStyles.headerTitle}>工单详情</Text>
      <View style={commonStyles.headerRight} />
    </View>
  );
  
  // 设置状态栏颜色
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    } else if (Platform.OS === 'ios') {
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    }
  }, [isDarkMode]);
  
  // 设置导航标题
  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      navigation.setOptions({
        title: '工单详情',
        headerTintColor: colors.text,
        headerStyle: {
          backgroundColor: colors.card,
          shadowOpacity: 0,
          elevation: 0,
          borderBottomWidth: 0,
        },
      });
    }
  }, [navigation, colors]);
  
  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.loadingContainer]}>
        {/* 移除条件渲染的Android导航栏 */}
        <ActivityIndicator size="large" color="#FF6700" />
        <Text style={commonStyles.loadingText}>加载工单详情...</Text>
      </View>
    );
  }
  
  if (!ticket) {
    return (
      <View style={[commonStyles.container, commonStyles.emptyContainer]}>
        {/* 移除条件渲染的Android导航栏 */}
        <Ionicons name="alert-circle-outline" size={60} color={colors.textSecondary} />
        <Text style={commonStyles.emptyText}>工单不存在或已被删除</Text>
        <TouchableOpacity
          style={[styles.backButton, { marginTop: 20 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>返回工单列表</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* 移除条件渲染的Android导航栏 */}
      
      <ScrollView 
        ref={scrollViewRef}
        style={commonStyles.scrollView}
        contentContainerStyle={commonStyles.contentContainer}
      >
        {/* 工单头部信息 */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>{ticket.title}</Text>
            <View style={styles.statusContainer}>
              <TouchableOpacity
                style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}
                onPress={() => {
                  // 检查是否是管理员或部门管理员
                  const isAdmin = checkUserRole(user, 1);
                  const isDeptAdmin = checkUserRole(user, 2);
                  
                  console.log("当前用户角色:", user.is_admin, "类型:", typeof user.is_admin);
                  console.log("是管理员:", isAdmin, "是部门管理员:", isDeptAdmin);
                  
                  if (isAdmin || isDeptAdmin) {
                    if (ticket.status === 'pending') {
                      // 直接打开状态更新模态框
                      setSelectedStatus('approved'); // 默认选择"已审核"
                      setShowStatusModal(true);
                    } else if (ticket.status === 'completed') {
                      // 已完成工单直接打开审核模态框
                      setSelectedStatus(isDeptAdmin ? 'completionReview' : 'closed');
                      setShowCompletionApprovalModal(true);
                    } else if (ticket.status === 'completionReview' && isAdmin) {
                      // 部门审核通过的工单直接打开最终审核模态框
                      setSelectedStatus('closed');
                      setShowCompletionApprovalModal(true);
                    } else {
                      // 对于其他状态，显示下拉选项
                      setShowStatusOptions(!showStatusOptions);
                    }
                  }
                }}
              >
                <Text style={styles.statusText}>{getStatusName(ticket.status)}</Text>
                {canChangeStatus() && (
                  <Ionicons 
                    name="chevron-down"
                    size={14} 
                    color="white" 
                    style={{ marginLeft: 4 }} 
                  />
                )}
              </TouchableOpacity>
              
              {/* 状态选项弹出框 */}
              {showStatusOptions && canChangeStatus() && (
                <View style={[styles.statusOptions, { backgroundColor: colors.card }]}>
                  {getAvailableStatuses().map((status) => (
                    <TouchableOpacity
                      key={status.id}
                      style={styles.statusOption}
                      onPress={() => {
                        setSelectedStatus(status.id);
                        setShowStatusOptions(false);
                        if (ticket.status === 'completed' || status.id === 'completionReview') {
                          setShowCompletionApprovalModal(true);
                        } else {
                          setShowStatusModal(true);
                        }
                      }}
                    >
                      <Text style={[styles.statusOptionText, { color: colors.text }]}>{status.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          
          <Text style={[styles.description, { color: colors.text }]}>{ticket.description}</Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                创建者: {ticket.creator?.name || ticket.creator_name || '未知'}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                创建时间: {new Date(ticket.createdAt || ticket.created_at).toLocaleString()}
              </Text>
            </View>
            
            {ticket.category && (
              <View style={styles.metaItem}>
                <Ionicons name="bookmark-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  类别: {ticket.category}
                </Text>
              </View>
            )}
            
            {ticket.priority && (
              <View style={styles.metaItem}>
                <Ionicons name="flag-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  优先级: {ticket.priority}
                </Text>
              </View>
            )}
            
            {(ticket.assignedTo?.role || ticket.assigned_to_role) && (
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  处理人: {getRoleName(ticket.assignedTo?.role || ticket.assigned_to_role)}
                </Text>
              </View>
            )}
            
            {ticket.dueDate && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  截止日期: {new Date(ticket.dueDate).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* 添加工单图片部分 - 改进图片显示 */}
        {loadingImages ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>工单图片</Text>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载图片中...</Text>
            </View>
          </View>
        ) : ticketImages.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>工单图片</Text>
            <ScrollView horizontal style={styles.imageContainer}>
              {ticketImages.map((file, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <TouchableOpacity
                    onPress={() => {
                      handleImagePress(file.thumbnailUrl || file.url);
                    }}
                  >
                    <Image
                      source={{
                        uri: file.thumbnailUrl || file.url,
                        headers: {
                          'Cache-Control': 'no-cache',
                          'Pragma': 'no-cache'
                        }
                      }}
                      style={styles.ticketImage}
                      resizeMode="cover"
                      onLoadStart={() => {
                        setImageLoadErrors(prev => ({ ...prev, [file.url]: 0 }));
                      }}
                      onError={() => {
                        console.error(`图片加载错误 ${file.url}`);
                        setImageLoadErrors(prev => ({
                          ...prev,
                          [file.url]: (prev[file.url] || 0) + 1
                        }));
                      }}
                    />
                  </TouchableOpacity>
                  {imageLoadErrors[file.url] > 0 && (
                    <TouchableOpacity
                      style={[styles.retryButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                      onPress={() => {
                        setImageLoadErrors(prev => ({...prev, [file.url]: 0}));
                        // 强制刷新图片
                        const updatedImages = [...ticketImages];
                        setTicketImages([]);
                        setTimeout(() => setTicketImages(updatedImages), 100);
                      }}
                    >
                      <Ionicons name="reload" size={20} color="#fff" />
                      <Text style={styles.retryText}>重试</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
        
        {/* 操作按钮 */}
        {canEditTicket() && (
          <View style={[styles.actionCard, { backgroundColor: colors.card }]}>
            <View style={styles.actionContainer}>
              {canAssignTicket() && ticket.status === 'approved' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
                  onPress={() => setShowAssignModal(true)}
                >
                  <Ionicons name="people" size={18} color="#fff" style={styles.actionIcon} />
                  <Text style={styles.actionText}>分配工单</Text>
                </TouchableOpacity>
              )}
              
              {canChangeStatus() && (
                <TouchableOpacity
                  style={[
                    styles.actionButton, 
                    { 
                      backgroundColor: ticket.status === 'pending' && canChangeStatus()
                        ? '#4CAF50' // 对待审核工单使用更醒目的颜色
                        : ticket.status === 'completionReview' && checkUserRole(user, 1)
                          ? '#8BC34A' // 最终审核使用特殊颜色
                          : '#2196F3'
                    }
                  ]}
                  onPress={() => {
                    const isAdmin = checkUserRole(user, 1);
                    const isDeptAdmin = checkUserRole(user, 2);
                    
                    console.log("点击状态更新按钮");
                    console.log("当前工单状态:", ticket.status);
                    console.log("当前用户角色:", user.is_admin, "类型:", typeof user.is_admin);
                    console.log("是管理员:", isAdmin, "是部门管理员:", isDeptAdmin);
                    
                    if (ticket.status === 'pending' && (isAdmin || isDeptAdmin)) {
                      // 对于管理员处理待审核工单，直接默认选择"已审核"状态
                      setSelectedStatus('approved');
                      setShowStatusModal(true);
                    } else if (ticket.status === 'completed' && (isAdmin || isDeptAdmin)) {
                      // 处理已完成工单
                      setSelectedStatus(isDeptAdmin ? 'completionReview' : 'closed');
                      setShowCompletionApprovalModal(true);
                    } else if (ticket.status === 'completionReview' && isAdmin) {
                      // 管理员审核部门已确认的工单
                      setSelectedStatus('closed');
                      setShowCompletionApprovalModal(true);
                    } else {
                      // 其他情况显示状态模态框
                      setShowStatusModal(true);
                    }
                  }}
                >
                  <Ionicons 
                    name={
                      ticket.status === 'pending' ? "checkmark-circle" : 
                      ticket.status === 'completed' ? "checkmark-done" :
                      ticket.status === 'completionReview' ? "shield-checkmark" :
                      "refresh"
                    } 
                    size={18} 
                    color="#fff" 
                    style={styles.actionIcon} 
                  />
                  <Text style={styles.actionText}>
                    {ticket.status === 'pending' && canChangeStatus()
                      ? '审核工单' // 更明确的文本
                      : ticket.status === 'completed' && canChangeStatus()
                        ? '确认完成'
                        : ticket.status === 'completionReview' && checkUserRole(user, 1)
                          ? '最终审核'
                          : '更新状态'
                    }
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* 添加工单相关文档的按钮 */}
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  { 
                    backgroundColor: '#FF9800',
                    // 当只有一个按钮时适当调整宽度
                    minWidth: (!canAssignTicket() && !canChangeStatus()) ? 160 : 110
                  }
                ]}
                onPress={() => {
                  // 在这里添加处理逻辑，如打开评论区
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }}
              >
                <Ionicons name="chatbubble" size={18} color="#fff" style={styles.actionIcon} />
                <Text style={styles.actionText}>添加评论</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* 工单时间线 */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>工单时间线</Text>
          
          <View style={styles.timeline}>
            {(ticket.timeline && ticket.timeline.length > 0) ? (
              ticket.timeline.map((item, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineIconContainer}>
                    {getTimelineIcon(item.action)}
                    {index !== ticket.timeline.length - 1 && (
                      <View style={[
                        styles.timelineLine, 
                        isImportantEvent(item.action) && styles.timelineImportantLine,
                        { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                      ]} />
                    )}
                  </View>
                  
                  <View style={[
                    styles.timelineContent,
                    isImportantEvent(item.action) && styles.timelineImportantContent,
                    { backgroundColor: isImportantEvent(item.action) ? 
                      (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') : 'transparent' }
                  ]}>
                    <View style={styles.timelineHeader}>
                      <Text style={[
                        styles.timelineAction, 
                        { color: colors.text, fontWeight: isImportantEvent(item.action) ? '600' : '500' }
                      ]}>
                        {item.user?.name || item.action_by_name || '系统'} {getTimelineActionText(item.action)}
                      </Text>
                      <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>
                        {new Date(item.time || item.created_at).toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                      </Text>
                    </View>
                    
                    {item.comment && (
                      <Text style={[styles.timelineComment, { color: colors.text }]}>
                        {item.comment}
                      </Text>
                    )}
                    
                    {/* 添加通知信息显示 */}
                    {item.action === 'notified' && getNotificationText(item) && (
                      <Text style={[styles.timelineNotification, { color: colors.textSecondary }]}>
                        {getNotificationText(item)}
                      </Text>
                    )}
                    
                    {/* 为重要事件添加状态标签 */}
                    {isImportantEvent(item.action) && (
                      <View style={[styles.statusLabel, { backgroundColor: getStatusColor(item.action) }]}>
                        <Text style={styles.statusLabelText}>{getStatusName(item.action)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                暂无时间线记录
              </Text>
            )}
          </View>
        </View>
        
        {/* 添加评论 */}
        {canEditTicket() && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>添加评论</Text>
            
            {/* 添加工单流程指导说明 */}
            <View style={[styles.workflowGuide, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderLeftColor: getStatusColor(ticket.status) }]}>
              <Text style={[styles.workflowTitle, { color: colors.text }]}>
                当前状态: <Text style={{fontWeight: '600'}}>{getStatusName(ticket.status)}</Text>
              </Text>
              
              {ticket.status === 'pending' && (checkUserRole(user, 1) || checkUserRole(user, 2)) && (
                <Text style={[styles.workflowText, { color: colors.textSecondary }]}>
                  请审核此工单，然后选择"审核通过"或"拒绝"。
                </Text>
              )}
              
              {ticket.status === 'approved' && (checkUserRole(user, 1) || checkUserRole(user, 2)) && (
                <Text style={[styles.workflowText, { color: colors.textSecondary }]}>
                  请将此工单分配给相应的处理角色。
                </Text>
              )}
              
              {ticket.status === 'assigned' && ticket.assignedTo && checkUserRole(user, parseInt(ticket.assignedTo.role)) && (
                <Text style={[styles.workflowText, { color: colors.textSecondary }]}>
                  此工单已分配给您，请开始处理并更新状态为"处理中"。
                </Text>
              )}
              
              {ticket.status === 'inProgress' && ticket.assignedTo && checkUserRole(user, parseInt(ticket.assignedTo.role)) && (
                <Text style={[styles.workflowText, { color: colors.textSecondary }]}>
                  处理完成后，请更新状态为"已完成"并添加处理结果。
                </Text>
              )}
              
              {ticket.status === 'completed' && checkUserRole(user, 2) && (
                <Text style={[styles.workflowText, { color: colors.textSecondary }]}>
                  请审核处理结果，满意后选择"审核通过"进入最终管理员审核。
                </Text>
              )}
              
              {ticket.status === 'completionReview' && checkUserRole(user, 1) && (
                <Text style={[styles.workflowText, { color: colors.textSecondary }]}>
                  部门管理员已确认处理结果，请最终审核并关闭工单。
                </Text>
              )}
              
              {ticket.status === 'completed' && checkUserRole(user, 1) && (
                <Text style={[styles.workflowText, { color: colors.textSecondary }]}>
                  此工单已完成处理，但尚未经过部门管理员确认。
                </Text>
              )}
              
              {ticket.status === 'rejected' && (
                <Text style={[styles.workflowText, { color: colors.textSecondary }]}>
                  此工单已被拒绝。如需重新提交，请创建新工单。
                </Text>
              )}
              
              {ticket.status === 'closed' && (
                <Text style={[styles.workflowText, { color: colors.textSecondary }]}>
                  此工单已关闭。如有后续问题，请创建新工单。
                </Text>
              )}
            </View>
            
            {/* 评论表单 */}
            <View style={styles.commentSection}>
              <TextInput
                style={[
                  styles.commentInput, 
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: colors.text }
                ]}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="输入评论内容..."
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              
              {/* 图片上传选项 */}
              <View style={styles.imageButtonContainer}>
                <TouchableOpacity 
                  style={[styles.imageButton, { backgroundColor: colors.primary }]}
                  onPress={pickImage}
                  disabled={submitting}
                >
                  <Ionicons name="images" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>选择图片</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.imageButton, { backgroundColor: colors.primary }]}
                  onPress={takePhoto}
                  disabled={submitting}
                >
                  <Ionicons name="camera" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>拍照</Text>
                </TouchableOpacity>
              </View>
              
              {/* 显示评论图片预览 */}
              {commentImages.length > 0 && (
                <ScrollView horizontal style={styles.imagePreviewContainer}>
                  {commentImages.map((uri, index) => (
                    <View key={index} style={styles.imagePreview}>
                      <TouchableOpacity onPress={() => handleImagePress(uri)}>
                        <Image source={{ uri }} style={styles.previewImage} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => {
                          const newImages = [...commentImages];
                          newImages.splice(index, 1);
                          setCommentImages(newImages);
                        }}
                        disabled={submitting}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              
              <TouchableOpacity
                style={[styles.commentButton, { opacity: submitting || (!newComment.trim() && commentImages.length === 0) ? 0.7 : 1 }]}
                onPress={handleAddComment}
                disabled={submitting || (!newComment.trim() && commentImages.length === 0)}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.commentButtonText}>提交评论</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
      
      {/* 分配工单模态框 */}
      <Modal
        visible={showAssignModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>分配工单</Text>
            
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              请选择要分配的角色
            </Text>
            
            <View style={styles.roleList}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleItem,
                    selectedRole === role.id && { backgroundColor: isDarkMode ? 'rgba(255,103,0,0.2)' : 'rgba(255,103,0,0.1)' }
                  ]}
                  onPress={() => setSelectedRole(role.id)}
                >
                  <View style={styles.roleRadio}>
                    {selectedRole === role.id && (
                      <View style={styles.roleRadioSelected} />
                    )}
                  </View>
                  <Text style={[styles.roleName, { color: colors.text }]}>{role.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* 添加分配说明输入框 */}
            <View style={styles.reviewCommentContainer}>
              <Text style={[styles.reviewCommentLabel, { color: colors.text }]}>
                分配说明（可选）:
              </Text>
              <TextInput
                style={[
                  styles.reviewCommentInput,
                  { 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    color: colors.text
                  }
                ]}
                placeholder="添加分配说明..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={assignComment}
                onChangeText={setAssignComment}
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAssignModal(false);
                  setSelectedRole(null);
                  setAssignComment('');
                }}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  { opacity: !selectedRole ? 0.7 : 1 }
                ]}
                onPress={() => {
                  console.log('确认分配按钮点击，角色ID:', selectedRole);
                  // 构建正确的分配数据结构传递给handleAssignTicket
                  handleAssignTicket({
                    roleId: selectedRole,
                    comment: assignComment || `工单已分配给${getRoleName(selectedRole)}`
                  });
                }}
                disabled={!selectedRole}
              >
                <Text style={styles.confirmButtonText}>确认分配</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 更新状态模态框 */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {ticket.status === 'pending' ? '审核工单' : '更新工单状态'}
            </Text>
            
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {ticket.status === 'pending' 
                ? '请审核此工单以继续处理流程' 
                : '请选择新的工单状态'
              }
            </Text>
            
            <View style={styles.statusList}>
              {getAvailableStatuses().map((status) => (
                <TouchableOpacity
                  key={status.id}
                  style={[
                    styles.statusItem,
                    selectedStatus === status.id && styles.selectedOption,
                    ticket.status === 'pending' && status.id === 'approved' && styles.recommendedOption,
                    { backgroundColor: isDarkMode ? 'rgba(255,103,0,0.2)' : 'rgba(255,103,0,0.1)' }
                  ]}
                  onPress={() => setSelectedStatus(status.id)}
                >
                  <View style={styles.statusRadio}>
                    {selectedStatus === status.id && (
                      <View style={styles.statusRadioSelected} />
                    )}
                  </View>
                  <View style={styles.statusInfo}>
                    <Text style={[styles.statusName, { color: colors.text }]}>{status.name}</Text>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(status.id) }]} />
                  </View>
                  
                  {ticket.status === 'pending' && status.id === 'approved' && (
                    <Text style={styles.recommendedText}>推荐</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {/* 审核说明输入框（针对待审核工单） */}
            {ticket.status === 'pending' && (
              <View style={styles.reviewCommentContainer}>
                <Text style={[styles.reviewCommentLabel, { color: colors.text }]}>
                  审核说明（可选）:
                </Text>
                <TextInput
                  style={[
                    styles.reviewCommentInput,
                    { 
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      color: colors.text
                    }
                  ]}
                  placeholder="添加审核说明..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                />
              </View>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowStatusModal(false);
                  setSelectedStatus(null);
                  setReviewComment('');
                }}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  { opacity: !selectedStatus ? 0.7 : 1 }
                ]}
                onPress={handleUpdateStatus}
                disabled={!selectedStatus}
              >
                <Text style={styles.confirmButtonText}>
                  {ticket.status === 'pending' 
                    ? (selectedStatus === 'approved' ? '确定' : '拒绝') 
                    : '确认更新'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 图片查看模态框 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={imageModalVisible}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 40,
              right: 20,
              zIndex: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 20,
              padding: 8
            }}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.modalImageContainer}>
            {selectedImage && (
              <Image 
                source={{ 
                  uri: selectedImage,
                  headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                  }
                }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
          
          <View style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            backgroundColor: 'transparent',
            gap: 20,
          }}>
            <TouchableOpacity 
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                minWidth: 120,
                justifyContent: 'center',
              }}
              onPress={async () => {
                try {
                  if (!selectedImage) return;
                  
                  // 下载图片到本地缓存
                  const fileUri = await FileSystem.downloadAsync(
                    selectedImage,
                    FileSystem.cacheDirectory + 'ticket_image_' + Date.now() + '.jpg',
                    {
                      headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                      }
                    }
                  );
                  
                  // 分享图片
                  await Share.share({
                    url: fileUri.uri,
                    message: `工单相关图片`
                  });
                } catch (error) {
                  console.error('分享图片失败:', error);
                  Alert.alert('错误', '分享图片失败: ' + error.message);
                }
              }}
            >
              <Ionicons name="share-outline" size={24} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500', marginLeft: 8 }}>分享</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                minWidth: 120,
                justifyContent: 'center',
              }}
              onPress={() => setImageModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500', marginLeft: 8 }}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 已完成工单审核模态框 */}
      <Modal
        visible={showCompletionApprovalModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompletionApprovalModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {user.is_admin === 2 ? '部门确认' : '最终审核'}
            </Text>
            
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {user.is_admin === 2 
                ? '请确认工单处理结果是否满意' 
                : '请对工单处理结果进行最终审核'
              }
            </Text>
            
            <View style={styles.statusList}>
              {getAvailableStatuses().map((status) => (
                <TouchableOpacity
                  key={status.id}
                  style={[
                    styles.statusItem,
                    selectedStatus === status.id && styles.selectedOption,
                    { backgroundColor: isDarkMode ? 'rgba(255,103,0,0.2)' : 'rgba(255,103,0,0.1)' }
                  ]}
                  onPress={() => setSelectedStatus(status.id)}
                >
                  <View style={styles.statusRadio}>
                    {selectedStatus === status.id && (
                      <View style={styles.statusRadioSelected} />
                    )}
                  </View>
                  <View style={styles.statusInfo}>
                    <Text style={[styles.statusName, { color: colors.text }]}>{status.name}</Text>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(status.id) }]} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* 审核说明输入框 */}
            <View style={styles.reviewCommentContainer}>
              <Text style={[styles.reviewCommentLabel, { color: colors.text }]}>
                审核说明（可选）:
              </Text>
              <TextInput
                style={[
                  styles.reviewCommentInput,
                  { 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    color: colors.text
                  }
                ]}
                placeholder="添加审核说明..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={completionApprovalComment}
                onChangeText={setCompletionApprovalComment}
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCompletionApprovalModal(false);
                  setSelectedStatus(null);
                  setCompletionApprovalComment('');
                }}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  { opacity: !selectedStatus ? 0.7 : 1 }
                ]}
                onPress={handleUpdateStatus}
                disabled={!selectedStatus}
              >
                <Text style={styles.confirmButtonText}>
                  {user.is_admin === 2 
                    ? (selectedStatus === 'completionReview' ? '确认通过' : '需要修改') 
                    : (selectedStatus === 'closed' ? '关闭工单' : '重新处理')
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// 获取时间线动作文本
const getTimelineActionText = (action) => {
  switch (action) {
    case 'created':
      return '创建了工单';
    case 'approved':
      return '审核通过了工单';
    case 'rejected':
      return '拒绝了工单';
    case 'assigned':
      return '分配了工单';
    case 'inProgress':
      return '开始处理工单';
    case 'completed':
      return '完成了工单';
    case 'closed':
      return '关闭了工单';
    case 'comment':
      return '添加了评论';
    default:
      return '更新了工单';
  }
};

// 格式化详情字段的键
const formatDetailKey = (key) => {
  const keyMap = {
    title: '标题',
    description: '描述',
    priority: '优先级',
    category: '类别',
    status: '状态',
    assigned_to_role: '分配角色',
    due_date: '截止日期'
  };
  return keyMap[key] || key;
};

// 格式化详情字段的值
const formatDetailValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  
  // 如果是优先级，翻译为中文
  if (value === 'high') return '高';
  if (value === 'medium') return '中';
  if (value === 'low') return '低';
  
  // 如果是状态，使用已有的getStatusName函数
  if (['pending', 'approved', 'assigned', 'inProgress', 'completed', 'rejected', 'closed'].includes(value)) {
    return getStatusName(value);
  }
  
  return value.toString();
};

export default TicketDetailScreen; 