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

async function fetchClipsApi(path, params = {}, method = 'GET') {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_URL}/api/v1/clips${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { method, headers: authHeaders() });
  if (!res.ok) throw new Error(`Clips API error: ${res.status}`);
  return res.json();
}

// ── Clip helpers ──────────────────────────────────────────────────

const MOOD_CONFIG = {
  wired:   { label: 'Silly',      emoji: '\u{1F604}', color: '#FFB946' },
  curious: { label: 'Adventure',  emoji: '\u{1F52E}', color: '#7B68EE' },
  calm:    { label: 'Gentle',     emoji: '\u{1F319}', color: '#6BB5C9' },
  sad:     { label: 'Comfort',    emoji: '\u{1F49B}', color: '#E8A87C' },
  anxious: { label: 'Brave',      emoji: '\u{1F6E1}', color: '#85C88A' },
  angry:   { label: 'Let It Out', emoji: '\u{1F30A}', color: '#C9896D' },
};

const VOICE_LABELS = { female_1: 'Calm voice', asmr: 'ASMR voice', default: 'Lullaby' };

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

// ── Diversity Tab ────────────────────────────────────────────────

const TIER_COLORS = {
  1: '#f59e0b',
  2: '#a78bfa',
  3: '#6BB5C9',
};

const TIER_LABELS = {
  1: 'Tier 1 — Hard Rules',
  2: 'Tier 2 — Medium Weight',
  3: 'Tier 3 — Lower Weight',
};

