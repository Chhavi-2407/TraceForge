Create a complete, professional README.md for my TraceForge project.

IMPORTANT:
- Create/update ONLY the root-level README.md.
- Do not modify any source code.
- Do not modify frontend files.
- Do not modify backend files.
- Do not modify the Makefile.
- Do not invent features that are not present in the project.
- Inspect the existing project structure, frontend, backend, Makefile, and available functionality before writing the README.
- The README should accurately describe the current implementation.
- Make it suitable for a GitHub repository and an LCC × Dev Club Hackathon 2026 final submission.
- Make it polished, professional, easy to understand, and visually attractive.
- Use proper Markdown headings, tables, code blocks, diagrams, and checklists.
- Do not make the README unnecessarily verbose.
- Do not include fake metrics, fake test results, fake screenshots, fake contributors, or unsupported claims.
- Do not claim the system is 100% autonomous or production-ready.
- Do not claim a feature exists unless it is actually implemented.

PROJECT NAME:
TraceForge

PROJECT TAGLINE:
Autonomous Coding Harness — From Issue to Verified Code Change

CORE IDEA:

TraceForge is an AI-powered autonomous coding harness that helps developers solve software issues end-to-end.

The workflow is:

Issue
→ Context Retrieval
→ Hypothesis
→ Plan
→ Edit
→ Test
→ Failure Analysis
→ Recovery / Replanning
→ Verification

TraceForge analyzes a software issue, scans the repository for relevant context, generates a technical hypothesis, creates an implementation plan, generates code changes, safely applies patches, runs tests, and records the execution trace.

The README should explain that TraceForge focuses on making autonomous coding more traceable, testable, safer, and verifiable rather than simply generating code.

==================================================
README STRUCTURE
==================================================

Create the README with the following sections.

# 1. Hero / Introduction

Start with:

# TraceForge

Then:

> Autonomous Coding Harness — From Issue to Verified Code Change.

Give a concise 2–3 paragraph explanation of what TraceForge is and what problem it solves.

Include the core workflow:

Issue → Context → Hypothesis → Plan → Edit → Test → Failure Analysis → Recovery → Verification

Do not overclaim.

==================================================
# 2. Why TraceForge?

Explain the difference between a basic AI coding assistant and TraceForge.

Basic workflow:

Prompt → Generated Code

TraceForge workflow:

Problem
↓
Repository Understanding
↓
Hypothesis
↓
Plan
↓
Code Generation
↓
Patch Validation
↓
Code Application
↓
Testing
↓
Failure Analysis
↓
Recovery
↓
Verification

Explain that TraceForge focuses on the complete software-repair lifecycle and execution trace.

==================================================
# 3. Key Features

Document the actual implemented features.

Include subsections for:

## Issue Understanding

Explain that TraceForge accepts a natural-language software issue.

## Repository Context Retrieval

Explain repository scanning and relevant context retrieval.

## Hypothesis Generation

Explain root-cause hypothesis generation.

## Implementation Planning

Explain how the AI creates a structured implementation plan.

## Autonomous Code Editing

Explain generated structured changes using concepts such as:

- file path
- old_text
- new_text
- reason

## Safe Patch Application

Explain the existing safety checks accurately.

Mention relevant protections such as:

- repository boundary/path validation
- exact old_text matching
- duplicate-match protection
- .env protection
- malformed patch validation

Do not claim protections that do not exist.

## Automated Testing

Explain how TraceForge runs available repository tests and records results.

Mention the Makefile workflow if it is actually integrated.

## Failure Analysis and Recovery

Explain the implemented failure/recovery behavior accurately.

Mention that autonomous runs can encounter:

- invalid AI responses
- malformed JSON
- patch-context mismatches
- patch application failures
- test failures
- provider errors

Only describe recovery mechanisms that actually exist in the code.

## Execution Trace

Explain the stage-based run trace:

