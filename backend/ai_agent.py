import os
import json
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
import requests


# ============================================================
# CONFIG
# ============================================================

# Load .env only for NON-API configuration.
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH)

# IMPORTANT:
# There is NO hardcoded/default API key anymore.
#
# The API key will come from the user at runtime.
#
# Example:
# analyze_issue(issue, repo_path, api_key, model, provider)




# ============================================================
# FILE CONFIG
# ============================================================

TEXT_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".html",
    ".css",
    ".md",
    ".txt",
    ".yaml",
    ".yml",
}


IGNORED_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".venv",
    "__pycache__",
    ".idea",
    ".next",
    ".pytest_cache",
}


# ============================================================
# AI PROVIDER
# ============================================================

class AIResponse:
    """Provider-neutral response wrapper used by TraceForge."""

    def __init__(self, text):
        self.text = text


MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "").strip()

MAX_RETRIES = 3
REQUEST_TIMEOUT = 120

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

QWEN_URL = (
    "https://dashscope.aliyuncs.com/"
    "compatible-mode/v1/chat/completions"
)


def create_ai_client(provider, api_key):
    """Validate the runtime provider and API key."""

    if not api_key or not api_key.strip():
        raise ValueError(
            "API key is required. Please configure your AI provider "
            "and API key in TraceForge Settings."
        )

    provider = (provider or "gemini").strip().lower()

    if provider not in {"gemini", "deepseek", "qwen"}:
        raise ValueError(
            f"Unsupported AI provider: {provider}. "
            "Choose Gemini, DeepSeek, or Qwen."
        )

    if provider == "gemini":
        return genai.Client(api_key=api_key.strip())

    return {
        "provider": provider,
        "api_key": api_key.strip(),
    }


def _call_openai_compatible(url, api_key, model, prompt):
    """Call DeepSeek/Qwen OpenAI-compatible API."""

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the AI reasoning engine of TraceForge. "
                    "Follow the user's instructions exactly and return "
                    "only the requested output."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "stream": False,
    }

    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=REQUEST_TIMEOUT,
    )

    if not response.ok:
        try:
            detail = response.json()
        except Exception:
            detail = response.text[:1000]

        raise RuntimeError(
            f"AI provider request failed with HTTP "
            f"{response.status_code}: {detail}"
        )

    data = response.json()

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(
            "AI provider returned an unexpected response format."
        ) from exc

    if not content:
        raise RuntimeError("AI provider returned an empty response.")

    return AIResponse(content)


# ============================================================
# AI CALL WITH RETRY
# ============================================================

def call_ai(
    prompt,
    api_key,
    provider="gemini",
    model=None,
):
    """Call the selected AI provider using the user's runtime key."""

    provider = (provider or "gemini").strip().lower()

    if not api_key or not api_key.strip():
        raise ValueError(
            "API key is required. Please configure your AI provider "
            "and API key in TraceForge Settings."
        )

    if model and model.strip():
        selected_model = model.strip()
    elif provider == "gemini":
        selected_model = MODEL_NAME
    elif provider == "deepseek":
        selected_model = "deepseek-chat"
    else:
        selected_model = "qwen-plus"

    client = create_ai_client(
        provider=provider,
        api_key=api_key,
    )

    models = [selected_model]

    if (
        provider == "gemini"
        and not model
        and FALLBACK_MODEL
        and FALLBACK_MODEL != selected_model
    ):
        models.append(FALLBACK_MODEL)

    last_error = None

    for current_model in models:

        for attempt in range(MAX_RETRIES):

            try:

                print(
                    f"[TraceForge AI] Calling "
                    f"{provider}/{current_model} "
                    f"(attempt {attempt + 1}/{MAX_RETRIES})"
                )

                if provider == "gemini":

                    response = client.models.generate_content(
                        model=current_model,
                        contents=prompt,
                    )

                    if not response or not response.text:
                        raise RuntimeError(
                            f"{provider} returned an empty response."
                        )

                    result = AIResponse(response.text)

                elif provider == "deepseek":

                    result = _call_openai_compatible(
                        DEEPSEEK_URL,
                        api_key.strip(),
                        current_model,
                        prompt,
                    )

                elif provider == "qwen":

                    result = _call_openai_compatible(
                        QWEN_URL,
                        api_key.strip(),
                        current_model,
                        prompt,
                    )

                else:
                    raise ValueError(
                        f"Unsupported AI provider: {provider}"
                    )

                print(
                    f"[TraceForge AI] Response received from "
                    f"{provider}/{current_model}"
                )

                return result

            except Exception as exc:

                last_error = exc
                error_text = str(exc)

                is_temporary = (
                    "503" in error_text
                    or "UNAVAILABLE" in error_text
                    or "temporarily" in error_text.lower()
                    or "high demand" in error_text.lower()
                    or "429" in error_text
                    or "rate limit" in error_text.lower()
                    or "timeout" in error_text.lower()
                    or "timed out" in error_text.lower()
                )

                if not is_temporary:
                    raise

                if attempt < MAX_RETRIES - 1:

                    wait_time = 2 ** attempt

                    print(
                        f"[TraceForge AI] Temporary AI error. "
                        f"Retrying in {wait_time}s..."
                    )

                    time.sleep(wait_time)

        print(
            f"[TraceForge AI] Model {current_model} "
            f"exhausted retries."
        )

    raise RuntimeError(
        "AI request failed after retries. "
        f"Last error: {last_error}"
    )


