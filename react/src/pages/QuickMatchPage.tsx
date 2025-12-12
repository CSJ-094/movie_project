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
  tasteTypeName: string;
  avgLikedRating: number | null;
  mainKeywords: string[];
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
  const [currentMovie, setCurrentMovie] = useState<QuickMatchMovieDto | null>(
    null
  );
  const [progress, setProgress] = useState<ProgressDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"MATCHING" | "RESULT">("MATCHING");
  const [result, setResult] = useState<QuickMatchResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<Set<string>>(
    new Set()
  ); // 찜하기

  // ✅ "한 장 더 뽑기" 눌렸는지 보이게
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) 로그인된 사용자 찜 목록 가져오기
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await axiosInstance.get<string[]>("/favorites");
        setFavoriteMovieIds(new Set(res.data));
      } catch (err) {
        console.error("찜한 영화 불러오기 실패", err);
      }
    };

    fetchFavorites();
  }, []);

  // 3) 다음 영화 가져오기
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

  // 4) 피드백 전송 (LIKE / DISLIKE)
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

  // ✅ 추천 카드 한 장 교체하기 (405 해결: GET -> POST + Body)
  const handleReplaceRecommendation = async (index: number, movieId: string) => {
    if (!sessionId) return;

    try {
      setReplacingIndex(index);
      setError(null);

      const body = {
        sessionId,
        currentMovieId: movieId,
      };

      const res = await axiosInstance.post<QuickMatchRecommendationDto>(
        "/quickmatch/alternative",
        body
      );

      const newCard = res.data;

      setResult((prev) => {
        if (!prev) return prev;
        const newRecs = [...prev.recommendations];
        newRecs[index] = newCard;
        return { ...prev, recommendations: newRecs };
      });
    } catch (e) {
      console.error("대체 추천 요청 실패", e);
      setError("비슷한 영화 다시 추천 중 오류가 발생했습니다.");
    } finally {
      setReplacingIndex(null);
    }
  };

  // 찜 토글 함수
  const toggleFavorite = async (movieId: string) => {
    try {
      const res = await axiosInstance.post(`/favorites/${movieId}`);
      const isFavorited = res.data.isFavorited;

      setFavoriteMovieIds((prev) => {
        const copy = new Set(prev);
        if (isFavorited) copy.add(movieId);
        else copy.delete(movieId);
        return copy;
      });
    } catch (err) {
      console.error("찜 토글 실패", err);
    }
  };

  // 5) 결과 조회
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

  // 공통 스타일 (카드 hover 등)
  const GlobalStyles = (
    <style>{`
      .qm-card {
        transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      }
      .qm-card:hover {
        transform: translateY(-4px);
        border-color: rgba(148,163,184,0.26) !important;
        box-shadow: 0 18px 45px rgba(0,0,0,0.6) !important;
      }
      .qm-iconBtn {
        width: 34px;
        height: 34px;
        border-radius: 999px;
        border: 1px solid rgba(148,163,184,0.18);
        background: rgba(2,6,23,0.45);
        backdrop-filter: blur(6px);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .qm-iconBtn:hover {
        border-color: rgba(148,163,184,0.32);
        background: rgba(2,6,23,0.6);
      }
    `}</style>
  );

  // ===== RESULT UI =====
  if (phase === "RESULT" && result) {
    const { summary, recommendations } = result;
    const prefSentence = buildPreferenceSentence(summary);

    return (
      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "flex",
          justifyContent: "center",
          padding: "32px 16px",
          color: "#e5e7eb",
          background:
            "radial-gradient(1200px 600px at 20% 0%, rgba(59,130,246,0.12), transparent 55%), radial-gradient(900px 500px at 80% 20%, rgba(236,72,153,0.10), transparent 60%), #050b17",
        }}
      >
        {GlobalStyles}

        <div style={{ width: "100%", maxWidth: 960 }}>
          <h1 style={{ marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
            퀵매칭 결과
          </h1>

          {error && (
            <div
              style={{
                border: "1px solid rgba(248,113,113,0.35)",
                backgroundColor: "rgba(248,113,113,0.10)",
                padding: "10px 12px",
                borderRadius: 14,
                color: "#fecaca",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {/* 요약 카드 */}
          <section
            style={{
              borderRadius: 18,
              padding: 20,
              marginBottom: 24,
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.14), rgba(236,72,153,0.06))",
              border: "1px solid rgba(148,163,184,0.16)",
              boxShadow: "0 18px 45px rgba(0,0,0,0.5)",
            }}
          >
            {/* 헤더 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    letterSpacing: 1,
                  }}
                >
                  오늘의 취향 스냅샷
                </div>

                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#e5e7eb",
                  }}
                >
                  {prefSentence}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  좋아요 {summary.likedCount}편 · 별로에요 {summary.dislikedCount}
                  편
                </div>

                {summary.avgLikedRating !== null && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "#e5e7eb" }}>
                    평균 평점{" "}
                    <span style={{ fontWeight: 800 }}>
                      {summary.avgLikedRating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 타입 */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.18)",
                backgroundColor: "rgba(2,6,23,0.35)",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                오늘의 취향 타입
              </span>
              <span
                style={{ fontSize: 14, fontWeight: 800, color: "#e5e7eb" }}
              >
                {summary.tasteTypeName}
              </span>
            </div>

            {/* 키워드 */}
            {summary.mainKeywords.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                {summary.mainKeywords.slice(0, 6).map((k) => (
                  <span
                    key={k}
                    style={{
                      fontSize: 12,
                      borderRadius: 999,
                      padding: "5px 10px",
                      backgroundColor: "rgba(15, 23, 42, 0.85)",
                      border: "1px solid rgba(148,163,184,0.18)",
                      color: "#e5e7eb",
                    }}
                  >
                    #{k}
                  </span>
                ))}
              </div>
            )}

            {/* 장르 뱃지 */}
            {summary.topGenres.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {summary.topGenres.slice(0, 3).map((g) => (
                  <span
                    key={g.name}
                    style={{
                      fontSize: 12,
                      borderRadius: 999,
                      padding: "6px 10px",
                      backgroundColor: "rgba(31, 41, 55, 0.75)",
                      border: "1px solid rgba(148,163,184,0.2)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        backgroundColor: "#fb923c",
                      }}
                    />
                    <span style={{ color: "#e5e7eb", fontWeight: 700 }}>
                      {g.name}
                    </span>
                    <span style={{ color: "#94a3b8" }}>
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
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>추천 영화</h2>
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
              {recommendations.map((r, idx) => (
                <div
                  key={`${r.movieId}-${idx}`}
                  className="qm-card"
                  style={{
                    border: "1px solid rgba(148,163,184,0.14)",
                    borderRadius: 14,
                    background:
                      "linear-gradient(180deg, rgba(15,23,42,0.75), rgba(2,6,23,0.9))",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    position: "relative",
                  }}
                >
                  {/* 찜하기 하트 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(r.movieId);
                    }}
                    className="qm-iconBtn"
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      fontSize: 18,
                      color: favoriteMovieIds.has(r.movieId)
                        ? "#f87171"
                        : "#ffffff90",
                      zIndex: 2,
                    }}
                    aria-label="favorite"
                  >
                    {favoriteMovieIds.has(r.movieId) ? "❤️" : "🤍"}
                  </button>

                  {/* 포스터 */}
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

                  {/* 제목 + 추천 문구 + 버튼 */}
                  <div
                    style={{
                      padding: "10px 12px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        margin: 0,
                        color: "#e5e7eb",
                      }}
                    >
                      {r.title}
                    </h3>

                    {/* ✅ 결과 카드 문구: 잘리지 않게 그대로 출력 */}
                    <p
                      style={{
                        fontSize: 12,
                        color: "#9ca3af",
                        margin: 0,
                        lineHeight: 1.55,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {r.reason}
                    </p>

                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: 10,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        onClick={() => handleReplaceRecommendation(idx, r.movieId)}
                        disabled={replacingIndex === idx}
                        style={{
                          fontSize: 11,
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "1px solid rgba(148,163,184,0.18)",
                          cursor: replacingIndex === idx ? "default" : "pointer",
                          backgroundColor:
                            replacingIndex === idx
                              ? "rgba(148,163,184,0.10)"
                              : "rgba(2,6,23,0.35)",
                          color: "#e5e7eb",
                          opacity: replacingIndex === idx ? 0.75 : 1,
                        }}
                      >
                        {replacingIndex === idx ? "뽑는 중..." : "한 장 더 뽑기"}
                      </button>
                    </div>
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
                background: "linear-gradient(135deg, #3b82f6, #22c55e, #f97316)",
                backgroundSize: "200% 200%",
                color: "#fff",
                fontWeight: 700,
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
        padding: "36px 16px 60px",
        color: "#e5e7eb",
        background:
          "radial-gradient(1200px 600px at 20% 0%, rgba(59,130,246,0.16), transparent 55%), radial-gradient(900px 500px at 80% 20%, rgba(236,72,153,0.10), transparent 60%), #050b17",
      }}
    >
      {GlobalStyles}

      <div style={{ width: "100%", maxWidth: 960, margin: "0 auto" }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 12,
              color: "#94a3b8",
              letterSpacing: 1.8,
              marginBottom: 6,
            }}
          >
            QUICK MATCH
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
              30초 영화 퀵매칭
            </h1>

            {progress && (
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                {progress.ratedCount} / {progress.targetCount} ·{" "}
                <span style={{ color: "#e5e7eb", fontWeight: 700 }}>
                  {progressPercent}%
                </span>
              </div>
            )}
          </div>

          <p
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "#94a3b8",
              lineHeight: 1.6,
            }}
          >
            직관적으로{" "}
            <span style={{ color: "#fb923c", fontWeight: 700 }}>
              좋아요 / 별로에요
            </span>
            만 눌러 주세요. 오늘 취향에 딱 맞는 영화를 찾아 드릴게요.
          </p>
        </div>

        {/* 에러 */}
        {error && (
          <div
            style={{
              border: "1px solid rgba(248,113,113,0.35)",
              backgroundColor: "rgba(248,113,113,0.10)",
              padding: "10px 12px",
              borderRadius: 14,
              color: "#fecaca",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* 진행바 */}
        {progress && (
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                width: "100%",
                height: 10,
                background: "rgba(2,6,23,0.65)",
                borderRadius: 999,
                overflow: "hidden",
                boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.12)",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, rgba(34,197,94,0.95), rgba(250,204,21,0.95), rgba(251,146,60,0.95))",
                  transition: "width 0.25s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* 로딩 */}
        {loading && !currentMovie && (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>로딩 중...</p>
        )}

        {/* 영화 카드 */}
        {currentMovie && (
          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(148,163,184,0.14)",
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.85), rgba(2,6,23,0.9))",
              boxShadow: "0 26px 60px rgba(0,0,0,0.55)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "260px 1fr",
                gap: 18,
                padding: 18,
              }}
            >
              {/* 포스터 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
                }}
              >
                {currentMovie.posterUrl ? (
                  <img
                    src={currentMovie.posterUrl}
                    alt={currentMovie.title}
                    style={{
                      width: "100%",
                      height: 360,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 360,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: 13,
                    }}
                  >
                    포스터 없음
                  </div>
                )}

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.55))",
                  }}
                />
              </div>

              {/* 내용 */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: -0.2,
                  }}
                >
                  {currentMovie.title}
                </h2>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginTop: 10,
                    marginBottom: 12,
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.18)",
                      backgroundColor: "rgba(2,6,23,0.35)",
                    }}
                  >
                    개봉일: {currentMovie.releaseDate ?? "정보 없음"}
                  </span>

                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.18)",
                      backgroundColor: "rgba(2,6,23,0.35)",
                    }}
                  >
                    평점:{" "}
                    {currentMovie.voteAverage !== null
                      ? currentMovie.voteAverage.toFixed(1)
                      : "정보 없음"}
                  </span>
                </div>

                {/* ✅ 더보기/클램프 제거: 줄거리 그냥 다 보여주기 */}
                <div
                  style={{
                    color: "#d1d5db",
                    fontSize: 14,
                    lineHeight: 1.7,
                    whiteSpace: "pre-line",
                  }}
                >
                  {currentMovie.overview || "줄거리 정보가 없습니다."}
                </div>

                {/* 버튼 영역 */}
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 16,
                    display: "flex",
                    gap: 12,
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => sendFeedback("DISLIKE")}
                    disabled={loading || !currentMovie}
                    style={{
                      padding: "12px 18px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.18)",
                      background:
                        "linear-gradient(135deg, rgba(51,65,85,0.55), rgba(2,6,23,0.65))",
                      color: "#e5e7eb",
                      cursor: loading || !currentMovie ? "default" : "pointer",
                      minWidth: 140,
                      fontWeight: 700,
                      fontSize: 14,
                      boxShadow: "0 10px 25px rgba(0,0,0,0.45)",
                      opacity: loading || !currentMovie ? 0.6 : 1,
                    }}
                  >
                    별로에요
                  </button>

                  <button
                    onClick={() => sendFeedback("LIKE")}
                    disabled={loading || !currentMovie}
                    style={{
                      padding: "12px 18px",
                      borderRadius: 999,
                      border: "none",
                      background:
                        "linear-gradient(135deg, #fb923c, #f97316, #ec4899)",
                      color: "#fff",
                      cursor: loading || !currentMovie ? "default" : "pointer",
                      minWidth: 140,
                      fontWeight: 800,
                      fontSize: 14,
                      boxShadow: "0 18px 40px rgba(251,146,60,0.25)",
                      opacity: loading || !currentMovie ? 0.7 : 1,
                    }}
                  >
                    좋아요
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 반응형 */}
        <div style={{ height: 0 }}>
          <style>{`
            @media (max-width: 820px) {
              .qm-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
};

export default QuickMatchPage;
