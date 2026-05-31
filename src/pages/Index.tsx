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
  const [voter, setVoter] = useState<string>("");
  const [contestant, setContestant] = useState<string>("");

  const [contestants, setContestants] = useState<Contestant[]>(
    PARTICIPANTS.map((name) => ({ name, points: 0, animating: false, fillProgress: 0 }))
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
    const sq: FlyingSquare = {
      id: flyId,
      points: pts,
      startX: btnRect.left + btnRect.width / 2 - 32,
      startY: btnRect.top + btnRect.height / 2 - 26,
      endX: rowRect.right - 80,
      endY: rowRect.top + rowRect.height / 2 - 26,
    };

    setFlyingSquares(prev => [...prev, sq]);
    setGivenPoints(prev => [...prev, pts]);
    setActivePoints(null);

    setTimeout(() => {
      setFlyingSquares(prev => prev.filter(s => s.id !== flyId));
      animateRow(targetName, pts);
    }, 650);
  }

  function animateRow(targetName: string, pts: number) {
    const duration = 1400;
    const steps = 70;
    let step = 0;
    let basePoints = 0;

    setContestants(prev => {
      const found = prev.find(c => c.name === targetName);
      if (found) basePoints = found.points;
      return prev.map(c => c.name === targetName ? { ...c, animating: true, fillProgress: 0 } : c);
    });

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      setContestants(prev =>
        prev.map(c => {
          if (c.name !== targetName) return c;
          const displayPoints = basePoints + Math.min(Math.floor(pts * Math.min(progress * 1.3, 1)), pts);
          const done = step >= steps;
          return {
            ...c,
            fillProgress: Math.min(progress, 1),
            points: done ? basePoints + pts : displayPoints,
            animating: !done,
          };
        })
      );
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
  }

  const allPointsGiven = POINT_VALUES.every(p => givenPoints.includes(p));

  return (
    <div style={{ minHeight: "100vh", background: "#000", fontFamily: "'Oswald', sans-serif" }}>
      {phase === "setup" && (
        <SetupScreen
          participants={PARTICIPANTS}
          voter={voter}
          contestant={contestant}
          onVoterChange={setVoter}
          onContestantChange={setContestant}
          onStart={startVoting}
        />
      )}
      {phase === "voting" && (
        <VotingScreen
          sortedContestants={sortedContestants}
          voter={voter}
          contestant={contestant}
          givenPoints={givenPoints}
          activePoints={activePoints}
          flyingSquares={flyingSquares}
          votingInfo={votingInfo}
          pointBtnRefs={pointBtnRefs}
          rowRefs={rowRefs}
          allPointsGiven={allPointsGiven}
          onPointClick={handlePointClick}
          onContestantClick={handleContestantClick}
          onNewVoting={() => {
            setPhase("setup");
            setVoter("");
            setContestant("");
            setGivenPoints([]);
            setActivePoints(null);
          }}
        />
      )}
    </div>
  );
}

