import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./index.css";
import "./App.css";

// ==============================================================================
// CONFIG & CONSTANTS
// ==============================================================================

const API_URL = "http://127.0.0.1:8000";

const STAGES = [
  "Issue",
  "Context Retrieval",
  "Hypothesis",
  "Plan",
  "Edit",
  "Test",
  "Failure Analysis",
  "Recovery / Replanning",
  "Verification",
];

const PROVIDER_DEFAULTS = {
  gemini: "gemini-3-flash-preview",
  deepseek: "deepseek-chat",
  qwen: "qwen-plus",
};

// ==============================================================================
// ICONS (DECLARED OUTSIDE COMPONENT RENDER FOR PERFORMANCE & ZERO LINT WARNINGS)
// ==============================================================================

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#8B5CF6" />
      <path d="M2 17l10 5 10-5" stroke="#22D3EE" />
      <path d="M2 12l10 5 10-5" stroke="#A78BFA" />
      <circle cx="12" cy="12" r="1.5" fill="#38BDF8" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function RunsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 1 0 0 8.49m-8.48-.01a6 6 0 0 0 0-8.49" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

// ==============================================================================
// MAIN APP COMPONENT
// ==============================================================================

export default function App() {
  // Navigation & View
  const [currentView, setCurrentView] = useState("dashboard");

  // New Run Form State
  const [issueTask, setIssueTask] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [issueError, setIssueError] = useState("");
  const [repoError, setRepoError] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // AI Provider Settings State (persisted in sessionStorage)
  const [aiProvider, setAiProvider] = useState(
    () => sessionStorage.getItem("traceforge_provider") || "gemini"
  );
  const [aiApiKey, setAiApiKey] = useState(
    () => sessionStorage.getItem("traceforge_api_key") || ""
  );
  const [aiModel, setAiModel] = useState(
    () => sessionStorage.getItem("traceforge_model") || PROVIDER_DEFAULTS.gemini
  );
  const [aiTestStatus, setAiTestStatus] = useState("");
  const [isTestingAI, setIsTestingAI] = useState(false);

  // Runs & Execution State
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [isCreatingRun, setIsCreatingRun] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [backendConnected, setBackendConnected] = useState(true);
  const [copiedNotification, setCopiedNotification] = useState("");

  // ============================================================================
  // FORMAT RUN RESPONSE (NORMALIZER)
  // ============================================================================
  const formatRun = useCallback((run) => {
    if (!run) return null;

    const rawId = run.id ?? run.run_id ?? run.runNumber ?? run.run_number ?? "";
    const numericId = String(rawId).replace(/\D/g, "");
    const displayId = numericId ? numericId.padStart(3, "0") : String(rawId);

    return {
      id: run.id ?? run.run_id ?? displayId,
      runNumber: run.runNumber || run.run_number || (displayId ? `Run #${displayId}` : "Run"),
      task: run.issue || run.task || "Untitled task",
      repoPath: run.repo_path || run.repoPath || "",
      provider: run.provider || "gemini",
      model: run.model || "",
      status: run.status || "Running",
      attempts: run.attempts ?? 1,
      tests: run.tests || "Not started",
      filesChanged: run.files_changed ?? run.filesChanged ?? (Array.isArray(run.changed_files) ? run.changed_files.length : 0),
      changedFiles: Array.isArray(run.changed_files) ? run.changed_files : (Array.isArray(run.changedFiles) ? run.changedFiles : []),
      fileChangeDetails: Array.isArray(run.file_change_details) ? run.file_change_details : (Array.isArray(run.fileChangeDetails) ? run.fileChangeDetails : []),
      createdAt: run.created_at || run.createdAt || null,
      completedAt: run.completed_at || run.completedAt || null,
      executionTrace: Array.isArray(run.execution_trace) ? run.execution_trace : (Array.isArray(run.executionTrace) ? run.executionTrace : []),
      hypothesis: run.hypothesis || run.ai_analysis?.hypothesis || "",
      plan: run.plan || run.ai_analysis?.plan || "",
      testResult: run.test_result || null,
    };
  }, []);

  // ============================================================================
  // API: LOAD ALL RUNS
  // ============================================================================
  const loadRuns = useCallback(async () => {
    try {
      setBackendError("");
      const response = await fetch(`${API_URL}/runs`);
      if (!response.ok) {
        throw new Error(`Failed to load runs (${response.status})`);
      }
      const data = await response.json();
      const rawRuns = Array.isArray(data) ? data : (Array.isArray(data.runs) ? data.runs : []);
      const formatted = rawRuns.map(formatRun).filter(Boolean).reverse();
      setRuns(formatted);
      setBackendConnected(true);
    } catch (err) {
      console.warn("Backend unavailable:", err.message);
      setBackendConnected(false);
    }
  }, [formatRun]);

  // ============================================================================
  // API: LOAD SINGLE RUN
  // ============================================================================
  const loadSingleRun = useCallback(async (runId) => {
    if (runId === undefined || runId === null) return null;
    try {
      const response = await fetch(`${API_URL}/runs/${runId}`);
      if (!response.ok) {
        throw new Error(`Failed to load run ${runId}`);
      }
      const data = await response.json();
      const formatted = formatRun(data.run || data);
      if (!formatted) return null;

      setSelectedRun(formatted);
      setRuns((prev) => {
        const exists = prev.some((r) => String(r.id) === String(formatted.id));
        if (!exists) return [formatted, ...prev];
        return prev.map((r) => (String(r.id) === String(formatted.id) ? formatted : r));
      });
      setBackendConnected(true);
      return formatted;
    } catch (err) {
      console.warn(`GET /runs/${runId} failed:`, err.message);
      return null;
    }
  }, [formatRun]);

  // Initial Load
  useEffect(() => {
    let ignore = false;
    const fetchInitial = async () => {
      try {
        const response = await fetch(`${API_URL}/runs`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!ignore) {
          const rawRuns = Array.isArray(data) ? data : (Array.isArray(data.runs) ? data.runs : []);
          setRuns(rawRuns.map(formatRun).filter(Boolean).reverse());
          setBackendConnected(true);
        }
      } catch {
        if (!ignore) setBackendConnected(false);
      }
    };
    fetchInitial();
    return () => {
      ignore = true;
    };
  }, [formatRun]);

  // Poll Active Run
  useEffect(() => {
    if (!selectedRun?.id || selectedRun.status !== "Running") {
      return;
    }

    let isMounted = true;
    const interval = setInterval(async () => {
      if (!isMounted) return;
      const updated = await loadSingleRun(selectedRun.id);
      if (updated && (updated.status === "Success" || updated.status === "Failed")) {
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedRun?.id, selectedRun?.status, loadSingleRun]);

  // Periodically Ping Backend Status (every 10 seconds)
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/`);
        setBackendConnected(res.ok);
      } catch {
        setBackendConnected(false);
      }
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // ============================================================================
  // METRICS & COMPUTED STATS
  // ============================================================================
  const activeRun = useMemo(() => runs.find((r) => r.status === "Running"), [runs]);
  const successfulRuns = useMemo(() => runs.filter((r) => r.status === "Success").length, [runs]);
  const failedRuns = useMemo(() => runs.filter((r) => r.status === "Failed").length, [runs]);
  const totalFilesChanged = useMemo(
    () => runs.reduce((acc, r) => acc + (r.filesChanged || 0), 0),
    [runs]
  );

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================
  const goToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedRun(null);
  };

  const goToNewRun = () => {
    setCurrentView("new-run");
    setSelectedRun(null);
    setBackendError("");
    setIssueError("");
    setRepoError("");
    setApiKeyError("");
  };

  const goToRuns = () => {
    setCurrentView("runs");
    setSelectedRun(null);
    loadRuns();
  };

  const goToSettings = () => {
    setCurrentView("settings");
    setSelectedRun(null);
    setAiTestStatus("");
    setBackendError("");
  };

  const openRunDetails = async (run) => {
    setSelectedRun(run);
    setCurrentView("runs");
    if (run?.id) {
      await loadSingleRun(run.id);
    }
  };

  // ============================================================================
  // FORM: AI PROVIDER CHANGE
  // ============================================================================
  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    setAiProvider(newProvider);
    setAiTestStatus("");
    sessionStorage.setItem("traceforge_provider", newProvider);

    const currentModel = aiModel.trim();
    const defaults = Object.values(PROVIDER_DEFAULTS);
    if (!currentModel || defaults.includes(currentModel)) {
      const defaultModel = PROVIDER_DEFAULTS[newProvider] || "";
      setAiModel(defaultModel);
      sessionStorage.setItem("traceforge_model", defaultModel);
    }
  };

  // ============================================================================
  // FORM: SAVE SETTINGS
  // ============================================================================
  const handleSaveSettings = () => {
    sessionStorage.setItem("traceforge_provider", aiProvider);
    sessionStorage.setItem("traceforge_api_key", aiApiKey.trim());
    sessionStorage.setItem("traceforge_model", aiModel.trim());
    setAiTestStatus("✓ Settings saved to browser session.");
  };

  // ============================================================================
  // FORM: TEST AI CONNECTION
  // ============================================================================
  const handleTestAIConnection = async () => {
    setAiTestStatus("");
    setBackendError("");

    if (!aiApiKey.trim()) {
      setAiTestStatus("✕ Please enter an API key first.");
      return;
    }

    setIsTestingAI(true);
    try {
      const response = await fetch(`${API_URL}/ai/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          api_key: aiApiKey.trim(),
          model: aiModel.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "AI connection failed.");
      }

      sessionStorage.setItem("traceforge_provider", aiProvider);
      sessionStorage.setItem("traceforge_api_key", aiApiKey.trim());
      sessionStorage.setItem("traceforge_model", aiModel.trim());
      setAiTestStatus(`✓ ${aiProvider.toUpperCase()} connection successful.`);
    } catch (err) {
      setAiTestStatus(`✕ ${err.message}`);
    } finally {
      setIsTestingAI(false);
    }
  };

  // ============================================================================
  // FORM: START AUTONOMOUS RUN
  // ============================================================================
  const handleStartRun = async (e) => {
    e.preventDefault();

    let hasError = false;
    if (!issueTask.trim()) {
      setIssueError("Please enter an issue or task.");
      hasError = true;
    }
    if (!repoPath.trim()) {
      setRepoError("Please enter the repository path.");
      hasError = true;
    }
    if (!aiApiKey.trim()) {
      setApiKeyError("Please enter an API key for autonomous execution.");
      hasError = true;
    }

    if (hasError) return;

    setIssueError("");
    setRepoError("");
    setApiKeyError("");
    setBackendError("");
    setIsCreatingRun(true);

    try {
      // Sync credentials to session
      sessionStorage.setItem("traceforge_provider", aiProvider);
      sessionStorage.setItem("traceforge_api_key", aiApiKey.trim());
      sessionStorage.setItem("traceforge_model", aiModel.trim());

      const response = await fetch(`${API_URL}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue: issueTask.trim(),
          repo_path: repoPath.trim(),
          provider: aiProvider,
          api_key: aiApiKey.trim(),
          model: aiModel.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `Failed to create run (${response.status})`);
      }

      const data = await response.json();
      const newRun = formatRun(data.run || data);

      if (!newRun) {
        throw new Error("Invalid run returned by backend.");
      }

      // Add to list and set as selected
      setRuns((prev) => [newRun, ...prev.filter((r) => String(r.id) !== String(newRun.id))]);
      setSelectedRun(newRun);
      setIssueTask("");
      setRepoPath("");

      // Switch to Runs Details view immediately to watch live trace
      setCurrentView("runs");

      if (newRun.id) {
        setTimeout(() => loadSingleRun(newRun.id), 250);
      }
    } catch (err) {
      console.error("Run creation failed:", err);
      setBackendError(err.message || "Failed to start autonomous run. Ensure the backend is reachable.");
    } finally {
      setIsCreatingRun(false);
    }
  };

  // Helper: Copy string to clipboard
  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedNotification(label || "Copied to clipboard");
    setTimeout(() => setCopiedNotification(""), 2000);
  };

  // Helper: Format relative or simple time
  const formatTimeStr = (isoString) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return isoString;
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  // ============================================================================
  // RENDER: DASHBOARD VIEW
  // ============================================================================
  const renderDashboard = () => (
    <div className="page-container">
      {/* Hero Banner */}
      <section className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-tag">AUTONOMOUS CODING HARNESS</div>
          <h1 className="hero-title">Autonomous coding, without the busywork.</h1>
          <p className="hero-subtitle">
            TraceForge analyzes an issue, plans a fix, edits the repository, runs tests and reports exactly what changed.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn-primary" onClick={goToNewRun}>
              <PlusIcon />
              <span>+ New Run</span>
            </button>
            <button type="button" className="btn-secondary" onClick={goToRuns}>
              <span>View Runs</span>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Runs</span>
            <span className="metric-icon"><RunsIcon /></span>
          </div>
          <div className="metric-value">{runs.length}</div>
          <div className="metric-note">Recorded executions</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Successful</span>
            <span className="metric-icon" style={{ color: "var(--status-success)" }}><CheckIcon /></span>
          </div>
          <div className="metric-value" style={{ color: "var(--status-success)" }}>{successfulRuns}</div>
          <div className="metric-note">
            {runs.length > 0 ? `${Math.round((successfulRuns / runs.length) * 100)}% pass rate` : "No runs yet"}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Failed</span>
            <span className="metric-icon" style={{ color: failedRuns > 0 ? "var(--status-error)" : "inherit" }}>
              <CloseIcon />
            </span>
          </div>
          <div className="metric-value" style={{ color: failedRuns > 0 ? "var(--status-error)" : "inherit" }}>
            {failedRuns}
          </div>
          <div className="metric-note">{failedRuns > 0 ? "Requires review" : "Zero errors"}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Files Changed</span>
            <span className="metric-icon"><FileTextIcon /></span>
          </div>
          <div className="metric-value">{totalFilesChanged}</div>
          <div className="metric-note">Patches generated & verified</div>
        </div>
      </section>

      {/* How It Works Pipeline */}
      <section className="section-block">
        <div className="section-header">
          <div>
            <h2 className="section-title">How TraceForge Works</h2>
            <p className="section-subtitle">Seven-stage autonomous verification pipeline.</p>
          </div>
        </div>

        <div className="pipeline-flow-container">
          {[
            { step: "01", name: "Issue" },
            { step: "02", name: "Context" },
            { step: "03", name: "Hypothesis" },
            { step: "04", name: "Plan" },
            { step: "05", name: "Edit" },
            { step: "06", name: "Test" },
            { step: "07", name: "Verified" },
          ].map((node, index, arr) => (
            <React.Fragment key={node.step}>
              <div className="flow-node">
                <div className="flow-step-badge">{node.step}</div>
                <span className="flow-step-name">{node.name}</span>
              </div>
              {index < arr.length - 1 && <div className="flow-connector-line" />}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Recent Runs Table */}
      <section className="section-block">
        <div className="section-header">
          <div>
            <h2 className="section-title">Recent Runs</h2>
            <p className="section-subtitle">Latest autonomous execution outcomes.</p>
          </div>
          {runs.length > 0 && (
            <button type="button" className="btn-ghost" onClick={goToRuns}>
              View All ({runs.length})
              <ArrowRightIcon />
            </button>
          )}
        </div>

        <div className="data-table-card">
          {runs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><RunsIcon /></div>
              <h3 className="empty-state-title">No autonomous runs yet.</h3>
              <p className="empty-state-desc">Launch your first autonomous coding run to see execution traces here.</p>
              <button type="button" className="btn-primary" onClick={goToNewRun}>
                <PlusIcon />
                <span>Start First Run</span>
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>Run ID</th>
                  <th>Issue / Task</th>
                  <th style={{ width: "120px" }}>Provider</th>
                  <th style={{ width: "110px" }}>Status</th>
                  <th style={{ width: "110px" }}>Files Changed</th>
                  <th style={{ width: "100px" }}>Time</th>
                  <th style={{ width: "80px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 5).map((run) => (
                  <tr key={run.id} onClick={() => openRunDetails(run)}>
                    <td className="table-run-id">{run.runNumber}</td>
                    <td>
                      <div className="table-task-cell" title={run.task}>
                        {run.task}
                      </div>
                    </td>
                    <td>
                      <span className="provider-pill">{run.provider}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${run.status.toLowerCase()}`}>
                        {run.status === "Success" && "✓ "}
                        {run.status === "Failed" && "✕ "}
                        {run.status === "Running" && "● "}
                        {run.status}
                      </span>
                    </td>
                    <td>{run.filesChanged} {run.filesChanged === 1 ? "file" : "files"}</td>
                    <td>{formatTimeStr(run.createdAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="table-link-action">
                        Inspect <ArrowRightIcon />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );

  // ============================================================================
  // RENDER: NEW RUN VIEW
  // ============================================================================
  const renderNewRun = () => (
    <div className="page-container">
      <div className="new-run-grid">
        {/* Main Form Panel */}
        <div className="form-panel">
          <div className="panel-header-block">
            <span className="panel-eyebrow">AUTONOMOUS RUN LAUNCHER</span>
            <h2 className="panel-title">Start a new autonomous run</h2>
            <p className="panel-desc">
              Describe the coding problem, specify the local repository path, and TraceForge will autonomously plan, patch, and verify the fix.
            </p>
          </div>

          <form onSubmit={handleStartRun} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Issue / Task */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="issue-task">Issue / Task</label>
                <span className="form-char-count">{issueTask.length} chars</span>
              </div>
              <span className="form-hint">Describe the bug, feature request, or validation requirement.</span>
              <textarea
                id="issue-task"
                className={`form-textarea ${issueError ? "has-error" : ""}`}
                placeholder="Example: Fix the validation bug where empty repository paths trigger an unhandled 500 error instead of a clean 422 ValidationError..."
                value={issueTask}
                onChange={(e) => {
                  setIssueTask(e.target.value);
                  if (e.target.value.trim()) setIssueError("");
                }}
              />
              {issueError && <span className="field-error-text">{issueError}</span>}
            </div>

            {/* Repository Path */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="repo-path">Repository Path</label>
              </div>
              <span className="form-hint">Absolute local filesystem path where TraceForge should inspect code and run tests.</span>
              <input
                id="repo-path"
                type="text"
                className={`form-input ${repoError ? "has-error" : ""}`}
                placeholder="/path/to/repository (e.g. /Users/developer/projects/traceforge)"
                value={repoPath}
                onChange={(e) => {
                  setRepoPath(e.target.value);
                  if (e.target.value.trim()) setRepoError("");
                }}
              />
              {repoError && <span className="field-error-text">{repoError}</span>}
            </div>

            {/* Provider & Model (Side by side) */}
            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label" htmlFor="run-provider">AI Provider</label>
                <select
                  id="run-provider"
                  className="form-select"
                  value={aiProvider}
                  onChange={handleProviderChange}
                >
                  <option value="gemini">Gemini (Google)</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="qwen">Qwen (Alibaba)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="run-model">Model</label>
                <input
                  id="run-model"
                  type="text"
                  className="form-input"
                  placeholder={PROVIDER_DEFAULTS[aiProvider] || "Default"}
                  value={aiModel}
                  onChange={(e) => {
                    setAiModel(e.target.value);
                    sessionStorage.setItem("traceforge_model", e.target.value.trim());
                  }}
                />
              </div>
            </div>

            {/* API Key */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="run-api-key">API Key</label>
                <span className="form-char-count">{aiApiKey ? "Key active in session" : "Required"}</span>
              </div>
              <span className="form-hint">Stored securely only in browser sessionStorage for this session.</span>
              <div className="password-input-wrap">
                <input
                  id="run-api-key"
                  type={showApiKey ? "text" : "password"}
                  className={`form-input ${apiKeyError ? "has-error" : ""}`}
                  placeholder={`Enter your ${aiProvider.toUpperCase()} API key...`}
                  value={aiApiKey}
                  onChange={(e) => {
                    setAiApiKey(e.target.value);
                    sessionStorage.setItem("traceforge_api_key", e.target.value.trim());
                    if (e.target.value.trim()) setApiKeyError("");
                  }}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="btn-toggle-vis"
                  onClick={() => setShowApiKey(!showApiKey)}
                  title={showApiKey ? "Hide API Key" : "Show API Key"}
                >
                  {showApiKey ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {apiKeyError && <span className="field-error-text">{apiKeyError}</span>}
            </div>

            {/* Backend / Global Error Banner */}
            {backendError && (
              <div className="form-alert-error">
                <CloseIcon />
                <span>{backendError}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: "4px", padding: "12px 24px", fontSize: "14px" }}
              disabled={isCreatingRun}
            >
              {isCreatingRun ? (
                <>
                  <span className="spinner" />
                  <span>Launching Autonomous Agent...</span>
                </>
              ) : (
                <>
                  <RocketIcon />
                  <span>Start Autonomous Run</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Info Stack */}
        <div className="right-info-stack">
          {/* Run Pipeline Preview */}
          <div className="preview-panel">
            <span className="panel-eyebrow">PIPELINE EXECUTION PHASES</span>
            <h3 className="section-title">Run Pipeline</h3>
            <div className="preview-stage-list">
              {[
                { num: "01", name: "Issue", desc: "Extract problem constraints & symptoms" },
                { num: "02", name: "Context", desc: "Retrieve repository tree & relevant source files" },
                { num: "03", name: "Hypothesis", desc: "Formulate root-cause reasoning via LLM" },
                { num: "04", name: "Plan", desc: "Synthesize minimal surgical patch strategy" },
                { num: "05", name: "Edit", desc: "Apply targeted diff to affected files" },
                { num: "06", name: "Test", desc: "Run detected test suite (Makefile/pytest/npm)" },
                { num: "07", name: "Verify", desc: "Validate complete fix or trigger recovery loop" },
              ].map((stage) => (
                <div className="preview-stage-item" key={stage.num}>
                  <div className="preview-step-num">{stage.num}</div>
                  <div className="preview-stage-text">
                    <span className="preview-stage-name">{stage.name}</span>
                    <span className="preview-stage-hint">{stage.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Notice */}
          <div className="security-box">
            <div className="security-box-title">
              <ShieldCheckIcon />
              <span>Zero-Data Retention</span>
            </div>
            <p className="security-box-text">
              Your API key stays temporary in this browser session (sessionStorage). TraceForge never commits keys to git, logs, or persistent databases. All code modifications execute strictly on your local machine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: RUNS VIEW (LIST & SUMMARY)
  // ============================================================================
  const renderRunsList = () => (
    <div className="page-container">
      <div className="section-header">
        <div>
          <span className="panel-eyebrow">EXECUTION ARCHIVE</span>
          <h1 className="hero-title" style={{ fontSize: "24px" }}>Runs</h1>
          <p className="section-subtitle">Monitor autonomous coding executions and verification outcomes.</p>
        </div>
        <button type="button" className="btn-primary" onClick={goToNewRun}>
          <PlusIcon />
          <span>New Run</span>
        </button>
      </div>

      {/* Summary Metrics Bar */}
      <div className="metrics-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="metric-card">
          <span className="metric-label">Total Executions</span>
          <span className="metric-value">{runs.length}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Successful Outcomes</span>
          <span className="metric-value" style={{ color: "var(--status-success)" }}>{successfulRuns}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Failed / Need Review</span>
          <span className="metric-value" style={{ color: failedRuns > 0 ? "var(--status-error)" : "inherit" }}>
            {failedRuns}
          </span>
        </div>
      </div>

      {/* Runs Table */}
      <div className="data-table-card">
        {runs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><RunsIcon /></div>
            <h3 className="empty-state-title">No autonomous runs recorded yet.</h3>
            <p className="empty-state-desc">Start a run to track real-time issue diagnosis, code patching, and test runs.</p>
            <button type="button" className="btn-primary" onClick={goToNewRun}>
              <PlusIcon />
              <span>Start New Run</span>
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "80px" }}>ID</th>
                <th>Issue / Task</th>
                <th style={{ width: "100px" }}>Provider</th>
                <th style={{ width: "110px" }}>Status</th>
                <th style={{ width: "90px" }}>Attempts</th>
                <th style={{ width: "110px" }}>Tests</th>
                <th style={{ width: "80px" }}>Files</th>
                <th style={{ width: "100px" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} onClick={() => openRunDetails(run)}>
                  <td className="table-run-id">{run.runNumber}</td>
                  <td>
                    <div className="table-task-cell" title={run.task}>
                      {run.task}
                    </div>
                  </td>
                  <td>
                    <span className="provider-pill">{run.provider}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${run.status.toLowerCase()}`}>
                      {run.status === "Success" && "✓ "}
                      {run.status === "Failed" && "✕ "}
                      {run.status === "Running" && "● "}
                      {run.status}
                    </span>
                  </td>
                  <td>{run.attempts}</td>
                  <td>
                    <span style={{
                      fontWeight: 600,
                      color: run.tests === "Passed" ? "var(--status-success)" : (run.tests === "Failed" ? "var(--status-error)" : "var(--text-muted)")
                    }}>
                      {run.tests}
                    </span>
                  </td>
                  <td>{run.filesChanged}</td>
                  <td>{formatTimeStr(run.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: RUN DETAILS VIEW (IDE / CI CONSOLE)
  // ============================================================================
  const renderRunDetails = () => {
    if (!selectedRun) return null;

    return (
      <div className="page-container run-details-page">
        {/* Back Button */}
        <button
          type="button"
          className="btn-back"
          onClick={() => {
            setSelectedRun(null);
            loadRuns();
          }}
        >
          <ArrowLeftIcon />
          <span>Back to Runs</span>
        </button>

        {/* Console Header Card */}
        <section className="console-header-card">
          <div className="console-title-row">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="run-id-badge">{selectedRun.runNumber}</span>
                <span className={`status-badge ${selectedRun.status.toLowerCase()}`}>
                  {selectedRun.status === "Success" && "✓ "}
                  {selectedRun.status === "Failed" && "✕ "}
                  {selectedRun.status === "Running" && "● "}
                  {selectedRun.status}
                </span>
                {copiedNotification && (
                  <span style={{ fontSize: "11px", color: "var(--accent-cyan)", fontWeight: 500 }}>
                    {copiedNotification}
                  </span>
                )}
              </div>
              <h1 className="run-headline">{selectedRun.task}</h1>
              {selectedRun.repoPath && (
                <div
                  className="run-repo-bar"
                  onClick={() => handleCopy(selectedRun.repoPath, "Repository path copied")}
                  title="Click to copy repository path"
                  style={{ cursor: "pointer" }}
                >
                  <span style={{ color: "var(--text-muted)" }}>REPO:</span>
                  <span>{selectedRun.repoPath}</span>
                  <CopyIcon />
                </div>
              )}
            </div>

            {selectedRun.status === "Running" && (
              <div className="status-badge running" style={{ padding: "6px 12px", fontSize: "12px" }}>
                <span className="pulse-dot" />
                <span>Executing Pipeline...</span>
              </div>
            )}
          </div>

          {/* Metadata Chips Strip */}
          <div className="meta-chips-strip">
            <div className="meta-chip">
              <span className="meta-chip-label">Provider:</span>
              <span className="meta-chip-val" style={{ textTransform: "capitalize" }}>{selectedRun.provider}</span>
            </div>
            {selectedRun.model && (
              <div className="meta-chip">
                <span className="meta-chip-label">Model:</span>
                <span className="meta-chip-val">{selectedRun.model}</span>
              </div>
            )}
            <div className="meta-chip">
              <span className="meta-chip-label">Attempts:</span>
              <span className="meta-chip-val">{selectedRun.attempts}</span>
            </div>
            <div className="meta-chip">
              <span className="meta-chip-label">Tests:</span>
              <span className="meta-chip-val" style={{
                color: selectedRun.tests === "Passed" ? "var(--status-success)" : (selectedRun.tests === "Failed" ? "var(--status-error)" : "inherit")
              }}>
                {selectedRun.tests}
              </span>
            </div>
            <div className="meta-chip">
              <span className="meta-chip-label">Files Modified:</span>
              <span className="meta-chip-val">{selectedRun.filesChanged}</span>
            </div>
            <div className="meta-chip">
              <span className="meta-chip-label">Created:</span>
              <span className="meta-chip-val">{formatTimeStr(selectedRun.createdAt)}</span>
            </div>
          </div>
        </section>

        {/* Execution Pipeline Timeline */}
        <section className="timeline-card">
          <div className="section-header">
            <div>
              <span className="panel-eyebrow">STEP-BY-STEP TRACE</span>
              <h2 className="section-title">Execution Pipeline</h2>
            </div>
          </div>

          <div className="timeline-list">
            {(selectedRun.executionTrace && selectedRun.executionTrace.length > 0
              ? selectedRun.executionTrace
              : STAGES.map((s) => ({ stage: s, status: "Pending", description: "" }))
            ).map((item, index, arr) => {
              const isCompleted = item.status === "Completed" || item.status === "Passed";
              const isFailed = item.status === "Failed";
              const isRunning = item.status === "Running";
              const nodeClass = isCompleted ? "success" : (isFailed ? "failed" : (isRunning ? "running" : ""));

              return (
                <div className="timeline-row" key={`${item.stage}-${index}`}>
                  <div className="timeline-indicator-col">
                    <div className={`timeline-node ${nodeClass}`}>
                      {isCompleted ? <CheckIcon /> : (isFailed ? <CloseIcon /> : String(index + 1).padStart(2, "0"))}
                    </div>
                    {index < arr.length - 1 && <div className="timeline-track-line" />}
                  </div>

                  <div className="timeline-content-body">
                    <div className="timeline-stage-header">
                      <span className="timeline-stage-name">{item.stage}</span>
                      <span className={`status-badge ${isCompleted ? "success" : (isFailed ? "failed" : (isRunning ? "running" : "pending"))}`}>
                        {item.stage === "Test" && isCompleted ? "✓ Passed" : (item.stage === "Test" && isFailed ? "✕ Failed" : item.status)}
                      </span>
                    </div>

                    {item.description && (
                      <div className="timeline-desc">{item.description}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Files Changed */}
        <section className="files-panel">
          <div className="section-header">
            <div>
              <span className="panel-eyebrow">REPOSITORY DIFF</span>
              <h2 className="section-title">Files Changed ({selectedRun.filesChanged})</h2>
            </div>
          </div>

          {selectedRun.fileChangeDetails && selectedRun.fileChangeDetails.length > 0 ? (
            <div className="files-list">
              {selectedRun.fileChangeDetails.map((file, idx) => (
                <div className="file-item-card" key={idx}>
                  <div className="file-path-row">
                    <FileTextIcon />
                    <code className="file-path-text">{file.path}</code>
                  </div>
                  {file.description && (
                    <div className="file-desc-text">{file.description}</div>
                  )}
                </div>
              ))}
            </div>
          ) : selectedRun.changedFiles && selectedRun.changedFiles.length > 0 ? (
            <div className="files-list">
              {selectedRun.changedFiles.map((file, idx) => (
                <div className="file-item-card" key={idx}>
                  <div className="file-path-row">
                    <FileTextIcon />
                    <code className="file-path-text">{typeof file === "string" ? file : file.path}</code>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>
              {selectedRun.status === "Running" ? "Evaluating modifications..." : "No files were modified during this run."}
            </div>
          )}
        </section>

        {/* Test Results Section */}
        <section className="test-summary-card">
          <div className="section-header">
            <div>
              <span className="panel-eyebrow">VERIFICATION RESULT</span>
              <h2 className="section-title">Test Results</h2>
            </div>
            {selectedRun.testResult?.command && (
              <span className="timeline-command-pill">Command: {selectedRun.testResult.command}</span>
            )}
          </div>

          <div className="test-metric-row">
            <div className="test-chip">
              <span style={{ color: "var(--text-muted)" }}>Outcome:</span>
              <strong style={{
                color: selectedRun.tests === "Passed" ? "var(--status-success)" : (selectedRun.tests === "Failed" ? "var(--status-error)" : "inherit")
              }}>
                {selectedRun.tests}
              </strong>
            </div>

            {selectedRun.testResult?.command && (
              <div className="test-chip">
                <span style={{ color: "var(--text-muted)" }}>Detected Runner:</span>
                <code>{selectedRun.testResult.command}</code>
              </div>
            )}
          </div>

          {selectedRun.testResult?.output && (
            <div style={{ marginTop: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                EXECUTION OUTPUT
              </div>
              <pre className="test-output-box">{selectedRun.testResult.output}</pre>
            </div>
          )}
        </section>

        {/* AI Reasoning / Plan */}
        {(selectedRun.hypothesis || selectedRun.plan) && (
          <section className="reasoning-grid">
            {selectedRun.hypothesis && (
              <div className="reasoning-card">
                <div className="reasoning-header">
                  <span style={{ color: "var(--accent-primary)" }}>H</span>
                  <span>Root Cause Hypothesis</span>
                </div>
                <div className="reasoning-body">{selectedRun.hypothesis}</div>
              </div>
            )}

            {selectedRun.plan && (
              <div className="reasoning-card">
                <div className="reasoning-header">
                  <span style={{ color: "var(--accent-cyan)" }}>P</span>
                  <span>Surgical Fix Plan</span>
                </div>
                <div className="reasoning-body">{selectedRun.plan}</div>
              </div>
            )}
          </section>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER: SETTINGS VIEW
  // ============================================================================
  const renderSettings = () => (
    <div className="page-container">
      <div className="section-header">
        <div>
          <span className="panel-eyebrow">SYSTEM CONFIGURATION</span>
          <h1 className="hero-title" style={{ fontSize: "24px" }}>AI Provider Settings</h1>
          <p className="section-subtitle">Configure the LLM engine TraceForge uses for autonomous reasoning, planning, and code patching.</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Settings Form Panel */}
        <div className="form-panel">
          {/* Provider Select */}
          <div className="form-group">
            <label className="form-label" htmlFor="settings-provider">AI Provider</label>
            <span className="form-hint">Choose between Google Gemini, DeepSeek, or Qwen.</span>
            <select
              id="settings-provider"
              className="form-select"
              value={aiProvider}
              onChange={handleProviderChange}
            >
              <option value="gemini">Gemini (Google DeepMind)</option>
              <option value="deepseek">DeepSeek AI</option>
              <option value="qwen">Qwen (Alibaba Cloud)</option>
            </select>
          </div>

          {/* API Key */}
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="settings-api-key">API Key</label>
              <span className="form-char-count">{aiApiKey ? "Active" : "Not Set"}</span>
            </div>
            <span className="form-hint">Stored strictly in browser sessionStorage. Never logged or exposed.</span>
            <div className="password-input-wrap">
              <input
                id="settings-api-key"
                type={showApiKey ? "text" : "password"}
                className="form-input"
                placeholder={`Enter your ${aiProvider.toUpperCase()} API key...`}
                value={aiApiKey}
                onChange={(e) => {
                  setAiApiKey(e.target.value);
                  setAiTestStatus("");
                }}
                autoComplete="off"
              />
              <button
                type="button"
                className="btn-toggle-vis"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? "Hide Key" : "Show Key"}
              >
                {showApiKey ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Model */}
          <div className="form-group">
            <label className="form-label" htmlFor="settings-model">Model Identifier</label>
            <span className="form-hint">Specify an explicit model ID or use the recommended default.</span>
            <input
              id="settings-model"
              type="text"
              className="form-input"
              placeholder={PROVIDER_DEFAULTS[aiProvider] || "Default"}
              value={aiModel}
              onChange={(e) => {
                setAiModel(e.target.value);
                setAiTestStatus("");
              }}
            />
          </div>

          {/* Inline Connection Alert */}
          {aiTestStatus && (
            <div className={`inline-alert ${aiTestStatus.startsWith("✓") ? "success" : "error"}`}>
              {aiTestStatus.startsWith("✓") ? <CheckIcon /> : <CloseIcon />}
              <span>{aiTestStatus}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="settings-actions">
            <button type="button" className="btn-secondary" onClick={handleSaveSettings}>
              Save Settings
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleTestAIConnection}
              disabled={isTestingAI}
            >
              {isTestingAI ? (
                <>
                  <span className="spinner" />
                  <span>Testing Connection...</span>
                </>
              ) : (
                <span>Test Connection</span>
              )}
            </button>
          </div>
        </div>

        {/* Security & Architecture Panel */}
        <div className="right-info-stack">
          <div className="preview-panel">
            <div className="security-box-title">
              <ShieldCheckIcon />
              <span>Your API key stays temporary</span>
            </div>
            <p className="security-box-text">
              TraceForge is designed from the ground up for strict confidentiality and data isolation:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
              {[
                "Stored only in browser sessionStorage",
                "Sent directly to AI provider for issue analysis & code generation",
                "Never persisted in backend database or run history",
                "Never displayed in execution traces or shared logs",
                "Automatically discarded when you close this browser tab",
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11.5px", color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--status-success)" }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // APP SHELL RENDER
  // ============================================================================
  return (
    <div className="app-shell">
      {/* Left Sidebar */}
      <aside className="sidebar">
        {/* Brand Header */}
        <div className="sidebar-header" onClick={goToDashboard} style={{ cursor: "pointer" }}>
          <div className="brand-mark">
            <LogoIcon />
          </div>
          <div className="brand-text-col">
            <span className="brand-name">
              TraceForge
              <span className="brand-version-pill">v1.0</span>
            </span>
            <span className="brand-subtitle">AUTONOMOUS CODING HARNESS</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          <span className="nav-section-label">PLATFORM</span>

          <button
            type="button"
            className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}
            onClick={goToDashboard}
          >
            <span className="nav-icon"><DashboardIcon /></span>
            <span className="nav-label">Dashboard</span>
          </button>

          <button
            type="button"
            className={`nav-item ${currentView === "new-run" ? "active" : ""}`}
            onClick={goToNewRun}
          >
            <span className="nav-icon"><PlusIcon /></span>
            <span className="nav-label">New Run</span>
          </button>

          <button
            type="button"
            className={`nav-item ${currentView === "runs" ? "active" : ""}`}
            onClick={goToRuns}
          >
            <span className="nav-icon"><RunsIcon /></span>
            <span className="nav-label">Runs</span>
            {runs.length > 0 && <span className="nav-pill">{runs.length}</span>}
          </button>

          <span className="nav-section-label" style={{ marginTop: "12px" }}>SETTINGS</span>

          <button
            type="button"
            className={`nav-item ${currentView === "settings" ? "active" : ""}`}
            onClick={goToSettings}
          >
            <span className="nav-icon"><SettingsIcon /></span>
            <span className="nav-label">Settings</span>
          </button>
        </nav>

        {/* Bottom Sidebar: System Status */}
        <div className="sidebar-footer">
          <div className={`backend-status-pill ${backendConnected ? "connected" : "disconnected"}`}>
            <span className={`status-indicator-dot ${backendConnected ? "pulse" : ""}`} />
            <span className="status-indicator-text">
              {backendConnected ? "Backend Connected" : "Backend Disconnected"}
            </span>
          </div>

          <div className="sidebar-session-provider">
            <span className="session-provider-label">AI ENGINE</span>
            <span className="session-provider-val">{aiProvider.toUpperCase()}</span>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="main-viewport">
        {/* Top Header Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="breadcrumb">
              <span className="breadcrumb-root" onClick={goToDashboard} style={{ cursor: "pointer" }}>TraceForge</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">
                {currentView === "dashboard" && "Dashboard"}
                {currentView === "new-run" && "New Run"}
                {currentView === "runs" && (selectedRun ? `${selectedRun.runNumber}` : "Runs Archive")}
                {currentView === "settings" && "AI Settings"}
              </span>
            </div>
          </div>

          <div className="topbar-right">
            {activeRun && (
              <button
                type="button"
                className="topbar-active-run-pill"
                onClick={() => openRunDetails(activeRun)}
                title="View active running execution"
              >
                <span className="pulse-dot" />
                <span>{activeRun.runNumber} active</span>
              </button>
            )}

            <div className="topbar-system-pill">
              <span className={`system-dot ${backendConnected ? "online" : "offline"}`} />
              <span>{backendConnected ? "System Ready" : "Offline"}</span>
            </div>

            {currentView !== "new-run" && (
              <button type="button" className="btn-primary-compact" onClick={goToNewRun}>
                <PlusIcon />
                <span>New Run</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Page View */}
        <main className="content-area">
          {currentView === "dashboard" && renderDashboard()}
          {currentView === "new-run" && renderNewRun()}
          {currentView === "runs" && (selectedRun ? renderRunDetails() : renderRunsList())}
          {currentView === "settings" && renderSettings()}
        </main>
      </div>
    </div>
  );
}