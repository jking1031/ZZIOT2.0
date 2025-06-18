package cn.iocoder.yudao.module.t.dal.dataobject.workorder;

import lombok.*;
import java.util.*;
import java.time.LocalDateTime;
import java.time.LocalDateTime;
import java.time.LocalDateTime;
import com.baomidou.mybatisplus.annotation.*;
import cn.iocoder.yudao.framework.mybatis.core.dataobject.BaseDO;

/**
 * 工单 DO
 *
 * @author 芋道源码
 */
@TableName("t_work_order")
@KeySequence("t_work_order_seq") // 用于 Oracle、PostgreSQL、Kingbase、DB2、H2 数据库的主键自增。如果是 MySQL 等数据库，可不写。
@Data
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderDO extends BaseDO {

    /**
     * 工单ID
     */
    @TableId
    private Long id;
    /**
     * 工单标题
     */
    private String title;
    /**
     * 问题描述
     */
    private String description;
    /**
     * 状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理
     */
    private String status;
    /**
     * 优先级：low-低，medium-中，high-高，urgent-紧急
     */
    private String priority;
    /**
     * 创建人ID
     */
    private Long creatorId;
    /**
     * 指派给
     */
    private Long assignToId;
    /**
     * 截止时间
     */
    private LocalDateTime deadline;
    /**
     * é™„ä»¶åœ°å€åˆ—è¡¨ï¼ŒJSONæ ¼å¼å­˜å‚¨
     */
    private String attachment;


}