// Aesthetic: "Ink & Amber" editorial — warm paper canvas, deep-ink sidebar,
// terracotta/amber accent, Fraunces display + Outfit body. Reads like an exam paper.
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell,
} from "recharts";

/* ------------------------------------------------------------------ */
/* storage helpers                                                     */
/* ------------------------------------------------------------------ */
const DB_KEY = "quizforge:db:v2";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

async function loadDb() {
  try {
    const r = await window.storage.get(DB_KEY);
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) { /* key absent on first run */ }
  return null;
}
async function persistDb(db) {
  try { await window.storage.set(DB_KEY, JSON.stringify(db)); }
  catch (e) { console.error("persist failed", e); }
}

/* ------------------------------------------------------------------ */
/* seed data                                                           */
/* ------------------------------------------------------------------ */
function seed() {
  const q = (topic, difficulty, text, options, correct, explanation) =>
    ({ id: uid(), topic, difficulty, text, options, correct, explanation });

  const questions = [
    q("Ancient", "Easy", "Which ancient city was the first kingdom and capital of Sri Lanka?", ["Polonnaruwa", "Anuradhapura", "Kandy", "Sigiriya"], 1, "Anuradhapura was Sri Lanka's first established kingdom, from around the 4th century BCE."),
    q("Ancient", "Medium", "Buddhism was introduced to Sri Lanka by Arahant Mahinda during the reign of which king?", ["Devanampiya Tissa", "Dutugemunu", "Vijaya", "Pandukabhaya"], 0, "In about 247 BCE, Mahinda — son of Emperor Ashoka — introduced Buddhism to King Devanampiya Tissa."),
    q("Ancient", "Hard", "The Sigiriya rock fortress was built by which king?", ["Kashyapa I", "Parakramabahu I", "Vijayabahu I", "Mahasena"], 0, "King Kashyapa I (477–495 CE) built Sigiriya as his palace and fortress."),
    q("Medieval", "Easy", "Which city became the capital after Anuradhapura declined?", ["Kandy", "Polonnaruwa", "Kotte", "Galle"], 1, "Polonnaruwa became the second major capital of the island."),
    q("Medieval", "Medium", "King Parakramabahu I is best remembered for building:", ["A great navy", "Extensive irrigation tanks", "The Temple of the Tooth", "Galle Fort"], 1, "He famously said not even a drop of rain should reach the sea unused, building vast irrigation works."),
    q("Medieval", "Hard", "The Gal Vihara rock-cut Buddha statues are located in:", ["Anuradhapura", "Polonnaruwa", "Dambulla", "Mihintale"], 1, "The Gal Vihara is a 12th-century rock temple in Polonnaruwa."),
    q("Colonial", "Easy", "Which European power was first to arrive in Sri Lanka, in 1505?", ["Dutch", "Portuguese", "British", "French"], 1, "The Portuguese arrived on the coast in 1505."),
    q("Colonial", "Medium", "The Dutch seized control of Sri Lanka's coastal areas from which power?", ["British", "Portuguese", "French", "Kandyans"], 1, "The Dutch displaced the Portuguese from the maritime provinces in the 17th century."),
    q("Colonial", "Hard", "The Kandyan Convention, ceding the Kandyan Kingdom to the British, was signed in:", ["1796", "1802", "1815", "1818"], 2, "The 1815 convention ended the independence of the Kandyan Kingdom."),
    q("Independence", "Easy", "In which year did Ceylon gain independence from Britain?", ["1947", "1948", "1956", "1972"], 1, "Ceylon became independent on 4 February 1948."),
    q("Independence", "Medium", "Who was the first Prime Minister of independent Ceylon?", ["D. S. Senanayake", "S. W. R. D. Bandaranaike", "Dudley Senanayake", "Sirimavo Bandaranaike"], 0, "D. S. Senanayake became the first PM in 1948."),
    q("Independence", "Hard", "In which year did Ceylon become a republic and adopt the name 'Sri Lanka'?", ["1948", "1956", "1972", "1978"], 2, "The 1972 constitution declared the Republic of Sri Lanka."),
    q("Modern", "Easy", "Who became the world's first elected female Prime Minister, in Sri Lanka in 1960?", ["Sirimavo Bandaranaike", "Chandrika Kumaratunga", "Indira Gandhi", "Golda Meir"], 0, "Sirimavo Bandaranaike became the world's first female PM in 1960."),
    q("Modern", "Medium", "The 'Sinhala Only Act' (Official Language Act) was passed in which year?", ["1948", "1956", "1972", "1983"], 1, "The Official Language Act was passed in 1956."),
    q("Modern", "Hard", "Sri Lanka's long civil war came to an end in which year?", ["2004", "2009", "2012", "2015"], 1, "The civil war ended in May 2009."),
  ];

  const byTopic = (t) => questions.filter(x => x.topic === t).map(x => x.id);
  const papers = [
    { id: uid(), title: "Sri Lankan History Midterm", desc: "Mixed eras, balanced difficulty", questionIds: [questions[0].id, questions[3].id, questions[6].id, questions[9].id, questions[12].id, questions[1].id, questions[4].id, questions[7].id], timeLimitMin: 10, passMark: 50, antiCheat: "strict" },
    { id: uid(), title: "Heritage Challenge", desc: "Harder questions across the eras", questionIds: [questions[2].id, questions[5].id, questions[8].id, questions[14].id, questions[11].id], timeLimitMin: 8, passMark: 60, antiCheat: "moderate" },
  ];

  // a couple of historic attempts so analytics aren't empty
  const mkAttempt = (paper, student, picks, daysAgo, violations, secs) => {
    const detail = paper.questionIds.map((qid, i) => {
      const qq = questions.find(x => x.id === qid);
      const chosen = picks[i];
      return { qid, topic: qq.topic, difficulty: qq.difficulty, chosen, correct: qq.correct, isCorrect: chosen === qq.correct };
    });
    const score = detail.filter(d => d.isCorrect).length;
    return {
      id: uid(), paperId: paper.id, paperTitle: paper.title, student,
      detail, score, total: detail.length,
      percent: Math.round((score / detail.length) * 100),
      passMark: paper.passMark, timeSpentSec: secs, violations,
      finishedAt: Date.now() - daysAgo * 86400000,
    };
  };

  const p1 = papers[0];
  const attempts = [
    mkAttempt(p1, "Maya Fernando", [1, 1, 2, 2, 1, 1, 1, 1], 14, 0, 410),
    mkAttempt(p1, "Maya Fernando", [1, 1, 2, 2, 1, 1, 1, 0], 7, 1, 360),
    mkAttempt(p1, "Maya Fernando", [1, 1, 2, 2, 1, 1, 0, 1], 1, 0, 300),
    mkAttempt(p1, "Dev Perera", [0, 1, 2, 2, 1, 0, 0, 1], 5, 3, 540),
    mkAttempt(p1, "Dev Perera", [1, 0, 2, 1, 1, 1, 0, 1], 1, 2, 520),
  ];

  return { questions, papers, attempts };
}

