package com.boot.service;

import com.boot.dto.PaymentCancelRequest;
import com.boot.dto.PaymentConfirmRequest;
import com.boot.entity.Payment;
import com.boot.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Value("${toss.payments.secret.key:test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R}")
    private String tossSecretKey;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 결제 승인 및 DB 저장
     */
    @Transactional
    public Map<String, Object> confirmPayment(PaymentConfirmRequest request) {
        try {
            // 1. 토스페이먼츠에 결제 승인 요청
            String url = "https://api.tosspayments.com/v1/payments/confirm";

            String auth = tossSecretKey + ":";
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Basic " + encodedAuth);

            Map<String, Object> body = new HashMap<>();
            body.put("paymentKey", request.getPaymentKey());
            body.put("orderId", request.getOrderId());
            body.put("amount", request.getAmount());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            Map<String, Object> tossResponse = response.getBody();

            // 2. DB에 결제 정보 저장
            Payment payment = new Payment();
            payment.setPaymentKey(request.getPaymentKey());
            payment.setOrderId(request.getOrderId());
            payment.setUserId(request.getUserId());
            payment.setBookingId(request.getBookingId());
            payment.setAmount(request.getAmount());
            payment.setMethod(request.getMethod());
            payment.setOrderName(request.getOrderName());
            payment.setStatus(Payment.PaymentStatus.DONE);
            payment.setApprovedAt(LocalDateTime.now());

            paymentRepository.save(payment);

            // 3. 응답 반환
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("payment", payment);
            result.put("tossResponse", tossResponse);

            return result;

        } catch (Exception e) {
            throw new RuntimeException("결제 승인 실패: " + e.getMessage());
        }
    }

    /**
     * 결제 취소 및 DB 업데이트
     */
    @Transactional
    public Map<String, Object> cancelPayment(PaymentCancelRequest request) {
        try {
            // 1. DB에서 결제 정보 조회
            Payment payment = paymentRepository.findByPaymentKey(request.getPaymentKey())
                    .orElseThrow(() -> new RuntimeException("결제 정보를 찾을 수 없습니다."));

            // 2. 이미 취소된 결제인지 확인
            if (payment.getStatus() == Payment.PaymentStatus.CANCELED) {
                throw new RuntimeException("이미 취소된 결제입니다.");
            }

            // 3. 토스페이먼츠에 취소 요청
            String url = "https://api.tosspayments.com/v1/payments/" + request.getPaymentKey() + "/cancel";

            String auth = tossSecretKey + ":";
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Basic " + encodedAuth);

            Map<String, String> body = new HashMap<>();
            body.put("cancelReason", request.getCancelReason());

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            Map<String, Object> tossResponse = response.getBody();

            // 4. DB 상태 업데이트
            payment.setStatus(Payment.PaymentStatus.CANCELED);
            payment.setCancelReason(request.getCancelReason());
            payment.setCanceledAt(LocalDateTime.now());
            paymentRepository.save(payment);

            // 5. 응답 반환
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("payment", payment);
            result.put("tossResponse", tossResponse);

            return result;

        } catch (Exception e) {
            throw new RuntimeException("결제 취소 실패: " + e.getMessage());
        }
    }

    /**
     * 사용자별 결제 내역 조회
     */
    public List<Payment> getPaymentsByUserId(Long userId) {
        return paymentRepository.findByUserId(userId);
    }

    /**
     * 예매별 결제 정보 조회
     */
    public Payment getPaymentByBookingId(Long bookingId) {
        List<Payment> payments = paymentRepository.findByBookingId(bookingId);
        return payments.isEmpty() ? null : payments.get(0);
    }

    /**
     * paymentKey로 결제 정보 조회
     */
    public Payment getPaymentByPaymentKey(String paymentKey) {
        return paymentRepository.findByPaymentKey(paymentKey)
                .orElse(null);
    }
}
