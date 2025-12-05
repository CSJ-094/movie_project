-- 결제 정보 테이블
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '결제 ID',
    payment_key VARCHAR(200) NOT NULL UNIQUE COMMENT '토스페이먼츠 결제 키',
    order_id VARCHAR(200) NOT NULL COMMENT '주문 ID',
    user_id BIGINT NOT NULL COMMENT '사용자 ID',
    booking_id BIGINT NOT NULL COMMENT '예매 ID',
    amount INT NOT NULL COMMENT '결제 금액',
    method VARCHAR(50) NOT NULL COMMENT '결제 수단 (카드, 토스페이, 가상계좌 등)',
    order_name VARCHAR(200) NOT NULL COMMENT '주문명',
    status VARCHAR(50) NOT NULL DEFAULT 'READY' COMMENT '결제 상태 (READY, IN_PROGRESS, DONE, CANCELED, PARTIAL_CANCELED, ABORTED, EXPIRED)',
    cancel_reason VARCHAR(500) COMMENT '취소 사유',
    canceled_at DATETIME COMMENT '취소 일시',
    approved_at DATETIME COMMENT '승인 일시',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
    
    INDEX idx_payment_key (payment_key),
    INDEX idx_order_id (order_id),
    INDEX idx_user_id (user_id),
    INDEX idx_booking_id (booking_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='결제 정보';