1. Issue
2. Context Retrieval
3. Hypothesis
4. Plan
5. Edit
6. Test
7. Failure Analysis
8. Recovery / Replanning
9. Verification

==================================================
# 4. Screens / Interface

Describe the actual frontend pages that exist.

Include:

- Dashboard
- New Run
- Runs
- Run Details
- Settings

Explain what each page does.

Do not invent pages.

If screenshots are actually present in the repository, include them appropriately.

If no screenshots exist, do not create fake image paths.

==================================================
# 5. Architecture

Create a clean Markdown architecture diagram.

Use this conceptual architecture:

Frontend
React + Vite
↓
FastAPI Backend
↓
Run Management
Repository Context Retrieval
AI Orchestration
Hypothesis Generation
Planning
Code Generation
Patch Application
Testing
Failure Handling
Execution Trace
↓
AI Provider

Mention the actual supported AI providers based on the current implementation.

==================================================
# 6. Tech Stack

Document the actual stack.

Use categories:

Frontend:
- React
- Vite
- JavaScript
- CSS

Backend:
- Python
- FastAPI
- Uvicorn
- Pytest

AI:
- Google Gemini
- DeepSeek
- Qwen

Only list a provider if it is actually supported by the current code.

Development:
- Git
- GitHub
- Make
- REST APIs

==================================================
# 7. Project Structure

Inspect the actual repository and create an accurate tree.

It should be similar to:

TraceForge/
├── backend/
│   ├── app/
│   │   └── main.py
│   ├── ai_agent.py
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── Makefile
├── .gitignore
└── README.md

BUT:
Use the actual current project structure.
Do not invent directories or files.

==================================================
# 8. Requirements

Document actual requirements.

Include:

- Python
- Node.js
- npm
- Git
- Make

Use versions from the project configuration if available.

Do not invent version requirements if they are not defined.

==================================================
# 9. Installation

Document the actual setup process.

Include:

git clone <YOUR_GITHUB_REPOSITORY_URL>
cd TraceForge

Then:

make install

Also provide manual backend/frontend installation only if useful.

==================================================
# 10. Running TraceForge

Document actual commands.

Backend:

make backend

Frontend:

make frontend

Development:

make dev

If the actual Makefile uses different behavior, document what it really does.

Backend default URL:

http://127.0.0.1:8000

Swagger:

http://127.0.0.1:8000/docs

Frontend URL should be documented based on the actual Vite configuration if known.

==================================================
# 11. AI Provider Configuration

Explain how the user configures:

- AI Provider
- API Key
- Model

Do NOT include any real API keys.

Explain that API keys are runtime/session credentials.

Do not claim they are permanently encrypted or stored unless the code actually does that.

==================================================
# 12. Testing

Document actual Makefile commands:

make test
make test-backend
make test-frontend
make build
make check

Explain what each command does based on the actual Makefile.

Do not claim frontend tests exist if package.json does not define them.

==================================================
# 13. Makefile

Create a table:

Command | Description

Include:

make help
make install
make backend
make frontend
make dev
make test
make test-backend
make test-frontend
make build
make check
make clean

Descriptions must match the actual Makefile.

==================================================
# 14. Security and Safety

Explain actual protections in the project.

Include relevant protections such as:

- repository path validation
- protection against repository escape
- .env protection
- exact patch matching
- duplicate old_text detection
- validation before writing
- runtime API credentials
- bounded recovery attempts

Again:
Only describe protections that actually exist in the current implementation.

==================================================
# 15. Example Autonomous Workflow

Show an example:

Developer submits issue
↓
TraceForge analyzes issue
↓
Repository is scanned
↓
Relevant context is retrieved
↓
Hypothesis is generated
↓
Implementation plan is created
↓
Code changes are generated
↓
Patch is validated
↓
Changes are applied
↓
Tests are executed
↓
Failures are analyzed if necessary
↓
Recovery / replanning happens if supported
↓
Final verification

Explain that the developer can inspect the execution trace.