# ============================================================
# BACKWARD COMPATIBILITY
# ============================================================

def call_gemini(
    prompt,
    api_key,
    model=None,
):
    """Backward-compatible Gemini helper."""

    return call_ai(
        prompt=prompt,
        api_key=api_key,
        provider="gemini",
        model=model,
    )


# ============================================================
# REPOSITORY READING
# ============================================================

def read_repository(repo_path):
    """
    Reads relevant text/code files from the repository.
    """

    root = Path(repo_path).resolve()

    if not root.exists():
        raise FileNotFoundError(
            f"Repository does not exist: {root}"
        )

    if not root.is_dir():
        raise NotADirectoryError(
            f"Repository path is not a directory: {root}"
        )

    files = []

    for path in root.rglob("*"):

        if not path.is_file():
            continue

        if any(part in IGNORED_DIRS for part in path.parts):
            continue

        if path.suffix.lower() not in TEXT_EXTENSIONS:
            continue

        try:
            relative_path = path.relative_to(root)

            content = path.read_text(
                encoding="utf-8",
                errors="ignore",
            )

            files.append(
                {
                    "path": str(relative_path),
                    "content": content,
                }
            )

        except Exception as exc:
            print(
                f"[TraceForge] Could not read {path}: {exc}"
            )

    return files


# ============================================================
# BUILD REPOSITORY CONTEXT
# ============================================================

def build_repository_context(repo_path):
    """
    Converts repository files into a bounded context
    for the AI model.
    """

    files = read_repository(repo_path)

    chunks = []

    total_chars = 0

    MAX_FILE_CHARS = 15_000
    MAX_TOTAL_CHARS = 90_000

    for file in files:

        content = file["content"]

        if len(content) > MAX_FILE_CHARS:
            content = content[:MAX_FILE_CHARS] + (
                "\n\n[FILE TRUNCATED]"
            )

        chunk = (
            f"\n===== FILE: {file['path']} =====\n"
            f"{content}\n"
        )

        if total_chars + len(chunk) > MAX_TOTAL_CHARS:
            break

        chunks.append(chunk)
        total_chars += len(chunk)

    return "".join(chunks)


# ============================================================
# JSON PARSER
# ============================================================

def parse_json_response(raw_text):
    """
    Converts AI JSON response into Python dict.
    Handles markdown JSON fences.
    """

    text = raw_text.strip()

    if text.startswith("```json"):
        text = text[len("```json"):].strip()

    elif text.startswith("```"):
        text = text[len("```"):].strip()

    if text.endswith("```"):
        text = text[:-3].strip()

    try:
        return json.loads(text)

    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "AI returned invalid JSON.\n"
            f"Response:\n{text}"
        ) from exc


# ============================================================
# ISSUE ANALYSIS
# ============================================================

def analyze_issue(
    issue,
    repo_path,
    api_key,
    provider="gemini",
    model=None,
):
    """
    Uses the selected AI provider to understand
    the issue and create a plan.
    """

    repository_context = build_repository_context(repo_path)

    prompt = f"""
You are the reasoning engine of TraceForge,
an autonomous coding repair system.

Analyze the user's coding issue using the repository context.

USER ISSUE:
{issue}

REPOSITORY:
{repository_context}

Return ONLY valid JSON.

Required format:

{{
  "hypothesis": "Most likely root cause",
  "relevant_files": [
    "path/to/file.py"
  ],
  "plan": [
    "Step 1",
    "Step 2",
    "Step 3"
  ],
  "confidence": "high"
}}

Rules:

1. Base the analysis on the repository.
2. Do not invent files.
3. Prefer the smallest reasonable fix.
4. Do not modify .env files.
5. Do not claim that tests passed.
6. Keep the response valid JSON.
"""

    response = call_ai(
        prompt=prompt,
        api_key=api_key,
        provider=provider,
        model=model,
    )

    result = parse_json_response(response.text)

    return result


# ============================================================
# CODE CHANGE GENERATION
# ============================================================

