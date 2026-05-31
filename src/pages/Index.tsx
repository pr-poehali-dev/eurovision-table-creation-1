import { useState, useRef, useEffect } from "react";

const PARTICIPANTS = [
  "Маша Сергеева", "Руслан Шлем", "Руслан Хмелинин", "Даня Шустов",
  "Дима Тарасов", "Юля Рунова", "Сергей Сумбаев", "Егор Коновалов ст",
  "Егор Коновалов мл", "Ярослав Ткачев", "Ярослав Удовиков", "Ваня Фальтенберг",
  "Тимофей Зелюченко", "Тимофей Павлов", "Егор Привалов", "Олег Линьков",
  "Миша Сумбаев", "Магомед Дутханов", "Антон Цепецавер", "Вова Молчанов",
  "Егор Ступак", "Саша Кондратьев", "Ваня Гринкевич", "Сергей Петрушин",
  "Артем Дорохов", "Максим Дунин", "Антон Викторович", "Влад Варанкин",
];

const POINT_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

type Phase = "setup" | "voting";

interface Contestant {
  name: string;
  points: number;
  animating: boolean;
  fillProgress: number;
  lastReceived: number | null;
}

interface FlyingSquare {
  id: number;
  points: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface VotingInfo {
  voterCount: number;
  totalVoters: number;
}

export default function Index() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [voter, setVoter] = useState("");
  const [contestant, setContestant] = useState("");

  const [contestants, setContestants] = useState<Contestant[]>(
    PARTICIPANTS.map((name) => ({ name, points: 0, animating: false, fillProgress: 0, lastReceived: null }))
  );

  const [givenPoints, setGivenPoints] = useState<number[]>([]);
  const [flyingSquares, setFlyingSquares] = useState<FlyingSquare[]>([]);
  const [activePoints, setActivePoints] = useState<number | null>(null);
  const [votingInfo, setVotingInfo] = useState<VotingInfo>({ voterCount: 0, totalVoters: PARTICIPANTS.length });

  const pointBtnRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const flyIdRef = useRef(0);

  const sortedContestants = [...contestants].sort(
    (a, b) => b.points - a.points || PARTICIPANTS.indexOf(a.name) - PARTICIPANTS.indexOf(b.name)
  );

  function startVoting() {
    if (!voter || !contestant) return;
    setVotingInfo(prev => ({ ...prev, voterCount: prev.voterCount + 1 }));
    setPhase("voting");
  }

  function handlePointClick(pts: number) {
    if (givenPoints.includes(pts)) return;
    setActivePoints(prev => prev === pts ? null : pts);
  }

  function handleContestantClick(targetName: string) {
    if (activePoints === null) return;
    if (targetName === contestant) return;
    const pts = activePoints;
    const btnEl = pointBtnRefs.current[pts];
    const rowEl = rowRefs.current[targetName];
    if (!btnEl || !rowEl) return;

    const btnRect = btnEl.getBoundingClientRect();
    const rowRect = rowEl.getBoundingClientRect();

    const flyId = flyIdRef.current++;
    setFlyingSquares(prev => [...prev, {
      id: flyId, points: pts,
      startX: btnRect.left + btnRect.width / 2 - 32,
      startY: btnRect.top - 60,
      endX: rowRect.right - 90,
      endY: rowRect.top + rowRect.height / 2 - 26,
    }]);
    setGivenPoints(prev => [...prev, pts]);
    setActivePoints(null);

    setTimeout(() => {
      setFlyingSquares(prev => prev.filter(s => s.id !== flyId));
      animateRow(targetName, pts);
    }, 680);
  }