/* ─── SETUP ─────────────────────────────────────────────────── */
function SetupScreen({ participants, voter, contestant, onVoterChange, onContestantChange, onStart }: {
  participants: string[]; voter: string; contestant: string;
  onVoterChange: (v: string) => void; onContestantChange: (v: string) => void; onStart: () => void;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 30% 20%, #1a0533 0%, #08001a 50%, #000 100%)",
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px"
    }}>
      <div style={{ width: "100%", maxWidth: 900, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 32 }}>
        <div style={{ fontSize: 42, textAlign: "center", marginBottom: 6 }}>🎤</div>
        <h1 style={{ fontFamily: "'Oswald',sans-serif", fontSize: 30, fontWeight: 700, color: "#fff", textAlign: "center", letterSpacing: 4, marginBottom: 4 }}>
          ЕВРОВИДЕНИЕ <span style={{ color: "#c084fc", fontSize: 18, letterSpacing: 8 }}>ГОЛОСОВАНИЕ</span>
        </h1>

        {[
          { label: "КТО ГОЛОСУЕТ", val: voter, onChange: onVoterChange },
          { label: "ЧЕЙ ВЫХОД НА СЦЕНУ", val: contestant, onChange: onContestantChange },
        ].map(({ label, val, onChange }) => (
          <div key={label} style={{ marginTop: 24 }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 12, letterSpacing: 3, color: "#a78bfa", marginBottom: 10 }}>{label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {participants.map(name => (
                <button key={name} onClick={() => onChange(name)} style={{
                  fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 600,
                  padding: "6px 13px", borderRadius: 6,
                  border: val === name ? "1px solid #c084fc" : "1px solid rgba(255,255,255,0.15)",
                  background: val === name ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.06)",
                  color: val === name ? "#fff" : "#d4c9f0",
                  cursor: "pointer", whiteSpace: "nowrap",
                  boxShadow: val === name ? "0 0 14px rgba(168,85,247,0.5)" : "none",
                }}>{name}</button>
              ))}
            </div>
          </div>
        ))}

        <button onClick={onStart} disabled={!voter || !contestant || voter === contestant} style={{
          display: "block", width: "100%", marginTop: 28, padding: 15,
          fontFamily: "'Oswald',sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: 4,
          borderRadius: 8, border: "none", cursor: voter && contestant && voter !== contestant ? "pointer" : "not-allowed",
          background: voter && contestant && voter !== contestant
            ? "linear-gradient(135deg,#be185d,#ec4899)" : "rgba(255,255,255,0.06)",
          color: voter && contestant && voter !== contestant ? "#fff" : "rgba(255,255,255,0.3)",
          boxShadow: voter && contestant && voter !== contestant ? "0 0 28px rgba(236,72,153,0.5)" : "none",
        }}>НАЧАТЬ ГОЛОСОВАНИЕ</button>
        {voter && contestant && voter === contestant &&
          <p style={{ textAlign: "center", color: "#f87171", fontFamily: "'Montserrat',sans-serif", fontSize: 13, marginTop: 8 }}>Нельзя голосовать за себя</p>
        }
      </div>
    </div>
  );
}

/* ─── VOTING ─────────────────────────────────────────────────── */
interface VotingScreenProps {
  sortedContestants: Contestant[]; voter: string; contestant: string;
  givenPoints: number[]; activePoints: number | null; flyingSquares: FlyingSquare[];
  votingInfo: VotingInfo;
  pointBtnRefs: React.MutableRefObject<Record<number, HTMLButtonElement | null>>;
  rowRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  allPointsGiven: boolean;
  onPointClick: (pts: number) => void; onContestantClick: (name: string) => void; onNewVoting: () => void;
}