def generate_code_changes(
    issue,
    repo_path,
    hypothesis,
    plan,
    api_key,
    provider="gemini",
    model=None,
    patch_error=None,
):
    """
    Asks the selected AI provider to generate
    exact safe text replacements.
    """

    repository_context = build_repository_context(repo_path)

    recovery_instructions = ""
    if patch_error:
        recovery_instructions = f"""
CRITICAL - PREVIOUS PATCH APPLICATION FAILED:
The previous patch could not be applied because old_text did not match the current file. Re-inspect the current repository and generate a new patch. Copy old_text verbatim from the current file. Do not reconstruct or paraphrase old_text.

Previous error details:
{patch_error}
"""

    prompt = f"""
You are the code-editing engine of TraceForge.

Your task is to generate the smallest safe code changes
required to fix the user's issue.
{recovery_instructions}
USER ISSUE:
{issue}

HYPOTHESIS:
{hypothesis}

PLAN:
{json.dumps(plan, indent=2)}

REPOSITORY:
{repository_context}

Return ONLY valid JSON in exactly this structure:

{{
  "changes": [
    {{
      "path": "backend/app/main.py",
      "old_text": "EXACT EXISTING CODE",
      "new_text": "REPLACEMENT CODE",
      "reason": "Why this change is required"
    }}
  ]
}}

STRICT RULES:

1. Only modify files that already exist.
2. Do not create new files.
3. Do not modify .env.
4. Do not modify unrelated code.
5. Make the smallest possible change.
6. old_text must match the existing file EXACTLY.
7. old_text must identify a unique section.
8. new_text must contain the complete replacement.
9. Do not use markdown code fences.
10. Do not claim that tests passed.
11. Return valid JSON only.
"""

    response = call_ai(
        prompt=prompt,
        api_key=api_key,
        provider=provider,
        model=model,
    )

    result = parse_json_response(response.text)

    if "changes" not in result:
        raise RuntimeError(
            "AI response does not contain 'changes'."
        )

    return result


# ============================================================
# SAFE CODE APPLICATION
# ============================================================

def apply_code_changes(repo_path, changes):
    """
    Safely and atomically applies AI-generated text replacements.
    All changes are validated in memory before any file is written.
    If ANY change is invalid, no files are modified.
    """

    root = Path(repo_path).resolve()

    if not isinstance(changes, list):
        return {
            "success": False,
            "applied": [],
            "failed": [
                {
                    "path": None,
                    "error": "Invalid changes format",
                    "reason": "Changes must be a list",
                }
            ],
            "files_changed": 0,
        }

    failed = []
    staged_contents = {}
    staged_paths = []

    # Phase 1: In-memory validation and staging
    for change in changes:

        if not isinstance(change, dict):
            failed.append(
                {
                    "path": None,
                    "error": "Invalid change object",
                    "reason": "Each change must be a dictionary",
                }
            )
            continue

        relative_path = change.get("path")
        old_text = change.get("old_text")
        new_text = change.get("new_text")

        if not relative_path or not isinstance(relative_path, str) or not relative_path.strip():
            failed.append(
                {
                    "path": relative_path,
                    "error": "Missing file path",
                    "reason": "No valid file path provided in change",
                }
            )
            continue

        relative_path = relative_path.strip()

        if old_text is None or new_text is None or not old_text:
            failed.append(
                {
                    "path": relative_path,
                    "error": "Missing old_text or new_text",
                    "reason": "Both old_text and new_text are required and old_text cannot be empty",
                }
            )
            continue

        file_path = (root / relative_path).resolve()

        # Prevent escaping repository boundary
        try:
            file_path.relative_to(root)
        except ValueError:
            failed.append(
                {
                    "path": relative_path,
                    "error": "Path escapes repository boundary",
                    "reason": "Path must stay inside repository",
                }
            )
            continue

        # Prohibit .env modification
        if file_path.name == ".env" or any(part == ".env" for part in file_path.parts):
            failed.append(
                {
                    "path": relative_path,
                    "error": "Modification of .env is prohibited",
                    "reason": ".env files cannot be modified",
                }
            )
            continue

        # File must exist
        if not file_path.exists() or not file_path.is_file():
            failed.append(
                {
                    "path": relative_path,
                    "error": "File does not exist",
                    "reason": "Target file was not found in repository",
                }
            )
            continue

        try:
            if file_path in staged_contents:
                content = staged_contents[file_path]
            else:
                content = file_path.read_text(encoding="utf-8")

            occurrences = content.count(old_text)

            if occurrences == 0:
                failed.append(
                    {
                        "path": relative_path,
                        "error": "old_text not found",
                        "reason": "Generated patch context does not match current file",
                    }
                )
                continue

            if occurrences > 1:
                failed.append(
                    {
                        "path": relative_path,
                        "error": "old_text matched multiple locations",
                        "reason": "old_text must uniquely match exactly one location",
                    }
                )
                continue

            updated_content = content.replace(
                old_text,
                new_text,
                1,
            )

            staged_contents[file_path] = updated_content
            staged_paths.append(relative_path)

        except Exception as exc:
            failed.append(
                {
                    "path": relative_path,
                    "error": str(exc),
                    "reason": "Failed to read or validate file content",
                }
            )

    # If ANY change failed, do NOT write anything to disk (atomic rejection)
    if failed:
        return {
            "success": False,
            "applied": [],
            "failed": failed,
            "files_changed": 0,
        }

    # Phase 2: All changes passed validation; write updated files to disk
    applied = []
    for file_path, new_content in staged_contents.items():
        file_path.write_text(
            new_content,
            encoding="utf-8",
        )
        applied.append(str(file_path.relative_to(root)))

    return {
        "success": True,
        "applied": applied,
        "failed": [],
        "files_changed": len(applied),
    }


# ============================================================
# MANUAL TEST
# ============================================================

if __name__ == "__main__":

    print("TraceForge AI Agent")
    print("-------------------")
    print()
    print(
        "AI API keys must now be provided at runtime."
    )
