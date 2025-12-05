package com.boot.repository;

import com.boot.entity.SearchHistory;
import com.boot.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {
    // 특정 사용자의 검색 기록을 최신순으로 가져오기
    List<SearchHistory> findByUserOrderByCreatedAtDesc(User user);

    // 특정 사용자의 특정 검색어 기록 조회
    Optional<SearchHistory> findByUserAndQuery(User user, String query);

    // 특정 사용자의 모든 검색 기록 삭제
    void deleteByUser(User user);

    // 특정 사용자의 특정 검색 기록 삭제
    void deleteByUserAndId(User user, Long id);
}
