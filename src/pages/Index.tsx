import { useState, useRef, useEffect } from "react";

/* ─── Данные ─────────────────────────────────────────────── */
const ALL_PARTICIPANTS = [
  "Маша Сергеева", "Руслан Шлем", "Руслан Хмелинин", "Даня Шустов",
  "Дима Тарасов", "Юля Рунова", "Сергей Сумбаев", "Егор Коновалов ст",
  "Егор Коновалов мл", "Ярослав Ткачев", "Ярослав Удовиков", "Ваня Фальтенберг",
  "Тимофей Зелюченко", "Тимофей Павлов", "Егор Привалов", "Олег Линьков",
  "Миша Сумбаев", "Магомед Дутханов", "Антон Цепецавер", "Вова Молчанов",
  "Егор Ступак", "Саша Кондратьев", "Ваня Гринкевич", "Сергей Петрушин",
  "Артем Дорохов", "Максим Дунин", "Антон Викторович", "Влад Варанкин",
];

const POINTS_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

type Phase = "menu" | "voting";
type MenuTab = "participants" | "voters";

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

/* ─── Root ───────────────────────────────────────────────── */
export default function Index() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [menuTab, setMenuTab] = useState<MenuTab>("participants");

  // Выбранные участники и голосующие
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([...ALL_PARTICIPANTS]);
  const [selectedVoters, setSelectedVoters] = useState<string[]>([...ALL_PARTICIPANTS]);

  // Состояние голосования
  const [voterIndex, setVoterIndex] = useState(0);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [pointIndex, setPointIndex] = useState(0); // текущий балл из POINTS_ORDER
  const [flyingSquares, setFlyingSquares] = useState<FlyingSquare[]>([]);

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const flyIdRef = useRef(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const ROW_H = 36;

  function startVoting() {
    if (selectedParticipants.length < 2 || selectedVoters.length < 1) return;
    const initial = selectedParticipants.map(name => ({
      name, points: 0, animating: false, fillProgress: 0, lastReceived: null,
    }));
    setContestants(initial);
    prevSortedRef.current = initial;
    setVoterIndex(0);
    setPointIndex(0);
    setPhase("voting");
  }

  const currentVoter = selectedVoters[voterIndex] ?? "";

  const sortedContestants = [...contestants].sort(
    (a, b) => b.points - a.points || selectedParticipants.indexOf(a.name) - selectedParticipants.indexOf(b.name)
  );

  const half = Math.ceil(sortedContestants.length / 2);

  function handleContestantClick(targetName: string) {
    if (pointIndex >= POINTS_ORDER.length) return;
    const pts = POINTS_ORDER[pointIndex];

    const rowEl = rowRefs.current[targetName];
    // найти кнопку снизу — используем координаты строки
    const flyId = flyIdRef.current++;
    const rowRect = rowEl?.getBoundingClientRect();
    const wh = window.innerHeight;
    const ww = window.innerWidth;

    setFlyingSquares(prev => [...prev, {
      id: flyId, points: pts,
      startX: ww / 2 - 36,
      startY: wh - 80,
      endX: rowRect ? rowRect.right - 90 : ww / 2,
      endY: rowRect ? rowRect.top + rowRect.height / 2 - 26 : wh / 2,
    }]);

    setPointIndex(prev => prev + 1);

    setTimeout(() => {
      setFlyingSquares(prev => prev.filter(s => s.id !== flyId));
      animateRow(targetName, pts);
    }, 680);
  }

  function animateRow(targetName: string, pts: number) {
    let step = 0;
    const steps = 70;
    const duration = 1400;
    let base = 0;
    setContestants(prev => {
      const found = prev.find(c => c.name === targetName);
      if (found) base = found.points;
      return prev.map(c => c.name === targetName
        ? { ...c, animating: true, fillProgress: 0, lastReceived: pts } : c);
    });
    const iv = setInterval(() => {
      step++;
      const p = step / steps;
      const done = step >= steps;
      setContestants(prev => prev.map(c => {
        if (c.name !== targetName) return c;
        const disp = Math.min(Math.floor(pts * Math.min(p * 1.3, 1)), pts);
        return { ...c, fillProgress: Math.min(p, 1), points: done ? base + pts : base + disp, animating: !done };
      }));
      if (done) clearInterval(iv);
    }, duration / steps);
  }

  function nextVoter() {
    if (voterIndex + 1 >= selectedVoters.length) {
      // Все проголосовали
      setPhase("menu");
    } else {
      setVoterIndex(v => v + 1);
      setPointIndex(0);
    }
  }

  const allPointsGiven = pointIndex >= POINTS_ORDER.length;
  const currentPoints = pointIndex < POINTS_ORDER.length ? POINTS_ORDER[pointIndex] : null;

  const toggleItem = (list: string[], setList: (v: string[]) => void, name: string) => {
    setList(list.includes(name) ? list.filter(x => x !== name) : [...list, name]);
  };

  return (
    <div className="esc-root">
      {phase === "menu" && (
        <MenuScreen
          menuTab={menuTab}
          setMenuTab={setMenuTab}
          allParticipants={ALL_PARTICIPANTS}
          selectedParticipants={selectedParticipants}
          selectedVoters={selectedVoters}
          onToggleParticipant={(name) => toggleItem(selectedParticipants, setSelectedParticipants, name)}
          onToggleVoter={(name) => toggleItem(selectedVoters, setSelectedVoters, name)}
          onSelectAllParticipants={() => setSelectedParticipants([...ALL_PARTICIPANTS])}
          onClearParticipants={() => setSelectedParticipants([])}
          onSelectAllVoters={() => setSelectedVoters([...ALL_PARTICIPANTS])}
          onClearVoters={() => setSelectedVoters([])}
          onStart={startVoting}
          canStart={selectedParticipants.length >= 2 && selectedVoters.length >= 1}
        />
      )}
      {phase === "voting" && (
        <VotingScreen
          sortedContestants={sortedContestants}
          half={half}
          currentVoter={currentVoter}
          voterIndex={voterIndex}
          totalVoters={selectedVoters.length}
          currentPoints={currentPoints}
          pointIndex={pointIndex}
          flyingSquares={flyingSquares}
          tableRef={tableRef}
          rowRefs={rowRefs}
          allPointsGiven={allPointsGiven}
          onContestantClick={handleContestantClick}
          onNextVoter={nextVoter}
        />
      )}
    </div>
  );
}

