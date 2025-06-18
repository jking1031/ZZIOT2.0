package cn.iocoder.yudao.module.t.service.workorder;

import java.util.*;
import javax.validation.*;
import cn.iocoder.yudao.module.t.controller.admin.workorder.vo.*;
import cn.iocoder.yudao.module.t.dal.dataobject.workorder.WorkOrderDO;
import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.framework.common.pojo.PageParam;

/**
 * 工单 Service 接口
 *
 * @author 芋道源码
 */
public interface WorkOrderService {

    /**
     * 创建工单
     *
     * @param createReqVO 创建信息
     * @return 编号
     */
    Long createWorkOrder(@Valid WorkOrderSaveReqVO createReqVO);

    /**
     * 更新工单
     *
     * @param updateReqVO 更新信息
     */
    void updateWorkOrder(@Valid WorkOrderSaveReqVO updateReqVO);

    /**
     * 删除工单
     *
     * @param id 编号
     */
    void deleteWorkOrder(Long id);

    /**
    * 批量删除工单
    *
    * @param ids 编号
    */
    void deleteWorkOrderListByIds(List<Long> ids);

    /**
     * 获得工单
     *
     * @param id 编号
     * @return 工单
     */
    WorkOrderDO getWorkOrder(Long id);

    /**
     * 获得工单分页
     *
     * @param pageReqVO 分页查询
     * @return 工单分页
     */
    PageResult<WorkOrderDO> getWorkOrderPage(WorkOrderPageReqVO pageReqVO);

}