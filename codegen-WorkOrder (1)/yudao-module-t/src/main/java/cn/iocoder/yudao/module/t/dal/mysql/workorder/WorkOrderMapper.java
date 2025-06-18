package cn.iocoder.yudao.module.t.dal.mysql.workorder;

import java.util.*;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.framework.mybatis.core.query.LambdaQueryWrapperX;
import cn.iocoder.yudao.framework.mybatis.core.mapper.BaseMapperX;
import cn.iocoder.yudao.module.t.dal.dataobject.workorder.WorkOrderDO;
import org.apache.ibatis.annotations.Mapper;
import cn.iocoder.yudao.module.t.controller.admin.workorder.vo.*;

/**
 * 工单 Mapper
 *
 * @author 芋道源码
 */
@Mapper
public interface WorkOrderMapper extends BaseMapperX<WorkOrderDO> {

    default PageResult<WorkOrderDO> selectPage(WorkOrderPageReqVO reqVO) {
        return selectPage(reqVO, new LambdaQueryWrapperX<WorkOrderDO>()
                .eqIfPresent(WorkOrderDO::getTitle, reqVO.getTitle())
                .eqIfPresent(WorkOrderDO::getDescription, reqVO.getDescription())
                .eqIfPresent(WorkOrderDO::getStatus, reqVO.getStatus())
                .eqIfPresent(WorkOrderDO::getPriority, reqVO.getPriority())
                .eqIfPresent(WorkOrderDO::getCreatorId, reqVO.getCreatorId())
                .eqIfPresent(WorkOrderDO::getAssignToId, reqVO.getAssignToId())
                .eqIfPresent(WorkOrderDO::getDeadline, reqVO.getDeadline())
                .eqIfPresent(WorkOrderDO::getAttachment, reqVO.getAttachment())
                .betweenIfPresent(WorkOrderDO::getCreateTime, reqVO.getCreateTime())
                .orderByDesc(WorkOrderDO::getId));
    }

}