==================================================
# 16. What Makes TraceForge Different?

Explain the project's main differentiator:

TraceForge is not only an AI code generator.

It is designed as an observable autonomous software-repair workflow that connects:

- issue understanding
- repository context
- reasoning stages
- code generation
- safe patching
- testing
- failure handling
- verification

Avoid marketing exaggeration.

==================================================
# 17. Use Cases

Include realistic use cases:

- fixing bugs from GitHub issues
- adding regression tests
- modifying existing functionality
- investigating failing tests
- implementing small feature changes
- repository-level issue analysis
- validating AI-generated patches
- autonomous software maintenance experiments

==================================================
# 18. Design Principles

Use:

### Autonomy
Reduce repetitive manual work.

### Traceability
Make the autonomous process observable.

### Safety
Validate changes before modifying repositories.

### Verification
Use tests and verification rather than treating generated code as automatically correct.

==================================================
# 19. Current Project Status

Create a checklist based on ACTUAL implemented features.

Possible items:

- [x] AI-powered issue analysis
- [x] Repository scanning
- [x] Context retrieval
- [x] Hypothesis generation
- [x] Implementation planning
- [x] AI-generated code changes
- [x] Safe patch application
- [x] Automated testing workflow
- [x] Execution traces
- [x] Failure handling
- [x] Recovery / replanning
- [x] Multi-provider AI architecture
- [x] React dashboard
- [x] New Run workflow
- [x] Run history
- [x] Run details
- [x] AI provider settings
- [x] Makefile workflow

IMPORTANT:
Verify each checkbox against the actual code before marking it complete.

If something is incomplete, mark it appropriately instead of claiming it is done.

==================================================
# 20. Future Improvements

Include reasonable future improvements such as:

- Git branch isolation
- Pull Request generation
- Git diff visualization
- advanced test-command detection
- stronger patch conflict resolution
- containerized execution
- sandboxed execution
- streaming AI responses
- persistent run history
- CI/CD integration
- automated PR review
- additional AI providers

Clearly label these as future ideas, not existing features.

==================================================
# 21. Hackathon

Include:

Built for:

LCC × Dev Club Hackathon 2026

Project:

TraceForge

Do not invent team member names.

==================================================
# 22. License

State:

This project is developed as a hackathon project.

Add a license only if an actual LICENSE file exists.

If no LICENSE file exists, say:

"License information will be added before public release."

==================================================
# 23. Closing

End with:

# TraceForge

From Issue → to Code → to Tests → to Verification.

Build. Trace. Verify.

==================================================
IMPORTANT WRITING RULES
==================================================

1. The README must be professional and GitHub-ready.

2. Use emojis sparingly for section headings where appropriate.

3. Do not make it sound like generic AI marketing.

4. Do not use phrases such as:
   - "revolutionary"
   - "100% autonomous"
   - "perfect"
   - "zero failures"
   - "production-ready"
   - "guaranteed"

5. Do not invent performance metrics.

6. Do not invent test counts.

7. Do not invent screenshots.

8. Do not invent team members.

9. Do not expose API keys.

10. Do not expose personal computer paths such as:
    /Users/chhavi/Desktop/TraceForge

11. Use relative project paths only.

12. Make all code blocks valid Markdown.

13. Keep the README readable instead of making every section extremely long.

14. Use tables where they improve readability.

15. Use a clean architecture diagram.

16. Make the README understandable to:
    - hackathon judges
    - developers
    - potential contributors
    - someone seeing the project for the first time

17. Most importantly:
    Inspect the CURRENT TraceForge codebase before writing the README and make the README reflect what actually exists.

After creating README.md:

1. Read the entire README once.
2. Check every technical claim against the current project.
3. Remove unsupported claims.
4. Ensure all commands match the current Makefile.
5. Ensure the project structure is accurate.
6. Ensure no API key, personal path, or secret appears.
7. Do not modify any file other than README.md.

Finally, show me the final README.md content.
