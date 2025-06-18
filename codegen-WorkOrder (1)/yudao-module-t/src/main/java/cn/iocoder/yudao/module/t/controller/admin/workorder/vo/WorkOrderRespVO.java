package cn.iocoder.yudao.module.t.controller.admin.workorder.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.util.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDateTime;
import com.alibaba.excel.annotation.*;

@Schema(description = "管理后台 - 工单 Response VO")
@Data
@ExcelIgnoreUnannotated
public class WorkOrderRespVO {

    @Schema(description = "工单ID", requiredMode = Schema.RequiredMode.REQUIRED, example = "30817")
    @ExcelProperty("工单ID")
    private Long id;

    @Schema(description = "工单标题", requiredMode = Schema.RequiredMode.REQUIRED)
    @ExcelProperty("工单标题")
    private String title;

    @Schema(description = "问题描述", requiredMode = Schema.RequiredMode.REQUIRED, example = "你说的对")
    @ExcelProperty("问题描述")
    private String description;

    @Schema(description = "状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理", requiredMode = Schema.RequiredMode.REQUIRED, example = "1")
    @ExcelProperty("状态：pending-待处理，assigned-已指派，processing-处理中，finished-已完成，closed-已关闭，returned-退回重处理")
    private String status;

    @Schema(description = "优先级：low-低，medium-中，high-高，urgent-紧急", requiredMode = Schema.RequiredMode.REQUIRED)
    @ExcelProperty("优先级：low-低，medium-中，high-高，urgent-紧急")
    private String priority;

    @Schema(description = "创建人ID", requiredMode = Schema.RequiredMode.REQUIRED, example = "8939")
    @ExcelProperty("创建人ID")
    private Long creatorId;

    @Schema(description = "指派给", example = "1619")
    @ExcelProperty("指派给")
    private Long assignToId;

    @Schema(description = "截止时间")
    @ExcelProperty("截止时间")
    private LocalDateTime deadline;

    @Schema(description = "é™„ä»¶åœ°å€åˆ—è¡¨ï¼ŒJSONæ ¼å¼å­˜å‚¨")
    @ExcelProperty("é™„ä»¶åœ°å€åˆ—è¡¨ï¼ŒJSONæ ¼å¼å­˜å‚¨")
    private String attachment;

    @Schema(description = "创建时间", requiredMode = Schema.RequiredMode.REQUIRED)
    @ExcelProperty("创建时间")
    private LocalDateTime createTime;

}