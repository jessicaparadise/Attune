import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, ActivityIndicator, Platform, Dimensions,
} from 'react-native';

const API_URL = 'https://qiocyz00ll.execute-api.us-west-2.amazonaws.com';
const { width: W } = Dimensions.get('window');

const C = {
  bg: '#080f0c', surface: '#0e1915', card: '#131f1a',
  border: 'rgba(168,220,200,0.08)', borderActive: 'rgba(168,220,200,0.2)',
  green1: '#a8dcc8', green2: '#4db896', greenGlow: 'rgba(77,184,150,0.15)',
  gold: '#f4c77d', goldGlow: 'rgba(244,199,125,0.1)',
  blue: '#7ea8f4', blueGlow: 'rgba(126,168,244,0.1)',
  coral: '#f09978', coralGlow: 'rgba(240,153,120,0.1)',
  text1: '#e8f4ee', text2: 'rgba(255,255,255,0.55)', text3: 'rgba(255,255,255,0.28)',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', emoji: String.fromCodePoint(0x2600, 0xFE0F) };
  if (h < 17) return { text: 'Good afternoon', emoji: String.fromCodePoint(0x1F324, 0xFE0F) };
  if (h < 21) return { text: 'Good evening', emoji: String.fromCodePoint(0x1F319) };
  return { text: 'Night owl mode', emoji: String.fromCodePoint(0x1F989) };
}

function getScoreVibe(score) {
  if (score >= 85) return { label: 'Excellent', color: C.green2 };
  if (score >= 70) return { label: 'Good', color: C.green1 };
  if (score >= 55) return { label: 'Fair', color: C.gold };
  return { label: 'Rest up', color: C.coral };
}

