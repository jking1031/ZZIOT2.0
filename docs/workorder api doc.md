编辑或更新工单


**接口地址**:`/admin-api/workorder/work-order/update`


**请求方式**:`PUT`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`*/*`


**接口描述**:


**请求示例**:


```javascript
{
  "id": 1,
  "title": "污水处理设备故障",
  "description": "1号污水处理设备出现异常，需要紧急维修",
  "priority": "high",
  "assignToId": 1,
  "deadline": "",
  "attachments": [
    "https://example.com/file1.jpg",
    "https://example.com/file2.jpg"
  ]
}
```


**请求参数**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|workOrderUpdateReqVO|管理后台 - 工单更新 Request VO|body|true|WorkOrderUpdateReqVO|WorkOrderUpdateReqVO|
|&emsp;&emsp;id|工单ID||true|integer(int64)||
|&emsp;&emsp;title|工单标题||true|string||
|&emsp;&emsp;description|问题描述||true|string||
|&emsp;&emsp;priority|优先级||true|string||
|&emsp;&emsp;assignToId|指派给||false|integer(int64)||
|&emsp;&emsp;deadline|截止时间||false|string(date-time)||
|&emsp;&emsp;attachments|附件地址列表||false|array|string|
|tenant-id|租户编号|header|false|integer(int32)||
|Authorization|认证 Token|header|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|CommonResultBoolean|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||integer(int32)|integer(int32)|
|data||boolean||
|msg||string||


**响应示例**:
```javascript
{
	"code": 0,
	"data": true,
	"msg": ""
}
```



## 退回工单


**接口地址**:`/admin-api/workorder/work-order/return`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`*/*`


**接口描述**:


**请求示例**:


```javascript
{
  "id": 1,
  "comment": "信息不完整，需要补充详细描述"
}
```


**请求参数**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|workOrderReturnReqVO|管理后台 - 工单退回 Request VO|body|true|WorkOrderReturnReqVO|WorkOrderReturnReqVO|
|&emsp;&emsp;id|工单ID||true|integer(int64)||
|&emsp;&emsp;comment|退回原因||true|string||
|tenant-id|租户编号|header|false|integer(int32)||
|Authorization|认证 Token|header|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|CommonResultBoolean|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||integer(int32)|integer(int32)|
|data||boolean||
|msg||string||


**响应示例**:
```javascript
{
	"code": 0,
	"data": true,
	"msg": ""
}
```




## 处理工单


**接口地址**:`/admin-api/workorder/work-order/process`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`*/*`


**接口描述**:


**请求示例**:


```javascript
{
  "id": 1,
  "comment": "正在处理中，预计2小时内完成"
}
```


**请求参数**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|workOrderProcessReqVO|管理后台 - 工单处理 Request VO|body|true|WorkOrderProcessReqVO|WorkOrderProcessReqVO|
|&emsp;&emsp;id|工单ID||true|integer(int64)||
|&emsp;&emsp;comment|处理备注||false|string||
|tenant-id|租户编号|header|false|integer(int32)||
|Authorization|认证 Token|header|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|CommonResultBoolean|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||integer(int32)|integer(int32)|
|data||boolean||
|msg||string||


**响应示例**:
```javascript
{
	"code": 0,
	"data": true,
	"msg": ""
}
```



## 完成工单


**接口地址**:`/admin-api/workorder/work-order/finish`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`*/*`


**接口描述**:


**请求示例**:


```javascript
{
  "id": 1,
  "comment": "设备已修复，运行正常"
}
```


**请求参数**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|workOrderFinishReqVO|管理后台 - 工单完成 Request VO|body|true|WorkOrderFinishReqVO|WorkOrderFinishReqVO|
|&emsp;&emsp;id|工单ID||true|integer(int64)||
|&emsp;&emsp;comment|完成备注||false|string||
|tenant-id|租户编号|header|false|integer(int32)||
|Authorization|认证 Token|header|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|CommonResultBoolean|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||integer(int32)|integer(int32)|
|data||boolean||
|msg||string||


**响应示例**:
```javascript
{
	"code": 0,
	"data": true,
	"msg": ""
}
```



## 创建工单


**接口地址**:`/admin-api/workorder/work-order/create`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`*/*`


**接口描述**:


**请求示例**:


```javascript
{
  "title": "污水处理设备故障",
  "description": "1号污水处理设备出现异常，需要紧急维修",
  "priority": "high",
  "assignToId": 1,
  "deadline": "",
  "attachments": [
    "https://example.com/file1.jpg",
    "https://example.com/file2.jpg"
  ]
}
```


