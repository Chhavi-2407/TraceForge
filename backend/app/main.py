# ============================================================
# TRACEFORGE BACKEND
# ============================================================
#
# Autonomous coding pipeline:
#
# Issue
#   ↓
# Context Retrieval
#   ↓
# Gemini Hypothesis
#   ↓
# Gemini Plan
#   ↓
# Gemini Code Patch
#   ↓
# Apply Patch
#   ↓
# Run Tests
#   ↓
# Failure?
#   ├── YES → Gemini Failure Analysis → Retry
#   └── NO  → Verification
#
# ============================================================


# ============================================================
# IMPORTS
# ============================================================

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
try:
    from pydantic import BaseModel, field_validator
except ImportError:
    from pydantic import BaseModel, validator as field_validator

from pathlib import Path
from datetime import datetime

import asyncio
import subprocess
import json
import sys


# ============================================================
# IMPORT TRACEFORGE AI AGENT
# ============================================================

BACKEND_DIR = Path(
    __file__
).resolve().parent.parent


if str(BACKEND_DIR) not in sys.path:

    sys.path.append(
        str(BACKEND_DIR)
    )


from ai_agent import (
    analyze_issue,
    generate_code_changes,
    apply_code_changes
)


# ============================================================
# APP
# ============================================================

app = FastAPI(

    title="TraceForge API",

    description="Autonomous coding agent backend",

    version="2.0.0"

)


# ============================================================
# CORS
# ============================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)


# ============================================================
# REQUEST MODEL
# ============================================================