function ScoreRing({ score, color, size = 100, label, delay = 0 }) {
  const [animated, setAnimated] = useState(false);
  const r = size * 0.4;
  const circum = 2 * Math.PI * r;
  const filled = (score / 100) * circum;
  const vibe = getScoreVibe(score);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, []);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color, fontSize: 28, fontWeight: '800' }}>{score}</Text>
        </View>
        <Text style={{ color: C.text3, fontSize: 11, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={(animated ? filled : 0) + ' ' + circum}
          strokeDashoffset={circum * 0.25} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)', filter: 'drop-shadow(0 0 6px ' + color + '40)' }} />
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="central"
          fill={color} style={{ fontSize: size * 0.26, fontWeight: 800 }}>{score}</text>
        <text x={size / 2} y={size / 2 + 18} textAnchor="middle" dominantBaseline="central"
          fill="rgba(255,255,255,0.3)" style={{ fontSize: 10 }}>{vibe.label}</text>
      </svg>
      <Text style={{ color: C.text3, fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function Sparkline({ data, color, width = 80, height = 28 }) {
  if (Platform.OS !== 'web' || !data || data.length < 2) return null;
  const min = Math.min.apply(null, data);
  const max = Math.max.apply(null, data);
  const range = max - min || 1;
  const points = data.map(function (v, i) {
    return ((i / (data.length - 1)) * width) + ',' + (height - ((v - min) / range) * (height - 4) - 2);
  }).join(' ');
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
  return (
    <svg width={width} height={height} style={{ opacity: 0.7 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

function StreakBadge({ days }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.goldGlow, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(244,199,125,0.15)' }}>
      <Text style={{ fontSize: 14 }}>{String.fromCodePoint(0x1F525)}</Text>
      <Text style={{ color: C.gold, fontSize: 13, fontWeight: '700' }}>{days} day streak</Text>
    </View>
  );
}

function TabBar({ active, onPress }) {
  var tabs = [
    { key: 'upload', icon: String.fromCodePoint(0x2B06), label: 'Upload' },
    { key: 'dashboard', icon: String.fromCodePoint(0x25C9), label: 'Dashboard' },
    { key: 'recs', icon: String.fromCodePoint(0x2726), label: 'For You' },
  ];
  return (
    <View style={styles.tabBar}>
      {tabs.map(function (t) {
        var isActive = active === t.key;
        return (
          <TouchableOpacity key={t.key} style={styles.tab} onPress={function () { onPress(t.key); }}>
            <View style={[styles.tabDot, isActive && { backgroundColor: C.green2 }]} />
            <Text style={[styles.tabIcon, isActive && { color: C.green2 }]}>{t.icon}</Text>
            <Text style={[styles.tabLabel, isActive && { color: C.green2 }]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function UploadScreen({ onUploadComplete }) {
  const [userId, setUserId] = useState('test-user-1');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0);
  var steps = ['Reading file...', 'Parsing sleep data...', 'Parsing activity data...', 'Analyzing readiness...', 'Done!'];

  var handleUpload = async function () {
    setUploading(true);
    for (var i = 0; i < steps.length; i++) {
      setStep(i);
      await new Promise(function (r) { setTimeout(r, 600); });
    }
    setUploading(false);
    setDone(true);
    setTimeout(function () { onUploadComplete(userId); }, 1000);
  };

  return (
    <ScrollView contentContainerStyle={styles.screenCenter}>
      <View style={styles.uploadIconRing}>
        <Text style={{ fontSize: 32 }}>{String.fromCodePoint(0x1F4E4)}</Text>
      </View>
      <Text style={[styles.screenTitle, { marginTop: 24 }]}>Upload your Oura data</Text>
      <Text style={styles.screenSub}>Export from the Oura app then upload the JSON or CSV file here.</Text>
      <View style={styles.uploadBox}>
        {!uploading && !done && (
          <View>
            <TouchableOpacity style={styles.dropZone} onPress={handleUpload} activeOpacity={0.8}>
              <Text style={{ fontSize: 28, marginBottom: 12 }}>{String.fromCodePoint(0x1F4C1)}</Text>
              <Text style={{ color: C.text2, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>Tap to select your Oura export</Text>
              <View style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>Choose File</Text></View>
            </TouchableOpacity>
            <TextInput style={styles.input} value={userId} onChangeText={setUserId} placeholder="Your User ID" placeholderTextColor={C.text3} />
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 20, justifyContent: 'center' }}>
              {['json', 'csv'].map(function (f) {
                return <View key={f} style={styles.formatBadge}><Text style={{ color: C.text3, fontSize: 11, fontWeight: '600' }}>.{f}</Text></View>;
              })}
            </View>
          </View>
        )}
        {uploading && (
          <View style={styles.progressWrap}>
            <ActivityIndicator size="large" color={C.green2} />
            <Text style={{ color: C.green1, marginTop: 20, fontSize: 15, fontWeight: '600' }}>{steps[step]}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: (((step + 1) / steps.length) * 100) + '%' }]} />
            </View>
          </View>
        )}
        {done && (
          <View style={styles.progressWrap}>
            <View style={styles.successCircle}><Text style={{ fontSize: 32, color: C.green2 }}>{String.fromCodePoint(0x2713)}</Text></View>
            <Text style={{ color: C.green1, fontSize: 18, fontWeight: '700', marginTop: 16 }}>Upload complete!</Text>
            <Text style={{ color: C.text3, fontSize: 13, marginTop: 8 }}>Heading to your dashboard...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, color, bg, trend, icon }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: bg || C.card }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
        <Sparkline data={trend} color={color} width={50} height={20} />
      </View>
      <Text style={{ color: color, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: C.text3, fontSize: 11, marginTop: 2, fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

function DashboardScreen({ metrics, onGetRecs }) {
  var greeting = getGreeting();
  var sleep = (metrics && metrics.sleep) || {};
  var readiness = (metrics && metrics.readiness) || {};
  var activity = (metrics && metrics.activity) || {};

  var sleepScore = sleep.score || 71;
  var readyScore = readiness.score || 68;
  var actScore = activity.score || 52;
  var avgScore = Math.round((sleepScore + readyScore + actScore) / 3);
  var avgVibe = getScoreVibe(avgScore);

  var sleepTrend = [72, 78, 75, 82, 71, 78, sleepScore];
  var readyTrend = [80, 82, 79, 87, 68, 82, readyScore];
  var actTrend = [60, 65, 78, 52, 70, 65, actScore];
  var avgTrend = sleepTrend.map(function (s, i) { return Math.round((s + readyTrend[i] + actTrend[i]) / 3); });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.dashHero}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: C.text3, fontSize: 14 }}>{greeting.emoji} {greeting.text}</Text>
            <Text style={{ color: C.text1, fontSize: 24, fontWeight: '800', marginTop: 4 }}>Your Day</Text>
          </View>
          <StreakBadge days={3} />
        </View>
        <View style={styles.overallCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: C.text3, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Overall</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <Text style={{ color: avgVibe.color, fontSize: 42, fontWeight: '800' }}>{avgScore}</Text>
                <Text style={{ color: avgVibe.color, fontSize: 14 }}>{avgVibe.label}</Text>
              </View>
            </View>
            <Sparkline data={avgTrend} color={avgVibe.color} width={100} height={36} />
          </View>
        </View>
      </View>

      <View style={{ padding: 20 }}>
        <View style={styles.scoreRow}>
          <ScoreRing score={sleepScore} color={C.blue} label="Sleep" size={105} delay={200} />
          <ScoreRing score={readyScore} color={C.green1} label="Ready" size={105} delay={400} />
          <ScoreRing score={actScore} color={C.gold} label="Active" size={105} delay={600} />
        </View>

        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard label="Deep Sleep" value={(sleep.deep_sleep_min || 80) + 'm'} color={C.blue} bg={C.blueGlow} trend={[65, 72, 80, 68, 75, 82, 80]} icon={String.fromCodePoint(0x1F30A)} />
          <MetricCard label="HRV" value={(sleep.hrv_avg || 41) + 'ms'} color={C.green1} bg={C.greenGlow} trend={[45, 48, 52, 41, 46, 48, 41]} icon={String.fromCodePoint(0x1F493)} />
          <MetricCard label="Resting HR" value={String(readiness.resting_hr || 62)} color={C.coral} bg={C.coralGlow} trend={[56, 58, 56, 62, 59, 58, 62]} icon={String.fromCodePoint(0x2764, 0xFE0F)} />
          <MetricCard label="Temp" value={'+' + (readiness.temp_deviation || 0.6) + '\u00B0'} color={C.gold} bg={C.goldGlow} trend={[0.1, 0.3, 0.1, 0.6, 0.2, 0.3, 0.6]} icon={String.fromCodePoint(0x1F321, 0xFE0F)} />
          <MetricCard label="Steps" value={((activity.steps || 3800) / 1000).toFixed(1) + 'k'} color={C.green2} bg={C.greenGlow} trend={[6200, 9400, 3800, 7100, 5500, 8200, 3800]} icon={String.fromCodePoint(0x1F45F)} />
          <MetricCard label="Calories" value={String(activity.active_calories || 180)} color={C.coral} bg={C.coralGlow} trend={[320, 480, 180, 350, 290, 410, 180]} icon={String.fromCodePoint(0x1F525)} />
        </View>

        <Text style={styles.sectionTitle}>Today's Focus</Text>
        <View style={styles.focusCard}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.greenGlow, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(168,220,200,0.1)' }}>
              <Text style={{ fontSize: 22 }}>{String.fromCodePoint(0x1F3AF)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text1, fontSize: 15, fontWeight: '700' }}>Recovery Day</Text>
              <Text style={{ color: C.text2, fontSize: 12, marginTop: 2 }}>Your readiness is {readyScore} and HRV dropped. Prioritize rest and nutrition today.</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.ctaButton} onPress={onGetRecs} activeOpacity={0.85}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>{String.fromCodePoint(0x2726)}</Text>
          <Text style={styles.btnPrimaryText}>Get My Recommendations</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function RecCard({ rec, color, index }) {
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState(null);

  return (
    <TouchableOpacity style={[styles.recCard, { borderLeftWidth: 3, borderLeftColor: color }]} onPress={function () { setExpanded(!expanded); }} activeOpacity={0.75}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: C.text1, fontSize: 15, fontWeight: '700' }}>{rec.title}</Text>
          {!expanded && <Text style={{ color: C.text3, fontSize: 12, marginTop: 4 }}>Tap for details + research {String.fromCodePoint(0x2192)}</Text>}
        </View>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color + '15', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: color, fontSize: 12, fontWeight: '700' }}>{index + 1}</Text>
        </View>
      </View>
      {expanded && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: C.text2, fontSize: 13, lineHeight: 21 }}>{rec.description}</Text>
          {rec.trigger_metric && (
            <View style={styles.triggerBadge}><Text style={{ color: C.text3, fontSize: 11 }}>{String.fromCodePoint(0x1F4CA)} {rec.trigger_metric}</Text></View>
          )}
          {rec.doi && (
            <View style={[styles.triggerBadge, { borderColor: 'rgba(126,168,244,0.1)' }]}><Text style={{ color: C.blue, fontSize: 11 }}>{String.fromCodePoint(0x1F4C4)} DOI: {rec.doi}</Text></View>
          )}
          {!action ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color + '20', borderWidth: 1, borderColor: color + '30' }]} onPress={function () { setAction('followed'); }}>
                <Text style={{ color: color, fontSize: 13, fontWeight: '700' }}>{String.fromCodePoint(0x2713)} I'll try this</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.border }]} onPress={function () { setAction('skipped'); }}>
                <Text style={{ color: C.text3, fontSize: 13 }}>Skip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.actionConfirm, { backgroundColor: action === 'followed' ? color + '10' : 'transparent' }]}>
              <Text style={{ color: action === 'followed' ? color : C.text3, fontSize: 13, fontWeight: '600' }}>
                {action === 'followed' ? String.fromCodePoint(0x2713) + ' Added to your plan!' : String.fromCodePoint(0x2014) + ' Skipped'}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function RecsScreen({ recs, loading }) {
  if (loading) {
    return (
      <View style={styles.screenCenter}>
        <View style={styles.loadingPulse}><ActivityIndicator size="large" color={C.green2} /></View>
        <Text style={{ color: C.text1, marginTop: 24, fontSize: 17, fontWeight: '700' }}>Analyzing your biometrics</Text>
        <Text style={{ color: C.text3, marginTop: 8, fontSize: 13, textAlign: 'center' }}>Cross-referencing your data with{'\n'}200+ peer-reviewed studies...</Text>
        <View style={[styles.progressBar, { marginTop: 24, width: 200 }]}>
          <View style={[styles.progressFill, { width: '60%' }]} />
        </View>
      </View>
    );
  }

  if (!recs) {
    return (
      <View style={styles.screenCenter}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.greenGlow, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(168,220,200,0.15)' }}>
          <Text style={{ fontSize: 36 }}>{String.fromCodePoint(0x2726)}</Text>
        </View>
        <Text style={styles.screenTitle}>Your Plan</Text>
        <Text style={styles.screenSub}>Upload Oura data and tap "Get My Recommendations" to begin.</Text>
      </View>
    );
  }

  var sections = [
    { key: 'nutrition', title: 'Nutrition', icon: String.fromCodePoint(0x1F957), color: C.green1, bg: C.greenGlow },
    { key: 'workout', title: 'Movement', icon: String.fromCodePoint(0x1F4AA), color: C.gold, bg: C.goldGlow },
    { key: 'recovery', title: 'Recovery', icon: String.fromCodePoint(0x1F9D8), color: C.blue, bg: C.blueGlow },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {recs.overall_insight && (
        <View style={styles.insightCard}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 18 }}>{String.fromCodePoint(0x1F9E0)}</Text>
            <Text style={{ color: C.green1, fontSize: 15, fontWeight: '700' }}>AI Insight</Text>
          </View>
          <Text style={{ color: C.text2, fontSize: 14, lineHeight: 22 }}>{recs.overall_insight}</Text>
        </View>
      )}
      {sections.map(function (section) {
        return (
          <View key={section.key} style={{ marginTop: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: section.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: section.color + '20' }}>
                <Text style={{ fontSize: 16 }}>{section.icon}</Text>
              </View>
              <Text style={{ color: section.color, fontSize: 17, fontWeight: '800' }}>{section.title}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: section.color + '15', marginLeft: 8 }} />
            </View>
            {(recs[section.key] || []).map(function (rec, i) {
              return <RecCard key={i} rec={rec} color={section.color} index={i} />;
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

export default function App() {
  const [tab, setTab] = useState('upload');
  const [userId, setUserId] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);

  var handleUploadComplete = function (id) { setUserId(id); setTab('dashboard'); };

  var handleGetRecs = async function () {
    setTab('recs');
    setLoading(true);
    try {
      var res = await fetch(API_URL + '/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId || 'test-user-1' }),
      });
      var data = await res.json();
      setMetrics(data.metrics_summary || null);
      setRecs(data.recommendations || null);
    } catch (err) { console.error('Error:', err); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}><Text style={{ color: C.bg, fontSize: 13, fontWeight: '900' }}>{String.fromCodePoint(0x266A)}</Text></View>
          <Text style={styles.logoText}>Attune</Text>
        </View>
        <View style={styles.headerPill}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green2 }} />
          <Text style={{ color: C.text3, fontSize: 11 }}>Live</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'upload' && <UploadScreen onUploadComplete={handleUploadComplete} />}
        {tab === 'dashboard' && <DashboardScreen metrics={metrics} onGetRecs={handleGetRecs} />}
        {tab === 'recs' && <RecsScreen recs={recs} loading={loading} />}
      </View>
      <TabBar active={tab} onPress={setTab} />
    </View>
  );
}

var styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, maxWidth: 480, alignSelf: 'center', width: '100%', height: '100vh', overflow: 'hidden' },
  header: { paddingTop: Platform.OS === 'web' ? 16 : 56, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.green2, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 20, fontWeight: '800', color: C.text1, letterSpacing: -0.5 },
  headerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(77,184,150,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface, paddingBottom: Platform.OS === 'web' ? 10 : 28, paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'transparent', marginBottom: 2 },
  tabIcon: { fontSize: 18, color: C.text3 },
  tabLabel: { fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  screen: { flex: 1 },
  screenCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  screenTitle: { fontSize: 24, fontWeight: '800', color: C.text1, letterSpacing: -0.5 },
  screenSub: { fontSize: 14, color: C.text2, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text3, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 28, marginBottom: 14 },
  dashHero: { padding: 20, paddingTop: 24 },
  overallCard: { backgroundColor: C.card, borderRadius: 16, padding: 20, marginTop: 20, borderWidth: 1, borderColor: C.border },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, width: '31%', flexGrow: 1 },
  focusCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.borderActive },
  ctaButton: { backgroundColor: C.green2, borderRadius: 16, padding: 16, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  uploadIconRing: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.greenGlow, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(168,220,200,0.15)' },
  uploadBox: { width: '100%', maxWidth: 380, marginTop: 32 },
  dropZone: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(168,220,200,0.15)', borderRadius: 20, padding: 36, alignItems: 'center', backgroundColor: 'rgba(168,220,200,0.02)' },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, color: C.text1, fontSize: 14, marginTop: 14 },
  formatBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  btnPrimary: { backgroundColor: C.green2, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  btnPrimaryText: { color: C.bg, fontSize: 15, fontWeight: '700' },
  progressWrap: { alignItems: 'center', padding: 40 },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, width: '80%', marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.green2, borderRadius: 2 },
  successCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.greenGlow, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.green2 },
  loadingPulse: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.greenGlow, justifyContent: 'center', alignItems: 'center' },
  insightCard: { backgroundColor: C.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(168,220,200,0.12)' },
  recCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 10 },
  triggerBadge: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: C.border },
  actionBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18 },
  actionConfirm: { borderRadius: 10, padding: 10, marginTop: 12 },
});
