/**
 * 工单权限控制服务
 * 根据用户角色、部门和工单状态控制操作权限
 */

import { useAuth } from '../context/AuthContext';
import { usePermissionControl } from '../hooks/usePermissionControl';

class WorkOrderPermissionService {
  /**
   * 工单状态枚举
   */
  static STATUS = {
    PENDING: 'pending',           // 待处理
    ASSIGNED: 'assigned',         // 已指派
    PROCESSING: 'processing',     // 处理中
    FINISHED: 'finished',         // 已完成
    CLOSED: 'closed',            // 已关闭
    RETURNED: 'returned'         // 已退回
  };

  /**
   * 用户角色枚举
   */
  static ROLES = {
    ADMIN: 'admin',                    // 管理员
    DEPT_ADMIN: 'dept_admin',         // 部门管理员
    USER: 'user'                      // 普通用户
  };

  /**
   * 检查用户是否为管理员
   * @param {Object} user - 用户信息
   * @returns {boolean}
   */
  static isAdmin(user) {
    return user?.roles?.includes(this.ROLES.ADMIN) || user?.role === this.ROLES.ADMIN;
  }

  /**
   * 检查用户是否为部门管理员
   * @param {Object} user - 用户信息
   * @returns {boolean}
   */
  static isDeptAdmin(user) {
    return user?.roles?.includes(this.ROLES.DEPT_ADMIN) || user?.role === this.ROLES.DEPT_ADMIN;
  }

  /**
   * 检查用户是否与创建人同属一个部门
   * @param {Object} user - 当前用户
   * @param {Object} creator - 创建人信息
   * @returns {boolean}
   */
  static isSameDepartment(user, creator) {
    return user?.deptId && creator?.deptId && user.deptId === creator.deptId;
  }

  /**
   * 检查用户是否与被指派人同属一个部门
   * @param {Object} user - 当前用户
   * @param {Object} assignee - 被指派人信息
   * @returns {boolean}
   */
  static isSameDepartmentWithAssignee(user, assignee) {
    return user?.deptId && assignee?.deptId && user.deptId === assignee.deptId;
  }

  /**
   * 检查是否可以查看工单列表
   * 第一条：工单列表所有的用户都可以看到
   * @param {Object} user - 用户信息
   * @returns {boolean}
   */
  static canViewWorkOrderList(user) {
    return !!user; // 所有登录用户都可以查看
  }

  /**
   * 检查是否可以查看工单详情
   * 第二条：工单详情所有的用户都可以看到
   * @param {Object} user - 用户信息
   * @param {Object} workOrder - 工单信息
   * @returns {boolean}
   */
  static canViewWorkOrderDetail(user, workOrder) {
    return !!user; // 所有登录用户都可以查看
  }

  /**
   * 检查是否可以指派工单
   * 第三条：工单创建后，状态为待处理，只有管理员可以看到指派按钮
   * 或者用户和创建人同属一个部门但角色为部门管理员可以看到分配按钮
   * @param {Object} user - 用户信息
   * @param {Object} workOrder - 工单信息
   * @param {Object} creator - 创建人信息
   * @returns {boolean}
   */
  static canAssignWorkOrder(user, workOrder, creator) {
    if (!workOrder || workOrder.status !== this.STATUS.PENDING) {
      return false;
    }

    // 管理员可以指派
    if (this.isAdmin(user)) {
      return true;
    }

    // 部门管理员可以指派同部门创建的工单
    if (this.isDeptAdmin(user) && this.isSameDepartment(user, creator)) {
      return true;
    }

    // 工单指派后，管理员和部门管理员将看不到指派按钮
    if (workOrder.assignToId) {
      return false;
    }

    return false;
  }

  /**
   * 检查是否可以删除工单
   * 第三条：管理员可以看到删除按钮
   * @param {Object} user - 用户信息
   * @param {Object} workOrder - 工单信息
   * @returns {boolean}
   */
  static canDeleteWorkOrder(user, workOrder) {
    if (!workOrder) {
      return false;
    }

    // 只有管理员可以删除
    return this.isAdmin(user);
  }

