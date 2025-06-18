<template>
  <ContentWrap>
    <!-- 搜索工作栏 -->
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="工单标题" prop="title">
        <el-input
          v-model="queryParams.title"
          placeholder="请输入工单标题"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理" prop="status">
        <el-select
          v-model="queryParams.status"
          placeholder="请选择状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理"
          clearable
          class="!w-240px"
        >
          <el-option label="请选择字典生成" value="" />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级：low-低，medium-中，high-高，urgent-紧急" prop="priority">
        <el-input
          v-model="queryParams.priority"
          placeholder="请输入优先级：low-低，medium-中，high-高，urgent-紧急"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="创建人ID" prop="creatorId">
        <el-input
          v-model="queryParams.creatorId"
          placeholder="请输入创建人ID"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="指派给" prop="assignToId">
        <el-input
          v-model="queryParams.assignToId"
          placeholder="请输入指派给"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="截止时间" prop="deadline">
        <el-date-picker
          v-model="queryParams.deadline"
          value-format="YYYY-MM-DD"
          type="date"
          placeholder="选择截止时间"
          clearable
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="é™„ä»¶åœ°å€åˆ—è¡¨ï¼ŒJSONæ ¼å¼å­˜å‚¨" prop="attachment">
        <el-input
          v-model="queryParams.attachment"
          placeholder="请输入é™„ä»¶åœ°å€åˆ—è¡¨ï¼ŒJSONæ ¼å¼å­˜å‚¨"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-220px"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['t:work-order:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['t:work-order:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="工单ID" align="center" prop="id" />
      <el-table-column label="工单标题" align="center" prop="title" />
      <el-table-column label="问题描述" align="center" prop="description" />
      <el-table-column label="状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理" align="center" prop="status" />
      <el-table-column label="优先级：low-低，medium-中，high-高，urgent-紧急" align="center" prop="priority" />
      <el-table-column label="创建人ID" align="center" prop="creatorId" />
      <el-table-column label="指派给" align="center" prop="assignToId" />
      <el-table-column
        label="截止时间"
        align="center"
        prop="deadline"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="é™„ä»¶åœ°å€åˆ—è¡¨ï¼ŒJSONæ ¼å¼å­˜å‚¨" align="center" prop="attachment" />
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="操作" align="center" min-width="120px">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['t:work-order:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['t:work-order:delete']"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页 -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <!-- 表单弹窗：添加/修改 -->
  <WorkOrderForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { WorkOrderApi, WorkOrderVO } from '@/api/t/workorder'
import WorkOrderForm from './WorkOrderForm.vue'

/** 工单 列表 */
defineOptions({ name: 'WorkOrder' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const list = ref<WorkOrderVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  title: undefined,
  description: undefined,
  status: undefined,
  priority: undefined,
  creatorId: undefined,
  assignToId: undefined,
  deadline: undefined,
  deadline: [],
  attachment: undefined,
  createTime: []
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await WorkOrderApi.getWorkOrderPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value.resetFields()
  handleQuery()
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await WorkOrderApi.deleteWorkOrder(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {}
}

/** 导出按钮操作 */
const handleExport = async () => {
  try {
    // 导出的二次确认
    await message.exportConfirm()
    // 发起导出
    exportLoading.value = true
    const data = await WorkOrderApi.exportWorkOrder(queryParams)
    download.excel(data, '工单.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>