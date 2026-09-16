package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 发送私信请求。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
public class SendMessageRequest {

    @NotBlank(message = "消息内容不能为空")
    @Size(max = 500, message = "消息最多 500 字")
    private String content;
}
