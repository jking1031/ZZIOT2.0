package cn.iocoder.yudao.module.t.controller.admin.workorder.vo;

import lombok.*;
import java.util.*;
import io.swagger.v3.oas.annotations.media.Schema;
import cn.iocoder.yudao.framework.common.pojo.PageParam;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDateTime;

import static cn.iocoder.yudao.framework.common.util.date.DateUtils.FORMAT_YEAR_MONTH_DAY_HOUR_MINUTE_SECOND;

@Schema(description = "管理后台 - 工单分页 Request VO")
@Data
public class WorkOrderPageReqVO extends PageParam {

    @Schema(description = "工单标题")
    private String title;

    @Schema(description = "问题描述", example = "你说的对")
    private String description;

    @Schema(description = "状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理", example = "1")
    private String status;

    @Schema(description = "优先级：low-低，medium-中，high-高，urgent-紧急")
    private String priority;

    @Schema(description = "创建人ID", example = "8939")
    private Long creatorId;

    @Schema(description = "指派给", example = "1619")
    private Long assignToId;

    @Schema(description = "截止时间")
    private LocalDateTime deadline;

    @Schema(description = "é™„ä»¶åœ°å€åˆ—è¡¨ï¼ŒJSONæ ¼å¼å­˜å‚¨")
    private String attachment;

    @Schema(description = "创建时间")
    @DateTimeFormat(pattern = FORMAT_YEAR_MONTH_DAY_HOUR_MINUTE_SECOND)
    private LocalDateTime[] createTime;

}