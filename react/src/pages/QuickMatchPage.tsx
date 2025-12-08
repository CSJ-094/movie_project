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
          targetCount: 25,
        };

        const res = await axiosInstance.post<QuickMatchSessionResponse>(
          "/quickmatch/session",
          body
        );

        setSessionId(res.data.sessionId);
        await fetchNextMovie(res.data.sessionId);
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

  // ===== 결과 화면용 헬퍼 =====
  const buildLikedDislikedText = (summary: QuickMatchResultSummaryDto) => {
    return `좋아요 ${summary.likedCount}편 · 별로에요 ${summary.dislikedCount}편`;
  };

  const buildPreferenceSentence = (summary: QuickMatchResultSummaryDto) => {
    const topNames = summary.topGenres
      ?.slice(0, 3)
      .map((g) => g.name)
      .filter(Boolean);

    if (topNames && topNames.length > 0) {
      return `주로 ${topNames.join(" · ")} 장르를 좋아하시는 편이에요.`;
    }

    return "아직 뚜렷한 장르 취향은 드러나지 않았어요. 조금 더 평가해 보면 더 정확한 추천을 드릴 수 있어요.";
  };

  // ===== RESULT UI =====
  if (phase === "RESULT" && result) {
    const { summary, recommendations } = result;

    const likedText = buildLikedDislikedText(summary);
    const prefSentence = buildPreferenceSentence(summary);

    return (
      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "flex",
          justifyContent: "center",
          padding: "32px 16px",
          color: "#e5e7eb",
        }}
      >
        <div style={{ width: "100%", maxWidth: 960 }}>
          <h1 style={{ marginBottom: 16, fontSize: 24, fontWeight: 700 }}>
            퀵매칭 결과
          </h1>

          {error && (
            <p style={{ color: "#f87171", marginBottom: 12 }}>{error}</p>
          )}

          {/* 요약 카드 */}
          <section
            style={{
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(14,165,233,0.05))",
              border: "1px solid #1f2937",
              boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ marginBottom: 8, fontSize: 14, opacity: 0.85 }}>
              오늘의 취향 스냅샷
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {prefSentence}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#9ca3af",
                marginBottom: 12,
              }}
            >
              {likedText}
            </div>

            {summary.topGenres && summary.topGenres.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {summary.topGenres.slice(0, 3).map((g) => (
                  <span
                    key={g.name}
                    style={{
                      fontSize: 12,
                      borderRadius: 999,
                      padding: "4px 10px",
                      backgroundColor: "rgba(31, 41, 55, 0.85)",
                      border: "1px solid #4b5563",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: "#f97316",
                      }}
                    />
                    <span>{g.name}</span>
                    <span style={{ color: "#9ca3af" }}>
                      {Math.round(g.ratio * 100)}%
                    </span>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 추천 영화 카드들 */}
          <section style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                추천 영화
              </h2>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                총 {recommendations.length}편의 영화를 골랐어요.
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: 18,
              }}
            >
              {recommendations.map((r) => (
                <div
                  key={r.movieId}
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: 14,
                    backgroundColor: "#020617",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  }}
                >
                  {r.posterUrl && (
                    <div style={{ position: "relative" }}>
                      <img
                        src={r.posterUrl}
                        alt={r.title}
                        style={{
                          width: "100%",
                          display: "block",
                          objectFit: "cover",
                          maxHeight: 260,
                        }}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      padding: "10px 12px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      flex: 1,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        margin: 0,
                        color: "#e5e7eb",
                      }}
                    >
                      {r.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#9ca3af",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {r.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => navigate("/")}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg, #3b82f6, #22c55e, #f97316)",
                backgroundSize: "200% 200%",
                color: "#fff",
                fontWeight: 500,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              메인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== 매칭 진행 UI =====
  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "32px 16px",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 820,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginBottom: 4,
              letterSpacing: 1,
            }}
          >
            QUICK MATCH
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            30초 영화 퀵매칭
          </h1>
          <p
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#9ca3af",
            }}
          >
            직관적으로{" "}
            <span style={{ color: "#f97316" }}>좋아요 / 별로에요</span>만
            눌러 주세요. 오늘 취향에 딱 맞는 영화를 찾아 드릴게요.
          </p>
        </div>

        {error && (
          <p style={{ color: "#f87171", marginBottom: 12 }}>{error}</p>
        )}

        {progress && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              <span>
                {progress.ratedCount} / {progress.targetCount} 개 평가함
              </span>
              <span style={{ color: "#9ca3af" }}>{progressPercent}% 완료</span>
            </div>
            <div
              style={{
                width: "100%",
                height: 10,
                background: "#020617",
                borderRadius: 999,
                overflow: "hidden",
                boxShadow: "inset 0 0 0 1px #0f172a",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, #10b981, #22c55e, #facc15)",
                  transition: "width 0.25s ease",
                }}
              />
            </div>
          </div>
        )}

        {loading && !currentMovie && (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>로딩 중...</p>
        )}

        {currentMovie && (
          <div
            style={{
              borderRadius: 18,
              border: "1px solid #1f2937",
              padding: 18,
              display: "flex",
              gap: 18,
              marginBottom: 20,
              background:
                "radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 55%), #020617",
              boxShadow: "0 18px 45px rgba(0,0,0,0.6)",
            }}
          >
            {currentMovie.posterUrl && (
              <img
                src={currentMovie.posterUrl}
                alt={currentMovie.title}
                style={{
                  width: 220,
                  borderRadius: 12,
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            )}

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                {currentMovie.title}
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  fontSize: 13,
                  color: "#9ca3af",
                  marginBottom: 10,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  개봉일: {currentMovie.releaseDate ?? "정보 없음"}
                </span>
                <span>·</span>
                <span>
                  평점:{" "}
                  {currentMovie.voteAverage !== null
                    ? currentMovie.voteAverage.toFixed(1)
                    : "정보 없음"}
                </span>
              </div>
              <p
                style={{
                  marginTop: 4,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "#d1d5db",
                  whiteSpace: "pre-line",
                }}
              >
                {currentMovie.overview || "줄거리 정보가 없습니다."}
              </p>
            </div>
          </div>
        )}

        {/* 버튼 영역 */}
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
              padding: "12px 26px",
              background:
                "linear-gradient(135deg, #374151, #111827)",
              color: "#e5e7eb",
              borderRadius: 999,
              border: "none",
              cursor: loading || !currentMovie ? "default" : "pointer",
              minWidth: 130,
              fontWeight: 500,
              fontSize: 14,
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              opacity: loading || !currentMovie ? 0.6 : 1,
            }}
          >
            별로에요
          </button>

          <button
            onClick={() => sendFeedback("LIKE")}
            disabled={loading || !currentMovie}
            style={{
              padding: "12px 26px",
              background:
                "linear-gradient(135deg, #fb923c, #f97316, #ec4899)",
              color: "#fff",
              borderRadius: 999,
              border: "none",
              cursor: loading || !currentMovie ? "default" : "pointer",
              minWidth: 130,
              fontWeight: 600,
              fontSize: 14,
              boxShadow: "0 12px 30px rgba(248,113,113,0.4)",
              opacity: loading || !currentMovie ? 0.7 : 1,
            }}
          >
            좋아요
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickMatchPage;
