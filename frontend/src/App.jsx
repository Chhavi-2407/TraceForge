import { useEffect, useState } from "react";
import "./App.css";

// ============================================================
// BACKEND API
// ============================================================

const API_URL = "http://127.0.0.1:8000";

// ============================================================
// APP
// ============================================================

function App() {
  // ==========================================================
  // BASIC UI STATES
  // ==========================================================

  const [currentView, setCurrentView] = useState("dashboard");

  // New Run form
  const [issueTask, setIssueTask] = useState("");
  const [repoPath, setRepoPath] = useState("");

  // Form validation
  const [issueError, setIssueError] = useState("");
  const [repoError, setRepoError] = useState("");

  // Backend error
  const [backendError, setBackendError] = useState("");

  // Runs coming from backend
  const [runs, setRuns] = useState([]);

  // Currently opened run
  const [selectedRun, setSelectedRun] = useState(null);

  // Loading states
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isCreatingRun, setIsCreatingRun] = useState(false);

  // ==========================================================
  // TRACEFORGE STAGES
  // ==========================================================

  const stages = [
    "Issue",
    "Context",
    "Hypothesis",
    "Plan",
    "Edit",
    "Test",
    "Verify",
  ];

  // ==========================================================
  // HELPER: FORMAT RUN FROM BACKEND
  // ==========================================================
  //
  // Backend snake_case use karta hai:
  //
  // repo_path
  // files_changed
  // execution_trace
  //
  // Frontend camelCase use karta hai:
  //
  // repoPath
  // filesChanged
  // executionTrace
  //
  // Ye function dono ko connect karta hai.
  // ==========================================================

  const formatRun = (run) => {
    if (!run) return null;

    const id = Number(run.id);

    return {
      id,

      runNumber: `Run #${String(id).padStart(3, "0")}`,

      task: run.issue || "Unknown task",

      repoPath: run.repo_path || "",

      status: run.status || "Running",

      attempts: run.attempts ?? 0,

      tests: run.tests || "Not started",

      filesChanged: run.files_changed ?? 0,

      createdAt: run.created_at || null,

      completedAt: run.completed_at || null,

      executionTrace: run.execution_trace || [],
    };
  };

  // ==========================================================
  // STATUS BADGE
  // ==========================================================

  const getStatusBadgeClass = (status) => {
    if (status === "Success") {
      return "status-badge-success";
    }

    if (status === "Failed") {
      return "status-badge-failed";
    }

    return "status-badge-running";
  };

  // ==========================================================
  // STATUS COLOR
  // ==========================================================

  const getStatusColor = (status) => {
    if (status === "Success") return "#3fb950";

    if (status === "Failed") return "#f85149";

    return "#818cf8";
  };

  // ==========================================================
  // TIME DISPLAY
  // ==========================================================

  const formatTime = (run) => {
    if (!run?.createdAt) {
      return "Today";
    }

    const date = new Date(run.createdAt);

    if (Number.isNaN(date.getTime())) {
      return "Today";
    }

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // ==========================================================
  // GET ALL RUNS
  // ==========================================================
  //
  // Backend:
  //
  // GET /runs
  //
  // Isse Runs page backend ke actual data se populate hogi.
  // ==========================================================

  const loadRuns = async () => {
    try {
      setIsLoadingRuns(true);
      setBackendError("");

      const response = await fetch(`${API_URL}/runs`);

      if (!response.ok) {
        throw new Error(
          `Failed to load runs. Status: ${response.status}`
        );
      }

      const data = await response.json();

      const backendRuns = Array.isArray(data.runs)
        ? data.runs
        : [];

      const formattedRuns = backendRuns
        .map(formatRun)
        .reverse();

      setRuns(formattedRuns);
    } catch (error) {
      console.error("GET /runs failed:", error);

      setBackendError(
        "Could not connect to the TraceForge backend."
      );
    } finally {
      setIsLoadingRuns(false);
    }
  };

  // ==========================================================
  // GET ONE RUN
  // ==========================================================
  //
  // Backend:
  //
  // GET /runs/{run_id}
  //
  // Ye actual execution status + trace fetch karega.
  // ==========================================================

  const loadSingleRun = async (runId) => {
    try {
      const response = await fetch(
        `${API_URL}/runs/${runId}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load run ${runId}. Status: ${response.status}`
        );
      }

      const data = await response.json();

      const backendRun = data.run || data;

      const formattedRun = formatRun(backendRun);

      if (!formattedRun) {
        return null;
      }

      // Update selected details page
      setSelectedRun(formattedRun);

      // Also update that run inside Runs list
      setRuns((previousRuns) =>
        previousRuns.map((run) =>
          run.id === formattedRun.id
            ? formattedRun
            : run
        )
      );

      return formattedRun;
    } catch (error) {
      console.error(
        `GET /runs/${runId} failed:`,
        error
      );

      return null;
    }
  };

  // ==========================================================
  // LOAD RUNS WHEN APP STARTS
  // ==========================================================

  useEffect(() => {
    loadRuns();
  }, []);

  // ==========================================================
  // AUTO REFRESH SELECTED RUN
  // ==========================================================
  //
  // IMPORTANT:
  //
  // Jab run "Running" hai, frontend backend ko repeatedly
  // check karega.
  //
  // Example:
  //
  // 10:00:01 -> Running
  // 10:00:02 -> Running
  // 10:00:03 -> Running
  // 10:00:04 -> Success
  //
  // Success/Failed milte hi polling automatically stop.
  // ==========================================================

  useEffect(() => {
    if (!selectedRun?.id) {
      return;
    }

    if (
      selectedRun.status !== "Running"
    ) {
      return;
    }

    const interval = setInterval(async () => {
      const updatedRun = await loadSingleRun(
        selectedRun.id
      );

      if (!updatedRun) {
        return;
      }

      // Backend complete ho gaya
      if (
        updatedRun.status === "Success" ||
        updatedRun.status === "Failed"
      ) {
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [selectedRun?.id, selectedRun?.status]);

  // ==========================================================
  // START NEW RUN
  // ==========================================================
  //
  // Frontend
  //    ↓
  // POST /runs
  //    ↓
  // Backend
  //    ↓
  // Run created
  //    ↓
  // Runs page
  // ==========================================================

  const handleStartRun = async (event) => {
    event.preventDefault();

    // --------------------------------------------------------
    // 1. VALIDATION
    // --------------------------------------------------------

    let hasError = false;

    if (!issueTask.trim()) {
      setIssueError(
        "Please enter an issue or task."
      );

      hasError = true;
    }

    if (!repoPath.trim()) {
      setRepoError(
        "Please enter the repository path."
      );

      hasError = true;
    }

    if (hasError) {
      return;
    }

    // --------------------------------------------------------
    // 2. CLEAR OLD ERRORS
    // --------------------------------------------------------

    setIssueError("");
    setRepoError("");
    setBackendError("");

    setIsCreatingRun(true);

    try {
      // ------------------------------------------------------
      // 3. CREATE RUN IN BACKEND
      // ------------------------------------------------------

      const response = await fetch(
        `${API_URL}/runs`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            issue: issueTask.trim(),
            repo_path: repoPath.trim(),
          }),
        }
      );

      // ------------------------------------------------------
      // 4. CHECK RESPONSE
      // ------------------------------------------------------

      if (!response.ok) {
        throw new Error(
          `Failed to create run. Status: ${response.status}`
        );
      }

      // ------------------------------------------------------
      // 5. READ BACKEND RESPONSE
      // ------------------------------------------------------

      const data = await response.json();

      console.log(
        "POST /runs response:",
        data
      );

      const backendRun = data.run || data;

      const newRun = formatRun(backendRun);

      // ------------------------------------------------------
      // 6. ADD RUN TO FRONTEND STATE
      // ------------------------------------------------------

      if (newRun) {
        setRuns((previousRuns) => [
          newRun,
          ...previousRuns.filter(
            (run) => run.id !== newRun.id
          ),
        ]);

        // ----------------------------------------------------
        // 7. OPEN THAT RUN'S DETAILS
        // ----------------------------------------------------

        setSelectedRun(newRun);
      }

      // ------------------------------------------------------
      // 8. CLEAR FORM
      // ------------------------------------------------------

      setIssueTask("");
      setRepoPath("");

      // ------------------------------------------------------
      // 9. OPEN RUNS PAGE
      // ------------------------------------------------------

      setCurrentView("runs");

      // ------------------------------------------------------
      // 10. IMPORTANT
      // ------------------------------------------------------
      //
      // Backend immediately response de raha hai:
      //
      // status = Running
      //
      // Isliye actual execution status frontend polling se
      // GET /runs/{id} ke through update karega.
      //
      // ------------------------------------------------------

      if (newRun?.id) {
        setTimeout(() => {
          loadSingleRun(newRun.id);
        }, 300);
      }
    } catch (error) {
      console.error(
        "POST /runs failed:",
        error
      );

      setBackendError(
        "Failed to start the run. Make sure the FastAPI backend is running."
      );
    } finally {
      setIsCreatingRun(false);
    }
  };

  // ==========================================================
  // OPEN RUN DETAILS
  // ==========================================================

  const handleViewDetails = async (run) => {
    // Pehle local data immediately show karo
    setSelectedRun(run);

    setCurrentView("runs");

    // Phir backend se latest data fetch karo
    await loadSingleRun(run.id);
  };

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  const renderDashboard = () => {
    return (
      <>
        {/* Welcome Banner */}

        <section className="welcome-card">
          <h2 className="welcome-title">
            Welcome to TraceForge
          </h2>

          <p className="welcome-description">
            TraceForge is an evidence-driven autonomous coding harness.
          </p>

          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setCurrentView("new-run");
              setSelectedRun(null);
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>

            <span>Start New Run</span>
          </button>
        </section>

        {/* Summary */}

        <section className="summary-cards">
          <div className="summary-card">
            <span className="summary-label">
              Active Run
            </span>

            <span className="summary-value">
              {runs.find(
                (run) => run.status === "Running"
              )?.runNumber || "None"}
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">
              Attempts
            </span>

            <span className="summary-value">
              {runs.find(
                (run) => run.status === "Running"
              )?.attempts ?? 0}
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">
              Tests
            </span>

            <span className="summary-value">
              {runs.find(
                (run) => run.status === "Running"
              )?.tests || "Not started"}
            </span>
          </div>
        </section>

        {/* Workflow */}

        <section className="workflow-section">
          <h3 className="workflow-title">
            How TraceForge Works
          </h3>

          <div className="workflow-pipeline">
            {stages.map((stage, index) => (
              <div
                key={stage}
                className="stage-wrapper"
              >
                <div className="stage-chip">
                  <span className="stage-number">
                    {index + 1}
                  </span>

                  <span className="stage-name">
                    {stage}
                  </span>
                </div>

                {index < stages.length - 1 && (
                  <span className="stage-arrow">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </>
    );
  };

  // ==========================================================
  // NEW RUN PAGE
  // ==========================================================

  const renderNewRun = () => {
    return (
      <section className="form-card">
        <div className="form-header">
          <h2 className="form-title">
            New Coding Run
          </h2>

          <p className="form-description">
            Give TraceForge a coding task and the repository it should
            work on.
          </p>
        </div>

        <form
          className="run-form"
          onSubmit={handleStartRun}
        >
          {/* Issue / Task */}

          <div className="form-group">
            <label
              className="form-label"
              htmlFor="issue-task"
            >
              Issue / Task
            </label>

            <textarea
              id="issue-task"
              className={`form-textarea ${
                issueError ? "input-error" : ""
              }`}
              rows="5"
              placeholder="Describe the coding problem you want TraceForge to solve..."
              value={issueTask}
              onChange={(event) => {
                setIssueTask(event.target.value);

                if (
                  event.target.value.trim()
                ) {
                  setIssueError("");
                }
              }}
            />

            {issueError && (
              <div className="field-error">
                {issueError}
              </div>
            )}
          </div>

          {/* Repository Path */}

          <div className="form-group">
            <label
              className="form-label"
              htmlFor="repo-path"
            >
              Repository Path
            </label>

            <input
              id="repo-path"
              type="text"
              className={`form-input ${
                repoError ? "input-error" : ""
              }`}
              placeholder="/Users/chhavi/Desktop/TraceForge"
              value={repoPath}
              onChange={(event) => {
                setRepoPath(event.target.value);

                if (
                  event.target.value.trim()
                ) {
                  setRepoError("");
                }
              }}
            />

            {repoError && (
              <div className="field-error">
                {repoError}
              </div>
            )}
          </div>

          {/* Backend Error */}

          {backendError && (
            <div className="field-error">
              {backendError}
            </div>
          )}

          {/* Info */}

          <div className="info-panel">
            <div className="info-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />

                <line
                  x1="12"
                  y1="16"
                  x2="12"
                  y2="12"
                />

                <line
                  x1="12"
                  y1="8"
                  x2="12.01"
                  y2="8"
                />
              </svg>
            </div>

            <p className="info-text">
              TraceForge will understand the issue, retrieve relevant
              context, form a hypothesis, plan a change, test it, and
              verify the result.
            </p>
          </div>

          {/* Submit */}

          <div>
            <button
              type="submit"
              className="btn-primary"
              disabled={isCreatingRun}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>

              <span>
                {isCreatingRun
                  ? "Starting Run..."
                  : "Start Autonomous Run"}
              </span>
            </button>
          </div>
        </form>
      </section>
    );
  };

  // ==========================================================
  // RUN DETAILS
  // ==========================================================

  const renderRunDetails = () => {
    if (!selectedRun) return null;

    const trace = selectedRun.executionTrace || [];

    return (
      <section className="run-details-card">
        {/* Back */}

        <button
          type="button"
          className="btn-back"
          onClick={() => {
            setSelectedRun(null);
            setCurrentView("runs");
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line
              x1="19"
              y1="12"
              x2="5"
              y2="12"
            />

            <polyline points="12 19 5 12 12 5" />
          </svg>

          <span>Back to Runs</span>
        </button>

        {/* Header */}

        <div className="run-details-header">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <span className="run-number">
                {selectedRun.runNumber}
              </span>

              <span
                className={getStatusBadgeClass(
                  selectedRun.status
                )}
              >
                {selectedRun.status}
              </span>
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                color: "#f0f6fc",
              }}
            >
              {selectedRun.task}
            </h2>
          </div>
        </div>

        {/* Metadata */}

        <div className="run-details-meta-grid">
          <div className="run-details-meta-item">
            <span className="run-metric-label">
              Run Number
            </span>

            <span className="run-metric-val">
              {selectedRun.runNumber}
            </span>
          </div>

          <div className="run-details-meta-item">
            <span className="run-metric-label">
              Task
            </span>

            <span className="run-metric-val">
              {selectedRun.task}
            </span>
          </div>

          <div className="run-details-meta-item">
            <span className="run-metric-label">
              Status
            </span>

            <span
              style={{
                fontWeight: 600,
                color: getStatusColor(
                  selectedRun.status
                ),
              }}
            >
              {selectedRun.status}
            </span>
          </div>

          <div className="run-details-meta-item">
            <span className="run-metric-label">
              Attempts
            </span>

            <span className="run-metric-val">
              {selectedRun.attempts}
            </span>
          </div>

          <div className="run-details-meta-item">
            <span className="run-metric-label">
              Tests
            </span>

            <span className="run-metric-val">
              {selectedRun.tests}
            </span>
          </div>

          <div className="run-details-meta-item">
            <span className="run-metric-label">
              Files Changed
            </span>

            <span className="run-metric-val">
              {selectedRun.filesChanged}
            </span>
          </div>

          <div className="run-details-meta-item">
            <span className="run-metric-label">
              Repository Path
            </span>

            <span className="run-metric-val">
              {selectedRun.repoPath}
            </span>
          </div>
        </div>

        {/* ====================================================
            EXECUTION TRACE
        ==================================================== */}

        <section className="run-trace-section">
          <div className="run-trace-header">
            <h3 className="run-trace-title">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />

                <polyline points="12 6 12 12 16 14" />
              </svg>

              Execution Trace
            </h3>

            <p className="run-trace-subtitle">
              Evidence-driven execution cycle with automated failure recovery
            </p>
          </div>

          <div className="timeline-container">
            {trace.length === 0 ? (
              <div className="evidence-report-section">
                <h3>
                  Waiting for execution...
                </h3>

                <p>
                  The backend has created this run. Execution
                  trace will appear here as the run progresses.
                </p>
              </div>
            ) : (
              trace.map((item, index) => {
                const isLast =
                  index === trace.length - 1;

                const isFailed =
                  item.status === "Failed";

                const isCompleted =
                  item.status === "Completed";

                const isPending =
                  item.status === "Pending";

                const isRunning =
                  item.status === "Running";

                let nodeClass = "success";

                if (isFailed) {
                  nodeClass = "failed";
                } else if (
                  isPending ||
                  isRunning
                ) {
                  nodeClass = "recovery";
                }

                return (
                  <div key={`${item.stage}-${index}`}>
                    <div className="timeline-item">
                      <div className="timeline-node-col">
                        <div
                          className={`timeline-node ${nodeClass}`}
                        >
                          {index + 1}
                        </div>

                        {!isLast && (
                          <div className="timeline-line"></div>
                        )}
                      </div>

                      <div className="timeline-content">
                        <div className="timeline-header-row">
                          <div className="timeline-stage-title-wrap">
                            <span className="timeline-stage-title">
                              {item.stage}
                            </span>
                          </div>

                          <span
                            className={
                              isFailed
                                ? "status-badge-failed"
                                : isCompleted
                                ? "status-badge-success"
                                : "status-badge-running"
                            }
                          >
                            {item.status}
                          </span>
                        </div>

                        <p className="timeline-desc">
                          {item.description ||
                            (
                              isPending
                                ? "Waiting for this stage to execute."
                                : isRunning
                                ? "This stage is currently running."
                                : "Execution information will appear here."
                            )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Evidence */}

        <div className="evidence-report-section">
          <h3>
            Evidence Report
          </h3>

          <p>
            Detailed evidence is being provided by the TraceForge backend.
          </p>
        </div>
      </section>
    );
  };

  // ==========================================================
  // RUNS LIST
  // ==========================================================

  const renderRuns = () => {
    if (selectedRun) {
      return renderRunDetails();
    }

    const successfulRuns = runs.filter(
      (run) => run.status === "Success"
    ).length;

    const failedRuns = runs.filter(
      (run) => run.status === "Failed"
    ).length;

    return (
      <>
        <div className="page-header">
          <h2 className="page-title">
            Runs
          </h2>

          <p className="page-subtitle">
            Review previous TraceForge coding runs and their outcomes.
          </p>
        </div>

        {backendError && (
          <div className="field-error">
            {backendError}
          </div>
        )}

        {isLoadingRuns && (
          <p className="page-subtitle">
            Loading runs...
          </p>
        )}

        {/* Summary */}

        <section className="summary-cards">
          <div className="summary-card">
            <span className="summary-label">
              Total Runs
            </span>

            <span className="summary-value">
              {runs.length}
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">
              Successful
            </span>

            <span
              className="summary-value"
              style={{
                color: "#3fb950",
              }}
            >
              {successfulRuns}
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">
              Failed
            </span>

            <span
              className="summary-value"
              style={{
                color: "#f85149",
              }}
            >
              {failedRuns}
            </span>
          </div>
        </section>

        {/* Recent Runs */}

        <section className="runs-section">
          <h3 className="runs-section-title">
            Recent Runs
          </h3>

          <div className="runs-list">
            {runs.length === 0 && !isLoadingRuns ? (
              <div className="run-card">
                <p className="page-subtitle">
                  No runs found. Start your first autonomous run.
                </p>
              </div>
            ) : (
              runs.map((run) => (
                <div
                  key={run.id}
                  className="run-card"
                >
                  {/* Header */}

                  <div className="run-card-header">
                    <div className="run-card-title-group">
                      <span className="run-number">
                        {run.runNumber}
                      </span>

                      <span className="run-task-title">
                        {run.task}
                      </span>
                    </div>

                    <span
                      className={getStatusBadgeClass(
                        run.status
                      )}
                    >
                      {run.status}
                    </span>
                  </div>

                  {/* Metrics */}

                  <div className="run-metrics">
                    <div className="run-metric-item">
                      <span className="run-metric-label">
                        Attempts
                      </span>

                      <span className="run-metric-val">
                        {run.attempts}
                      </span>
                    </div>

                    <div className="run-metric-item">
                      <span className="run-metric-label">
                        Tests
                      </span>

                      <span className="run-metric-val">
                        {run.tests}
                      </span>
                    </div>

                    <div className="run-metric-item">
                      <span className="run-metric-label">
                        Files Changed
                      </span>

                      <span className="run-metric-val">
                        {run.filesChanged}
                      </span>
                    </div>

                    <div className="run-metric-item">
                      <span className="run-metric-label">
                        Time
                      </span>

                      <span className="run-metric-val">
                        {formatTime(run)}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}

                  <div className="run-card-footer">
                    <span className="run-time">
                      {formatTime(run)}
                    </span>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        handleViewDetails(run)
                      }
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </>
    );
  };

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div className="dashboard-layout">
      {/* ====================================================
          SIDEBAR
      ==================================================== */}

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon
                  points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
                  fill="rgba(129, 140, 248, 0.2)"
                />
              </svg>
            </div>

            <span className="brand-name">
              TraceForge
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Dashboard */}

          <button
            type="button"
            className={`nav-item ${
              currentView === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() => {
              setCurrentView("dashboard");
              setSelectedRun(null);
            }}
          >
            <span className="nav-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="3"
                  y="3"
                  width="7"
                  height="9"
                  rx="1"
                />

                <rect
                  x="14"
                  y="3"
                  width="7"
                  height="5"
                  rx="1"
                />

                <rect
                  x="14"
                  y="12"
                  width="7"
                  height="9"
                  rx="1"
                />

                <rect
                  x="3"
                  y="16"
                  width="7"
                  height="5"
                  rx="1"
                />
              </svg>
            </span>

            <span>Dashboard</span>
          </button>

          {/* New Run */}

          <button
            type="button"
            className={`nav-item ${
              currentView === "new-run"
                ? "active"
                : ""
            }`}
            onClick={() => {
              setCurrentView("new-run");
              setSelectedRun(null);
            }}
          >
            <span className="nav-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />

                <line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="16"
                />

                <line
                  x1="8"
                  y1="12"
                  x2="16"
                  y2="12"
                />
              </svg>
            </span>

            <span>New Run</span>
          </button>

          {/* Runs */}

          <button
            type="button"
            className={`nav-item ${
              currentView === "runs"
                ? "active"
                : ""
            }`}
            onClick={() => {
              setCurrentView("runs");
              setSelectedRun(null);

              // Backend se latest runs fetch
              loadRuns();
            }}
          >
            <span className="nav-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line
                  x1="8"
                  y1="6"
                  x2="21"
                  y2="6"
                />

                <line
                  x1="8"
                  y1="12"
                  x2="21"
                  y2="12"
                />

                <line
                  x1="8"
                  y1="18"
                  x2="21"
                  y2="18"
                />

                <line
                  x1="3"
                  y1="6"
                  x2="3.01"
                  y2="6"
                />

                <line
                  x1="3"
                  y1="12"
                  x2="3.01"
                  y2="12"
                />

                <line
                  x1="3"
                  y1="18"
                  x2="3.01"
                  y2="18"
                />
              </svg>
            </span>

            <span>Runs</span>
          </button>
        </nav>
      </aside>

      {/* ====================================================
          MAIN AREA
      ==================================================== */}

      <div className="main-wrapper">
        {/* Header */}

        <header className="top-header">
          <h1 className="header-title">
            {currentView === "dashboard"
              ? "Dashboard"
              : currentView === "new-run"
              ? "New Run"
              : "Runs"}
          </h1>

          <div className="status-badge">
            <span className="status-dot"></span>
            <span>System Ready</span>
          </div>
        </header>

        {/* Content */}

        <main className="content-area">
          {currentView === "dashboard" &&
            renderDashboard()}

          {currentView === "new-run" &&
            renderNewRun()}

          {currentView === "runs" &&
            renderRuns()}
        </main>
      </div>
    </div>
  );
}

export default App;