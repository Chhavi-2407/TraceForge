from pathlib import Path
from unittest.mock import MagicMock
import pytest

from ai_agent import apply_code_changes, generate_code_changes
from app.main import runs, run_credentials, execute_run, get_stage, create_execution_trace


# ============================================================
# 1. Exact old_text match succeeds
# ============================================================

def test_exact_old_text_match_succeeds(tmp_path):
    src_file = tmp_path / "greeting.py"
    src_file.write_text("def greet():\n    return 'hello world'\n", encoding="utf-8")

    changes = [
        {
            "path": "greeting.py",
            "old_text": "'hello world'",
            "new_text": "'hello TraceForge'",
            "reason": "Update greeting to TraceForge",
        }
    ]

    result = apply_code_changes(str(tmp_path), changes)

    assert result["success"] is True
    assert result["files_changed"] == 1
    assert result["applied"] == ["greeting.py"]
    assert result["failed"] == []
    assert src_file.read_text(encoding="utf-8") == "def greet():\n    return 'hello TraceForge'\n"


# ============================================================
# 2. old_text not found is safely rejected
# ============================================================

def test_old_text_not_found_safely_rejected(tmp_path):
    config_file = tmp_path / "config.py"
    original_content = "DEBUG = True\nPORT = 8000\n"
    config_file.write_text(original_content, encoding="utf-8")

    changes = [
        {
            "path": "config.py",
            "old_text": "DEBUG = False",
            "new_text": "DEBUG = True",
        }
    ]

    result = apply_code_changes(str(tmp_path), changes)

    assert result["success"] is False
    assert len(result["failed"]) == 1
    assert result["failed"][0]["path"] == "config.py"
    assert result["failed"][0]["error"] == "old_text not found"
    assert "Generated patch context does not match" in result["failed"][0]["reason"]
    # File content must remain completely unchanged
    assert config_file.read_text(encoding="utf-8") == original_content


# ============================================================
# 3. Duplicate old_text is safely rejected
# ============================================================

def test_duplicate_old_text_safely_rejected(tmp_path):
    util_file = tmp_path / "utils.py"
    original_content = "val = 1\n# separator\nval = 1\n"
    util_file.write_text(original_content, encoding="utf-8")

    changes = [
        {
            "path": "utils.py",
            "old_text": "val = 1",
            "new_text": "val = 2",
        }
    ]

    result = apply_code_changes(str(tmp_path), changes)

    assert result["success"] is False
    assert len(result["failed"]) == 1
    assert result["failed"][0]["error"] == "old_text matched multiple locations"
    assert util_file.read_text(encoding="utf-8") == original_content


# ============================================================
# 4. Repository traversal is rejected
# ============================================================

def test_repository_traversal_rejected(tmp_path):
    changes = [
        {
            "path": "../outside.txt",
            "old_text": "something",
            "new_text": "else",
        }
    ]

    result = apply_code_changes(str(tmp_path), changes)

    assert result["success"] is False
    assert len(result["failed"]) == 1
    assert result["failed"][0]["error"] == "Path escapes repository boundary"


# ============================================================
# 5. .env modification is rejected
# ============================================================

def test_env_modification_rejected(tmp_path):
    env_file = tmp_path / ".env"
    original_content = "GEMINI_API_KEY=secret_key_123\n"
    env_file.write_text(original_content, encoding="utf-8")

    changes = [
        {
            "path": ".env",
            "old_text": "GEMINI_API_KEY=secret_key_123",
            "new_text": "GEMINI_API_KEY=exposed",
        }
    ]

    result = apply_code_changes(str(tmp_path), changes)

    assert result["success"] is False
    assert len(result["failed"]) == 1
    assert result["failed"][0]["error"] == "Modification of .env is prohibited"
    assert env_file.read_text(encoding="utf-8") == original_content


# ============================================================
# 6. Multi-file patch is atomic
# ============================================================

def test_multi_file_patch_is_atomic(tmp_path):
    file1 = tmp_path / "file1.py"
    file2 = tmp_path / "file2.py"
    content1 = "alpha = 1\n"
    content2 = "beta = 2\n"
    file1.write_text(content1, encoding="utf-8")
    file2.write_text(content2, encoding="utf-8")

    changes = [
        {
            "path": "file1.py",
            "old_text": "alpha = 1",
            "new_text": "alpha = 10",
        },
        {
            "path": "file2.py",
            "old_text": "stale_not_matching",
            "new_text": "beta = 20",
        },
    ]

    result = apply_code_changes(str(tmp_path), changes)

    assert result["success"] is False
    assert result["applied"] == []
    # Both files must remain unchanged because change 2 failed
    assert file1.read_text(encoding="utf-8") == content1
    assert file2.read_text(encoding="utf-8") == content2


# ============================================================
# 7. Patch recovery can regenerate a stale patch
# ============================================================

