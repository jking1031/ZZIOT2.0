package cn.iocoder.yudao.module.t.controller.admin.workorder.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.util.*;
import javax.validation.constraints.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDateTime;

@Schema(description = "管理后台 - 工单新增/修改 Request VO")
@Data
public class WorkOrderSaveReqVO {

    @Schema(description = "工单ID", requiredMode = Schema.RequiredMode.REQUIRED, example = "30817")
    private Long id;

    @Schema(description = "工单标题", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotEmpty(message = "工单标题不能为空")
    private String title;

    @Schema(description = "问题描述", requiredMode = Schema.RequiredMode.REQUIRED, example = "你说的对")
    @NotEmpty(message = "问题描述不能为空")
    private String description;

    @Schema(description = "状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理", requiredMode = Schema.RequiredMode.REQUIRED, example = "1")
    @NotEmpty(message = "状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理不能为空")
    private String status;

    @Schema(description = "优先级：low-低，medium-中，high-高，urgent-紧急", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotEmpty(message = "优先级：low-低，medium-中，high-高，urgent-紧急不能为空")
    private String priority;

    @Schema(description = "创建人ID", requiredMode = Schema.RequiredMode.REQUIRED, example = "8939")
    @NotNull(message = "创建人ID不能为空")
    private Long creatorId;

    @Schema(description = "指派给", example = "1619")
    private Long assignToId;

    @Schema(description = "截止时间")
    private LocalDateTime deadline;

    @Schema(description = "é™„ä»¶åœ°å€åˆ—è¡¨ï¼ŒJSONæ ¼å¼å­˜å‚¨")
    private String attachment;

}