**请求参数**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|workOrderCreateReqVO|管理后台 - 工单创建 Request VO|body|true|WorkOrderCreateReqVO|WorkOrderCreateReqVO|
|&emsp;&emsp;title|工单标题||true|string||
|&emsp;&emsp;description|问题描述||true|string||
|&emsp;&emsp;priority|优先级||true|string||
|&emsp;&emsp;assignToId|指派给||false|integer(int64)||
|&emsp;&emsp;deadline|截止时间||false|string(date-time)||
|&emsp;&emsp;attachments|附件地址列表||false|array|string|
|tenant-id|租户编号|header|false|integer(int32)||
|Authorization|认证 Token|header|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|CommonResultLong|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||integer(int32)|integer(int32)|
|data||integer(int64)|integer(int64)|
|msg||string||


**响应示例**:
```javascript
{
	"code": 0,
	"data": 0,
	"msg": ""
}
```


## 关闭工单


**接口地址**:`/admin-api/workorder/work-order/close`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`*/*`


**接口描述**:


**请求示例**:


```javascript
{
  "id": 1,
  "comment": "问题已解决，工单关闭"
}
```


**请求参数**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|workOrderCloseReqVO|管理后台 - 工单关闭 Request VO|body|true|WorkOrderCloseReqVO|WorkOrderCloseReqVO|
|&emsp;&emsp;id|工单ID||true|integer(int64)||
|&emsp;&emsp;comment|关闭备注||false|string||
|tenant-id|租户编号|header|false|integer(int32)||
|Authorization|认证 Token|header|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|CommonResultBoolean|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||integer(int32)|integer(int32)|
|data||boolean||
|msg||string||


**响应示例**:
```javascript
{
	"code": 0,
	"data": true,
	"msg": ""
}
```



## 指派工单


**接口地址**:`/admin-api/workorder/work-order/assign`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`*/*`


**接口描述**:


**请求示例**:


```javascript
{
  "id": 1,
  "assignToId": 1
}
```


**请求参数**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|workOrderAssignReqVO|管理后台 - 工单指派 Request VO|body|true|WorkOrderAssignReqVO|WorkOrderAssignReqVO|
|&emsp;&emsp;id|工单ID||true|integer(int64)||
|&emsp;&emsp;assignToId|指派给用户ID||true|integer(int64)||
|tenant-id|租户编号|header|false|integer(int32)||
|Authorization|认证 Token|header|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|CommonResultBoolean|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||integer(int32)|integer(int32)|
|data||boolean||
|msg||string||


**响应示例**:
```javascript
{
	"code": 0,
	"data": true,
	"msg": ""
}
```


## 删除工单


**接口地址**:`/admin-api/workorder/work-order/delete`


**请求方式**:`DELETE`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`*/*`


**接口描述**:


**请求参数**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|编号|query|true|integer(int64)||
|tenant-id|租户编号|header|false|integer(int32)||
|Authorization|认证 Token|header|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|CommonResultBoolean|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||integer(int32)|integer(int32)|
|data||boolean||
|msg||string||


**响应示例**:
```javascript
{
	"code": 0,
	"data": true,
	"msg": ""
}
```








## 工单流程

工单流程
第一，工单列表所有的用户都可以看到
第二，工单详情所有的用户都可以看到，但是操作按钮要根据下面的流程来动态显示。
第三，工单状态为创建，但是未分配，这个时候只有用户角色为管理员可以看到分配按钮，删除按钮，编辑按钮，退回按钮。用户为创建人的用户可以看到删除按钮、编辑按钮。或者用户和创建人同属一个部门且角色为部门管理员可以看到分配按钮，编辑按钮，退回按钮。创建人可以看到编辑按钮和删除按钮。
第四，管理员或用户和创建人同属一个部门且角色为部门管理员分配工单后。只有当前用户为被指派的用户时，才可以看到处理按钮和退回按钮，其他用户看不到任何按钮。
第五，被指派用户点击处理按钮并填写处理信息后，处理按钮关闭，只显示完成按钮。
第六，被指派用户点击完成并填写完成信息后，完成按钮关闭，提示工单待审核并关闭。
第七，这个时候，用户角色为管理员，可以看到关闭工单按钮或退回按钮。或者用户和被指派的人同属一个部门且角色为部门管理员可以看到关闭工单和退回按钮。

