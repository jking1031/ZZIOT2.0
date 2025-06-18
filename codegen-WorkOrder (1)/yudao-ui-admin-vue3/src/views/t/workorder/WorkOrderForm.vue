<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="工单标题" prop="title">
        <el-input v-model="formData.title" placeholder="请输入工单标题" />
      </el-form-item>
      <el-form-item label="问题描述" prop="description">
        <Editor v-model="formData.description" height="150px" />
      </el-form-item>
      <el-form-item label="状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio value="1">请选择字典生成</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="优先级：low-低，medium-中，high-高，urgent-紧急" prop="priority">
        <el-input v-model="formData.priority" placeholder="请输入优先级：low-低，medium-中，high-高，urgent-紧急" />
      </el-form-item>
      <el-form-item label="创建人ID" prop="creatorId">
        <el-input v-model="formData.creatorId" placeholder="请输入创建人ID" />
      </el-form-item>
      <el-form-item label="指派给" prop="assignToId">
        <el-input v-model="formData.assignToId" placeholder="请输入指派给" />
      </el-form-item>
      <el-form-item label="截止时间" prop="deadline">
        <el-date-picker
          v-model="formData.deadline"
          type="date"
          value-format="x"
          placeholder="选择截止时间"
        />
      </el-form-item>
      <el-form-item label="é™„ä»¶åœ°å€åˆ—è¡¨ï¼ŒJSONæ ¼å¼å­˜å‚¨" prop="attachment">
        <el-input v-model="formData.attachment" placeholder="请输入é™„ä»¶åœ°å€åˆ—è¡¨ï¼ŒJSONæ ¼å¼å­˜å‚¨" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { WorkOrderApi, WorkOrderVO } from '@/api/t/workorder'

/** 工单 表单 */
defineOptions({ name: 'WorkOrderForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  title: undefined,
  description: undefined,
  status: undefined,
  priority: undefined,
  creatorId: undefined,
  assignToId: undefined,
  deadline: undefined,
  attachment: undefined
})
const formRules = reactive({
  title: [{ required: true, message: '工单标题不能为空', trigger: 'blur' }],
  description: [{ required: true, message: '问题描述不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理不能为空', trigger: 'blur' }],
  priority: [{ required: true, message: '优先级：low-低，medium-中，high-高，urgent-紧急不能为空', trigger: 'blur' }],
  creatorId: [{ required: true, message: '创建人ID不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await WorkOrderApi.getWorkOrder(id)
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  await formRef.value.validate()
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as WorkOrderVO
    if (formType.value === 'create') {
      await WorkOrderApi.createWorkOrder(data)
      message.success(t('common.createSuccess'))
    } else {
      await WorkOrderApi.updateWorkOrder(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    id: undefined,
    title: undefined,
    description: undefined,
    status: undefined,
    priority: undefined,
    creatorId: undefined,
    assignToId: undefined,
    deadline: undefined,
    attachment: undefined
  }
  formRef.value?.resetFields()
}
</script>