  function animateRow(targetName: string, pts: number) {
    let step = 0;
    const steps = 70;
    const duration = 1400;
    let basePoints = 0;

    setContestants(prev => {
      const found = prev.find(c => c.name === targetName);
      if (found) basePoints = found.points;
      return prev.map(c =>
        c.name === targetName ? { ...c, animating: true, fillProgress: 0, lastReceived: pts } : c
      );
    });

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const done = step >= steps;
      setContestants(prev =>
        prev.map(c => {
          if (c.name !== targetName) return c;
          const display = Math.min(Math.floor(pts * Math.min(progress * 1.3, 1)), pts);
          return {
            ...c,
            fillProgress: Math.min(progress, 1),
            points: done ? basePoints + pts : basePoints + display,
            animating: !done,
          };
        })
      );
      if (done) clearInterval(interval);
    }, duration / steps);
  }

  const allPointsGiven = POINT_VALUES.every(p => givenPoints.includes(p));
  const half = Math.ceil(sortedContestants.length / 2);

  return (
    <div style={{ minHeight: "100vh", background: "#000", fontFamily: "'Oswald', sans-serif" }}>
      {phase === "setup" && (
        <SetupScreen
          participants={PARTICIPANTS}
          voter={voter} contestant={contestant}
          onVoterChange={setVoter} onContestantChange={setContestant}
          onStart={startVoting}
        />
      )}
      {phase === "voting" && (
        <VotingScreen
          sortedContestants={sortedContestants}
          voter={voter} contestant={contestant}
          givenPoints={givenPoints} activePoints={activePoints}
          flyingSquares={flyingSquares} votingInfo={votingInfo}
          half={half}
          pointBtnRefs={pointBtnRefs} rowRefs={rowRefs}
          allPointsGiven={allPointsGiven}
          onPointClick={handlePointClick}
          onContestantClick={handleContestantClick}
          onNewVoting={() => {
            setPhase("setup"); setVoter(""); setContestant("");
            setGivenPoints([]); setActivePoints(null);
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SETUP
═══════════════════════════════════════════════════════════ */
function SetupScreen({ participants, voter, contestant, onVoterChange, onContestantChange, onStart }: {
  participants: string[]; voter: string; contestant: string;
  onVoterChange: (v: string) => void; onContestantChange: (v: string) => void; onStart: () => void;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 30% 20%, #1a0533 0%, #08001a 55%, #000 100%)",
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px"
    }}>
      <div style={{ width: "100%", maxWidth: 900, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 32 }}>
        <h1 style={{ fontFamily: "'Oswald',sans-serif", fontSize: 28, fontWeight: 700, color: "#fff", textAlign: "center", letterSpacing: 4, marginBottom: 4 }}>
          🎤 ЕВРОВИДЕНИЕ &nbsp;<span style={{ color: "#c084fc", fontSize: 16, letterSpacing: 6 }}>ГОЛОСОВАНИЕ</span>
        </h1>

        {[
          { label: "КТО ГОЛОСУЕТ", val: voter, onChange: onVoterChange },
          { label: "ЧЕЙ ВЫХОД НА СЦЕНУ", val: contestant, onChange: onContestantChange },
        ].map(({ label, val, onChange }) => (
          <div key={label} style={{ marginTop: 24 }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 11, letterSpacing: 3, color: "#a78bfa", marginBottom: 10 }}>{label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {participants.map(name => (
                <button key={name} onClick={() => onChange(name)} style={{
                  fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 600,
                  padding: "6px 13px", borderRadius: 6,
                  border: val === name ? "1px solid #c084fc" : "1px solid rgba(255,255,255,0.15)",
                  background: val === name ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.06)",
                  color: "#fff", cursor: "pointer", whiteSpace: "nowrap",
                  boxShadow: val === name ? "0 0 14px rgba(168,85,247,0.5)" : "none",
                }}>{name}</button>
              ))}
            </div>
          </div>
        ))}

        <button onClick={onStart} disabled={!voter || !contestant || voter === contestant} style={{
          display: "block", width: "100%", marginTop: 28, padding: 15,
          fontFamily: "'Oswald',sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: 4,
          borderRadius: 8, border: "none",
          cursor: voter && contestant && voter !== contestant ? "pointer" : "not-allowed",
          background: voter && contestant && voter !== contestant
            ? "linear-gradient(135deg,#be185d,#ec4899)" : "rgba(255,255,255,0.08)",
          color: voter && contestant && voter !== contestant ? "#fff" : "rgba(255,255,255,0.3)",
          boxShadow: voter && contestant && voter !== contestant ? "0 0 28px rgba(236,72,153,0.4)" : "none",
        }}>НАЧАТЬ ГОЛОСОВАНИЕ</button>
        {voter && contestant && voter === contestant &&
          <p style={{ textAlign: "center", color: "#f87171", fontSize: 13, marginTop: 8, fontFamily: "'Montserrat',sans-serif" }}>Нельзя голосовать за себя</p>
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VOTING SCREEN
═══════════════════════════════════════════════════════════ */
interface VotingScreenProps {
  sortedContestants: Contestant[]; voter: string; contestant: string;
  givenPoints: number[]; activePoints: number | null; flyingSquares: FlyingSquare[];
  votingInfo: VotingInfo; half: number;
  pointBtnRefs: React.MutableRefObject<Record<number, HTMLButtonElement | null>>;
  rowRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  allPointsGiven: boolean;
  onPointClick: (pts: number) => void; onContestantClick: (name: string) => void; onNewVoting: () => void;
}

function VotingScreen({
  sortedContestants, voter, contestant, givenPoints, activePoints,
  flyingSquares, votingInfo, half,
  pointBtnRefs, rowRefs, allPointsGiven,
  onPointClick, onContestantClick, onNewVoting,
}: VotingScreenProps) {
  const ROW_H = 36;
  const tableRef = useRef<HTMLDivElement>(null);
  // FLIP: запоминаем позиции ДО ре-рендера
  const posBeforeRef = useRef<Record<string, { col: number; top: number }>>({});
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({});

  // Снимаем позиции ПЕРЕД изменением списка
  const prevSorted = useRef<Contestant[]>(sortedContestants);
  useEffect(() => {
    // FIRST: record where things were before this render
    const before: Record<string, { col: number; top: number }> = {};
    prevSorted.current.forEach((c, i) => {
      const col = i < half ? 0 : 1;
      const rowInCol = i < half ? i : i - half;
      before[c.name] = { col, top: rowInCol * ROW_H };
    });

    // SECOND: compute offsets (where did they come FROM relative to where they are NOW)
    const newOffsets: Record<string, { x: number; y: number }> = {};
    const tableW = tableRef.current ? tableRef.current.offsetWidth / 2 : 400;
    sortedContestants.forEach((c, i) => {
      const col = i < half ? 0 : 1;
      const rowInCol = i < half ? i : i - half;
      const prev = before[c.name];
      if (prev) {
        const dx = (prev.col - col) * tableW;
        const dy = prev.top - rowInCol * ROW_H;
        if (dx !== 0 || dy !== 0) {
          newOffsets[c.name] = { x: dx, y: dy };
        }
      }
    });

    prevSorted.current = sortedContestants;

    if (Object.keys(newOffsets).length === 0) return;

    // Apply offsets immediately (no transition), then animate to 0
    setOffsets(newOffsets);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOffsets({});
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [sortedContestants, half]);

  const leftCol = sortedContestants.slice(0, half);
  const rightCol = sortedContestants.slice(half);

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#0d0d14",
      fontFamily: "'Oswald', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {flyingSquares.map(sq => <FlyingSquareEl key={sq.id} sq={sq} />)}

      {/* Основная area */}
      <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden", padding: "8px 8px 0" }}>

        {/* ══ ТАБЛИЦА ══ */}
        <div
          ref={tableRef}
          style={{
            flex: 1,
            background: "#2c2c3c",
            borderRadius: "6px 6px 0 0",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "none",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
          }}>
          {/* ЛЕВАЯ КОЛОНКА */}
          <div style={{ borderRight: "1px solid rgba(0,0,0,0.5)", position: "relative" }}>
            {leftCol.map((c, i) => {
              const off = offsets[c.name];
              return (
                <div
                  key={c.name}
                  style={{
                    transform: off ? `translate(${off.x}px, ${off.y}px)` : "translate(0,0)",
                    transition: off ? "none" : "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
                    willChange: "transform",
                  }}
                >
                  <TableRow
                    c={c} rank={i + 1}
                    even={i % 2 === 0}
                    isContestant={c.name === contestant}
                    isClickable={activePoints !== null && c.name !== contestant}
                    onClick={() => onContestantClick(c.name)}
                    rowRef={(el: HTMLDivElement | null) => { rowRefs.current[c.name] = el; }}
                  />
                </div>
              );
            })}
          </div>
          {/* ПРАВАЯ КОЛОНКА */}
          <div style={{ position: "relative" }}>
            {rightCol.map((c, i) => {
              const off = offsets[c.name];
              return (
                <div
                  key={c.name}
                  style={{
                    transform: off ? `translate(${off.x}px, ${off.y}px)` : "translate(0,0)",
                    transition: off ? "none" : "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
                    willChange: "transform",
                  }}
                >
                  <TableRow
                    c={c} rank={half + i + 1}
                    even={i % 2 === 0}
                    isContestant={c.name === contestant}
                    isClickable={activePoints !== null && c.name !== contestant}
                    onClick={() => onContestantClick(c.name)}
                    rowRef={(el: HTMLDivElement | null) => { rowRefs.current[c.name] = el; }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ ПРАВАЯ ПАНЕЛЬ ══ */}
        <div style={{
          width: 230, flexShrink: 0,
          background: "#1c1c28",
          borderRadius: "6px 6px 0 0",
          border: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "none",
          marginLeft: 6,
          display: "flex", flexDirection: "column",
          justifyContent: "flex-end",
          padding: 14,
        }}>
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 12,
          }}>
            <div style={{
              fontFamily: "'Oswald',sans-serif", fontWeight: 700,
              fontSize: 21, color: "#fff", letterSpacing: 0.5, marginBottom: 5,
            }}>{contestant}</div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
              {votingInfo.voterCount} из {votingInfo.totalVoters} голосующих
            </div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              Голосует: <span style={{ color: "#c084fc", fontWeight: 700 }}>{voter}</span>
            </div>
            {allPointsGiven && (
              <button onClick={onNewVoting} style={{
                marginTop: 12, width: "100%", padding: "9px 0",
                fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 2,
                background: "linear-gradient(135deg,#be185d,#ec4899)", color: "#fff",
                border: "none", borderRadius: 5, cursor: "pointer",
                boxShadow: "0 0 14px rgba(236,72,153,0.5)",
              }}>СЛЕДУЮЩИЙ →</button>
            )}
          </div>
        </div>
      </div>

      {/* ══ НИЖНЯЯ ПОЛОСА С БАЛЛАМИ ══ */}
      <BottomBar
        givenPoints={givenPoints} activePoints={activePoints}
        onPointClick={onPointClick} pointBtnRefs={pointBtnRefs}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TABLE ROW
═══════════════════════════════════════════════════════════ */
function TableRow({ c, rank, even, isContestant, isClickable, onClick, rowRef }: {
  c: Contestant; rank: number; even: boolean;
  isContestant: boolean; isClickable: boolean;
  onClick: () => void; rowRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={rowRef}
      onClick={isClickable ? onClick : undefined}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: 36,
        background: isContestant
          ? "#3d1a6e"
          : even ? "#363648" : "#2e2e3e",
        borderBottom: "1px solid rgba(0,0,0,0.4)",
        cursor: isClickable ? "pointer" : "default",
        overflow: "hidden",
        outline: isClickable ? "1px solid rgba(255,255,255,0.08) inset" : "none",
      }}
    >
      {/* Silver sweep */}
      {c.animating && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: "linear-gradient(90deg, #4b5563 0%, #6b7280 25%, #9ca3af 55%, #d1d5db 75%, #f0f0f0 100%)",
          transformOrigin: "left",
          transform: `scaleX(${c.fillProgress})`,
          transition: "transform 0.04s linear",
        }} />
      )}

      {/* Левая зона: бейдж или пусто */}
      <div style={{
        position: "relative", zIndex: 1,
        width: 34, height: "100%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {c.lastReceived !== null && (
          <div style={{
            width: 22, height: 22, borderRadius: 3,
            background: "#6d28d9",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 13, color: "#fff",
          }}>
            {c.lastReceived}
          </div>
        )}
      </div>

      {/* Имя */}
      <div style={{
        position: "relative", zIndex: 1, flex: 1,
        fontFamily: "'Oswald',sans-serif", fontWeight: 400, fontSize: 15,
        color: "#fff", letterSpacing: 0.2,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        paddingRight: 4,
      }}>
        {c.name}
      </div>

      {/* Счёт */}
      <div style={{
        position: "relative", zIndex: 1,
        width: 44, textAlign: "right", paddingRight: 10, flexShrink: 0,
        fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 19,
        color: "#fff",
      }}>
        {c.points > 0 ? c.points : ""}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BOTTOM BAR  — 1 2 3 4 5 6 7 | 8  10  12
═══════════════════════════════════════════════════════════ */
function BottomBar({ givenPoints, activePoints, onPointClick, pointBtnRefs }: {
  givenPoints: number[]; activePoints: number | null;
  onPointClick: (pts: number) => void;
  pointBtnRefs: React.MutableRefObject<Record<number, HTMLButtonElement | null>>;
}) {
  return (
    <div style={{
      background: "#0d0d14",
      borderTop: "2px solid rgba(255,255,255,0.05)",
      padding: "10px 0 13px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    }}>
      {/* 1–7 */}
      {[1, 2, 3, 4, 5, 6, 7].map(pts => {
        const given = givenPoints.includes(pts);
        const active = activePoints === pts;
        return (
          <button
            key={pts}
            ref={el => { pointBtnRefs.current[pts] = el; }}
            onClick={given ? undefined : () => onPointClick(pts)}
            disabled={given}
            style={{
              width: 58, height: 58,
              fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 24,
              color: given ? "rgba(255,255,255,0.18)" : "#fff",
              background: given ? "rgba(255,255,255,0.05)" : active ? "#4a4a62" : "#3a3a52",
              border: active ? "2px solid #e879f9" : "2px solid rgba(255,255,255,0.1)",
              borderRadius: 5,
              cursor: given ? "not-allowed" : "pointer",
              boxShadow: active ? "0 0 20px rgba(232,121,249,0.8)" : "none",
              transform: active ? "scale(1.1)" : "scale(1)",
              transition: "all 0.1s", padding: 0,
            }}
          >{pts}</button>
        );
      })}

      <div style={{ width: 10 }} />

      {/* 8, 10, 12 */}
      {[8, 10, 12].map(pts => {
        const given = givenPoints.includes(pts);
        const active = activePoints === pts;
        return (
          <button
            key={pts}
            ref={el => { pointBtnRefs.current[pts] = el; }}
            onClick={given ? undefined : () => onPointClick(pts)}
            disabled={given}
            style={{
              width: 88, height: 58,
              fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 34,
              color: given ? "rgba(255,255,255,0.18)" : "#fff",
              background: given
                ? "rgba(190,24,93,0.12)"
                : "linear-gradient(180deg, #e91e8c 0%, #b5135b 100%)",
              border: active
                ? "2px solid #fda4d0"
                : given
                  ? "2px solid rgba(190,24,93,0.2)"
                  : "2px solid rgba(233,30,140,0.6)",
              borderRadius: 5,
              cursor: given ? "not-allowed" : "pointer",
              boxShadow: given ? "none" : active
                ? "0 0 32px rgba(233,30,140,1)"
                : "0 0 16px rgba(233,30,140,0.55)",
              transform: active ? "scale(1.08)" : "scale(1)",
              transition: "all 0.1s", padding: 0,
            }}
          >{pts}</button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLYING SQUARE
═══════════════════════════════════════════════════════════ */
function FlyingSquareEl({ sq }: { sq: FlyingSquare }) {
  const [pos, setPos] = useState({ x: sq.startX, y: sq.startY });
  const big = sq.points >= 8;

  useEffect(() => {
    const t = setTimeout(() => setPos({ x: sq.endX, y: sq.endY }), 30);
    return () => clearTimeout(t);
  }, [sq.endX, sq.endY]);

  return (
    <div style={{
      position: "fixed", left: pos.x, top: pos.y, zIndex: 9999,
      width: 66, height: 54,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 5,
      fontFamily: "'Oswald',sans-serif", fontWeight: 700,
      fontSize: big ? 32 : 24, color: "#fff",
      background: big ? "linear-gradient(180deg,#e91e8c,#b5135b)" : "#3a3a52",
      border: big ? "2px solid rgba(253,164,208,0.7)" : "2px solid rgba(255,255,255,0.15)",
      boxShadow: big ? "0 0 24px rgba(233,30,140,0.9)" : "0 0 8px rgba(0,0,0,0.6)",
      pointerEvents: "none",
      transition: "left 0.62s cubic-bezier(0.4,0,0.2,1), top 0.62s cubic-bezier(0.4,0,0.2,1)",
    }}>
      {sq.points}
    </div>
  );
}