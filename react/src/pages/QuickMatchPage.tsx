// src/pages/QuickMatchPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

// ===== 타입 정의: 백엔드 DTO랑 맞춤 =====

interface QuickMatchSessionResponse {
  sessionId: string;
  targetCount: number;
}

interface ProgressDto {
  ratedCount: number;
  targetCount: number;
}

interface QuickMatchMovieDto {
  movieId: string;
  title: string;
  overview: string;
  posterUrl: string | null;
  voteAverage: number | null;
  releaseDate: string | null;
}

interface NextMovieResponse {
  sessionId: string;
  movie: QuickMatchMovieDto | null;
  progress: ProgressDto;
}

interface QuickMatchGenrePreferenceDto {
  name: string;
  ratio: number;
}

interface QuickMatchResultSummaryDto {
  likedCount: number;
  dislikedCount: number;
  topGenres: QuickMatchGenrePreferenceDto[];
  preferredYearRange: string;
  preferredCountry: string[];
  preferredMood: string[];
}

interface QuickMatchRecommendationDto {
  movieId: string;
  title: string;
  posterUrl: string | null;
  reason: string;
}

interface QuickMatchResultResponse {
  summary: QuickMatchResultSummaryDto;
  recommendations: QuickMatchRecommendationDto[];
}

const QuickMatchPage: React.FC = () => {
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentMovie, setCurrentMovie] =
    useState<QuickMatchMovieDto | null>(null);
  const [progress, setProgress] = useState<ProgressDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"MATCHING" | "RESULT">("MATCHING");
  const [result, setResult] = useState<QuickMatchResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1) 세션 생성
  useEffect(() => {
    const createSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const body = {
          targetCount: 25, // 필요하면 숫자 조절
        };

        const res = await axiosInstance.post<QuickMatchSessionResponse>(
          "/quickmatch/session",
          body
        );

        setSessionId(res.data.sessionId);
        await fetchNextMovie(res.data.sessionId); // 첫 영화 호출
      } catch (e) {
        console.error(e);
        setError("퀵매칭 세션 생성 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    createSession();
  }, []);

  // 2) 다음 영화 가져오기
  const fetchNextMovie = useCallback(
    async (sid?: string) => {
      try {
        setLoading(true);
        setError(null);

        const idToUse = sid ?? sessionId;
        if (!idToUse) return;

        const res = await axiosInstance.get<NextMovieResponse>(
          "/quickmatch/next",
          { params: { sessionId: idToUse } }
        );

        setCurrentMovie(res.data.movie);
        setProgress(res.data.progress);
      } catch (e) {
        console.error(e);
        setError("다음 영화를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  // 3) 피드백 전송 (LIKE / DISLIKE)
  const sendFeedback = async (action: "LIKE" | "DISLIKE") => {
    if (!sessionId || !currentMovie || !progress) return;

    try {
      setLoading(true);
      setError(null);

      const body = {
        sessionId,
        movieId: currentMovie.movieId,
        action,
      };

      const res = await axiosInstance.post<{
        sessionId: string;
        ratedCount: number;
        targetCount: number;
      }>("/quickmatch/feedback", body);

      const newRated = res.data.ratedCount;
      const target = res.data.targetCount;

      setProgress({ ratedCount: newRated, targetCount: target });

      if (newRated >= target) {
        // 목표 개수 도달 → 결과 단계
        await fetchResult(sessionId);
        setPhase("RESULT");
      } else {
        await fetchNextMovie(sessionId);
      }
    } catch (e) {
      console.error(e);
      setError("피드백 전송 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 4) 결과 조회
  const fetchResult = async (sid: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await axiosInstance.get<QuickMatchResultResponse>(
        "/quickmatch/result",
        { params: { sessionId: sid } }
      );

      setResult(res.data);
    } catch (e) {
      console.error(e);
      setError("결과를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const progressPercent =
    progress && progress.targetCount > 0
      ? Math.round((progress.ratedCount / progress.targetCount) * 100)
      : 0;

  // ===== RESULT UI =====
  if (phase === "RESULT" && result) {
    const { summary, recommendations } = result;

    return (
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "24px",
          color: "#e5e7eb",
        }}
      >
        <h1 style={{ marginBottom: 16 }}>퀵매칭 결과</h1>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <section style={{ marginBottom: 24 }}>
          <h2>당신의 취향 요약</h2>
          <p>
            좋아요: {summary.likedCount}개 / 별로에요:{" "}
            {summary.dislikedCount}개
          </p>
          <p>선호 연도대: {summary.preferredYearRange}</p>
          <p>선호 국가: {summary.preferredCountry.join(", ")}</p>
          <p>선호 분위기: {summary.preferredMood.join(", ")}</p>

          <div style={{ marginTop: 12 }}>
            <strong>선호 장르</strong>
            <ul>
              {summary.topGenres.map((g) => (
                <li key={g.name}>
                  {g.name} ({Math.round(g.ratio * 100)}%)
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>추천 영화</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 16,
              marginTop: 12,
            }}
          >
            {recommendations.map((r) => (
              <div
                key={r.movieId}
                style={{
                  border: "1px solid #374151",
                  borderRadius: 8,
                  padding: 8,
                  background: "#111827",
                }}
              >
                {r.posterUrl && (
                  <img
                    src={r.posterUrl}
                    alt={r.title}
                    style={{
                      width: "100%",
                      borderRadius: 4,
                      marginBottom: 8,
                    }}
                  />
                )}
                <h3 style={{ fontSize: 14, margin: "4px 0" }}>{r.title}</h3>
                <p style={{ fontSize: 12, color: "#9ca3af" }}>{r.reason}</p>
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={() => navigate("/")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#3b82f6",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          메인으로 돌아가기
        </button>
      </div>
    );
  }

  // ===== 매칭 진행 UI =====
  return (
    <div
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: "24px",
        color: "#e5e7eb",
      }}
    >
      <h1 style={{ marginBottom: 16 }}>30초 영화 퀵매칭</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {progress && (
        <div style={{ marginBottom: 16 }}>
          <p>
            {progress.ratedCount} / {progress.targetCount} 개 평가함 (
            {progressPercent}
            %)
          </p>
          <div
            style={{
              width: "100%",
              height: 10,
              background: "#111827",
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "#10b981",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>
      )}

      {loading && !currentMovie && <p>로딩 중...</p>}

      {currentMovie && (
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #374151",
            padding: 16,
            display: "flex",
            gap: 16,
            marginBottom: 16,
            background: "#111827",
          }}
        >
          {currentMovie.posterUrl && (
            <img
              src={currentMovie.posterUrl}
              alt={currentMovie.title}
              style={{ width: 200, borderRadius: 8, objectFit: "cover" }}
            />
          )}

          <div style={{ flex: 1 }}>
            <h2>{currentMovie.title}</h2>
            <p style={{ fontSize: 14, color: "#9ca3af" }}>
              개봉일: {currentMovie.releaseDate ?? "정보 없음"}
            </p>
            <p style={{ fontSize: 14, color: "#9ca3af" }}>
              평점: {currentMovie.voteAverage ?? "정보 없음"}
            </p>
            <p style={{ marginTop: 8, fontSize: 14 }}>
              {currentMovie.overview || "줄거리 정보가 없습니다."}
            </p>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => sendFeedback("DISLIKE")}
          disabled={loading || !currentMovie}
          style={{
            padding: "12px 24px",
            background: "#4b5563",
            color: "#e5e7eb",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            minWidth: 120,
          }}
        >
          별로에요
        </button>

        <button
          onClick={() => sendFeedback("LIKE")}
          disabled={loading || !currentMovie}
          style={{
            padding: "12px 24px",
            background: "#f97316",
            color: "#fff",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            minWidth: 120,
          }}
        >
          좋아요
        </button>
      </div>
    </div>
  );
};

export default QuickMatchPage;
