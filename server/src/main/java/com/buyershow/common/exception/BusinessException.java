package com.buyershow.common.exception;

import com.buyershow.common.ErrorCode;
import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final int code;
    private final String userMessage;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.code = errorCode.getCode();
        this.userMessage = errorCode.getMessage();
    }

    public BusinessException(ErrorCode errorCode, String detail) {
        super(detail);
        this.code = errorCode.getCode();
        this.userMessage = detail;
    }

    public BusinessException(int code, String userMessage) {
        super(userMessage);
        this.code = code;
        this.userMessage = userMessage;
    }
}
