import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, ActivityIndicator, Animated, Platform,
} from 'react-native';

// ─── Config ─────────────────────────────────────────────────
const API_URL = 'https://qiocyz00ll.execute-api.us-west-2.amazonaws.com';
const COLORS = {
  bg: '#0a1410', surface: '#111e18', card: '#162420',
  border: 'rgba(168,220,200,0.1)', green1: '#a8dcc8', green2: '#4db896',
  gold: '#f4c77d', blue: '#7ea8f4', coral: '#f09978',
  text1: '#e0f0e8', text2: 'rgba(255,255,255,0.55)', text3: 'rgba(255,255,255,0.3)',
};

// ─── Score Ring SVG (web-compatible) ────────────────────────
function ScoreRing({ score, color, size = 80, label }) {
  const circum = 2 * Math.PI * 34;
  const filled = (score / 100) * circum;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: size, height: size }}>
        {Platform.OS === 'web' ? (
          <svg width={size} height={size} viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="5"
              strokeDasharray={`${filled} ${circum - filled}`}
              strokeDashoffset={circum * 0.25} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
            <text x="40" y="44" textAnchor="middle" fill={color}
              style={{ fontSize: 18, fontWeight: 800 }}>{score}</text>
          </svg>
        ) : (
          <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', borderRadius: size/2, borderWidth: 4, borderColor: color }}>
            <Text style={{ color, fontSize: 22, fontWeight: '800' }}>{score}</Text>
          </View>
        )}
      </View>
      <Text style={{ color: COLORS.text3, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}

// ─── Tab Bar ────────────────────────────────────────────────
function TabBar({ active, onPress }) {
  const tabs = [
    { key: 'upload', icon: '↑', label: 'Upload' },
    { key: 'dashboard', icon: '◉', label: 'Dashboard' },
    { key: 'recs', icon: '★', label: 'For You' },
  ];
  return (
    <View style={styles.tabBar}>
      {tabs.map(t => (
        <TouchableOpacity key={t.key} style={styles.tab} onPress={() => onPress(t.key)}>
          <Text style={[styles.tabIcon, active === t.key && { color: COLORS.green2 }]}>{t.icon}</Text>
          <Text style={[styles.tabLabel, active === t.key && { color: COLORS.green2 }]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Upload Screen ──────────────────────────────────────────
function UploadScreen({ onUploadComplete }) {
  const [userId, setUserId] = useState('test-user-1');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    // Simulate upload delay (in production: pick file, presign URL, upload to S3)
    await new Promise(r => setTimeout(r, 2000));
    setUploading(false);
    setDone(true);
    setTimeout(() => onUploadComplete(userId), 800);
  };

  return (
    <View style={styles.screenCenter}>
      <View style={styles.uploadIcon}>
        <Text style={{ fontSize: 48 }}>{'⬆'}</Text>
      </View>
      <Text style={styles.screenTitle}>Upload Oura Data</Text>
      <Text style={styles.screenSub}>Export your data from the Oura app,{'\n'}then upload the JSON or CSV file here.</Text>

      <View style={styles.uploadBox}>
        {!uploading && !done && (
          <>
            <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.border, borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: COLORS.text3, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
                Tap to select your Oura export file
              </Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleUpload}>
                <Text style={styles.btnPrimaryText}>Select File</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              placeholder="User ID"
              placeholderTextColor={COLORS.text3}
            />
          </>
        )}
        {uploading && (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <ActivityIndicator size="large" color={COLORS.green2} />
            <Text style={{ color: COLORS.text2, marginTop: 16, fontSize: 14 }}>Parsing your biometrics...</Text>
          </View>
        )}
        {done && (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>{'✓'}</Text>
            <Text style={{ color: COLORS.green1, fontSize: 16, fontWeight: '700' }}>Data uploaded successfully!</Text>
            <Text style={{ color: COLORS.text3, fontSize: 13, marginTop: 8 }}>Generating your recommendations...</Text>
          </View>
        )}
      </View>

      <Text style={{ color: COLORS.text3, fontSize: 11, marginTop: 16 }}>
        Supports .json and .csv Oura exports
      </Text>
    </View>
  );
}

// ─── Dashboard Screen ───────────────────────────────────────
function DashboardScreen({ metrics, onGetRecs }) {
  const sleep = metrics?.sleep || {};
  const readiness = metrics?.readiness || {};
  const activity = metrics?.activity || {};

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={styles.greeting}>Good morning</Text>
      <Text style={styles.screenTitle}>Today's Scores</Text>

      <View style={styles.scoreRow}>
        <ScoreRing score={sleep.score || 78} color={COLORS.blue} label="Sleep" />
        <ScoreRing score={readiness.score || 82} color={COLORS.green1} label="Ready" />
        <ScoreRing score={activity.score || 65} color={COLORS.gold} label="Active" />
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard label="Deep Sleep" value={`${sleep.deep_sleep_min || 80} min`} color={COLORS.blue} />
        <MetricCard label="HRV" value={`${sleep.hrv_avg || 48} ms`} color={COLORS.green1} />
        <MetricCard label="Resting HR" value={`${readiness.resting_hr || 58} bpm`} color={COLORS.coral} />
        <MetricCard label="Temp Dev" value={`+${readiness.temp_deviation || 0.3}°C`} color={COLORS.gold} />
        <MetricCard label="Steps" value={`${(activity.steps || 6200).toLocaleString()}`} color={COLORS.green2} />
        <MetricCard label="Calories" value={`${activity.active_calories || 320}`} color={COLORS.coral} />
      </View>

      <TouchableOpacity style={[styles.btnPrimary, { marginTop: 24, alignSelf: 'stretch' }]} onPress={onGetRecs}>
        <Text style={styles.btnPrimaryText}>Get My Recommendations</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <View style={styles.metricCard}>
      <Text style={{ color: COLORS.text3, fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <Text style={{ color, fontSize: 18, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

// ─── Recommendations Screen ─────────────────────────────────
function RecsScreen({ recs, loading, metrics }) {
  if (loading) {
    return (
      <View style={styles.screenCenter}>
        <ActivityIndicator size="large" color={COLORS.green2} />
        <Text style={{ color: COLORS.text2, marginTop: 20, fontSize: 15 }}>
          Analyzing your biometrics...
        </Text>
        <Text style={{ color: COLORS.text3, marginTop: 8, fontSize: 12 }}>
          This may take 15-20 seconds
        </Text>
      </View>
    );
  }

  if (!recs) {
    return (
      <View style={styles.screenCenter}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>{'★'}</Text>
        <Text style={styles.screenTitle}>Your Recommendations</Text>
        <Text style={styles.screenSub}>Upload your Oura data and tap{'\n'}"Get My Recommendations" to get started.</Text>
      </View>
    );
  }

  const sections = [
    { key: 'nutrition', title: 'Nutrition', icon: '🥬', color: COLORS.green1 },
    { key: 'workout', title: 'Movement', icon: '🏃', color: COLORS.gold },
    { key: 'recovery', title: 'Recovery', icon: '🧘', color: COLORS.blue },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {recs.overall_insight && (
        <View style={[styles.card, { borderColor: 'rgba(168,220,200,0.15)' }]}>
          <Text style={{ color: COLORS.green1, fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
            Today's Insight
          </Text>
          <Text style={{ color: COLORS.text2, fontSize: 13, lineHeight: 20 }}>
            {recs.overall_insight}
          </Text>
        </View>
      )}

      {sections.map(section => (
        <View key={section.key} style={{ marginTop: 24 }}>
          <Text style={{ color: section.color, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
            {section.icon}  {section.title}
          </Text>
          {(recs[section.key] || []).map((rec, i) => (
            <RecCard key={i} rec={rec} color={section.color} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function RecCard({ rec, color }) {
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState(null);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftWidth: 3, borderLeftColor: color }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <Text style={{ color: COLORS.text1, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>
        {rec.title}
      </Text>
      {expanded && (
        <>
          <Text style={{ color: COLORS.text2, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
            {rec.description}
          </Text>
          {rec.trigger_metric && (
            <View style={{ backgroundColor: 'rgba(168,220,200,0.06)', borderRadius: 8, padding: 8, marginTop: 10 }}>
              <Text style={{ color: COLORS.text3, fontSize: 11 }}>
                Triggered by: {rec.trigger_metric}
              </Text>
            </View>
          )}
          {rec.doi && (
            <Text style={{ color: COLORS.text3, fontSize: 11, marginTop: 8 }}>
              📄 DOI: {rec.doi}
            </Text>
          )}
          {!action && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(77,184,150,0.15)' }]}
                onPress={() => setAction('followed')}
              >
                <Text style={{ color: COLORS.green2, fontSize: 12, fontWeight: '600' }}>I'll try this</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                onPress={() => setAction('skipped')}
              >
                <Text style={{ color: COLORS.text3, fontSize: 12 }}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
          {action && (
            <Text style={{ color: COLORS.green2, fontSize: 12, marginTop: 12 }}>
              ✓ {action === 'followed' ? 'Added to your plan!' : 'Skipped'}
            </Text>
          )}
        </>
      )}
      {!expanded && (
        <Text style={{ color: COLORS.text3, fontSize: 12 }} numberOfLines={1}>
          Tap to see details and research
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main App ───────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('upload');
  const [userId, setUserId] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUploadComplete = (id) => {
    setUserId(id);
    setTab('dashboard');
  };

  const handleGetRecs = async () => {
    setTab('recs');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId || 'test-user-1' }),
      });
      const data = await res.json();
      setMetrics(data.metrics_summary || null);
      setRecs(data.recommendations || null);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={{ color: COLORS.bg, fontSize: 14, fontWeight: '800' }}>♪</Text>
          </View>
          <Text style={styles.logoText}>Attune</Text>
        </View>
      </View>

      {/* Screen content */}
      <View style={{ flex: 1 }}>
        {tab === 'upload' && <UploadScreen onUploadComplete={handleUploadComplete} />}
        {tab === 'dashboard' && <DashboardScreen metrics={metrics} onGetRecs={handleGetRecs} />}
        {tab === 'recs' && <RecsScreen recs={recs} loading={loading} metrics={metrics} />}
      </View>

      {/* Tab bar */}
      <TabBar active={tab} onPress={setTab} />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: Platform.OS === 'web' ? 16 : 56,
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.green2,
    justifyContent: 'center', alignItems: 'center',
  },
  logoText: { fontSize: 20, fontWeight: '800', color: COLORS.text1 },

  tabBar: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface, paddingBottom: Platform.OS === 'web' ? 8 : 28, paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 20, color: COLORS.text3 },
  tabLabel: { fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 0.5 },

  screen: { flex: 1 },
  screenCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text1, marginBottom: 8 },
  screenSub: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 22 },
  greeting: { fontSize: 14, color: COLORS.text3, marginBottom: 4 },

  uploadBox: { width: '100%', maxWidth: 360, marginTop: 32 },
  uploadIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(77,184,150,0.1)', justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(77,184,150,0.2)',
  },

  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 14, color: COLORS.text1, fontSize: 14, marginTop: 12,
  },

  btnPrimary: {
    backgroundColor: COLORS.green2, borderRadius: 12, padding: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: COLORS.bg, fontSize: 15, fontWeight: '700' },

  scoreRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginTop: 24, marginBottom: 28,
  },

  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  metricCard: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, padding: 16, width: '48%', flexGrow: 1,
  },

  card: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, padding: 16, marginBottom: 10,
  },

  actionBtn: {
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16,
  },
});
