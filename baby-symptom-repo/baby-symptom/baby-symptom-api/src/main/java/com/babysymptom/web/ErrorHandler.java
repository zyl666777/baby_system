package com.babysymptom.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.ErrorResponse;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.util.LinkedHashMap;
import java.util.Map;

/** 統一錯誤格式：{ message, errors: { 欄位: 訊息 } }，不把系統內部錯誤細節傳給使用者 */
@RestControllerAdvice
public class ErrorHandler {
    private static final Logger log = LoggerFactory.getLogger(ErrorHandler.class);

    record ErrorBody(String message, Map<String, String> errors) {}

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorBody> invalid(MethodArgumentNotValidException e) {
        Map<String, String> errors = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(fe -> {
            String field = fe.getField().replaceAll("\\[\\d+]$", ""); // signs[2] → signs
            errors.putIfAbsent(field, fe.getDefaultMessage());
        });
        return ResponseEntity.badRequest().body(new ErrorBody("資料有誤，請檢查標示的欄位", errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorBody> unreadable(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(new ErrorBody("資料格式錯誤", Map.of()));
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorBody> api(ApiException e) {
        Map<String, String> errors = e.getField() == null ? Map.of() : Map.of(e.getField(), e.getMessage());
        return ResponseEntity.status(e.getStatus()).body(new ErrorBody(e.getMessage(), errors));
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ResponseEntity<ErrorBody> conflict(ObjectOptimisticLockingFailureException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorBody("這筆資料剛被其他人修改過，請重新載入後再編輯", Map.of()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ErrorBody> badParam(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.badRequest().body(new ErrorBody("網址參數格式錯誤", Map.of()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorBody> unexpected(Exception e) {
        // 404、405 這類 Spring 已知的錯誤，維持原本的狀態碼
        if (e instanceof ErrorResponse er) {
            return ResponseEntity.status(er.getStatusCode()).body(new ErrorBody("找不到或不支援這個請求", Map.of()));
        }
        log.error("未預期的錯誤", e);
        return ResponseEntity.internalServerError().body(new ErrorBody("系統發生錯誤，請稍後再試", Map.of()));
    }
}