  /**
   * 检查是否可以编辑工单
   * 第三条：管理员可以看到编辑按钮，创建人可以看到编辑按钮
   * 或者用户和创建人同属一个部门但角色为部门管理员可以看到编辑按钮
   * @param {Object} user - 用户信息
   * @param {Object} workOrder - 工单信息
   * @param {Object} creator - 创建人信息
   * @returns {boolean}
   */
  static canEditWorkOrder(user, workOrder, creator) {
    if (!workOrder) return false;

    // 管理员可以编辑
    if (this.isAdmin(user)) {
      return true;
    }

    // 创建人可以编辑
    if (workOrder.creatorId === user?.id) {
      return true;
    }

    // 部门管理员可以编辑同部门创建的工单
    if (this.isDeptAdmin(user) && this.isSameDepartment(user, creator)) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否可以关闭工单
   * 第三条：创建人可以看到关闭按钮
   * 第七条：管理员可以看到关闭工单按钮，或者用户和被指派的人同属一个部门且角色为部门管理员可以看到关闭工单按钮
   * @param {Object} user - 用户信息
   * @param {Object} workOrder - 工单信息
   * @param {Object} assignee - 被指派人信息
   * @returns {boolean}
   */
  static canCloseWorkOrder(user, workOrder, assignee) {
    if (!workOrder) return false;

    // 待处理状态下，创建人可以关闭
    if (workOrder.status === this.STATUS.PENDING && workOrder.creatorId === user?.id) {
      return true;
    }

    // 已完成状态下，管理员可以关闭
    if (workOrder.status === this.STATUS.FINISHED && this.isAdmin(user)) {
      return true;
    }

    // 已完成状态下，部门管理员可以关闭同部门被指派人的工单
    if (workOrder.status === this.STATUS.FINISHED && 
        this.isDeptAdmin(user) && 
        this.isSameDepartmentWithAssignee(user, assignee)) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否可以退回工单
   * 第三条：管理员可以看到退回按钮，部门管理员可以看到退回按钮
   * 第四条：被指派用户可以看到退回按钮
   * 第七条：管理员可以看到退回按钮，部门管理员可以看到退回按钮
   * @param {Object} user - 用户信息
   * @param {Object} workOrder - 工单信息
   * @param {Object} creator - 创建人信息
   * @param {Object} assignee - 被指派人信息
   * @returns {boolean}
   */
  static canReturnWorkOrder(user, workOrder, creator, assignee) {
    if (!workOrder) return false;

    // 管理员可以退回
    if (this.isAdmin(user)) {
      return true;
    }

    // 部门管理员可以退回同部门的工单
    if (this.isDeptAdmin(user)) {
      // 同部门创建的工单
      if (this.isSameDepartment(user, creator)) {
        return true;
      }
      // 同部门被指派的工单（第七条）
      if (workOrder.status === this.STATUS.FINISHED && 
          this.isSameDepartmentWithAssignee(user, assignee)) {
        return true;
      }
    }

    // 被指派的用户可以退回，但处理中和已完成状态下不能退回
    if (workOrder.assignToId === user?.id) {
      if (workOrder.status === this.STATUS.PROCESSING || workOrder.status === this.STATUS.FINISHED) {
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * 检查是否可以处理工单
   * 第四条：只有当前用户为被指派的用户时，才可以看到处理按钮
   * @param {Object} user - 用户信息
   * @param {Object} workOrder - 工单信息
   * @returns {boolean}
   */
  static canProcessWorkOrder(user, workOrder) {
    if (!workOrder || !user) return false;

    // 只有被指派的用户在已指派状态下可以处理
    return workOrder.assignToId === user?.id && workOrder.status === this.STATUS.ASSIGNED;
  }

  /**
   * 检查是否可以完成工单
   * 第五条：被指派用户点击处理按钮并填写处理信息后，处理按钮关闭，只显示完成按钮
   * @param {Object} user - 用户信息
   * @param {Object} workOrder - 工单信息
   * @returns {boolean}
   */
  static canFinishWorkOrder(user, workOrder) {
    if (!workOrder || !user) return false;

    // 只有被指派的用户在处理中状态下可以完成
    return workOrder.assignToId === user?.id && workOrder.status === this.STATUS.PROCESSING;
  }

  /**
   * 获取工单可见的操作按钮
   * @param {Object} user - 用户信息
   * @param {Object} workOrder - 工单信息
   * @param {Object} creator - 创建人信息
   * @param {Object} assignee - 被指派人信息
   * @returns {Object} 按钮可见性配置
   */
  static getVisibleActions(user, workOrder, creator, assignee) {
    if (!workOrder || !user) {
      return {
        canAssign: false,
        canEdit: false,
        canDelete: false,
        canClose: false,
        canReturn: false,
        canProcess: false,
        canFinish: false
      };
    }

    const actions = {
      canAssign: this.canAssignWorkOrder(user, workOrder, creator),
      canEdit: this.canEditWorkOrder(user, workOrder, creator),
      canDelete: this.canDeleteWorkOrder(user, workOrder),
      canClose: this.canCloseWorkOrder(user, workOrder, assignee),
      canReturn: this.canReturnWorkOrder(user, workOrder, creator, assignee),
      canProcess: this.canProcessWorkOrder(user, workOrder),
      canFinish: this.canFinishWorkOrder(user, workOrder)
    };
    
    // 只输出工单流程相关的关键信息
    console.log(`工单${workOrder.id}权限计算: 状态=${workOrder.status}, 用户ID=${user?.id}, 用户名=${user?.username}, 可操作=${Object.keys(actions).filter(k => actions[k]).join(',')}`);
    
    return actions;
  }

  /**
   * 获取工单状态的中文描述
   * @param {string} status - 工单状态
   * @returns {string}
   */
  static getStatusLabel(status) {
    const statusLabels = {
      [this.STATUS.PENDING]: '待处理',
      [this.STATUS.ASSIGNED]: '已指派',
      [this.STATUS.PROCESSING]: '处理中',
      [this.STATUS.FINISHED]: '已完成',
      [this.STATUS.CLOSED]: '已关闭',
      [this.STATUS.RETURNED]: '已退回'
    };
    return statusLabels[status] || '未知状态';
  }

  /**
   * 获取下一个可能的状态列表
   * @param {string} currentStatus - 当前状态
   * @param {Object} user - 用户信息
   * @param {Object} workOrder - 工单信息
   * @returns {Array} 可选状态列表
   */
  static getNextPossibleStatuses(currentStatus, user, workOrder) {
    const statuses = [];

    switch (currentStatus) {
      case this.STATUS.PENDING:
        // 待处理状态可以指派或关闭
        if (this.canAssignWorkOrder(user, workOrder)) {
          statuses.push({ value: this.STATUS.ASSIGNED, label: '指派' });
        }
        if (this.canCloseWorkOrder(user, workOrder)) {
          statuses.push({ value: this.STATUS.CLOSED, label: '关闭' });
        }
        break;

      case this.STATUS.ASSIGNED:
        // 已指派状态可以开始处理
        if (this.canProcessWorkOrder(user, workOrder)) {
          statuses.push({ value: this.STATUS.PROCESSING, label: '开始处理' });
        }
        break;

      case this.STATUS.PROCESSING:
        // 处理中状态可以完成
        if (this.canFinishWorkOrder(user, workOrder)) {
          statuses.push({ value: this.STATUS.FINISHED, label: '完成' });
        }
        break;

      case this.STATUS.FINISHED:
        // 已完成状态可以关闭
        if (this.canCloseWorkOrder(user, workOrder)) {
          statuses.push({ value: this.STATUS.CLOSED, label: '关闭' });
        }
        break;
    }

    // 大部分状态都可以退回（除了已关闭）
    if (currentStatus !== this.STATUS.CLOSED && this.canReturnWorkOrder(user, workOrder)) {
      statuses.push({ value: this.STATUS.RETURNED, label: '退回' });
    }

    return statuses;
  }
}

export default WorkOrderPermissionService;