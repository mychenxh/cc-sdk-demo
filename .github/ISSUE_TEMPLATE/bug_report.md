---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Install the SDK: `npm install @instantlyeasy/claude-code-sdk-ts@version`
2. Run this code:
```javascript
// Your code here
```
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Actual behavior**
What actually happened, including any error messages.

**Environment:**
 - OS: [e.g. macOS 14.0, Ubuntu 22.04, Windows 11]
 - Node.js version: [e.g. 18.17.0]
 - SDK version: [e.g. 0.3.0-beta.1]
 - Claude CLI version: [run `claude --version`]

**Additional context**
Add any other context about the problem here.

**Logs**
If applicable, add debug logs by running with debug enabled:
```javascript
const response = await claude()
  .withDebug(true)
  .query('...');
```