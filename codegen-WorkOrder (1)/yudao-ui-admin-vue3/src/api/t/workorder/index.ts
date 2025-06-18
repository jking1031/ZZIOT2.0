import request from '@/config/axios'

// 工单 VO
export interface WorkOrderVO {
  id: number // 工单ID
  title: string // 工单标题
  description: string // 问题描述
  status: string // 状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理
  priority: string // 优先级：low-低，medium-中，high-高，urgent-紧急
  creatorId: number // 创建人ID
  assignToId: number // 指派给
  deadline: Date // 截止时间
  attachment: string // é™„ä»¶åœ°å€åˆ—è¡¨ï¼ŒJSONæ ¼å¼å­˜å‚¨
}

// 工单 API
export const WorkOrderApi = {
  // 查询工单分页
  getWorkOrderPage: async (params: any) => {
    return await request.get({ url: `/t/work-order/page`, params })
  },

  // 查询工单详情
  getWorkOrder: async (id: number) => {
    return await request.get({ url: `/t/work-order/get?id=` + id })
  },

  // 新增工单
  createWorkOrder: async (data: WorkOrderVO) => {
    return await request.post({ url: `/t/work-order/create`, data })
  },

  // 修改工单
  updateWorkOrder: async (data: WorkOrderVO) => {
    return await request.put({ url: `/t/work-order/update`, data })
  },

  // 删除工单
  deleteWorkOrder: async (id: number) => {
    return await request.delete({ url: `/t/work-order/delete?id=` + id })
  },

  // 导出工单 Excel
  exportWorkOrder: async (params) => {
    return await request.download({ url: `/t/work-order/export-excel`, params })
  }
}