def test_patch_recovery_can_regenerate_stale_patch(tmp_path, monkeypatch):
    target_file = tmp_path / "service.py"
    target_file.write_text("def handle():\n    return 404\n", encoding="utf-8")

    # Stale patch has old_text "def handle():\n    return 500\n"
    stale_changes = [
        {
            "path": "service.py",
            "old_text": "def handle():\n    return 500\n",
            "new_text": "def handle():\n    return 200\n",
        }
    ]

    initial_result = apply_code_changes(str(tmp_path), stale_changes)
    assert initial_result["success"] is False
    assert initial_result["failed"][0]["error"] == "old_text not found"

    # Mock AI response for regeneration
    prompts_captured = []

    def mock_call_ai(prompt, api_key, provider, model):
        prompts_captured.append(prompt)
        mock_resp = MagicMock()
        mock_resp.text = '{"changes": [{"path": "service.py", "old_text": "return 404", "new_text": "return 200", "reason": "Fixed"}]}'
        return mock_resp

    monkeypatch.setattr("ai_agent.call_ai", mock_call_ai)

    regenerated = generate_code_changes(
        issue="Fix status code",
        repo_path=str(tmp_path),
        hypothesis="return 404 is wrong",
        plan=["Change return 404 to 200"],
        api_key="mock_key",
        provider="gemini",
        patch_error="service.py: old_text not found",
    )

    # Verify that the regeneration prompt explicitly instructs verbatim copying
    assert len(prompts_captured) == 1
    assert "The previous patch could not be applied because old_text did not match the current file." in prompts_captured[0]
    assert "Copy old_text verbatim from the current file. Do not reconstruct or paraphrase old_text." in prompts_captured[0]

    # Applying the regenerated patch now succeeds
    recovery_apply_result = apply_code_changes(str(tmp_path), regenerated["changes"])
    assert recovery_apply_result["success"] is True
    assert target_file.read_text(encoding="utf-8") == "def handle():\n    return 200\n"


# ============================================================
# 8. Successful recovery allows the run to continue to Test
# ============================================================

def test_successful_recovery_allows_run_to_continue_to_test(tmp_path, monkeypatch):
    import asyncio
    code_file = tmp_path / "app.py"
    code_file.write_text("status = 'pending'\n", encoding="utf-8")

    # Set up mock git repo (initialize empty git repo)
    git_dir = tmp_path / ".git"
    git_dir.mkdir()

    # Track calls to generate_code_changes:
    # 1st call: returns stale patch
    # 2nd call (recovery): returns exact matching patch
    call_count = 0

    def mock_generate_code_changes(issue, repo_path, hypothesis, plan, api_key, provider, model=None, patch_error=None):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return {
                "changes": [
                    {
                        "path": "app.py",
                        "old_text": "status = 'wrong_stale'",
                        "new_text": "status = 'verified'",
                    }
                ]
            }
        else:
            assert patch_error is not None
            return {
                "changes": [
                    {
                        "path": "app.py",
                        "old_text": "status = 'pending'",
                        "new_text": "status = 'verified'",
                    }
                ]
            }

    def mock_analyze_issue(issue, repo_path, api_key, provider="gemini", model=None):
        return {
            "hypothesis": "Status needs to be verified",
            "plan": ["Update status in app.py"],
            "relevant_files": ["app.py"],
            "confidence": "high",
        }

    def mock_run_tests(repo_path):
        return {
            "executed": True,
            "passed": True,
            "command": "make test",
            "output": "All 1 tests passed.",
        }

    monkeypatch.setattr("app.main.analyze_issue", mock_analyze_issue)
    monkeypatch.setattr("app.main.generate_code_changes", mock_generate_code_changes)
    monkeypatch.setattr("app.main.run_tests", mock_run_tests)
    monkeypatch.setattr("app.main.get_git_changed_files", lambda repo: ["app.py"])

    run_id = 9999
    test_run = {
        "id": run_id,
        "issue": "Fix status flag",
        "repo_path": str(tmp_path),
        "status": "Pending",
        "attempts": 0,
        "tests": "Not started",
        "files_changed": 0,
        "created_at": "2026-09-27T09:00:00",
        "completed_at": None,
        "execution_trace": create_execution_trace(),
    }

    runs.append(test_run)
    run_credentials[run_id] = {
        "provider": "gemini",
        "api_key": "mock_test_key",
        "model": "gemini-2.5-flash",
    }

    try:
        asyncio.run(execute_run(run_id))

        # Check Edit stage: must be Completed, with the recovery explanation
        edit_stage = get_stage(test_run, "Edit")
        assert edit_stage["status"] == "Completed"
        assert "Initial patch context did not match. Regenerated patch from current repository state and applied successfully." in edit_stage["description"]

        # Check Test stage: was executed and completed
        test_stage = get_stage(test_run, "Test")
        assert test_stage["status"] == "Completed"
        assert "Tests passed successfully" in test_stage["description"]

        # Overall run status must be Success
        assert test_run["status"] == "Success"
        assert test_run["files_changed"] == 1
        assert code_file.read_text(encoding="utf-8") == "status = 'verified'\n"

    finally:
        if test_run in runs:
            runs.remove(test_run)
        if run_id in run_credentials:
            del run_credentials[run_id]
