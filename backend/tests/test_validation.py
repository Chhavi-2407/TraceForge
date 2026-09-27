from pathlib import Path

import pytest
from pydantic import ValidationError

from app.main import RunRequest


def test_valid_request(tmp_path):
    request = RunRequest(
        issue="Fix API validation bug",
        repo_path=str(tmp_path),
    )

    assert request.issue == "Fix API validation bug"
    assert request.repo_path == str(tmp_path.resolve())


def test_empty_issue():
    with pytest.raises(ValidationError):
        RunRequest(
            issue="",
            repo_path="/tmp",
        )


def test_whitespace_issue():
    with pytest.raises(ValidationError):
        RunRequest(
            issue="   ",
            repo_path="/tmp",
        )


def test_empty_repo_path():
    with pytest.raises(ValidationError):
        RunRequest(
            issue="Fix bug",
            repo_path="",
        )


def test_whitespace_repo_path():
    with pytest.raises(ValidationError):
        RunRequest(
            issue="Fix bug",
            repo_path="   ",
        )


def test_nonexistent_repo_path():
    with pytest.raises(ValidationError):
        RunRequest(
            issue="Fix bug",
            repo_path="/this/path/does/not/exist",
        )


def test_repo_path_must_be_directory(tmp_path):
    file_path = tmp_path / "file.txt"
    file_path.write_text("test")

    with pytest.raises(ValidationError):
        RunRequest(
            issue="Fix bug",
            repo_path=str(file_path),
        )


def test_repo_path_is_normalized(tmp_path):
    request = RunRequest(
        issue="Fix bug",
        repo_path=str(tmp_path),
    )

    assert request.repo_path == str(Path(tmp_path).expanduser().resolve())


def test_detect_test_command_makefile(tmp_path):
    from app.main import detect_test_command

    # Makefile with a test target
    makefile = tmp_path / "Makefile"
    makefile.write_text(".PHONY: test\ntest:\n\tpytest\n")
    assert detect_test_command(str(tmp_path)) == "make test"


def test_detect_test_command_makefile_without_test_target(tmp_path):
    from app.main import detect_test_command

    # Makefile with only build target should not return make test
    makefile = tmp_path / "Makefile"
    makefile.write_text("build:\n\tnpm run build\n")
    assert detect_test_command(str(tmp_path)) is None