function DiversityTab({ data, loading, view, onViewChange, openTiers, setOpenTiers }) {
  if (loading && !data) return <p className={styles.empty}>Loading diversity data...</p>;
  if (!data) return <p className={styles.empty}>No diversity data available</p>;
  if (data.error) return <p className={styles.empty}>{data.error}</p>;

  const { catalog, mood, content, covers } = data;

  // Group dimensions by tier
  const dimsByTier = { 1: [], 2: [], 3: [] };
  if (content?.dimensions) {
    Object.entries(content.dimensions).forEach(([name, dim]) => {
      dimsByTier[dim.tier]?.push({ name, ...dim });
    });
  }

  const formatDimLabel = (s) => s.replace(/_/g, ' ');

  const coverageClass = (cov) =>
    cov >= 0.7 ? styles.coverageGood : cov >= 0.4 ? styles.coverageWarn : styles.coverageBad;

  return (
    <>
      {/* View toggle */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'current' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewChange('current')}
          >Current</button>
          <button
            className={`${styles.viewBtn} ${view === 'previous' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewChange('previous')}
          >Previous</button>
        </div>
        {data.generatedAt && (
          <span className={styles.snapshotTime}>
            {view === 'previous' ? 'Snapshot' : 'Live'}: {new Date(data.generatedAt).toLocaleString()}
          </span>
        )}
        {loading && <span className={styles.loadingDot} style={{ marginLeft: 8 }}>Loading...</span>}
      </div>

      {/* Catalog Overview */}
      <section className={styles.section}>
        <h2>Catalog Overview</h2>
        <div className={styles.metricsGrid}>
          <MetricCard label="Total Items" value={catalog?.total || 0} />
          <MetricCard label="With Fingerprint" value={catalog?.withFingerprint || 0} color="#8b5cf6" />
          <MetricCard label="With Mood" value={catalog?.withMood || 0} color="#10b981" />
          <MetricCard label="With Cover" value={catalog?.withCover || 0} color="#06b6d4" />
          <MetricCard label="Stories" value={catalog?.byType?.story || 0} />
          <MetricCard label="Poems" value={catalog?.byType?.poem || 0} />
          <MetricCard label="Songs" value={catalog?.byType?.song || 0} />
          <MetricCard label="Long Stories" value={catalog?.byType?.long_story || 0} />
        </div>
      </section>

      {/* Mood Distribution */}
      <section className={styles.section}>
        <h2>Mood Distribution</h2>
        <div className={styles.moodGrid}>
          {(mood?.config?.moods || []).map(m => {
            const info = MOOD_CONFIG[m] || {};
            const d = mood?.distribution?.[m] || { count: 0, pct: 0 };
            return (
              <div key={m} className={styles.moodCard} style={{ borderColor: `${info.color || '#555'}33` }}>
                <div className={styles.moodEmoji}>{info.emoji || '?'}</div>
                <div className={styles.moodName}>{info.label || m}</div>
                <div className={styles.moodCount} style={{ color: info.color }}>{d.count}</div>
                <div className={styles.moodPct}>{d.pct}%</div>
              </div>
            );
          })}
        </div>

        {/* Mood by type */}
        {mood?.byType && (
          <div className={styles.chartBox}>
            <h3>Mood × Content Type</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={Object.entries(mood.byType).map(([type, counts]) => ({
                type,
                ...Object.fromEntries((mood.config?.moods || []).map(m => [m, counts[m] || 0])),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="type" stroke={CHART_AXIS} tick={{ fontSize: 11 }} />
                <YAxis stroke={CHART_AXIS} />
                <Tooltip contentStyle={TT_STYLE} />
                {(mood.config?.moods || []).map(m => (
                  <Bar key={m} dataKey={m} stackId="mood" fill={MOOD_CONFIG[m]?.color || '#555'} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Mood by age */}
        {mood?.byAge && (
          <div className={styles.chartBox}>
            <h3>Mood × Age Group</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={['0-1', '2-5', '6-8', '9-12'].map(ag => ({
                age: ag,
                ...Object.fromEntries((mood.config?.moods || []).map(m => [m, mood.byAge[ag]?.[m] || 0])),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="age" stroke={CHART_AXIS} tick={{ fontSize: 11 }} />
                <YAxis stroke={CHART_AXIS} />
                <Tooltip contentStyle={TT_STYLE} />
                {(mood.config?.moods || []).map(m => (
                  <Bar key={m} dataKey={m} stackId="mood" fill={MOOD_CONFIG[m]?.color || '#555'} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Content Diversity (13 dimensions) */}
      <section className={styles.section}>
        <h2>Content Diversity — 13 Dimensions</h2>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: -8, marginBottom: 16 }}>
          {content?.totalFingerprinted || 0} / {catalog?.total || 0} items fingerprinted
        </p>

        {[1, 2, 3].map(tier => {
          const dims = dimsByTier[tier];
          if (!dims || dims.length === 0) return null;
          const isOpen = openTiers[tier];
          return (
            <div key={tier} className={styles.dimSection}>
              <div
                className={styles.dimSectionHeader}
                onClick={() => setOpenTiers(prev => ({ ...prev, [tier]: !prev[tier] }))}
              >
                <span className={`${styles.tierBadge} ${styles[`tier${tier}`]}`}>Tier {tier}</span>
                <span className={styles.dimSectionTitle}>{TIER_LABELS[tier]}</span>
                <span className={styles.dimToggle}>{isOpen ? '▾' : '▸'} {dims.length} dimensions</span>
              </div>
              {isOpen && (
                <div className={styles.dimGroup}>
                  {dims.map(dim => {
                    const maxCount = Math.max(1, ...Object.values(dim.distribution || {}));
                    return (
                      <div key={dim.name} className={styles.dimCard}>
                        <div className={styles.dimCardHeader}>
                          <span className={styles.dimName}>{formatDimLabel(dim.name)}</span>
                          <span className={styles.dimWeight}>w:{dim.weight}</span>
                          {dim.hardRule && <span className={styles.dimWeight}>hard</span>}
                          <span className={`${styles.coverageBadge} ${coverageClass(dim.coverage)}`}>
                            {Math.round(dim.coverage * 100)}%
                          </span>
                        </div>
                        <div className={styles.dimBars}>
                          {(dim.values || []).map(val => {
                            const count = dim.distribution?.[val] || 0;
                            const pct = Math.round(count / maxCount * 100);
                            return (
                              <div key={val} className={styles.dimBar}>
                                <span className={styles.dimLabel} title={val}>{formatDimLabel(val)}</span>
                                <div className={styles.dimBarTrack}>
                                  <div
                                    className={styles.dimBarFill}
                                    style={{
                                      width: `${pct}%`,
                                      background: count === 0
                                        ? 'rgba(239,68,68,0.2)'
                                        : TIER_COLORS[tier] || '#f59e0b',
                                      opacity: count === 0 ? 0.3 : 0.7,
                                    }}
                                  />
                                </div>
                                <span className={styles.dimCount}>{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Catalog Gaps */}
      {content?.gaps && Object.keys(content.gaps).length > 0 && (
        <section className={styles.section}>
          <h2>Catalog Gaps</h2>
          <div className={styles.chartBox}>
            <h3>Missing / Underrepresented Values</h3>
            <div className={styles.gapsList}>
              {Object.entries(content.gaps).map(([dim, values]) => (
                <div key={dim} className={styles.gapRow}>
                  <span className={styles.gapDim}>{formatDimLabel(dim)}</span>
                  <span className={styles.gapValues}>
                    {values.map(v => (
                      <span key={v} className={styles.gapTag}>{formatDimLabel(v)}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cover Diversity */}
      <section className={styles.section}>
        <h2>Cover Diversity — 7 Axes</h2>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: -8, marginBottom: 16 }}>
          {covers?.historyCount || 0} covers in history
        </p>

        {covers?.axes && (
          <div className={styles.dimGroup}>
            {Object.entries(covers.axes).map(([axisName, axis]) => {
              const maxCount = Math.max(1, ...Object.values(axis.distribution || {}));
              return (
                <div key={axisName} className={styles.dimCard}>
                  <div className={styles.dimCardHeader}>
                    <span className={styles.dimName}>{formatDimLabel(axisName)}</span>
                    <span className={`${styles.coverageBadge} ${coverageClass(axis.coverage)}`}>
                      {Math.round(axis.coverage * 100)}%
                    </span>
                  </div>
                  <div className={styles.dimBars}>
                    {(axis.values || []).map(val => {
                      const count = axis.distribution?.[val] || 0;
                      const pct = Math.round(count / maxCount * 100);
                      return (
                        <div key={val} className={styles.dimBar}>
                          <span className={styles.dimLabel} title={val}>{formatDimLabel(val)}</span>
                          <div className={styles.dimBarTrack}>
                            <div
                              className={styles.dimBarFill}
                              style={{
                                width: `${pct}%`,
                                background: count === 0 ? 'rgba(239,68,68,0.2)' : '#ec4899',
                                opacity: count === 0 ? 0.3 : 0.7,
                              }}
                            />
                          </div>
                          <span className={styles.dimCount}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Lead Character Type */}
      {covers?.leadCharacterType && Object.keys(covers.leadCharacterType).length > 0 && (
        <section className={styles.section}>
          <h2>Lead Character Types</h2>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height={Math.max(200, Object.keys(covers.leadCharacterType).length * 28)}>
              <BarChart
                data={Object.entries(covers.leadCharacterType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => ({ name: formatDimLabel(name), count }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis type="number" stroke={CHART_AXIS} />
                <YAxis type="category" dataKey="name" stroke={CHART_AXIS} tick={{ fontSize: 11 }} width={120} />
                <Tooltip contentStyle={TT_STYLE} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </>
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
  const [usersActivity, setUsersActivity] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [health, setHealth] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [clips, setClips] = useState(null);
  const [clipsFilters, setClipsFilters] = useState({ mood: '', voice: '', posted: '', sort: 'newest' });
  const [copiedCaption, setCopiedCaption] = useState(null);
  const [diversity, setDiversity] = useState(null);
  const [diversityView, setDiversityView] = useState('current');
  const [diversityLoading, setDiversityLoading] = useState(false);
  const [openTiers, setOpenTiers] = useState({ 1: true, 2: false, 3: false });

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
      const [ov, us, aq, ct, rt, en, ua, fn] = await Promise.all([
        fetchApi('/overview', range),
        fetchApi('/users', range),
        fetchApi('/acquisition', range),
        fetchApi('/content', range),
        fetchApi('/retention', { start_date: range.to }),
        fetchApi('/engagement', range),
        fetchApi('/users-activity', range),
        fetchApi('/funnel', range),
      ]);
      setOverview(ov);
      setUsers(us);
      setAcquisition(aq);
      setContent(ct);
      setRetention(rt);
      setEngagement(en);
      setUsersActivity(ua);
      setFunnel(fn);
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

  // Clips tab: lazy-load when tab switches to clips
  const loadClips = useCallback(async () => {
    if (!authed) return;
    try {
      const params = {};
      if (clipsFilters.mood) params.mood = clipsFilters.mood;
      if (clipsFilters.voice) params.voice = clipsFilters.voice;
      if (clipsFilters.posted) params.posted = clipsFilters.posted;
      if (clipsFilters.sort) params.sort = clipsFilters.sort;
      const data = await fetchClipsApi('/', params);
      setClips(data);
    } catch (e) {
      console.error('Clips load error:', e);
    }
  }, [authed, clipsFilters]);

  useEffect(() => {
    if (tab === 'clips') loadClips();
  }, [tab, loadClips]);

  // Diversity tab: lazy-load
  const loadDiversity = useCallback(async (view) => {
    if (!authed) return;
    setDiversityLoading(true);
    try {
      const data = await fetchApi('/diversity', { view: view || diversityView });
      setDiversity(data);
    } catch (e) {
      console.error('Diversity load error:', e);
    }
    setDiversityLoading(false);
  }, [authed, diversityView]);

  useEffect(() => {
    if (tab === 'diversity') loadDiversity();
  }, [tab, loadDiversity]);

  const switchDiversityView = (v) => {
    setDiversityView(v);
    setDiversityLoading(true);
    fetchApi('/diversity', { view: v }).then(data => {
      setDiversity(data);
      setDiversityLoading(false);
    }).catch(() => setDiversityLoading(false));
  };

  // Health tab polling (60s refresh when active)
  useEffect(() => {
    if (!authed || tab !== 'health') return;
    const hoursMap = { today: 24, '7d': 168, '30d': 720, '90d': 168 };
    const loadHealth = async () => {
      try {
        const data = await fetchApi('/server-health', { hours: hoursMap[preset] || 168 });
        setHealth(data);
      } catch (e) {
        console.error('Health load error:', e);
      }
    };
    loadHealth();
    const timer = setInterval(loadHealth, 60000);
    return () => clearInterval(timer);
  }, [authed, tab, preset]);

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

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'dashboard' ? styles.activeTab : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={`${styles.tab} ${tab === 'funnel' ? styles.activeTab : ''}`} onClick={() => setTab('funnel')}>Funnel</button>
        <button className={`${styles.tab} ${tab === 'users' ? styles.activeTab : ''}`} onClick={() => setTab('users')}>Users</button>
        <button className={`${styles.tab} ${tab === 'health' ? styles.activeTab : ''}`} onClick={() => setTab('health')}>Health</button>
        <button className={`${styles.tab} ${tab === 'clips' ? styles.activeTab : ''}`} onClick={() => setTab('clips')}>Clips</button>
        <button className={`${styles.tab} ${tab === 'diversity' ? styles.activeTab : ''}`} onClick={() => setTab('diversity')}>Diversity</button>
      </div>

      {tab === 'users' && (
        <section className={styles.section}>
          <h2>User Activity</h2>
          {usersActivity?.users?.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.usersTable}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Sessions</th>
                    <th>Plays</th>
                    <th>Completed</th>
                    <th>Events</th>
                    <th>Device</th>
                    <th>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {usersActivity.users.map((u) => (
                    <tr key={u.userId}>
                      <td className={styles.userCell}>
                        {u.username ? (
                          <>
                            <span className={styles.username}>{u.username}</span>
                            <span className={styles.userId}>{u.userId.slice(0, 8)}</span>
                          </>
                        ) : (
                          <span className={styles.userId} style={{ fontSize: '13px' }}>{u.userId}</span>
                        )}
                      </td>
                      <td>{u.sessions}</td>
                      <td>{u.plays}</td>
                      <td>{u.completions}</td>
                      <td>{u.totalEvents}</td>
                      <td>{u.device || '—'}</td>
                      <td>{new Date(u.lastSeen).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.noData}>No user activity in this period.</p>
          )}
        </section>
      )}

      {tab === 'funnel' && (
        <section className={styles.section}>
          <h2>Conversion Funnel</h2>
          {funnel?.steps?.length > 0 ? (
            <div className={styles.funnelWrap}>
              {funnel.steps.map((step, i) => {
                const maxCount = funnel.steps[0].count || 1;
                const widthPct = maxCount > 0 ? Math.max((step.count / maxCount) * 100, 8) : 8;
                const prevCount = i > 0 ? funnel.steps[i - 1].count : null;
                const convRate = prevCount > 0 ? Math.round((step.count / prevCount) * 100) : null;
                return (
                  <div key={step.label} className={styles.funnelStep}>
                    <div className={styles.funnelInfo}>
                      <span className={styles.funnelLabel}>{step.label}</span>
                      <span className={styles.funnelCount}>{step.count.toLocaleString()}</span>
                    </div>
                    <div className={styles.funnelBarTrack}>
                      <div
                        className={styles.funnelBar}
                        style={{
                          width: `${widthPct}%`,
                          background: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                    {convRate !== null && (
                      <div className={styles.funnelConv}>{convRate}% conversion</div>
                    )}
                  </div>
                );
              })}
              {funnel.steps[0].count > 0 && funnel.steps[funnel.steps.length - 1] && (
                <div className={styles.funnelTotal}>
                  Overall: {Math.round((funnel.steps[funnel.steps.length - 1].count / funnel.steps[0].count) * 100)}% end-to-end conversion
                </div>
              )}
            </div>
          ) : (
            <p className={styles.empty}>No funnel data yet. Events will appear as users visit and interact.</p>
          )}
        </section>
      )}

      {tab === 'health' && (<>
        {health ? (() => {
          const peak = health.peakHealth || {};
          const cur = health.current || {};
          const scoreColor = peak.status === 'green' ? '#10b981' : peak.status === 'yellow' ? '#f59e0b' : '#ef4444';
          const statusLabel = peak.status === 'green' ? 'Healthy' : peak.status === 'yellow' ? 'Degraded' : 'Critical';
          const peakTime = peak.timestamp ? new Date(peak.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

          // History for charts
          const healthHistory = (health.history || []).map(h => ({
            time: new Date(h.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            p50: h.p50, p95: h.p95, p99: h.p99,
            errorRate: h.errorRate, requestCount: h.requestCount,
            healthScore: h.healthScore,
          }));

          return (
          <>
          {/* Health Score Slider */}
          <section className={styles.section}>
            <h2>Peak Traffic Health <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(worst in last 6h)</span></h2>
            <div className={styles.healthSlider}>
              <div className={styles.healthScoreRow}>
                <span className={styles.healthScoreNum} style={{ color: scoreColor }}>{peak.score ?? '—'}</span>
                <span className={styles.healthStatusBadge} style={{ background: `${scoreColor}15`, color: scoreColor }}>{statusLabel}</span>
                {peakTime && <span className={styles.healthPeakTime}>at {peakTime}</span>}
              </div>
              <div className={styles.healthTrack}>
                <div className={styles.healthTrackFill} />
                <div className={styles.healthPointer} style={{ left: `${Math.max(0, Math.min(100, peak.score || 0))}%` }}>
                  <div className={styles.healthPointerDot} style={{ background: scoreColor }} />
                </div>
              </div>
              <div className={styles.healthTrackLabels}>
                <span>Critical</span><span>Degraded</span><span>Healthy</span>
              </div>
              {/* Component breakdown */}
              <div className={styles.healthComponents}>
                {(peak.components || []).map(c => {
                  const cColor = c.status === 'green' ? '#10b981' : c.status === 'yellow' ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={c.name} className={styles.healthComp}>
                      <div className={styles.healthCompHeader}>
                        <span className={styles.healthCompDot} style={{ background: cColor }} />
                        <span className={styles.healthCompName}>{c.name}</span>
                        <span className={styles.healthCompValue}>{c.value}</span>
                        <span className={styles.healthCompScore}>{c.score}/{c.max}</span>
                      </div>
                      <div className={styles.healthCompBar}>
                        <div style={{ width: `${(c.score / c.max) * 100}%`, background: cColor, height: '100%', borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Status Cards */}
          <section className={styles.section}>
            <h2>Current Status</h2>
            <div className={styles.metricsGrid}>
              <MetricCard label="Uptime" value={cur.uptimeHuman || '—'} color="#10b981" />
              <MetricCard label="CPU Load" value={cur.cpuLoad1m ?? '—'} color={(cur.cpuLoad1m || 0) > 2 ? '#ef4444' : '#10b981'} />
              <MetricCard label="Memory" value={cur.memoryUsedPct ?? '—'} unit="%" color={(cur.memoryUsedPct || 0) > 80 ? '#ef4444' : '#f59e0b'} />
              <MetricCard label="Disk" value={cur.diskUsedPct ?? '—'} unit="%" color={(cur.diskUsedPct || 0) > 85 ? '#ef4444' : '#06b6d4'} />
              <MetricCard label="DB Size" value={cur.dbSizeMb ?? 0} unit="MB" color="#8b5cf6" />
              <MetricCard label="Req/5min" value={cur.latency?.request_count ?? 0} live color="#f59e0b" />
            </div>
          </section>

          {/* Response Time Chart */}
          <section className={styles.section}>
            <h2>Response Time</h2>
            <div className={styles.chartBox}>
              {healthHistory.length > 1 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={healthHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="time" stroke={CHART_AXIS} tick={{ fontSize: 11 }} />
                    <YAxis stroke={CHART_AXIS} unit="ms" />
                    <Tooltip contentStyle={TT_STYLE} />
                    <defs>
                      <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={1.5} fill="url(#p50Grad)" name="p50" />
                    <Area type="monotone" dataKey="p95" stroke="#f59e0b" strokeWidth={2} fill="url(#p95Grad)" name="p95" />
                    <Area type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={1.5} fill="rgba(239,68,68,0.05)" name="p99" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className={styles.empty}>Collecting data... Charts appear after ~10 minutes.</p>}
              <div className={styles.legend}>
                <span style={{ color: '#10b981' }}>p50</span>
                <span style={{ color: '#f59e0b' }}>p95</span>
                <span style={{ color: '#ef4444' }}>p99</span>
              </div>
            </div>
          </section>

          {/* Error Rate + Volume Chart */}
          <section className={styles.section}>
            <h2>Error Rate & Request Volume</h2>
            <div className={styles.chartBox}>
              {healthHistory.length > 1 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={healthHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="time" stroke={CHART_AXIS} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" stroke={CHART_AXIS} unit="%" />
                    <YAxis yAxisId="right" orientation="right" stroke={CHART_AXIS} />
                    <Tooltip contentStyle={TT_STYLE} />
                    <Line yAxisId="left" type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} dot={false} name="Error Rate %" />
                    <Line yAxisId="right" type="monotone" dataKey="requestCount" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="Requests" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className={styles.empty}>Collecting data...</p>}
              <div className={styles.legend}>
                <span style={{ color: '#ef4444' }}>Error Rate</span>
                <span style={{ color: '#06b6d4' }}>Requests</span>
              </div>
            </div>
          </section>

          {/* Slow Requests Table */}
          {health.slowRequests?.length > 0 && (
            <section className={styles.section}>
              <h2>Slow Requests (last hour, &gt;500ms)</h2>
              <div className={styles.chartBox}>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Time</th><th>Method</th><th>Path</th><th>Status</th><th>Duration</th></tr></thead>
                    <tbody>
                      {health.slowRequests.map((r, i) => (
                        <tr key={i}>
                          <td>{new Date(r.timestamp).toLocaleTimeString()}</td>
                          <td>{r.method}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.path}</td>
                          <td>{r.status}</td>
                          <td style={{ color: r.durationMs > 2000 ? '#ef4444' : '#f59e0b' }}>{r.durationMs}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Recent Issues Table */}
          {health.recentErrors?.length > 0 && (
            <section className={styles.section}>
              <h2>Recent Issues (last hour)</h2>
              <div className={styles.chartBox}>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Time</th><th>What Happened</th><th>Status</th><th>Duration</th></tr></thead>
                    <tbody>
                      {health.recentErrors.map((r, i) => (
                        <tr key={i}>
                          <td>{new Date(r.timestamp).toLocaleTimeString()}</td>
                          <td>
                            <div>{r.description || r.path}</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 2 }}>{r.method} {r.path}</div>
                          </td>
                          <td style={{ color: r.severity === 'error' ? '#ef4444' : '#f59e0b' }}>{r.status}</td>
                          <td>{r.durationMs}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
          </>);
        })() : <p className={styles.empty}>Loading health data...</p>}
      </>)}

      {tab === 'clips' && (
        <section className={styles.section}>
          <h2>Social Media Clips</h2>

          {/* Filters */}
          <div className={styles.clipFilters}>
            <select
              value={clipsFilters.mood}
              onChange={e => setClipsFilters(f => ({ ...f, mood: e.target.value }))}
              className={styles.clipSelect}
            >
              <option value="">All moods</option>
              {Object.entries(MOOD_CONFIG).map(([key, m]) => (
                <option key={key} value={key}>{m.emoji} {m.label}</option>
              ))}
            </select>

            <select
              value={clipsFilters.voice}
              onChange={e => setClipsFilters(f => ({ ...f, voice: e.target.value }))}
              className={styles.clipSelect}
            >
              <option value="">All voices</option>
              <option value="female_1">Calm voice</option>
              <option value="asmr">ASMR voice</option>
              <option value="default">Lullaby</option>
            </select>

            <select
              value={clipsFilters.posted}
              onChange={e => setClipsFilters(f => ({ ...f, posted: e.target.value }))}
              className={styles.clipSelect}
            >
              <option value="">All status</option>
              <option value="posted">Posted</option>
              <option value="unposted">Not posted</option>
            </select>

            <select
              value={clipsFilters.sort}
              onChange={e => setClipsFilters(f => ({ ...f, sort: e.target.value }))}
              className={styles.clipSelect}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">By title</option>
            </select>

            <span className={styles.clipCount}>{clips?.total ?? 0} clips</span>
          </div>

          {/* Clip Cards */}
          {clips?.clips?.length > 0 ? (
            <div className={styles.clipGrid}>
              {clips.clips.map(clip => {
                const moodCfg = MOOD_CONFIG[clip.mood] || MOOD_CONFIG.calm;
                const voiceLabel = VOICE_LABELS[clip.voice] || clip.voice;
                const posted = clip.posted || {};
                const clipKey = `${clip.storyId}_${clip.voice}`;

                return (
                  <div key={clipKey} className={styles.clipCard}>
                    <div className={styles.clipInfo}>
                      <div className={styles.clipTitle}>{clip.title}</div>
                      <div className={styles.clipTags}>
                        <span className={styles.moodTag} style={{ color: moodCfg.color, borderColor: moodCfg.color }}>
                          {moodCfg.emoji} {moodCfg.label}
                        </span>
                        <span className={styles.voiceTag}>{voiceLabel}</span>
                      </div>
                      <div className={styles.clipMeta}>
                        Ages {clip.ageGroup || '—'} · {clip.contentType || 'story'} · {formatFileSize(clip.fileSize)}
                      </div>
                      <div className={styles.clipDate}>
                        {clip.generatedAt ? new Date(clip.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                      </div>
                    </div>

                    <div className={styles.clipActions}>
                      {/* Download */}
                      <a
                        href={`${API_URL}/api/v1/clips/${clip.storyId}/${clip.voice}/download`}
                        className={styles.downloadBtn}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => {
                          e.preventDefault();
                          const link = document.createElement('a');
                          link.href = `${API_URL}/api/v1/clips/${clip.storyId}/${clip.voice}/download?${new URLSearchParams({ Authorization: `Bearer ${getKey()}` })}`;
                          // Use fetch for auth'd download
                          fetch(`${API_URL}/api/v1/clips/${clip.storyId}/${clip.voice}/download`, { headers: authHeaders() })
                            .then(r => r.blob())
                            .then(blob => {
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `dreamvalley-${clip.storyId}-${clip.voice}.mp4`;
                              a.click();
                              URL.revokeObjectURL(url);
                            });
                        }}
                      >
                        ⬇ Download
                      </a>

                      {/* Caption Copy Buttons */}
                      <div className={styles.captionBtns}>
                        {['youtube', 'instagram', 'tiktok'].map(platform => (
                          <button
                            key={platform}
                            className={styles.captionBtn}
                            title={`Copy ${platform} caption`}
                            onClick={() => {
                              const text = clip.captions?.[platform] || '';
                              navigator.clipboard.writeText(text);
                              setCopiedCaption(`${clipKey}_${platform}`);
                              setTimeout(() => setCopiedCaption(null), 2000);
                            }}
                          >
                            {platform === 'youtube' ? '▶' : platform === 'instagram' ? '📷' : '♪'}
                            {copiedCaption === `${clipKey}_${platform}` ? ' ✓' : ''}
                          </button>
                        ))}
                      </div>

                      {/* Posted Toggles */}
                      <div className={styles.postedRow}>
                        {['youtube', 'instagram', 'tiktok'].map(platform => (
                          <button
                            key={platform}
                            className={`${styles.postedToggle} ${posted[platform] ? styles.postedActive : ''}`}
                            title={posted[platform] ? `Posted to ${platform} (click to unpost)` : `Mark as posted to ${platform}`}
                            onClick={async () => {
                              try {
                                const endpoint = posted[platform] ? 'unpost' : 'posted';
                                await fetchClipsApi(
                                  `/${clip.storyId}/${clip.voice}/${endpoint}`,
                                  { platform },
                                  'PUT',
                                );
                                loadClips();
                              } catch (e) {
                                console.error('Toggle posted error:', e);
                              }
                            }}
                          >
                            {platform === 'youtube' ? 'YT' : platform === 'instagram' ? 'IG' : 'TT'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.empty}>
              {clips ? 'No clips found. Run the clip generation script to create clips.' : 'Loading clips...'}
            </p>
          )}
        </section>
      )}

      {tab === 'diversity' && (
        <DiversityTab
          data={diversity}
          loading={diversityLoading}
          view={diversityView}
          onViewChange={switchDiversityView}
          openTiers={openTiers}
          setOpenTiers={setOpenTiers}
        />
      )}

      {tab === 'dashboard' && (<>
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
      </>)}
    </div>
  );
}
