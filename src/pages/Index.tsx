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
  targetName: string;
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
  const tableRef = useRef<HTMLDivElement>(null);

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
      targetName,
      startX: btnRect.left + btnRect.width / 2 - 30,
      startY: btnRect.top + btnRect.height / 2 - 22,
      endX: rowRect.left + rowRect.width / 2 - 30,
      endY: rowRect.top + rowRect.height / 2 - 22,
    };

    setFlyingSquares(prev => [...prev, sq]);
    setGivenPoints(prev => [...prev, pts]);
    setActivePoints(null);

    setTimeout(() => {
      setFlyingSquares(prev => prev.filter(s => s.id !== flyId));
      animateRow(targetName, pts);
    }, 700);
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
    <div className="esc-root">
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
          tableRef={tableRef}
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

function SetupScreen({
  participants, voter, contestant, onVoterChange, onContestantChange, onStart
}: {
  participants: string[];
  voter: string;
  contestant: string;
  onVoterChange: (v: string) => void;
  onContestantChange: (v: string) => void;
  onStart: () => void;
}) {
  return (
    <div className="setup-bg">
      <div className="setup-card">
        <div className="setup-logo">🎤</div>
        <h1 className="setup-title">ЕВРОВИДЕНИЕ<br /><span className="setup-subtitle">ГОЛОСОВАНИЕ</span></h1>

        <div className="setup-section">
          <label className="setup-label">КТО ГОЛОСУЕТ</label>
          <div className="setup-grid">
            {participants.map(name => (
              <button
                key={name}
                className={`setup-btn ${voter === name ? "setup-btn-active" : ""}`}
                onClick={() => onVoterChange(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-section">
          <label className="setup-label">ЧЕЙ ВЫХОД НА СЦЕНУ</label>
          <div className="setup-grid">
            {participants.map(name => (
              <button
                key={name}
                className={`setup-btn ${contestant === name ? "setup-btn-active" : ""}`}
                onClick={() => onContestantChange(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <button
          className={`setup-start ${voter && contestant && voter !== contestant ? "setup-start-ready" : "setup-start-disabled"}`}
          onClick={onStart}
          disabled={!voter || !contestant || voter === contestant}
        >
          НАЧАТЬ ГОЛОСОВАНИЕ
        </button>

        {voter && contestant && voter === contestant && (
          <p className="setup-error">Нельзя голосовать за себя</p>
        )}
      </div>
    </div>
  );
}

interface VotingScreenProps {
  sortedContestants: Contestant[];
  voter: string;
  contestant: string;
  givenPoints: number[];
  activePoints: number | null;
  flyingSquares: FlyingSquare[];
  votingInfo: VotingInfo;
  pointBtnRefs: React.MutableRefObject<Record<number, HTMLButtonElement | null>>;
  rowRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  tableRef: React.RefObject<HTMLDivElement>;
  allPointsGiven: boolean;
  onPointClick: (pts: number) => void;
  onContestantClick: (name: string) => void;
  onNewVoting: () => void;
}

function VotingScreen({
  sortedContestants, voter, contestant, givenPoints, activePoints,
  flyingSquares, votingInfo, pointBtnRefs, rowRefs, tableRef,
  allPointsGiven, onPointClick, onContestantClick, onNewVoting
}: VotingScreenProps) {
  return (
    <div className="esc-bg">
      {flyingSquares.map((sq: FlyingSquare) => (
        <FlyingSquareEl key={sq.id} sq={sq} />
      ))}

      <div className="esc-layout">
        <div className="esc-table-wrap" ref={tableRef}>
          <div className="esc-table-inner">
            {sortedContestants.map((c: Contestant, i: number) => (
              <ScoreRow
                key={c.name}
                c={c}
                rank={i + 1}
                isContestant={c.name === contestant}
                isActive={activePoints !== null && c.name !== contestant}
                onClick={() => onContestantClick(c.name)}
                rowRef={(el: HTMLDivElement | null) => { rowRefs.current[c.name] = el; }}
              />
            ))}
          </div>
        </div>

        <div className="esc-right">
          <div className="esc-voter-panel">
            <div className="esc-contestant-name">{contestant}</div>
            <div className="esc-voter-info">
              {votingInfo.voterCount} из {votingInfo.totalVoters} голосующих
            </div>
            <div className="esc-voter-label">Голосует: <span>{voter}</span></div>
          </div>

          <div className="esc-points-panel">
            <div className="esc-points-label">
              {activePoints ? `Выберите участника для ${activePoints} баллов` : "Выберите баллы"}
            </div>
            <div className="esc-points-row">
              {[1, 2, 3, 4, 5, 6, 7].map(pts => (
                <PointBtn
                  key={pts}
                  pts={pts}
                  given={givenPoints.includes(pts)}
                  active={activePoints === pts}
                  big={false}
                  onClick={() => onPointClick(pts)}
                  btnRef={(el: HTMLButtonElement | null) => { pointBtnRefs.current[pts] = el; }}
                />
              ))}
            </div>
            <div className="esc-points-row esc-points-row-big">
              {[8, 10, 12].map(pts => (
                <PointBtn
                  key={pts}
                  pts={pts}
                  given={givenPoints.includes(pts)}
                  active={activePoints === pts}
                  big={true}
                  onClick={() => onPointClick(pts)}
                  btnRef={(el: HTMLButtonElement | null) => { pointBtnRefs.current[pts] = el; }}
                />
              ))}
            </div>
          </div>

          {allPointsGiven && (
            <button className="esc-next-btn" onClick={onNewVoting}>
              СЛЕДУЮЩИЙ ГОЛОСУЮЩИЙ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ c, rank, isContestant, isActive, onClick, rowRef }: {
  c: Contestant;
  rank: number;
  isContestant: boolean;
  isActive: boolean;
  onClick: () => void;
  rowRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={rowRef}
      className={`esc-row ${isContestant ? "esc-row-contestant" : ""} ${isActive ? "esc-row-clickable" : ""} ${c.animating ? "esc-row-animating" : ""}`}
      style={c.animating ? { "--fill-progress": c.fillProgress } as React.CSSProperties : {}}
      onClick={isActive ? onClick : undefined}
    >
      <div className="esc-row-rank">{rank <= 10 ? rank : ""}</div>
      <div className="esc-row-name">{c.name}</div>
      <div className="esc-row-score">{c.points}</div>
    </div>
  );
}

function PointBtn({ pts, given, active, big, onClick, btnRef }: {
  pts: number;
  given: boolean;
  active: boolean;
  big: boolean;
  onClick: () => void;
  btnRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={btnRef}
      className={`esc-point-btn ${big ? "esc-point-btn-big" : ""} ${given ? "esc-point-given" : ""} ${active ? "esc-point-active" : ""}`}
      onClick={given ? undefined : onClick}
      disabled={given}
    >
      {pts}
    </button>
  );
}

function FlyingSquareEl({ sq }: { sq: FlyingSquare }) {
  const [pos, setPos] = useState({ x: sq.startX, y: sq.startY });

  useEffect(() => {
    const t = setTimeout(() => {
      setPos({ x: sq.endX, y: sq.endY });
    }, 30);
    return () => clearTimeout(t);
  }, [sq.endX, sq.endY]);

  const isPink = sq.points >= 8;

  return (
    <div
      className={`flying-sq ${isPink ? "flying-sq-pink" : "flying-sq-blue"}`}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        transition: "left 0.65s cubic-bezier(0.4,0,0.2,1), top 0.65s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 9999,
        width: 60,
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
        fontSize: 22,
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 700,
        color: "#fff",
        pointerEvents: "none",
      }}
    >
      {sq.points}
    </div>
  );
}
