'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart,
} from 'recharts';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getKey() {
  return sessionStorage.getItem('analyticsKey') || '';
}

function authHeaders() {
  return { Authorization: `Bearer ${getKey()}` };
}

async function fetchApi(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_URL}/api/v1/analytics${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Date helpers ─────────────────────────────────────────────────

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function getDateRange(preset) {
  const to = new Date();
  const from = new Date();
  switch (preset) {
    case 'today': break;
    case '7d': from.setDate(from.getDate() - 6); break;
    case '30d': from.setDate(from.getDate() - 29); break;
    case '90d': from.setDate(from.getDate() - 89); break;
    default: from.setDate(from.getDate() - 6);
  }
  return { from: formatDate(from), to: formatDate(to) };
}

function shortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Colors ───────────────────────────────────────────────────────

const COLORS = ['#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f97316', '#6366f1', '#14b8a6'];
const CHART_GRID = 'rgba(255,255,255,0.06)';
const CHART_AXIS = 'rgba(255,255,255,0.4)';
const TT_STYLE = { background: '#1a1848', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 13 };

// ── Metric Card ──────────────────────────────────────────────────

function MetricCard({ label, value, unit, sparkData, dataKey, color = '#f59e0b', live }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}{live && <span className={styles.liveDot} />}</div>
      <div className={styles.metricValue}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className={styles.metricUnit}>{unit}</span>}
      </div>
      {sparkData && sparkData.length > 1 && (
        <div className={styles.sparkline}>
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey={dataKey || 'value'} stroke={color} strokeWidth={2} fill={`url(#spark-${label})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Retention Table ──────────────────────────────────────────────

function retentionColor(val) {
  if (val >= 40) return 'rgba(52, 211, 153, 0.25)';
  if (val >= 20) return 'rgba(251, 191, 36, 0.2)';
  if (val > 0) return 'rgba(239, 68, 68, 0.15)';
  return 'transparent';
}

function RetentionTable({ cohorts }) {
  if (!cohorts || cohorts.length === 0) return <p className={styles.empty}>No retention data yet.</p>;
  const periods = ['day_1', 'day_3', 'day_7', 'day_14', 'day_30'];
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cohort (week of)</th>
            {periods.map(p => <th key={p}>{p.replace('_', ' ').replace('day', 'Day')}</th>)}
          </tr>
        </thead>
        <tbody>
          {cohorts.map(c => (
            <tr key={c.cohort}>
              <td>{shortDate(c.cohort)}</td>
              {periods.map(p => (
                <td key={p} style={{ background: retentionColor(c[p] || 0) }}>
                  {c[p] != null ? `${c[p]}%` : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [authed, setAuthed] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [preset, setPreset] = useState('7d');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState(null);
  const [acquisition, setAcquisition] = useState(null);
  const [content, setContent] = useState(null);
  const [retention, setRetention] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check if already authed
  useEffect(() => {
    if (getKey()) setAuthed(true);
  }, []);

  const handleAuth = async () => {
    sessionStorage.setItem('analyticsKey', keyInput);
    try {
      await fetchApi('/overview', getDateRange('7d'));
      setAuthed(true);
      setAuthError('');
    } catch {
      sessionStorage.removeItem('analyticsKey');
      setAuthError('Invalid key.');
    }
  };

  const loadData = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    const range = getDateRange(preset);
    try {
      const [ov, us, aq, ct, rt, en] = await Promise.all([
        fetchApi('/overview', range),
        fetchApi('/users', range),
        fetchApi('/acquisition', range),
        fetchApi('/content', range),
        fetchApi('/retention', { start_date: range.to }),
        fetchApi('/engagement', range),
      ]);
      setOverview(ov);
      setUsers(us);
      setAcquisition(aq);
      setContent(ct);
      setRetention(rt);
      setEngagement(en);
    } catch (e) {
      console.error('Analytics load error:', e);
    }
    setLoading(false);
  }, [authed, preset]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime polling
  useEffect(() => {
    if (!authed) return;
    const poll = async () => {
      try {
        const data = await fetchApi('/realtime');
        setRealtime(data);
      } catch {}
    };
    poll();
    const timer = setInterval(poll, 30000);
    return () => clearInterval(timer);
  }, [authed]);

  // ── Auth Screen ────────────────────────────────────────────────

  if (!authed) {
    return (
      <div className={styles.authPage}>
        <div className={styles.authCard}>
          <h1>Analytics Dashboard</h1>
          <p>Enter admin key to continue</p>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            placeholder="Admin key"
            className={styles.authInput}
            autoFocus
          />
          {authError && <p className={styles.authError}>{authError}</p>}
          <button onClick={handleAuth} className={styles.authBtn}>Enter</button>
        </div>
      </div>
    );
  }

  // ── Derived data ───────────────────────────────────────────────

  const daily = overview?.daily || [];
  const totals = overview?.totals || {};
  const today = daily[daily.length - 1] || {};

  const dauSpark = daily.map(d => ({ date: shortDate(d.date), value: d.dau }));
  const newUsersSpark = daily.map(d => ({ date: shortDate(d.date), value: d.newUsers }));
  const playsSpark = daily.map(d => ({ date: shortDate(d.date), value: d.playsStarted }));
  const completionSpark = daily.map(d => ({ date: shortDate(d.date), value: d.completionRate }));
  const sessionSpark = daily.map(d => ({ date: shortDate(d.date), value: d.avgSessionDurationMin }));

  // Users section
  const dauChartData = (users?.daily || []).map(d => ({
    date: shortDate(d.date),
    dau: d.dau,
    newUsers: d.newUsers,
  }));
  const deviceData = Object.entries(users?.devices || {}).map(([name, value]) => ({ name, value }));

  // Acquisition
  const referrerData = Object.entries(acquisition?.referrers || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Content
  const typeData = Object.entries(content?.playsByType || {}).map(([name, value]) => ({ name, value }));
  const ageData = Object.entries(content?.playsByAge || {}).map(([name, value]) => ({ name, value }));
  const voiceData = Object.entries(content?.playsByVoice || {}).map(([name, value]) => ({ name, value }));
  const phaseData = Object.entries(content?.abandonsByPhase || {}).map(([name, value]) => ({ name: `Phase ${name}`, value }));
  const topContent = content?.topContent || [];

  // Engagement
  const engagementDaily = (engagement?.daily || []).map(d => ({
    date: shortDate(d.date),
    likes: d.likes,
    shares: d.shares,
    blogViews: d.blogViews,
  }));

  // ── Dashboard ──────────────────────────────────────────────────

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <h1>Dream Valley Analytics</h1>
        <div className={styles.controls}>
          {['today', '7d', '30d', '90d'].map(p => (
            <button
              key={p}
              className={`${styles.presetBtn} ${preset === p ? styles.active : ''}`}
              onClick={() => setPreset(p)}
            >
              {p === 'today' ? 'Today' : p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
          {loading && <span className={styles.loadingDot}>Loading...</span>}
        </div>
      </header>

      {/* Section 1: Overview */}
      <section className={styles.section}>
        <h2>Overview</h2>
        <div className={styles.metricsGrid}>
          <MetricCard label="Daily Active Users" value={today.dau || 0} sparkData={dauSpark} color="#f59e0b" />
          <MetricCard label="New Users" value={today.newUsers || 0} sparkData={newUsersSpark} color="#8b5cf6" />
          <MetricCard label="Plays Today" value={today.playsStarted || 0} sparkData={playsSpark} color="#06b6d4" />
          <MetricCard label="Completion Rate" value={today.completionRate || 0} unit="%" sparkData={completionSpark} color="#10b981" />
          <MetricCard label="Avg Session" value={today.avgSessionDurationMin || 0} unit="min" sparkData={sessionSpark} color="#ec4899" />
          <MetricCard label="Active Now" value={realtime?.activeUsers ?? '—'} live color="#10b981" />
        </div>
      </section>

      {/* Section 2: Users */}
      <section className={styles.section}>
        <h2>Users</h2>
        <div className={styles.chartRow}>
          <div className={styles.chartBox}>
            <h3>DAU Over Time</h3>
            {dauChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dauChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="date" stroke={CHART_AXIS} tick={{ fontSize: 11 }} />
                  <YAxis stroke={CHART_AXIS} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <defs>
                    <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="dau" stroke="#f59e0b" strokeWidth={2} fill="url(#dauGrad)" />
                  <Area type="monotone" dataKey="newUsers" stroke="#8b5cf6" strokeWidth={1.5} fill="rgba(139,92,246,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className={styles.empty}>No data yet</p>}
          </div>
          <div className={styles.chartBox}>
            <h3>Devices</h3>
            {deviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deviceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis type="number" stroke={CHART_AXIS} />
                  <YAxis dataKey="name" type="category" stroke={CHART_AXIS} width={80} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className={styles.empty}>No data yet</p>}
            <div className={styles.keyNumbers}>
              <span>Total unique users: <strong>{users?.totalUniqueUsers?.toLocaleString() || 0}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Acquisition */}
      <section className={styles.section}>
        <h2>Acquisition</h2>
        <div className={styles.chartBox}>
          <h3>Traffic Sources</h3>
          {referrerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={referrerData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="name" stroke={CHART_AXIS} tick={{ fontSize: 11 }} />
                <YAxis stroke={CHART_AXIS} />
                <Tooltip contentStyle={TT_STYLE} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {referrerData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className={styles.empty}>No data yet</p>}
        </div>
      </section>

      {/* Section 4: Content */}
      <section className={styles.section}>
        <h2>Content</h2>

        {/* Sleep Success Rate highlight */}
        <div className={styles.sleepCard}>
          <div className={styles.sleepLabel}>Sleep Success Rate</div>
          <div className={styles.sleepValue}>{content?.sleepSuccessRate || 0}%</div>
          <div className={styles.sleepSub}>Plays ending in Phase 3+ or completion</div>
        </div>

        <div className={styles.chartRow}>
          <div className={styles.chartBox}>
            <h3>Plays by Type</h3>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="name" stroke={CHART_AXIS} tick={{ fontSize: 11 }} />
                  <YAxis stroke={CHART_AXIS} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className={styles.empty}>No data yet</p>}
          </div>
          <div className={styles.chartBox}>
            <h3>Plays by Age Group</h3>
            {ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="name" stroke={CHART_AXIS} tick={{ fontSize: 11 }} />
                  <YAxis stroke={CHART_AXIS} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className={styles.empty}>No data yet</p>}
          </div>
        </div>

        <div className={styles.chartRow}>
          <div className={styles.chartBox}>
            <h3>Plays by Voice</h3>
            {voiceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={voiceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="name" stroke={CHART_AXIS} tick={{ fontSize: 11 }} />
                  <YAxis stroke={CHART_AXIS} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className={styles.empty}>No data yet</p>}
          </div>
          <div className={styles.chartBox}>
            <h3>Abandonment by Phase</h3>
            {phaseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={phaseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="name" stroke={CHART_AXIS} tick={{ fontSize: 11 }} />
                  <YAxis stroke={CHART_AXIS} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className={styles.empty}>No data yet</p>}
            <div className={styles.keyNumbers}>
              <span>Avg abandon point: <strong>{content?.avgAbandonPercent || 0}%</strong></span>
            </div>
          </div>
        </div>

        {/* Top Stories Table */}
        {topContent.length > 0 && (
          <div className={styles.chartBox}>
            <h3>Top Stories</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>#</th><th>Story</th><th>Plays</th></tr>
                </thead>
                <tbody>
                  {topContent.map((item, i) => (
                    <tr key={item.id}>
                      <td>{i + 1}</td>
                      <td>{item.title}</td>
                      <td>{item.plays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Section 5: Retention */}
      <section className={styles.section}>
        <h2>Retention</h2>
        <RetentionTable cohorts={retention?.cohorts} />
      </section>

      {/* Section 6: Engagement */}
      <section className={styles.section}>
        <h2>Engagement</h2>
        <div className={styles.chartBox}>
          {engagementDaily.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={engagementDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="date" stroke={CHART_AXIS} tick={{ fontSize: 11 }} />
                <YAxis stroke={CHART_AXIS} />
                <Tooltip contentStyle={TT_STYLE} />
                <Line type="monotone" dataKey="likes" stroke="#ec4899" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="shares" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="blogViews" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className={styles.empty}>No data yet</p>}
          <div className={styles.legend}>
            <span style={{ color: '#ec4899' }}>Likes</span>
            <span style={{ color: '#f59e0b' }}>Shares</span>
            <span style={{ color: '#06b6d4' }}>Blog Views</span>
          </div>
        </div>
      </section>

      {/* Totals Summary */}
      {Object.keys(totals).length > 0 && (
        <section className={styles.section}>
          <h2>Period Summary</h2>
          <div className={styles.metricsGrid}>
            <MetricCard label="Total Users" value={totals.totalUsers || 0} />
            <MetricCard label="New Users" value={totals.totalNewUsers || 0} />
            <MetricCard label="Total Sessions" value={totals.totalSessions || 0} />
            <MetricCard label="Total Plays" value={totals.totalPlays || 0} />
            <MetricCard label="Avg Completion" value={totals.avgCompletionRate || 0} unit="%" />
            <MetricCard label="Avg Sleep Success" value={totals.avgSleepSuccessRate || 0} unit="%" />
          </div>
        </section>
      )}
    </div>
  );
}