class RunRequest(BaseModel):

    issue: str

    repo_path: str

    @field_validator("issue")
    @classmethod
    def validate_issue(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Issue description cannot be empty.")
        return value.strip()

    @field_validator("repo_path")
    @classmethod
    def validate_repo_path(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Repository path cannot be empty.")
        path = Path(value.strip()).expanduser().resolve()
        if not path.exists():
            raise ValueError(f"Repository path does not exist: {value}")
        if not path.is_dir():
            raise ValueError(f"Repository path is not a directory: {value}")
        return str(path)


# ============================================================
# RUN STORAGE
# ============================================================

runs = []


# ============================================================
# EXECUTION STAGES
# ============================================================

STAGES = [

    "Issue",

    "Context Retrieval",

    "Hypothesis",

    "Plan",

    "Edit",

    "Test",

    "Failure Analysis",

    "Recovery / Replanning",

    "Verification"

]


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "TraceForge backend is running!"
    }


# ============================================================
# REPOSITORY SCANNER
# ============================================================

def scan_repository(repo_path: str):

    root = Path(repo_path)

    if not root.exists():

        return {

            "exists": False,

            "file_count": 0,

            "files": [],

            "error":
                "Repository path does not exist."

        }


    if not root.is_dir():

        return {

            "exists": False,

            "file_count": 0,

            "files": [],

            "error":
                "Repository path is not a directory."

        }


    ignored_directories = {

        ".git",
        "node_modules",
        "dist",
        "build",
        ".venv",
        "__pycache__",
        ".idea",
        ".next"

    }


    files = []


    for path in root.rglob("*"):

        if path.is_dir():
            continue


        if any(

            ignored in path.parts

            for ignored
            in ignored_directories

        ):

            continue


        try:

            relative_path = str(

                path.relative_to(root)

            )

        except ValueError:

            continue


        files.append(
            relative_path
        )


    files.sort()


    return {

        "exists": True,

        "file_count":
            len(files),

        "files":
            files[:200],

        "error":
            None

    }


# ============================================================
# CREATE EXECUTION TRACE
# ============================================================

def create_execution_trace():

    return [

        {

            "stage":
                stage,

            "status":
                "Pending",

            "description":
                ""

        }

        for stage in STAGES

    ]


# ============================================================
# GET STAGE
# ============================================================

def get_stage(
    run,
    stage_name
):

    return next(

        item

        for item
        in run["execution_trace"]

        if item["stage"] == stage_name

    )


# ============================================================
# TEST COMMAND DETECTION
# ============================================================
def detect_test_command(repo_path):
    root = Path(repo_path)

    # Python / pytest at repository root
    if (root / "pytest.ini").exists():
        return "python3 -m pytest -q"

    if (root / "pyproject.toml").exists():
        try:
            content = (root / "pyproject.toml").read_text(
                encoding="utf-8",
                errors="ignore",
            )

            if "pytest" in content:
                return "python3 -m pytest -q"

        except Exception:
            pass

    if (root / "tests").is_dir():
        return "python3 -m pytest -q"

    # Python tests inside backend
    backend_dir = root / "backend"

    if backend_dir.is_dir():
        if (backend_dir / "tests").is_dir():
            return "cd backend && python3 -m pytest -q"

        if (backend_dir / "pytest.ini").exists():
            return "cd backend && python3 -m pytest -q"

    # Node.js
    package_json = root / "package.json"

    if package_json.exists():
        try:
            package = json.loads(
                package_json.read_text(
                    encoding="utf-8",
                    errors="ignore",
                )
            )

            scripts = package.get("scripts", {})

            if scripts.get("test:run"):
                return "npm run test:run"

            if (
                scripts.get("test")
                and "no test specified"
                not in scripts.get("test", "").lower()
            ):
                return "npm test"

        except Exception:
            pass

    # Frontend package
    frontend_package = root / "frontend" / "package.json"

    if frontend_package.exists():
        try:
            package = json.loads(
                frontend_package.read_text(
                    encoding="utf-8",
                    errors="ignore",
                )
            )

            scripts = package.get("scripts", {})

            if scripts.get("test:run"):
                return "cd frontend && npm run test:run"

            if (
                scripts.get("test")
                and "no test specified"
                not in scripts.get("test", "").lower()
            ):
                return "cd frontend && npm test"

        except Exception:
            pass

    return None

# ============================================================
# RUN TESTS
# ============================================================

def run_tests(
    repo_path: str
):

    command = detect_test_command(
        repo_path
    )


    if command is None:

        return {

            "executed":
                False,

            "passed":
                False,

            "command":
                None,

            "output":
                "No supported test command was detected."

        }


    command_str = (
        command
        if isinstance(command, str)
        else " ".join(command)
    )

    try:

        result = subprocess.run(

            command,

            cwd=repo_path,

            capture_output=True,

            text=True,

            timeout=120,

            shell=True

        )


        output = (

            result.stdout

            + "\n"

            + result.stderr

        ).strip()


        return {

            "executed":
                True,

            "passed":
                result.returncode == 0,

            "command":
                command_str,

            "output":
                output[-12000:]

        }


    except subprocess.TimeoutExpired:

        return {

            "executed":
                True,

            "passed":
                False,

            "command":
                command_str,

            "output":
                "Test execution timed out after 120 seconds."

        }


    except Exception as error:

        return {

            "executed":
                True,

            "passed":
                False,

            "command":
                command_str,

            "output":
                f"Test execution error: {error}"

        }


# ============================================================
# GIT CHANGED FILES
# ============================================================
#
# Important:
# TraceForge itself may be inside another Git repository.
# Therefore we only report files inside the requested repo.
# ============================================================

def get_git_changed_files(
    repo_path: str
):

    root = Path(
        repo_path
    ).resolve()


    try:

        git_root_result = subprocess.run(

            [
                "git",
                "-C",
                str(root),
                "rev-parse",
                "--show-toplevel"
            ],

            capture_output=True,

            text=True,

            timeout=10

        )


        if git_root_result.returncode != 0:

            return []


        git_root = Path(

            git_root_result.stdout.strip()

        ).resolve()


        status_result = subprocess.run(

            [
                "git",
                "-C",
                str(git_root),
                "status",
                "--short"
            ],

            capture_output=True,

            text=True,

            timeout=10

        )


        if status_result.returncode != 0:

            return []


        changed_files = []


        for line in status_result.stdout.splitlines():

            if not line.strip():
                continue


            # Git status format:
            #
            # XY filename
            #
            relative_git_path = line[3:]


            # Handle quoted paths conservatively
            relative_git_path = (
                relative_git_path.strip('"')
            )


            absolute_file = (

                git_root
                / relative_git_path

            ).resolve()


            # ------------------------------------------------
            # Only include files INSIDE requested repo
            # ------------------------------------------------

            try:

                relative_to_repo = (

                    absolute_file.relative_to(root)

                )

            except ValueError:

                continue


            changed_files.append(

                str(relative_to_repo)

            )


        return sorted(
            set(changed_files)
        )


    except Exception:

        return []


# ============================================================
# CREATE FILE BACKUPS
# ============================================================
#
# We don't use git reset because the user's repository may
# already contain unrelated changes.
#
# Instead we store the original contents of files that
# TraceForge modifies.
# ============================================================

def create_backups(
    repo_path: str,
    changes: list
):

    root = Path(
        repo_path
    ).resolve()


    backups = {}


    for change in changes:

        relative_path = change.get(
            "path"
        )


        if not relative_path:
            continue


        target = (

            root
            / relative_path

        ).resolve()


        try:

            target.relative_to(root)

        except ValueError:

            continue


        if target.exists():

            backups[relative_path] = (

                target.read_text(
                    encoding="utf-8"
                )

            )


    return backups


# ============================================================
# RESTORE FILE BACKUPS
# ============================================================

def restore_backups(
    repo_path: str,
    backups: dict
):

    root = Path(
        repo_path
    ).resolve()


    for relative_path, content in backups.items():

        target = (

            root
            / relative_path

        ).resolve()


        try:

            target.relative_to(root)

        except ValueError:

            continue


        try:

            target.write_text(

                content,

                encoding="utf-8"

            )

        except Exception as error:

            print(
                f"Could not restore {relative_path}: {error}"
            )


# ============================================================
# AUTONOMOUS EXECUTION
# ============================================================

async def execute_run(
    run_id: int
):

    run = next(

        (
            item

            for item in runs

            if item["id"] == run_id

        ),

        None

    )


    if run is None:
        return


    try:

        # ====================================================
        # 1. ISSUE
        # ====================================================

        stage = get_stage(
            run,
            "Issue"
        )

        stage["status"] = "Running"


        await asyncio.sleep(0.2)


        stage["status"] = "Completed"

        stage["description"] = (

            "Parsed the submitted problem statement."

        )


        # ====================================================
        # 2. CONTEXT RETRIEVAL
        # ====================================================

        stage = get_stage(
            run,
            "Context Retrieval"
        )

        stage["status"] = "Running"


        context = scan_repository(

            run["repo_path"]

        )


        run["repository_context"] = {

            "file_count":
                context["file_count"],

            "files":
                context["files"],

            "exists":
                context["exists"]

        }


        stage["status"] = "Completed"

        stage["description"] = (

            f"Scanned repository and found "
            f"{context['file_count']} relevant files."

        )


        # ====================================================
        # 3. GEMINI HYPOTHESIS
        # ====================================================

        stage = get_stage(
            run,
            "Hypothesis"
        )

        stage["status"] = "Running"


        ai_result = await asyncio.to_thread(

            analyze_issue,

            run["issue"],

            run["repo_path"]

        )


        hypothesis = ai_result.get(

            "hypothesis",

            "No hypothesis returned."

        )


        relevant_files = ai_result.get(

            "relevant_files",

            []

        )


        confidence = ai_result.get(

            "confidence",

            "unknown"

        )


        run["ai_analysis"] = {

            "hypothesis":
                hypothesis,

            "relevant_files":
                relevant_files,

            "confidence":
                confidence

        }


        stage["status"] = "Completed"

        stage["description"] = hypothesis


        # ====================================================
        # 4. GEMINI PLAN
        # ====================================================

        stage = get_stage(
            run,
            "Plan"
        )

        stage["status"] = "Running"


        plan = ai_result.get(
            "plan",
            []
        )


        run["plan"] = plan


        if plan:

            stage["description"] = "\n".join(

                f"{index + 1}. {step}"

                for index, step
                in enumerate(plan)

            )

        else:

            stage["description"] = (

                "Gemini did not return an implementation plan."

            )


        stage["status"] = "Completed"


        # ====================================================
        # RETRY LOOP
        # ====================================================

        MAX_ATTEMPTS = 2

        test_result = None

        last_failure = None


        for attempt in range(
            1,
            MAX_ATTEMPTS + 1
        ):

            run["attempts"] = attempt


            # =================================================
            # EDIT
            # =================================================

            edit_stage = get_stage(
                run,
                "Edit"
            )

            edit_stage["status"] = "Running"


            # -------------------------------------------------
            # Generate patch from Gemini
            # -------------------------------------------------

            patch_result = await asyncio.to_thread(

                generate_code_changes,

                run["issue"],

                run["repo_path"],

                hypothesis,

                plan

            )


            changes = patch_result.get(

                "changes",

                []

            )


            run["generated_changes"] = changes


            if not changes:

                edit_stage["status"] = "Failed"

                edit_stage["description"] = (

                    "Gemini did not generate any code changes."

                )

                raise RuntimeError(

                    "Gemini generated no code changes."

                )


            # -------------------------------------------------
            # Backup files before editing
            # -------------------------------------------------

            backups = create_backups(

                run["repo_path"],

                changes

            )


            # -------------------------------------------------
            # Apply changes
            # -------------------------------------------------

            apply_result = await asyncio.to_thread(

                apply_code_changes,

                run["repo_path"],

                changes

            )


            run["edit_result"] = apply_result


            applied = apply_result.get(
                "applied",
                []
            )


            failed = apply_result.get(
                "failed",
                []
            )


            if failed:

                # If some patches were applied but another
                # patch failed, restore everything from this
                # attempt.

                if applied:

                    restore_backups(

                        run["repo_path"],

                        backups

                    )


                edit_stage["status"] = "Failed"

                edit_stage["description"] = (

                    f"Patch application failed: "
                    f"{failed}"

                )


                raise RuntimeError(

                    "Gemini generated an invalid or unsafe "
                    "patch."

                )


            run["files_changed"] = (

                apply_result.get(
                    "files_changed",
                    0
                )

            )


            edit_stage["status"] = "Completed"

            edit_stage["description"] = (

                f"Applied {run['files_changed']} "
                f"AI-generated file change(s)."

            )


            # =================================================
            # TEST
            # =================================================

            test_stage = get_stage(
                run,
                "Test"
            )

            test_stage["status"] = "Running"


            test_result = await asyncio.to_thread(

                run_tests,

                run["repo_path"]

            )


            run["test_result"] = test_result


            # -------------------------------------------------
            # No test command
            # -------------------------------------------------

            if not test_result["executed"]:

                test_stage["status"] = "Completed"

                test_stage["description"] = (

                    "No supported test command was detected."

                )


                # We cannot claim the code is tested.
                #
                # But the edit itself succeeded.

                break


            # -------------------------------------------------
            # Tests passed
            # -------------------------------------------------

            if test_result["passed"]:

                test_stage["status"] = "Completed"

                test_stage["description"] = (

                    f"Tests passed successfully using "
                    f"{test_result['command']}."

                )

                break


            # -------------------------------------------------
            # Tests failed
            # -------------------------------------------------

            test_stage["status"] = "Failed"

            test_stage["description"] = (

                f"Tests failed using "
                f"{test_result['command']}."

            )


            last_failure = test_result["output"]


            # =================================================
            # FAILURE ANALYSIS
            # =================================================

            failure_stage = get_stage(

                run,

                "Failure Analysis"

            )

            failure_stage["status"] = "Running"


            failure_issue = f"""
Original issue:

{run['issue']}

Previous hypothesis:

{hypothesis}

The code was edited according to the previous plan,
but the test suite failed.

TEST COMMAND:

{test_result['command']}

TEST OUTPUT:

{last_failure}

Analyze this failure.

Identify:

1. Why the test failed.
2. What the new root cause is.
3. What files need to change.
4. What should be done differently on the next attempt.

Return the result as a concise software debugging analysis.
"""


            failure_result = await asyncio.to_thread(

                analyze_issue,

                failure_issue,

                run["repo_path"]

            )


            new_hypothesis = failure_result.get(

                "hypothesis",

                hypothesis

            )


            new_plan = failure_result.get(

                "plan",

                plan

            )


            hypothesis = new_hypothesis

            plan = new_plan


            run["ai_analysis"] = {

                "hypothesis":
                    hypothesis,

                "relevant_files":
                    failure_result.get(
                        "relevant_files",
                        []
                    ),

                "confidence":
                    failure_result.get(
                        "confidence",
                        "unknown"
                    )

            }


            run["plan"] = plan


            failure_stage["status"] = "Completed"

            failure_stage["description"] = (

                hypothesis

            )


            # =================================================
            # RECOVERY / REPLANNING
            # =================================================

            recovery_stage = get_stage(

                run,

                "Recovery / Replanning"

            )

            recovery_stage["status"] = "Running"


            recovery_stage["description"] = (

                "Gemini analyzed the test failure and "
                "generated a revised hypothesis and plan."

            )


            recovery_stage["status"] = "Completed"


            # -------------------------------------------------
            # Restore failed attempt before retry
            # -------------------------------------------------

            restore_backups(

                run["repo_path"],

                backups

            )


        # ====================================================
        # FINAL VERIFICATION
        # ====================================================

        verification_stage = get_stage(

            run,

            "Verification"

        )

        verification_stage["status"] = "Running"


        # ----------------------------------------------------
        # Check final repository state
        # ----------------------------------------------------

        changed_files = get_git_changed_files(

            run["repo_path"]

        )


        run["changed_files"] = changed_files


        # If git is unavailable or repo isn't tracked,
        # use files_changed from patch engine.

        if changed_files:

            run["files_changed"] = len(
                changed_files
            )


        # ----------------------------------------------------
        # Determine final status
        # ----------------------------------------------------

        if (
            test_result
            and test_result["executed"]
            and not test_result["passed"]
        ):

            run["status"] = "Failed"

            verification_stage["status"] = "Failed"

            verification_stage["description"] = (

                "Verification failed because the test "
                "suite did not pass after the maximum "
                "number of attempts."

            )

        else:

            run["status"] = "Success"

            verification_stage["status"] = "Completed"


            if (
                test_result
                and test_result["executed"]
            ):

                verification_stage["description"] = (

                    "Code changes were applied and the "
                    "test suite passed."

                )

            else:

                verification_stage["description"] = (

                    "Code changes were applied successfully, "
                    "but no supported automated test suite "
                    "was available."

                )


        run["completed_at"] = (
            datetime.now().isoformat()
        )


    # ========================================================
    # GLOBAL ERROR HANDLING
    # ========================================================

    except Exception as error:

        print(
            f"TraceForge execution error: {error}"
        )


        run["status"] = "Failed"


        run["completed_at"] = (
            datetime.now().isoformat()
        )


        # Mark active stage as failed

        for stage_data in run[
            "execution_trace"
        ]:

            if stage_data["status"] == "Running":

                stage_data["status"] = "Failed"

                stage_data["description"] = (

                    f"Execution failed: {error}"

                )

                break


# ============================================================
# CREATE RUN
# ============================================================

@app.post("/runs")
async def create_run(

    run: RunRequest,

    background_tasks: BackgroundTasks

):

    # --------------------------------------------------------
    # Basic validation
    # --------------------------------------------------------

    if not run.issue.strip():

        raise HTTPException(

            status_code=422,

            detail="Issue or task cannot be empty."

        )


    if not run.repo_path.strip():

        raise HTTPException(

            status_code=422,

            detail="Repository path cannot be empty."

        )


    # --------------------------------------------------------
    # Repository validation
    # --------------------------------------------------------

    repo = Path(
        run.repo_path.strip()
    )


    if not repo.exists():

        raise HTTPException(

            status_code=400,

            detail="Repository path does not exist."

        )


    if not repo.is_dir():

        raise HTTPException(

            status_code=400,

            detail="Repository path is not a directory."

        )


    # --------------------------------------------------------
    # Create run ID
    # --------------------------------------------------------

    new_id = len(runs) + 1


    # --------------------------------------------------------
    # Create run
    # --------------------------------------------------------

    new_run = {

        "id":
            new_id,

        "issue":
            run.issue.strip(),

        "repo_path":
            run.repo_path.strip(),

        "status":
            "Running",

        "attempts":
            0,

        "tests":
            "Not started",

        "files_changed":
            0,

        "created_at":
            datetime.now().isoformat(),

        "completed_at":
            None,

        "execution_trace":
            create_execution_trace()

    }


    runs.append(
        new_run
    )


    # --------------------------------------------------------
    # Start background execution
    # --------------------------------------------------------

    background_tasks.add_task(

        execute_run,

        new_id

    )


    return {

        "message":
            "Run created successfully",

        "run":
            new_run

    }


# ============================================================
# GET ALL RUNS
# ============================================================

@app.get("/runs")
def get_runs():

    return {

        "runs":
            runs

    }


# ============================================================
# GET SINGLE RUN
# ============================================================

@app.get("/runs/{run_id}")
def get_run(
    run_id: int
):

    run = next(

        (

            item

            for item in runs

            if item["id"] == run_id

        ),

        None

    )


    if run is None:

        raise HTTPException(

            status_code=404,

            detail="Run not found."

        )


    return {

        "run":
            run

    }