function VotingScreen({
  sortedContestants, voter, contestant, givenPoints, activePoints,
  flyingSquares, votingInfo, pointBtnRefs, rowRefs,
  allPointsGiven, onPointClick, onContestantClick, onNewVoting
}: VotingScreenProps) {

  const half = Math.ceil(sortedContestants.length / 2);
  const leftCol = sortedContestants.slice(0, half);
  const rightCol = sortedContestants.slice(half);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#111318", position: "relative" }}>

      {/* Flying squares */}
      {flyingSquares.map(sq => <FlyingSquareEl key={sq.id} sq={sq} />)}

      {/* Header */}
      <div style={{
        padding: "8px 16px", background: "rgba(0,0,0,0.6)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ color: "#fff", fontFamily: "'Oswald',sans-serif", fontSize: 15, letterSpacing: 2 }}>
          {votingInfo.voterCount} из {votingInfo.totalVoters} голосующих
        </div>
        <div style={{ color: "#c084fc", fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 700 }}>
          Голосует: <span style={{ color: "#fff" }}>{voter}</span>
          {" · "}Выход на сцену: <span style={{ color: "#fff" }}>{contestant}</span>
        </div>
        {allPointsGiven && (
          <button onClick={onNewVoting} style={{
            fontFamily: "'Oswald',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 2,
            padding: "7px 18px", borderRadius: 6, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#be185d,#ec4899)", color: "#fff",
            boxShadow: "0 0 16px rgba(236,72,153,0.5)"
          }}>СЛЕДУЮЩИЙ</button>
        )}
      </div>

      {/* Table – 2 columns */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px 4px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {leftCol.map((c, i) => (
              <ScoreRow key={c.name} c={c} rank={i + 1}
                isContestant={c.name === contestant}
                isActive={activePoints !== null && c.name !== contestant}
                onClick={() => onContestantClick(c.name)}
                rowRef={(el: HTMLDivElement | null) => { rowRefs.current[c.name] = el; }}
              />
            ))}
          </div>
          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {rightCol.map((c, i) => (
              <ScoreRow key={c.name} c={c} rank={half + i + 1}
                isContestant={c.name === contestant}
                isActive={activePoints !== null && c.name !== contestant}
                onClick={() => onContestantClick(c.name)}
                rowRef={(el: HTMLDivElement | null) => { rowRefs.current[c.name] = el; }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom points bar – Eurovision style */}
      <PointsBar
        givenPoints={givenPoints}
        activePoints={activePoints}
        onPointClick={onPointClick}
        pointBtnRefs={pointBtnRefs}
      />
    </div>
  );
}

/* ─── SCORE ROW ──────────────────────────────────────────────── */
function ScoreRow({ c, rank, isContestant, isActive, onClick, rowRef }: {
  c: Contestant; rank: number; isContestant: boolean; isActive: boolean;
  onClick: () => void; rowRef: (el: HTMLDivElement | null) => void;
}) {
  const showRank = rank <= 10;

  return (
    <div
      ref={rowRef}
      onClick={isActive ? onClick : undefined}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: 34,
        borderRadius: 3,
        overflow: "hidden",
        cursor: isActive ? "pointer" : "default",
        border: isContestant
          ? "1px solid rgba(168,85,247,0.5)"
          : isActive
            ? "1px solid rgba(255,255,255,0.25)"
            : "1px solid rgba(255,255,255,0.04)",
        background: isContestant ? "rgba(88,28,135,0.35)" : "transparent",
        transition: "box-shadow 0.15s",
        boxShadow: isActive && !isContestant ? "0 0 0 1px rgba(255,255,255,0.1) inset" : "none",
      }}
    >
      {/* Silver fill sweep */}
      {c.animating && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, #4b5563 0%, #9ca3af 40%, #d1d5db 70%, #f3f4f6 100%)",
          transformOrigin: "left",
          transform: `scaleX(${c.fillProgress})`,
          transition: "transform 0.05s linear",
          zIndex: 0,
        }} />
      )}
      {/* Rank badge */}
      <div style={{
        position: "relative", zIndex: 1,
        width: 28, flexShrink: 0, textAlign: "center",
        fontFamily: "'Oswald',sans-serif", fontSize: 13, fontWeight: 600,
        color: showRank ? "#e5e7eb" : "transparent",
        background: showRank ? "rgba(255,255,255,0.12)" : "transparent",
        height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {showRank ? rank : ""}
      </div>
      {/* Name */}
      <div style={{
        position: "relative", zIndex: 1, flex: 1,
        fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700,
        color: "#ffffff", paddingLeft: 8, paddingRight: 4,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        textShadow: "0 1px 4px rgba(0,0,0,0.9)",
      }}>
        {c.name}
      </div>
      {/* Score */}
      <div style={{
        position: "relative", zIndex: 1,
        width: 42, textAlign: "right", paddingRight: 10,
        fontFamily: "'Oswald',sans-serif", fontSize: 18, fontWeight: 700,
        color: "#ffffff", textShadow: "0 1px 4px rgba(0,0,0,0.9)", flexShrink: 0,
      }}>
        {c.points > 0 ? c.points : ""}
      </div>
    </div>
  );
}

/* ─── POINTS BAR (bottom) ────────────────────────────────────── */
function PointsBar({ givenPoints, activePoints, onPointClick, pointBtnRefs }: {
  givenPoints: number[]; activePoints: number | null;
  onPointClick: (pts: number) => void;
  pointBtnRefs: React.MutableRefObject<Record<number, HTMLButtonElement | null>>;
}) {
  const smallPts = [1, 2, 3, 4, 5, 6, 7];
  const bigPts = [8, 10, 12];

  return (
    <div style={{
      background: "rgba(0,0,0,0.75)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      padding: "10px 20px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    }}>
      {smallPts.map(pts => {
        const given = givenPoints.includes(pts);
        const active = activePoints === pts;
        return (
          <button
            key={pts}
            ref={(el) => { pointBtnRefs.current[pts] = el; }}
            onClick={given ? undefined : () => onPointClick(pts)}
            disabled={given}
            style={{
              fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 20,
              width: 54, height: 54,
              borderRadius: 4,
              border: active ? "2px solid #f0abfc" : "2px solid rgba(255,255,255,0.2)",
              background: given
                ? "rgba(255,255,255,0.08)"
                : active
                  ? "rgba(100,116,139,0.9)"
                  : "rgba(71,85,105,0.7)",
              color: given ? "rgba(255,255,255,0.25)" : "#fff",
              cursor: given ? "not-allowed" : "pointer",
              boxShadow: active ? "0 0 20px rgba(240,171,252,0.8)" : "none",
              transform: active ? "scale(1.12)" : "scale(1)",
              transition: "all 0.12s",
            }}
          >
            {pts}
          </button>
        );
      })}

      {bigPts.map(pts => {
        const given = givenPoints.includes(pts);
        const active = activePoints === pts;
        return (
          <button
            key={pts}
            ref={(el) => { pointBtnRefs.current[pts] = el; }}
            onClick={given ? undefined : () => onPointClick(pts)}
            disabled={given}
            style={{
              fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 30,
              width: 80, height: 54,
              borderRadius: 4,
              border: active ? "2px solid #f9a8d4" : "2px solid rgba(244,114,182,0.4)",
              background: given
                ? "rgba(190,24,93,0.15)"
                : active
                  ? "linear-gradient(135deg,#9d174d,#db2777)"
                  : "linear-gradient(135deg,#be185d,#ec4899)",
              color: given ? "rgba(255,255,255,0.25)" : "#fff",
              cursor: given ? "not-allowed" : "pointer",
              boxShadow: given ? "none" : active
                ? "0 0 28px rgba(236,72,153,0.9)"
                : "0 0 14px rgba(236,72,153,0.5)",
              transform: active ? "scale(1.1)" : "scale(1)",
              transition: "all 0.12s",
            }}
          >
            {pts}
          </button>
        );
      })}
    </div>
  );
}

/* ─── FLYING SQUARE ──────────────────────────────────────────── */
function FlyingSquareEl({ sq }: { sq: FlyingSquare }) {
  const [pos, setPos] = useState({ x: sq.startX, y: sq.startY });
  const isPink = sq.points >= 8;

  useEffect(() => {
    const t = setTimeout(() => setPos({ x: sq.endX, y: sq.endY }), 30);
    return () => clearTimeout(t);
  }, [sq.endX, sq.endY]);

  return (
    <div style={{
      position: "fixed", left: pos.x, top: pos.y, zIndex: 9999,
      width: 64, height: 52,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 4,
      fontFamily: "'Oswald',sans-serif", fontWeight: 700,
      fontSize: isPink ? 30 : 22,
      color: "#fff",
      background: isPink
        ? "linear-gradient(135deg,#be185d,#ec4899)"
        : "rgba(71,85,105,0.9)",
      boxShadow: isPink ? "0 0 24px rgba(236,72,153,0.8)" : "0 0 12px rgba(255,255,255,0.3)",
      border: isPink ? "2px solid rgba(244,114,182,0.5)" : "2px solid rgba(255,255,255,0.2)",
      pointerEvents: "none",
      transition: "left 0.6s cubic-bezier(0.4,0,0.2,1), top 0.6s cubic-bezier(0.4,0,0.2,1)",
    }}>
      {sq.points}
    </div>
  );
}