/* ═══ MENU ════════════════════════════════════════════════════ */
function MenuScreen({
  menuTab, setMenuTab, allParticipants,
  selectedParticipants, selectedVoters,
  onToggleParticipant, onToggleVoter,
  onSelectAllParticipants, onClearParticipants,
  onSelectAllVoters, onClearVoters,
  onStart, canStart,
}: {
  menuTab: MenuTab; setMenuTab: (t: MenuTab) => void;
  allParticipants: string[];
  selectedParticipants: string[]; selectedVoters: string[];
  onToggleParticipant: (n: string) => void; onToggleVoter: (n: string) => void;
  onSelectAllParticipants: () => void; onClearParticipants: () => void;
  onSelectAllVoters: () => void; onClearVoters: () => void;
  onStart: () => void; canStart: boolean;
}) {
  const isParticipants = menuTab === "participants";
  const list = isParticipants ? selectedParticipants : selectedVoters;
  const toggle = isParticipants ? onToggleParticipant : onToggleVoter;
  const selectAll = isParticipants ? onSelectAllParticipants : onSelectAllVoters;
  const clearAll = isParticipants ? onClearParticipants : onClearVoters;

  return (
    <div className="menu-bg">
      <div className="menu-card">
        <div className="menu-header">
          <div className="menu-logo">★</div>
          <h1 className="menu-title">ЕВРОВИДЕНИЕ</h1>
          <p className="menu-subtitle">ГОЛОСОВАНИЕ</p>
        </div>

        <div className="menu-tabs">
          <button
            className={`menu-tab ${menuTab === "participants" ? "menu-tab-active" : ""}`}
            onClick={() => setMenuTab("participants")}
          >
            1. УЧАСТНИКИ
            <span className="menu-tab-count">{selectedParticipants.length}</span>
          </button>
          <button
            className={`menu-tab ${menuTab === "voters" ? "menu-tab-active" : ""}`}
            onClick={() => setMenuTab("voters")}
          >
            2. ГОЛОСУЮЩИЕ
            <span className="menu-tab-count">{selectedVoters.length}</span>
          </button>
        </div>

        <div className="menu-actions">
          <button className="menu-action-btn" onClick={selectAll}>Выбрать всех</button>
          <button className="menu-action-btn" onClick={clearAll}>Снять всех</button>
        </div>

        <div className="menu-list">
          {allParticipants.map(name => {
            const selected = list.includes(name);
            return (
              <button
                key={name}
                className={`menu-list-item ${selected ? "menu-list-item-on" : ""}`}
                onClick={() => toggle(name)}
              >
                <span className="menu-list-check">{selected ? "✓" : ""}</span>
                <span className="menu-list-name">{name.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        <button
          className={`menu-start ${canStart ? "menu-start-ready" : "menu-start-disabled"}`}
          onClick={onStart}
          disabled={!canStart}
        >
          НАЧАТЬ ГОЛОСОВАНИЕ
        </button>
        {!canStart && (
          <p className="menu-hint">Выберите минимум 2 участника и 1 голосующего</p>
        )}
      </div>
    </div>
  );
}

/* ═══ VOTING SCREEN ═══════════════════════════════════════════ */
const ROW_H = 36;

interface VotingScreenProps {
  sortedContestants: Contestant[];
  half: number;
  currentVoter: string;
  voterIndex: number;
  totalVoters: number;
  currentPoints: number | null;
  pointIndex: number;
  flyingSquares: FlyingSquare[];
  tableRef: React.RefObject<HTMLDivElement>;
  rowRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  allPointsGiven: boolean;
  onContestantClick: (name: string) => void;
  onNextVoter: () => void;
}

function VotingScreen({
  sortedContestants, half, currentVoter, voterIndex, totalVoters,
  currentPoints, pointIndex, flyingSquares,
  tableRef, rowRefs, allPointsGiven,
  onContestantClick, onNextVoter,
}: VotingScreenProps) {

  // Вычисляем позицию каждой строки: col + top
  // Левая колонка: 0..half-1, Правая: half..n-1
  const rowPositions = sortedContestants.map((c, i) => ({
    name: c.name,
    col: i < half ? 0 : 1,
    top: (i < half ? i : i - half) * ROW_H,
  }));

  const colHeightLeft = half * ROW_H;
  const colHeightRight = (sortedContestants.length - half) * ROW_H;
  const tableHeight = Math.max(colHeightLeft, colHeightRight);

  return (
    <div className="voting-bg">
      {/* Анимированный фон */}
      <div className="voting-bg-rays" />
      <div className="voting-bg-glow1" />
      <div className="voting-bg-glow2" />

      {/* Flying squares */}
      {flyingSquares.map(sq => <FlyingSquareEl key={sq.id} sq={sq} />)}

      {/* Таблица */}
      <div className="voting-table-wrap" ref={tableRef}>
        <div className="voting-table-cols" style={{ height: tableHeight }}>
          {/* Разделитель колонок */}
          <div className="voting-col-divider" />

          {/* Все строки рендерятся в один слой, позиционируются абсолютно */}
          {sortedContestants.map((c) => {
            const pos = rowPositions.find(p => p.name === c.name)!;
            return (
              <div
                key={c.name}
                className="voting-abs-row"
                style={{
                  left: pos.col === 0 ? 0 : "50%",
                  top: pos.top,
                  width: "50%",
                  transition: "top 0.6s cubic-bezier(0.4,0,0.2,1), left 0.6s cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                <ScoreRow
                  c={c}
                  isClickable={!allPointsGiven}
                  onClick={() => onContestantClick(c.name)}
                  rowRef={(el) => { rowRefs.current[c.name] = el; }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Нижняя панель */}
      <div className="voting-bottom">
        {/* Инфо о голосующем */}
        <div className="voting-voter-info">
          <span className="voting-voter-label">ГОЛОСУЕТ</span>
          <span className="voting-voter-name">{currentVoter.toUpperCase()}</span>
          <span className="voting-voter-count">{voterIndex + 1} / {totalVoters}</span>
        </div>

        {/* Баллы */}
        <div className="voting-points-strip">
          {POINTS_ORDER.map((pts, idx) => {
            const given = idx < pointIndex;
            const active = idx === pointIndex;
            const big = pts >= 8;
            return (
              <div
                key={pts}
                className={`vp-btn ${big ? "vp-btn-big" : "vp-btn-small"} ${given ? "vp-given" : ""} ${active ? "vp-active" : ""}`}
              >
                {pts}
              </div>
            );
          })}
        </div>

        {allPointsGiven && (
          <button className="voting-next-btn" onClick={onNextVoter}>
            СЛЕДУЮЩИЙ ГОЛОСУЮЩИЙ →
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══ SCORE ROW ═══════════════════════════════════════════════ */
function ScoreRow({ c, isClickable, onClick, rowRef }: {
  c: Contestant;
  isClickable: boolean;
  onClick: () => void;
  rowRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={rowRef}
      className={`score-row ${isClickable ? "score-row-clickable" : ""} ${c.animating ? "score-row-animating" : ""}`}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Silver sweep */}
      {c.animating && (
        <div
          className="score-row-sweep"
          style={{ transform: `scaleX(${c.fillProgress})` }}
        />
      )}

      {/* Фиолетовый бейдж */}
      <div className="score-badge-wrap">
        {c.lastReceived !== null && (
          <div className="score-badge">{c.lastReceived}</div>
        )}
      </div>

      {/* Имя — 70% ширины, заглавные, Cinzel */}
      <div className="score-name"><span>{c.name.toUpperCase()}</span></div>

      {/* Счёт */}
      <div className="score-pts">{c.points > 0 ? c.points : ""}</div>
    </div>
  );
}

/* ═══ FLYING SQUARE ═══════════════════════════════════════════ */
function FlyingSquareEl({ sq }: { sq: FlyingSquare }) {
  const [pos, setPos] = useState({ x: sq.startX, y: sq.startY });
  const big = sq.points >= 8;

  useEffect(() => {
    const t = setTimeout(() => setPos({ x: sq.endX, y: sq.endY }), 30);
    return () => clearTimeout(t);
  }, [sq.endX, sq.endY]);

  return (
    <div
      className={`fly-sq ${big ? "fly-sq-pink" : "fly-sq-grey"}`}
      style={{
        left: pos.x, top: pos.y,
        transition: "left 0.62s cubic-bezier(0.4,0,0.2,1), top 0.62s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {sq.points}
    </div>
  );
}