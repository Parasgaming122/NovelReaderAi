## 📝 Pull Request Description

### Summary
<!-- Describe what this PR does -->

### Type of Change
- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 🔧 Documentation update

### Related Issue
<!-- Link to related issue: Fixes #123 -->

---

## 📋 Changes Made

<!-- List your changes here -->
- 

---

## ✅ Checklist

### Source Requirements
- [ ] All required metadata fields present (`id`, `name`, `version`, `baseUrl`, `language`)
- [ ] Bypasser integration included (`require("bypasser")`)
- [ ] Uses `fetchPage()` for HTTP requests (not raw `http_get`)
- [ ] No deprecated functions (`regex_replace`, `html_remove` without fallback)
- [ ] Tested in NovelDokusha app

### Code Quality
- [ ] Lua syntax is valid (no errors)
- [ ] No debug prints left in code
- [ ] Comments added for complex logic
- [ ] Follows existing code style

### Testing
- [ ] Search works correctly
- [ ] Chapter list loads
- [ ] Chapter text displays properly
- [ ] Works with bypass enabled
- [ ] Works without bypass (graceful fallback)

---

## 🧪 Test Results

<!-- Share test results here -->

**Source Name:** 
**Test URL:** 
**Result:** ✅ Pass / ❌ Fail

```
Test output/logs here
```

---

## 📸 Screenshots (if applicable)
<!-- Add screenshots to demonstrate changes -->


---

## Additional Notes
<!-- Any other context for reviewers -->



> **Note:** Please ensure all CI checks pass before requesting review.