/* ------------------------------------------------------------------ */
/* small ui atoms                                                      */
/* ------------------------------------------------------------------ */
const TOPICS = ["Ancient", "Medieval", "Colonial", "Independence", "Modern"];
const DIFFS = ["Easy", "Medium", "Hard"];
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmtDate = (ms) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// Fisher–Yates shuffle (returns a new array, leaves the original untouched).
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Randomise a question's answer options for one attempt, remapping `correct`
// to the option's new position so auto-marking and review stay correct.
const shuffleOptions = (q) => {
  const order = shuffle(q.options.map((_, i) => i));
  return { ...q, options: order.map(i => q.options[i]), correct: order.indexOf(q.correct) };
};

function Badge({ children, tone = "ink" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */
export default function QuizForge() {
  const [db, setDb] = useState(null);
  const [view, setView] = useState("overview");
  const [toast, setToast] = useState(null);

  // load
  useEffect(() => {
    (async () => {
      const existing = await loadDb();
      if (existing) setDb(existing);
      else { const s = seed(); setDb(s); persistDb(s); }
    })();
  }, []);

  const save = useCallback((next) => { setDb(next); persistDb(next); }, []);
  const ping = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  if (!db) {
    return (
      <div className="qf-root" style={{ display: "grid", placeItems: "center", minHeight: 480 }}>
        <Styles />
        <div style={{ textAlign: "center", color: "var(--ink-soft)" }}>
          <div className="spin" />
          <p style={{ fontFamily: "Fraunces, serif", fontSize: 20, marginTop: 16, color: "var(--ink)" }}>Loading QuizForge…</p>
        </div>
      </div>
    );
  }

  const nav = [
    { id: "overview", icon: "◆", label: "Overview" },
    { id: "bank", icon: "▤", label: "Question Bank" },
    { id: "papers", icon: "▦", label: "Papers" },
    { id: "take", icon: "▶", label: "Take Quiz" },
    { id: "analytics", icon: "◷", label: "Profiles & Analytics" },
  ];

  return (
    <div className="qf-root">
      <Styles />
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">QF</div>
            <div>
              <div className="brand-name">QuizForge</div>
              <div className="brand-sub">MCQ assessment engine</div>
            </div>
          </div>
          <nav>
            {nav.map(n => (
              <button key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>
                <span className="nav-ico">{n.icon}</span>{n.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="main">
          {view === "overview" && <Overview db={db} go={setView} />}
          {view === "bank" && <Bank db={db} save={save} ping={ping} />}
          {view === "papers" && <Papers db={db} save={save} ping={ping} />}
          {view === "take" && <TakeFlow db={db} save={save} ping={ping} />}
          {view === "analytics" && <Analytics db={db} />}
        </main>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* OVERVIEW                                                            */
/* ------------------------------------------------------------------ */
function Overview({ db, go }) {
  const { attempts } = db;
  const avg = attempts.length ? Math.round(attempts.reduce((a, x) => a + x.percent, 0) / attempts.length) : 0;
  const passRate = attempts.length ? Math.round(100 * attempts.filter(a => a.percent >= a.passMark).length / attempts.length) : 0;
  const students = new Set(attempts.map(a => a.student)).size;

  const trend = useMemo(() => {
    return [...attempts].sort((a, b) => a.finishedAt - b.finishedAt)
      .map((a, i) => ({ name: `#${i + 1}`, score: a.percent }));
  }, [attempts]);

  const topicPerf = useMemo(() => {
    const acc = {};
    attempts.forEach(a => a.detail.forEach(d => {
      acc[d.topic] = acc[d.topic] || { c: 0, t: 0 };
      acc[d.topic].t++; if (d.isCorrect) acc[d.topic].c++;
    }));
    return TOPICS.map(t => ({ topic: t, pct: acc[t] ? Math.round(100 * acc[t].c / acc[t].t) : 0 }));
  }, [attempts]);

  const recent = [...attempts].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 6);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="lede">A snapshot of every paper sat across all learners.</p>
        </div>
        <button className="btn btn-primary" onClick={() => go("take")}>▶ Sit a paper</button>
      </header>

      <div className="kpi-row">
        <Kpi label="Attempts" value={attempts.length} sub="papers submitted" />
        <Kpi label="Average score" value={`${avg}%`} sub="across all attempts" tone="amber" />
        <Kpi label="Pass rate" value={`${passRate}%`} sub="met the pass mark" tone="green" />
        <Kpi label="Learners" value={students} sub="distinct students" />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">Score trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tipStyle} />
              <Line type="monotone" dataKey="score" stroke="var(--amber)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--amber)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="card-title">Performance by topic</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topicPerf} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="topic" tick={{ fontSize: 10, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(37,99,235,0.08)" }} />
              <Bar dataKey="pct" radius={[5, 5, 0, 0]}>
                {topicPerf.map((d, i) => <Cell key={i} fill={d.pct >= 75 ? "var(--green)" : d.pct >= 50 ? "var(--amber)" : "var(--red)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Recent attempts</h3>
        <table className="tbl">
          <thead><tr><th>Student</th><th>Paper</th><th>Score</th><th>Result</th><th>Flags</th><th>When</th></tr></thead>
          <tbody>
            {recent.map(a => (
              <tr key={a.id}>
                <td><b>{a.student}</b></td>
                <td>{a.paperTitle}</td>
                <td>{a.score}/{a.total} · {a.percent}%</td>
                <td>{a.percent >= a.passMark ? <Badge tone="green">Pass</Badge> : <Badge tone="red">Fail</Badge>}</td>
                <td>{a.violations > 0 ? <Badge tone="red">⚠ {a.violations}</Badge> : <Badge tone="muted">clean</Badge>}</td>
                <td className="muted">{fmtDate(a.finishedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone = "ink" }) {
  return (
    <div className={`card kpi kpi-${tone}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* QUESTION BANK                                                       */
/* ------------------------------------------------------------------ */
function Bank({ db, save, ping }) {
  const blank = { topic: "Algebra", difficulty: "Easy", text: "", options: ["", "", "", ""], correct: 0, explanation: "" };
  const [editing, setEditing] = useState(null); // object or null
  const [filter, setFilter] = useState("All");

  const startNew = () => setEditing({ ...blank, id: null });
  const startEdit = (q) => setEditing({ ...q, options: [...q.options] });

  const commit = () => {
    if (!editing.text.trim() || editing.options.some(o => !o.trim())) { ping("Fill the question and all four options."); return; }
    let next;
    if (editing.id) {
      next = { ...db, questions: db.questions.map(q => q.id === editing.id ? editing : q) };
      ping("Question updated.");
    } else {
      next = { ...db, questions: [...db.questions, { ...editing, id: uid() }] };
      ping("Question added to bank.");
    }
    save(next); setEditing(null);
  };
  const remove = (id) => { save({ ...db, questions: db.questions.filter(q => q.id !== id) }); ping("Question removed."); };

  const list = db.questions.filter(q => filter === "All" || q.topic === filter);

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Question Bank</h1><p className="lede">Tag every question by topic & difficulty — that's what powers diagnostic marking.</p></div>
        <button className="btn btn-primary" onClick={startNew}>＋ New question</button>
      </header>

      <div className="chips">
        {["All", ...TOPICS].map(t => (
          <button key={t} className={`chip ${filter === t ? "on" : ""}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>

      <div className="q-list">
        {list.map(q => (
          <div className="card q-card" key={q.id}>
            <div className="q-card-head">
              <div className="q-tags"><Badge tone="amber">{q.topic}</Badge><Badge tone={q.difficulty === "Hard" ? "red" : q.difficulty === "Medium" ? "amber" : "green"}>{q.difficulty}</Badge></div>
              <div className="q-actions">
                <button className="btn btn-ghost sm" onClick={() => startEdit(q)}>Edit</button>
                <button className="btn btn-ghost sm danger" onClick={() => remove(q.id)}>Delete</button>
              </div>
            </div>
            <p className="q-text">{q.text}</p>
            <div className="q-opts">
              {q.options.map((o, i) => (
                <div key={i} className={`q-opt ${i === q.correct ? "ok" : ""}`}>
                  <span className="opt-key">{String.fromCharCode(65 + i)}</span>{o}{i === q.correct && <span className="opt-tick">✓</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="empty">No questions for this topic yet.</div>}
      </div>

      {editing && (
        <div className="modal-wrap" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="card-title">{editing.id ? "Edit question" : "New question"}</h3>
            <div className="row2">
              <label className="field"><span>Topic</span>
                <select className="input" value={editing.topic} onChange={e => setEditing({ ...editing, topic: e.target.value })}>
                  {TOPICS.map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="field"><span>Difficulty</span>
                <select className="input" value={editing.difficulty} onChange={e => setEditing({ ...editing, difficulty: e.target.value })}>
                  {DIFFS.map(d => <option key={d}>{d}</option>)}
                </select>
              </label>
            </div>
            <label className="field"><span>Question</span>
              <textarea className="input" rows={2} value={editing.text} onChange={e => setEditing({ ...editing, text: e.target.value })} placeholder="e.g. What is 7 × 8?" />
            </label>
            <div className="field"><span>Options — click the circle to mark the correct answer</span>
              {editing.options.map((o, i) => (
                <div className="opt-edit" key={i}>
                  <button className={`radio ${editing.correct === i ? "on" : ""}`} onClick={() => setEditing({ ...editing, correct: i })} title="Mark correct">{String.fromCharCode(65 + i)}</button>
                  <input className="input" value={o} onChange={e => { const n = [...editing.options]; n[i] = e.target.value; setEditing({ ...editing, options: n }); }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
            <label className="field"><span>Explanation (shown after marking)</span>
              <input className="input" value={editing.explanation} onChange={e => setEditing({ ...editing, explanation: e.target.value })} placeholder="Why the answer is correct" />
            </label>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={commit}>{editing.id ? "Save changes" : "Add to bank"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PAPERS                                                              */
/* ------------------------------------------------------------------ */
function Papers({ db, save, ping }) {
  const blank = { title: "", desc: "", questionIds: [], timeLimitMin: 10, passMark: 50, antiCheat: "moderate" };
  const [editing, setEditing] = useState(null);

  const commit = () => {
    if (!editing.title.trim()) { ping("Give the paper a title."); return; }
    if (editing.questionIds.length === 0) { ping("Add at least one question."); return; }
    let next;
    if (editing.id) next = { ...db, papers: db.papers.map(p => p.id === editing.id ? editing : p) };
    else next = { ...db, papers: [...db.papers, { ...editing, id: uid() }] };
    save(next); setEditing(null); ping("Paper saved.");
  };
  const remove = (id) => { save({ ...db, papers: db.papers.filter(p => p.id !== id) }); ping("Paper deleted."); };
  const toggleQ = (qid) => {
    const has = editing.questionIds.includes(qid);
    setEditing({ ...editing, questionIds: has ? editing.questionIds.filter(x => x !== qid) : [...editing.questionIds, qid] });
  };

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Papers</h1><p className="lede">Assemble reusable papers from the bank. Set the clock, the pass mark and anti-cheat strictness.</p></div>
        <button className="btn btn-primary" onClick={() => setEditing({ ...blank, id: null })}>＋ New paper</button>
      </header>

      <div className="grid-cards">
        {db.papers.map(p => {
          const attempts = db.attempts.filter(a => a.paperId === p.id);
          return (
            <div className="card paper-card" key={p.id}>
              <div className="paper-top">
                <h3>{p.title}</h3>
                <Badge tone={p.antiCheat === "strict" ? "red" : p.antiCheat === "moderate" ? "amber" : "muted"}>{p.antiCheat}</Badge>
              </div>
              <p className="muted">{p.desc || "—"}</p>
              <div className="paper-meta">
                <span>📝 {p.questionIds.length} Q</span><span>⏱ {p.timeLimitMin} min</span>
                <span>🎯 pass {p.passMark}%</span><span>👤 {attempts.length} sat</span>
              </div>
              <div className="q-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-ghost sm" onClick={() => setEditing({ ...p, questionIds: [...p.questionIds] })}>Edit</button>
                <button className="btn btn-ghost sm danger" onClick={() => remove(p.id)}>Delete</button>
              </div>
            </div>
          );
        })}
        {db.papers.length === 0 && <div className="empty">No papers yet — create one.</div>}
      </div>

      {editing && (
        <div className="modal-wrap" onClick={() => setEditing(null)}>
          <div className="modal wide" onClick={e => e.stopPropagation()}>
            <h3 className="card-title">{editing.id ? "Edit paper" : "New paper"}</h3>
            <div className="row2">
              <label className="field"><span>Title</span><input className="input" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. End-of-term Test" /></label>
              <label className="field"><span>Description</span><input className="input" value={editing.desc} onChange={e => setEditing({ ...editing, desc: e.target.value })} placeholder="optional" /></label>
            </div>
            <div className="row3">
              <label className="field"><span>Time limit (min)</span><input type="number" min={1} className="input" value={editing.timeLimitMin} onChange={e => setEditing({ ...editing, timeLimitMin: +e.target.value })} /></label>
              <label className="field"><span>Pass mark (%)</span><input type="number" min={0} max={100} className="input" value={editing.passMark} onChange={e => setEditing({ ...editing, passMark: +e.target.value })} /></label>
              <label className="field"><span>Anti-cheat</span>
                <select className="input" value={editing.antiCheat} onChange={e => setEditing({ ...editing, antiCheat: e.target.value })}>
                  <option value="off">off</option><option value="moderate">moderate (log flags)</option><option value="strict">strict (warn + log)</option>
                </select>
              </label>
            </div>
            <div className="field"><span>Pick questions ({editing.questionIds.length} selected)</span>
              <div className="picker">
                {db.questions.map(q => (
                  <label key={q.id} className={`pick ${editing.questionIds.includes(q.id) ? "on" : ""}`}>
                    <input type="checkbox" checked={editing.questionIds.includes(q.id)} onChange={() => toggleQ(q.id)} />
                    <span className="pick-tags"><Badge tone="amber">{q.topic}</Badge><Badge tone="muted">{q.difficulty}</Badge></span>
                    <span className="pick-text">{q.text}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={commit}>Save paper</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TAKE QUIZ  (timer + anti-cheat + auto marking)                      */
/* ------------------------------------------------------------------ */
function TakeFlow({ db, save, ping }) {
  const [stage, setStage] = useState("lobby"); // lobby | live | result
  const [paper, setPaper] = useState(null);
  const [student, setStudent] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [idx, setIdx] = useState(0);
  const [secsLeft, setSecsLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [warn, setWarn] = useState(null);
  const startRef = useRef(0);
  const [result, setResult] = useState(null);

  const begin = () => {
    if (!student.trim()) { ping("Enter your name first."); return; }
    if (!paper) { ping("Choose a paper."); return; }
    const base = paper.questionIds.map(id => db.questions.find(q => q.id === id)).filter(Boolean);
    // Randomise question order and each question's options, fresh per attempt,
    // so no two students see the same sequence — defeats over-the-shoulder copying.
    const qs = shuffle(base).map(shuffleOptions);
    setQuestions(qs); setAnswers({}); setIdx(0); setViolations(0);
    setSecsLeft(paper.timeLimitMin * 60); startRef.current = Date.now();
    setStage("live");
  };

  const submit = useCallback((auto = false) => {
    const spent = Math.round((Date.now() - startRef.current) / 1000);
    const detail = questions.map(q => {
      const chosen = answers[q.id];
      return { qid: q.id, topic: q.topic, difficulty: q.difficulty, chosen: chosen ?? null, correct: q.correct, isCorrect: chosen === q.correct };
    });
    const score = detail.filter(d => d.isCorrect).length;
    const attempt = {
      id: uid(), paperId: paper.id, paperTitle: paper.title, student: student.trim(),
      detail, score, total: detail.length, percent: Math.round(100 * score / detail.length),
      passMark: paper.passMark, timeSpentSec: spent, violations, finishedAt: Date.now(),
      autoSubmitted: auto,
    };
    save({ ...db, attempts: [...db.attempts, attempt] });
    setResult({ attempt, questions });
    setStage("result");
  }, [answers, questions, paper, student, violations, db, save]);

  // timer
  useEffect(() => {
    if (stage !== "live") return;
    if (secsLeft <= 0) { submit(true); return; }
    const t = setTimeout(() => setSecsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, secsLeft, submit]);

  // anti-cheat listeners
  useEffect(() => {
    if (stage !== "live" || !paper || paper.antiCheat === "off") return;
    const flag = (reason) => {
      setViolations(v => v + 1);
      if (paper.antiCheat === "strict") { setWarn(reason); setTimeout(() => setWarn(null), 3200); }
    };
    const onVis = () => { if (document.hidden) flag("You left the test tab — this has been logged."); };
    const onBlur = () => flag("The test window lost focus — this has been logged.");
    const block = (e) => e.preventDefault();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
    };
  }, [stage, paper]);

  /* ---- lobby ---- */
  if (stage === "lobby") {
    return (
      <div className="page">
        <header className="page-head"><div><h1>Take a Quiz</h1><p className="lede">Pick a paper, identify yourself, and sit it under exam conditions.</p></div></header>
        <div className="card lobby">
          <label className="field"><span>Your name</span><input className="input" value={student} onChange={e => setStudent(e.target.value)} placeholder="e.g. Maya Fernando" /></label>
          <div className="field"><span>Choose a paper</span>
            <div className="paper-choices">
              {db.papers.map(p => (
                <button key={p.id} className={`choice ${paper?.id === p.id ? "on" : ""}`} onClick={() => setPaper(p)}>
                  <div className="choice-title">{p.title}</div>
                  <div className="choice-meta">{p.questionIds.length} questions · {p.timeLimitMin} min · pass {p.passMark}%</div>
                  <div className="choice-guard"><Badge tone={p.antiCheat === "strict" ? "red" : p.antiCheat === "moderate" ? "amber" : "muted"}>{p.antiCheat}</Badge></div>
                </button>
              ))}
            </div>
          </div>
          <div className="exam-rules">
            <b>Exam conditions:</b> a countdown auto-submits when it hits zero. Switching tabs or leaving the window is detected and logged. Copy & right-click are disabled.
          </div>
          <button className="btn btn-primary big" onClick={begin}>Begin paper →</button>
        </div>
      </div>
    );
  }

  /* ---- live ---- */
  if (stage === "live") {
    const q = questions[idx];
    const answered = Object.keys(answers).length;
    const low = secsLeft <= 30;
    return (
      <div className="page exam">
        {warn && <div className="cheat-warn">⚠ {warn} <span className="vio">Flags: {violations}</span></div>}
        <div className="exam-bar">
          <div className="exam-meta"><b>{paper.title}</b> · {student}</div>
          <div className={`timer ${low ? "low" : ""}`}>⏱ {fmtTime(secsLeft)}</div>
        </div>
        <div className="exam-grid">
          <div className="card exam-q">
            <div className="exam-q-head">
              <span className="qnum">Question {idx + 1} <span className="muted">/ {questions.length}</span></span>
              <span className="q-tags"><Badge tone="amber">{q.topic}</Badge><Badge tone="muted">{q.difficulty}</Badge></span>
            </div>
            <p className="exam-q-text">{q.text}</p>
            <div className="exam-opts">
              {q.options.map((o, i) => (
                <button key={i} className={`exam-opt ${answers[q.id] === i ? "sel" : ""}`} onClick={() => setAnswers({ ...answers, [q.id]: i })}>
                  <span className="opt-key">{String.fromCharCode(65 + i)}</span>{o}
                </button>
              ))}
            </div>
            <div className="exam-foot">
              <button className="btn btn-ghost" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>← Prev</button>
              {idx < questions.length - 1
                ? <button className="btn btn-primary" onClick={() => setIdx(i => i + 1)}>Next →</button>
                : <button className="btn btn-primary" onClick={() => submit(false)}>Submit paper</button>}
            </div>
          </div>
          <div className="card navigator">
            <h4>Navigator</h4>
            <div className="nav-grid">
              {questions.map((qq, i) => (
                <button key={qq.id} className={`nav-cell ${i === idx ? "cur" : ""} ${answers[qq.id] != null ? "done" : ""}`} onClick={() => setIdx(i)}>{i + 1}</button>
              ))}
            </div>
            <div className="nav-legend"><span><i className="dot done" /> answered</span><span><i className="dot" /> blank</span></div>
            <div className="nav-summary">{answered}/{questions.length} answered</div>
            {paper.antiCheat !== "off" && <div className="nav-flags">Integrity flags: <b className={violations ? "bad" : ""}>{violations}</b></div>}
            <button className="btn btn-primary block" onClick={() => submit(false)}>Submit now</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- result ---- */
  return <Result result={result} onDone={() => { setStage("lobby"); setPaper(null); setResult(null); }} />;
}

function Result({ result, onDone }) {
  const { attempt, questions } = result;
  const passed = attempt.percent >= attempt.passMark;

  const byTopic = useMemo(() => {
    const acc = {};
    attempt.detail.forEach(d => { acc[d.topic] = acc[d.topic] || { c: 0, t: 0 }; acc[d.topic].t++; if (d.isCorrect) acc[d.topic].c++; });
    return Object.entries(acc).map(([topic, v]) => ({ topic, pct: Math.round(100 * v.c / v.t), label: `${v.c}/${v.t}` }));
  }, [attempt]);

  return (
    <div className="page">
      <header className="page-head"><div><h1>Results</h1><p className="lede">Marked automatically the moment you submitted.</p></div>
        <button className="btn btn-ghost" onClick={onDone}>Done</button></header>

      <div className={`score-hero ${passed ? "pass" : "fail"}`}>
        <div className="score-ring">
          <svg viewBox="0 0 120 120" width="140" height="140">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={passed ? "var(--green)" : "var(--red)"} strokeWidth="10"
              strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 52}`} strokeDashoffset={`${2 * Math.PI * 52 * (1 - attempt.percent / 100)}`}
              transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 1s ease" }} />
            <text x="60" y="56" textAnchor="middle" className="ring-pct">{attempt.percent}%</text>
            <text x="60" y="76" textAnchor="middle" className="ring-sub">{attempt.score}/{attempt.total}</text>
          </svg>
        </div>
        <div className="score-side">
          <div className={`verdict ${passed ? "pass" : "fail"}`}>{passed ? "PASS" : "BELOW PASS MARK"}</div>
          <div className="score-stats">
            <span>⏱ {fmtTime(attempt.timeSpentSec)} taken</span>
            <span>🎯 pass mark {attempt.passMark}%</span>
            <span className={attempt.violations ? "bad" : ""}>{attempt.violations ? `⚠ ${attempt.violations} integrity flag(s)` : "✓ no integrity flags"}</span>
            {attempt.autoSubmitted && <span className="bad">⏱ auto-submitted (time up)</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Where you stood, topic by topic</h3>
        <div className="topic-bars">
          {byTopic.map(t => (
            <div className="topic-bar" key={t.topic}>
              <div className="tb-label">{t.topic} <span className="muted">{t.label}</span></div>
              <div className="tb-track"><div className="tb-fill" style={{ width: `${t.pct}%`, background: t.pct >= 75 ? "var(--green)" : t.pct >= 50 ? "var(--amber)" : "var(--red)" }} /></div>
              <div className="tb-pct">{t.pct}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Answer review</h3>
        <div className="review">
          {questions.map((q, i) => {
            const d = attempt.detail.find(x => x.qid === q.id);
            return (
              <div className={`rev-item ${d.isCorrect ? "ok" : "no"}`} key={q.id}>
                <div className="rev-head"><b>Q{i + 1}.</b> {q.text} {d.isCorrect ? <Badge tone="green">correct</Badge> : <Badge tone="red">wrong</Badge>}</div>
                <div className="rev-opts">
                  {q.options.map((o, oi) => {
                    const isC = oi === q.correct, isM = oi === d.chosen;
                    return <div key={oi} className={`rev-opt ${isC ? "correct" : ""} ${isM && !isC ? "mine" : ""}`}>
                      <span className="opt-key">{String.fromCharCode(65 + oi)}</span>{o}
                      {isC && <span className="tag">correct answer</span>}{isM && !isC && <span className="tag">your answer</span>}
                    </div>;
                  })}
                </div>
                {q.explanation && <div className="rev-exp">💡 {q.explanation}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ANALYTICS + STUDENT PROFILING                                       */
/* ------------------------------------------------------------------ */
function Analytics({ db }) {
  const students = useMemo(() => [...new Set(db.attempts.map(a => a.student))].sort(), [db.attempts]);
  const [sel, setSel] = useState(students[0] || null);

  const board = useMemo(() => students.map(s => {
    const at = db.attempts.filter(a => a.student === s);
    const avg = Math.round(at.reduce((a, x) => a + x.percent, 0) / at.length);
    const best = Math.max(...at.map(a => a.percent));
    return { s, n: at.length, avg, best, flags: at.reduce((a, x) => a + x.violations, 0) };
  }).sort((a, b) => b.avg - a.avg), [students, db.attempts]);

  if (students.length === 0) return <div className="page"><header className="page-head"><div><h1>Profiles & Analytics</h1></div></header><div className="empty">No attempts yet — sit a paper to generate profiles.</div></div>;

  return (
    <div className="page">
      <header className="page-head"><div><h1>Profiles & Analytics</h1><p className="lede">Every attempt rolls up into a per-learner profile — mastery, trend, and a working style read.</p></div></header>
      <div className="analytics-grid">
        <div className="card board">
          <h3 className="card-title">Learners</h3>
          <table className="tbl compact">
            <thead><tr><th>Student</th><th>Avg</th><th>Best</th><th>⚠</th></tr></thead>
            <tbody>
              {board.map(r => (
                <tr key={r.s} className={sel === r.s ? "row-sel" : ""} onClick={() => setSel(r.s)} style={{ cursor: "pointer" }}>
                  <td><b>{r.s}</b><div className="muted sm">{r.n} attempt{r.n > 1 ? "s" : ""}</div></td>
                  <td>{r.avg}%</td><td>{r.best}%</td><td>{r.flags > 0 ? <span className="bad">{r.flags}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Profile db={db} student={sel} />
      </div>
    </div>
  );
}

function Profile({ db, student }) {
  const at = useMemo(() => db.attempts.filter(a => a.student === student).sort((a, b) => a.finishedAt - b.finishedAt), [db.attempts, student]);

  const topicMastery = useMemo(() => {
    const acc = {};
    at.forEach(a => a.detail.forEach(d => { acc[d.topic] = acc[d.topic] || { c: 0, t: 0 }; acc[d.topic].t++; if (d.isCorrect) acc[d.topic].c++; }));
    return TOPICS.filter(t => acc[t]).map(t => ({ topic: t, pct: Math.round(100 * acc[t].c / acc[t].t) }));
  }, [at]);

  const trend = at.map((a, i) => ({ name: fmtDate(a.finishedAt) + ` #${i + 1}`, score: a.percent }));
  const avg = Math.round(at.reduce((a, x) => a + x.percent, 0) / at.length);
  const avgTimePerQ = Math.round(at.reduce((a, x) => a + x.timeSpentSec / x.total, 0) / at.length);
  const totalFlags = at.reduce((a, x) => a + x.violations, 0);
  const weakest = [...topicMastery].sort((a, b) => a.pct - b.pct).slice(0, 2).filter(t => t.pct < 75);

  // speed vs accuracy → working-style classification
  const fast = avgTimePerQ < 45;
  const accurate = avg >= 65;
  const profile = accurate
    ? (fast ? { label: "Confident", note: "Quick and correct — ready for harder material.", tone: "green" }
            : { label: "Methodical", note: "Accurate but deliberate — solid grasp, works carefully.", tone: "amber" })
    : (fast ? { label: "Impulsive", note: "Answering fast but missing marks — slow down and re-read.", tone: "red" }
            : { label: "Struggling", note: "Slow and low accuracy — needs foundational support.", tone: "red" });

  return (
    <div className="profile">
      <div className="card profile-head">
        <div>
          <div className="profile-name">{student}</div>
          <div className="muted">{at.length} attempt{at.length > 1 ? "s" : ""} · last sat {fmtDate(at[at.length - 1].finishedAt)}</div>
        </div>
        <div className={`profile-type t-${profile.tone}`}>
          <div className="pt-label">Working style</div>
          <div className="pt-value">{profile.label}</div>
        </div>
      </div>

      <div className="profile-kpis">
        <div className="mini-kpi"><span>{avg}%</span><label>avg score</label></div>
        <div className="mini-kpi"><span>{avgTimePerQ}s</span><label>per question</label></div>
        <div className="mini-kpi"><span>{Math.max(...at.map(a => a.percent))}%</span><label>personal best</label></div>
        <div className={`mini-kpi ${totalFlags ? "bad" : ""}`}><span>{totalFlags}</span><label>integrity flags</label></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">Topic mastery</h3>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={topicMastery} outerRadius="72%">
              <PolarGrid stroke="var(--line)" />
              <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="pct" stroke="var(--amber)" fill="var(--amber)" fillOpacity={0.35} strokeWidth={2} />
              <Tooltip contentStyle={tipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="card-title">Score over time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tipStyle} />
              <Line type="monotone" dataKey="score" stroke="var(--green)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card insight">
        <h3 className="card-title">Diagnosis & recommended focus</h3>
        <p className="insight-note"><b>{profile.label}:</b> {profile.note}</p>
        {weakest.length > 0 ? (
          <div className="focus">
            <span className="focus-label">Prioritise:</span>
            {weakest.map(w => <Badge key={w.topic} tone="red">{w.topic} · {w.pct}%</Badge>)}
            <span className="focus-tip">These topics sit below the 75% mastery line — target practice here lifts the overall score fastest.</span>
          </div>
        ) : <p className="muted">No topic below 75% — broaden into harder material.</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* shared chart tooltip + styles                                       */
/* ------------------------------------------------------------------ */
const tipStyle = { background: "#15233F", border: "none", borderRadius: 10, color: "#FFFFFF", fontSize: 12, fontFamily: "Outfit, sans-serif" };

function Styles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=Outfit:wght@300;400;500;600;700&display=swap');
.qf-root{
  --paper:#EEF3FA; --surface:#FFFFFF; --surface2:#FFFFFF;
  --ink:#15233F; --ink-soft:#5B6B85; --line:#DCE5F0;
  --amber:#2563EB; --amber-soft:#93C5FD; --green:#4E7A52; --red:#B0432F; --muted:#8A98AE;
  font-family:'Outfit',sans-serif; color:var(--ink); background:var(--paper);
  overflow:hidden; line-height:1.5; -webkit-font-smoothing:antialiased;
}
.qf-root *{box-sizing:border-box;}
.app{display:grid; grid-template-columns:248px 1fr; min-height:100vh;}
/* sidebar */
.sidebar{background:var(--ink); color:var(--paper); padding:22px 16px; display:flex; flex-direction:column; gap:26px;}
.brand{display:flex; align-items:center; gap:12px;}
.brand-mark{width:40px;height:40px;border-radius:11px;background:var(--amber);display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:900;color:#fff;font-size:17px;}
.brand-name{font-family:'Fraunces',serif; font-weight:600; font-size:18px;}
.brand-sub{font-size:11px; color:rgba(255,255,255,.5); letter-spacing:.3px;}
.sidebar nav{display:flex; flex-direction:column; gap:4px;}
.nav-item{display:flex; align-items:center; gap:11px; background:none; border:none; color:rgba(255,255,255,.66); padding:11px 13px; border-radius:9px; font-size:14px; font-family:inherit; cursor:pointer; text-align:left; transition:.18s;}
.nav-item:hover{background:rgba(255,255,255,.06); color:var(--paper);}
.nav-item.active{background:var(--amber); color:#fff; font-weight:500;}
.nav-ico{font-size:13px; width:16px; text-align:center;}
.side-foot{margin-top:auto; display:flex; flex-direction:column; gap:6px; border-top:1px solid rgba(255,255,255,.1); padding-top:16px;}
.stat-mini{font-size:12px; color:rgba(255,255,255,.55);} .stat-mini b{color:var(--amber-soft); font-weight:600;}
/* main */
.main{padding:30px 34px; overflow-y:auto; overflow-x:hidden; max-height:100vh; background:var(--paper);}
.page{animation:fadeUp .5s ease;} @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.page-head{display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px; gap:16px; flex-wrap:wrap;}
.page-head h1{font-family:'Fraunces',serif; font-weight:600; font-size:30px; margin:0; letter-spacing:-.5px;}
.lede{color:var(--ink-soft); margin:4px 0 0; font-size:14px; max-width:560px;}
/* cards */
.card{background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:20px; margin-bottom:18px;}
.card-title{font-family:'Fraunces',serif; font-weight:600; font-size:16px; margin:0 0 16px;}
/* kpi */
.kpi-row{display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:8px;}
.kpi{margin:0;} .kpi-label{font-size:12px; color:var(--ink-soft); text-transform:uppercase; letter-spacing:.6px;}
.kpi-value{font-family:'Fraunces',serif; font-size:34px; font-weight:900; line-height:1.1; margin:6px 0 2px;}
.kpi-sub{font-size:12px; color:var(--muted);}
.kpi-amber .kpi-value{color:var(--amber);} .kpi-green .kpi-value{color:var(--green);}
/* grids */
.grid-2{display:grid; grid-template-columns:1fr 1fr; gap:16px;}
.grid-cards{display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px;}
/* buttons */
.btn{font-family:inherit; font-size:14px; padding:10px 18px; border-radius:9px; border:1px solid transparent; cursor:pointer; transition:.16s; font-weight:500;}
.btn-primary{background:var(--amber); color:#fff;} .btn-primary:hover{background:#1D4ED8; transform:translateY(-1px);}
.btn-ghost{background:transparent; border-color:var(--line); color:var(--ink);} .btn-ghost:hover{background:var(--paper); border-color:var(--ink-soft);}
.btn.sm{padding:6px 12px; font-size:13px;} .btn.big{font-size:15px; padding:13px 26px; margin-top:8px;}
.btn.block{width:100%; margin-top:14px;} .btn.danger{color:var(--red);} .btn.danger:hover{background:#f7e7e2;}
.btn:disabled{opacity:.4; cursor:default; transform:none;}
/* badges */
.badge{display:inline-block; font-size:11px; padding:3px 9px; border-radius:20px; font-weight:600; letter-spacing:.2px;}
.badge-ink{background:var(--ink); color:var(--paper);} .badge-amber{background:#DCE9FD; color:#1D4ED8;}
.badge-green{background:#dcebdd; color:var(--green);} .badge-red{background:#f5ddd6; color:var(--red);}
.badge-muted{background:#ece6da; color:var(--muted);}
/* tables */
.tbl{width:100%; border-collapse:collapse; font-size:14px;}
.tbl th{text-align:left; font-weight:600; color:var(--ink-soft); font-size:12px; text-transform:uppercase; letter-spacing:.5px; padding:8px 10px; border-bottom:1px solid var(--line);}
.tbl td{padding:11px 10px; border-bottom:1px solid var(--line);}
.tbl tr:last-child td{border-bottom:none;} .tbl tr:hover td{background:var(--paper);}
.tbl.compact td,.tbl.compact th{padding:8px 8px; font-size:13px;}
.muted{color:var(--muted);} .sm{font-size:12px;} .bad{color:var(--red); font-weight:600;}
/* chips */
.chips{display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap;}
.chip{background:var(--surface); border:1px solid var(--line); padding:7px 15px; border-radius:20px; font-size:13px; cursor:pointer; font-family:inherit; color:var(--ink-soft); transition:.15s;}
.chip:hover{border-color:var(--ink-soft);} .chip.on{background:var(--ink); color:var(--paper); border-color:var(--ink);}
/* question cards */
.q-list{display:flex; flex-direction:column; gap:12px;}
.q-card{margin:0;} .q-card-head{display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;}
.q-tags{display:flex; gap:6px;} .q-actions{display:flex; gap:6px;}
.q-text{font-size:15px; font-weight:500; margin:0 0 12px;}
.q-opts{display:grid; grid-template-columns:1fr 1fr; gap:8px;}
.q-opt{display:flex; align-items:center; gap:9px; padding:8px 12px; background:var(--paper); border:1px solid var(--line); border-radius:8px; font-size:13px;}
.q-opt.ok{background:#dcebdd; border-color:var(--green);} .opt-tick{margin-left:auto; color:var(--green); font-weight:700;}
.opt-key{width:22px; height:22px; border-radius:6px; background:var(--surface2); border:1px solid var(--line); display:grid; place-items:center; font-size:12px; font-weight:600; flex-shrink:0;}
.empty{padding:40px; text-align:center; color:var(--muted); background:var(--surface); border:1px dashed var(--line); border-radius:14px;}
/* modal */
.modal-wrap{position:fixed; inset:0; background:rgba(33,29,23,.45); display:grid; place-items:center; z-index:50; padding:20px; animation:fadeUp .2s ease;}
.modal{background:var(--surface); border-radius:16px; padding:26px; width:560px; max-width:100%; max-height:86vh; overflow-y:auto;}
.modal.wide{width:720px;}
.field{display:flex; flex-direction:column; gap:6px; margin-bottom:14px;}
.field>span{font-size:13px; font-weight:500; color:var(--ink-soft);}
.input{font-family:inherit; font-size:14px; padding:10px 12px; border:1px solid var(--line); border-radius:9px; background:var(--surface2); color:var(--ink); width:100%;}
.input:focus{outline:none; border-color:var(--amber); box-shadow:0 0 0 3px rgba(37,99,235,.15);}
textarea.input{resize:vertical;}
.row2{display:grid; grid-template-columns:1fr 1fr; gap:14px;} .row3{display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px;}
.opt-edit{display:flex; gap:10px; align-items:center; margin-bottom:8px;}
.radio{width:34px; height:34px; border-radius:8px; border:1px solid var(--line); background:var(--surface2); cursor:pointer; font-weight:600; font-family:inherit; color:var(--ink-soft); flex-shrink:0; transition:.15s;}
.radio.on{background:var(--green); color:#fff; border-color:var(--green);}
.modal-foot{display:flex; justify-content:flex-end; gap:10px; margin-top:10px;}
/* picker */
.picker{display:flex; flex-direction:column; gap:6px; max-height:300px; overflow-y:auto; border:1px solid var(--line); border-radius:10px; padding:8px;}
.pick{display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; cursor:pointer; font-size:13px;}
.pick:hover{background:var(--paper);} .pick.on{background:#DCE9FD;}
.pick-tags{display:flex; gap:4px; flex-shrink:0;} .pick-text{color:var(--ink);}
/* papers */
.paper-card{margin:0;} .paper-top{display:flex; justify-content:space-between; align-items:start; gap:8px;}
.paper-top h3{font-family:'Fraunces',serif; font-size:18px; margin:0 0 4px;}
.paper-meta{display:flex; flex-wrap:wrap; gap:12px; font-size:13px; color:var(--ink-soft); margin-top:14px;}
/* lobby */
.lobby{max-width:680px;} .paper-choices{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
.choice{text-align:left; background:var(--surface2); border:1.5px solid var(--line); border-radius:12px; padding:16px; cursor:pointer; font-family:inherit; transition:.16s;}
.choice:hover{border-color:var(--amber-soft);} .choice.on{border-color:var(--amber); background:#E8F0FE;}
.choice-title{font-family:'Fraunces',serif; font-weight:600; font-size:16px;}
.choice-meta{font-size:12px; color:var(--ink-soft); margin:5px 0 8px;}
.exam-rules{background:#E8F0FE; border:1px solid var(--amber-soft); border-radius:10px; padding:12px 14px; font-size:13px; color:#1E3A8A; margin:18px 0;}
/* exam live */
.exam{}
.cheat-warn{position:sticky; top:0; background:var(--red); color:#fff; padding:11px 16px; border-radius:10px; font-size:14px; margin-bottom:14px; display:flex; justify-content:space-between; animation:shake .4s; z-index:5;}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.cheat-warn .vio{font-weight:700;}
.exam-bar{display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;}
.exam-meta{font-size:14px;} .exam-meta b{font-family:'Fraunces',serif;}
.timer{font-family:'Fraunces',serif; font-weight:600; font-size:22px; background:var(--surface); border:1px solid var(--line); padding:7px 18px; border-radius:10px;}
.timer.low{background:var(--red); color:#fff; border-color:var(--red); animation:pulse 1s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
.exam-grid{display:grid; grid-template-columns:1fr 230px; gap:16px;}
.exam-q{margin:0;} .exam-q-head{display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;}
.qnum{font-family:'Fraunces',serif; font-weight:600; font-size:18px;}
.exam-q-text{font-size:18px; font-weight:500; margin:0 0 20px; line-height:1.45;}
.exam-opts{display:flex; flex-direction:column; gap:10px;}
.exam-opt{display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--surface2); border:1.5px solid var(--line); border-radius:11px; cursor:pointer; font-family:inherit; font-size:15px; text-align:left; transition:.14s; color:var(--ink);}
.exam-opt:hover{border-color:var(--amber-soft);} .exam-opt.sel{border-color:var(--amber); background:#E8F0FE;}
.exam-opt.sel .opt-key{background:var(--amber); color:#fff; border-color:var(--amber);}
.exam-foot{display:flex; justify-content:space-between; margin-top:22px;}
.navigator{margin:0; height:fit-content;} .navigator h4{font-family:'Fraunces',serif; margin:0 0 12px; font-size:15px;}
.nav-grid{display:grid; grid-template-columns:repeat(5,1fr); gap:7px;}
.nav-cell{aspect-ratio:1; border:1px solid var(--line); background:var(--surface2); border-radius:7px; cursor:pointer; font-family:inherit; font-size:13px; color:var(--ink-soft); transition:.14s;}
.nav-cell:hover{border-color:var(--ink-soft);} .nav-cell.done{background:#dcebdd; border-color:var(--green); color:var(--green); font-weight:600;}
.nav-cell.cur{outline:2px solid var(--amber); outline-offset:1px;}
.nav-legend{display:flex; gap:14px; font-size:11px; color:var(--ink-soft); margin:12px 0 8px;}
.nav-legend .dot{display:inline-block; width:10px; height:10px; border-radius:3px; border:1px solid var(--line); margin-right:4px; vertical-align:middle;}
.nav-legend .dot.done{background:#dcebdd; border-color:var(--green);}
.nav-summary{font-size:13px; font-weight:600;} .nav-flags{font-size:12px; color:var(--ink-soft); margin-top:6px;} .nav-flags b.bad{color:var(--red);}
/* result */
.score-hero{display:flex; align-items:center; gap:30px; padding:26px; border-radius:16px; margin-bottom:18px; border:1px solid var(--line);}
.score-hero.pass{background:#eef5ef;} .score-hero.fail{background:#faece8;}
.ring-pct{font-family:'Fraunces',serif; font-weight:900; font-size:24px; fill:var(--ink);}
.ring-sub{font-size:11px; fill:var(--ink-soft);}
.verdict{font-family:'Fraunces',serif; font-weight:900; font-size:26px; letter-spacing:1px;}
.verdict.pass{color:var(--green);} .verdict.fail{color:var(--red);}
.score-stats{display:flex; flex-direction:column; gap:6px; margin-top:10px; font-size:14px; color:var(--ink-soft);}
.topic-bars{display:flex; flex-direction:column; gap:12px;}
.topic-bar{display:grid; grid-template-columns:160px 1fr 44px; align-items:center; gap:12px;}
.tb-label{font-size:13px; font-weight:500;} .tb-track{height:10px; background:var(--paper); border-radius:6px; overflow:hidden;}
.tb-fill{height:100%; border-radius:6px; transition:width .8s ease;} .tb-pct{font-size:13px; font-weight:600; text-align:right;}
.review{display:flex; flex-direction:column; gap:14px;}
.rev-item{border:1px solid var(--line); border-radius:11px; padding:14px; border-left:4px solid var(--line);}
.rev-item.ok{border-left-color:var(--green);} .rev-item.no{border-left-color:var(--red);}
.rev-head{font-size:14px; margin-bottom:10px;} .rev-opts{display:flex; flex-direction:column; gap:6px;}
.rev-opt{display:flex; align-items:center; gap:9px; padding:7px 11px; border-radius:7px; font-size:13px; background:var(--paper);}
.rev-opt.correct{background:#dcebdd;} .rev-opt.mine{background:#f5ddd6;}
.rev-opt .tag{margin-left:auto; font-size:11px; font-weight:600; color:var(--ink-soft);}
.rev-exp{margin-top:10px; font-size:13px; color:var(--ink-soft); background:var(--paper); padding:8px 11px; border-radius:7px;}
/* analytics */
.analytics-grid{display:grid; grid-template-columns:280px 1fr; gap:18px; align-items:start;}
.board{margin:0;} .row-sel td{background:#E8F0FE !important;}
.profile{display:flex; flex-direction:column;}
.profile-head{display:flex; justify-content:space-between; align-items:center; margin:0 0 14px;}
.profile-name{font-family:'Fraunces',serif; font-size:24px; font-weight:600;}
.profile-type{text-align:right; padding:8px 16px; border-radius:11px;}
.profile-type.t-green{background:#dcebdd;} .profile-type.t-amber{background:#DCE9FD;} .profile-type.t-red{background:#f5ddd6;}
.pt-label{font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:var(--ink-soft);}
.pt-value{font-family:'Fraunces',serif; font-weight:900; font-size:20px;}
.profile-kpis{display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px;}
.mini-kpi{background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:14px; text-align:center;}
.mini-kpi span{font-family:'Fraunces',serif; font-weight:900; font-size:24px; display:block;}
.mini-kpi label{font-size:11px; color:var(--ink-soft); text-transform:uppercase; letter-spacing:.4px;}
.mini-kpi.bad span{color:var(--red);}
.insight{margin-bottom:0;} .insight-note{font-size:14px; margin:0 0 12px;}
.focus{display:flex; align-items:center; gap:8px; flex-wrap:wrap;}
.focus-label{font-weight:600; font-size:14px;} .focus-tip{font-size:13px; color:var(--ink-soft); flex-basis:100%; margin-top:6px;}
/* toast + spinner */
.toast{position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:var(--ink); color:var(--paper); padding:12px 22px; border-radius:10px; font-size:14px; z-index:90; animation:fadeUp .3s ease;}
.spin{width:34px; height:34px; border:3px solid var(--line); border-top-color:var(--amber); border-radius:50%; margin:0 auto; animation:rot 1s linear infinite;}
@keyframes rot{to{transform:rotate(360deg)}}
/* responsive */
@media (max-width:860px){
  .app{grid-template-columns:1fr;}
  .sidebar{flex-direction:row; align-items:center; gap:14px; padding:14px; overflow-x:auto;}
  .sidebar nav{flex-direction:row;} .side-foot{display:none;} .brand-sub{display:none;}
  .main{padding:20px 16px; max-height:none;}
  .kpi-row,.row3,.profile-kpis{grid-template-columns:1fr 1fr;}
  .grid-2,.row2,.paper-choices,.analytics-grid,.exam-grid,.q-opts{grid-template-columns:1fr;}
  .topic-bar{grid-template-columns:110px 1fr 40px;}
}
`}</style>
  );
}
