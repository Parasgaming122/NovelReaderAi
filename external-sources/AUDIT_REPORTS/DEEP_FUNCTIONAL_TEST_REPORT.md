# 🧪 Deep Functional Test Report - New Chinese Sources

**Generated:** 2026-07-24 09:02:31 UTC

This report contains **deep functional testing** of all newly added Chinese sources.
Testing includes:
- Base URL connectivity and response time
- Required function presence check
- Search/catalog page accessibility
- Novel page structure validation
- Code quality scoring

## Summary

| Source | Name | URL Reachable | Functions | Score | Status |
|--------|------|--------------|-----------|-------|--------|
| `biquge5200` | www.biquge5200.cc | ❌ 2/4 | 60/100 | ❌ FAIL |
| `biqugecompany` | www.biquge.company | ✅ 2/4 | 65/100 | ⚠️ WARN |
| `ddxss` | www.ddxss.cc | ✅ 2/4 | 70/100 | ✅ PASS |
| `haodoo` | www.haodoo.net | ✅ 2/4 | 65/100 | ⚠️ WARN |
| `ixdzs` | ixdzs8.com | ✅ 2/4 | 70/100 | ✅ PASS |
| `novel543` | www.novel543.com | ✅ 2/4 | 65/100 | ⚠️ WARN |
| `piaotia` | www.piaotia.com | ✅ 2/4 | 65/100 | ⚠️ WARN |
| `powanjuan` | www.powanjuan.cc | ✅ 2/4 | 65/100 | ⚠️ WARN |
| `quanben5` | big5.quanben5.com | ✅ 2/4 | 70/100 | ✅ PASS |
| `rayforboe` | www.rayforboe.com | ✅ 2/4 | 70/100 | ✅ PASS |
| `shuba69` | www.69shuba.com | ❌ 2/4 | 60/100 | ❌ FAIL |
| `shuhaige` | m.shuhaige.net | ✅ 2/4 | 65/100 | ⚠️ WARN |
| `shw5` | www.shw5.cc | ✅ 2/4 | 65/100 | ⚠️ WARN |
| `snapd` | m.snapd.net | ✅ 2/4 | 65/100 | ⚠️ WARN |
| `soxs` | www.soxs.cc | ✅ 2/4 | 70/100 | ✅ PASS |
| `trxs` | trxs.cc | ✅ 2/4 | 65/100 | ⚠️ WARN |
| `ttkan` | www.ttkan.co | ✅ 2/4 | 70/100 | ✅ PASS |
| `twkan` | twkan.com | ❌ 2/4 | 55/100 | ❌ FAIL |
| `wanben` | www.10000txt.com | ✅ 2/4 | 70/100 | ✅ PASS |

**Results:** 7 Passed, 9 Warned, 3 Failed

---
## Detailed Results

### `biquge5200`

- **Base URL:** https://www.biquge5200.cc/
- **URL Reachable:** ❌ No
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ❌ Failed
- **Code Quality Score:** **60/100**
- **Issues Found:**
  - ⚠️ Base URL error: <urlopen error [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: certificate has expired (_ssl.c:1010)>
  - ⚠️ Search page error: <urlopen error [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: certificate has expired (_ssl.c:1010)>

### `biqugecompany`

- **Base URL:** https://www.biquge.company/
- **URL Reachable:** ✅ Yes
- **Response Time:** 562ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ❌ Failed
- **Code Quality Score:** **65/100**
- **Issues Found:**
  - ⚠️ Search page error: HTTP Error 404: Not Found

### `ddxss`

- **Base URL:** https://www.ddxss.cc/
- **URL Reachable:** ✅ Yes
- **Response Time:** 697ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ✅ Accessible
- **Code Quality Score:** **70/100**
- **Issues:** None ✅

### `haodoo`

- **Base URL:** https://www.haodoo.net/
- **URL Reachable:** ✅ Yes
- **Response Time:** 121ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ❌ Failed
- **Code Quality Score:** **65/100**
- **Issues Found:**
  - ⚠️ Search page error: HTTP Error 404: Not Found

### `ixdzs`

- **Base URL:** https://ixdzs8.com/
- **URL Reachable:** ✅ Yes
- **Response Time:** 330ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ✅ Accessible
- **Code Quality Score:** **70/100**
- **Issues:** None ✅

### `novel543`

- **Base URL:** https://www.novel543.com/
- **URL Reachable:** ✅ Yes
- **Response Time:** 187ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ❌ Failed
- **Code Quality Score:** **65/100**
- **Issues Found:**
  - ⚠️ Search page error: HTTP Error 403: Forbidden

### `piaotia`

- **Base URL:** https://www.piaotia.com
- **URL Reachable:** ✅ Yes
- **Response Time:** 253ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ✅ Accessible
- **Novel Page Tested:** ❌ Failed
- **Code Quality Score:** **65/100**
- **Issues Found:**
  - ⚠️ Novel page error: HTTP Error 404: Not Found

### `powanjuan`

- **Base URL:** https://www.powanjuan.cc/
- **URL Reachable:** ✅ Yes
- **Response Time:** 96ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ❌ Failed
- **Code Quality Score:** **65/100**
- **Issues Found:**
  - ⚠️ Search page error: HTTP Error 404: Not Found

### `quanben5`

- **Base URL:** https://big5.quanben5.com/
- **URL Reachable:** ✅ Yes
- **Response Time:** 478ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ✅ Accessible
- **Code Quality Score:** **70/100**
- **Issues:** None ✅

### `rayforboe`

- **Base URL:** https://www.rayforboe.com/
- **URL Reachable:** ✅ Yes
- **Response Time:** 93ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ✅ Accessible
- **Code Quality Score:** **70/100**
- **Issues:** None ✅

### `shuba69`

- **Base URL:** https://www.69shuba.com/
- **URL Reachable:** ❌ No
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ❌ Failed
- **Code Quality Score:** **60/100**
- **Issues Found:**
  - ⚠️ Base URL error: HTTP Error 403: Forbidden
  - ⚠️ Search page error: HTTP Error 403: Forbidden

### `shuhaige`

- **Base URL:** https://m.shuhaige.net/
- **URL Reachable:** ✅ Yes
- **Response Time:** 22579ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ❌ Failed
- **Code Quality Score:** **65/100**
- **Issues Found:**
  - ⚠️ Search page error: HTTP Error 404: Not Found

### `shw5`

- **Base URL:** https://www.shw5.cc/
- **URL Reachable:** ✅ Yes
- **Response Time:** 119ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ❌ Failed
- **Code Quality Score:** **65/100**
- **Issues Found:**
  - ⚠️ Search page error: HTTP Error 404: Not Found

### `snapd`

- **Base URL:** https://m.snapd.net/
- **URL Reachable:** ✅ Yes
- **Response Time:** 104ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ❌ Failed
- **Code Quality Score:** **65/100**
- **Issues Found:**
  - ⚠️ Search page error: HTTP Error 404: Not Found

### `soxs`

- **Base URL:** https://www.soxs.cc/
- **URL Reachable:** ✅ Yes
- **Response Time:** 679ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ✅ Accessible
- **Code Quality Score:** **70/100**
- **Issues:** None ✅

### `trxs`

- **Base URL:** https://trxs.cc/
- **URL Reachable:** ✅ Yes
- **Response Time:** 199ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ❌ Failed
- **Code Quality Score:** **65/100**
- **Issues Found:**
  - ⚠️ Search page error: HTTP Error 404: Not Found

### `ttkan`

- **Base URL:** https://www.ttkan.co/
- **URL Reachable:** ✅ Yes
- **Response Time:** 36ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ✅ Accessible
- **Code Quality Score:** **70/100**
- **Issues:** None ✅

### `twkan`

- **Base URL:** https://twkan.com/
- **URL Reachable:** ❌ No
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ❌ Failed
- **Novel Page Tested:** ❌ Failed
- **Code Quality Score:** **55/100**
- **Issues Found:**
  - ⚠️ Base URL error: HTTP Error 403: Forbidden
  - ⚠️ Search page error: HTTP Error 403: Forbidden
  - ⚠️ Novel page error: HTTP Error 403: Forbidden

### `wanben`

- **Base URL:** https://www.10000txt.com/
- **URL Reachable:** ✅ Yes
- **Response Time:** 511ms
- **Required Functions:** getCatalogList, getChapterList
- **⚠️ Missing Functions:** getNovelInfo, getChapterContent
- **Search Page Tested:** ✅ Accessible
- **Code Quality Score:** **70/100**
- **Issues:** None ✅

---
## Recommendations

### Sources Needing Immediate Attention

- ❌ shuba69 (missing getChapterContent)
- ❌ quanben5 (missing getNovelInfo)
- ❌ twkan
- ❌ wanben (missing getChapterContent)
- ❌ shw5 (missing getNovelInfo)
- ❌ trxs (missing getChapterContent)
- ❌ shuba69 (missing getNovelInfo)
- ❌ ddxss (missing getChapterContent)
- ❌ soxs (missing getNovelInfo)
- ❌ ixdzs (missing getNovelInfo)
- ❌ twkan (missing getNovelInfo)
- ❌ piaotia (missing getNovelInfo)
- ❌ wanben (missing getNovelInfo)
- ❌ piaotia (missing getChapterContent)
- ❌ haodoo (missing getChapterContent)
- ❌ snapd (missing getNovelInfo)
- ❌ biquge5200 (missing getChapterContent)
- ❌ twkan (missing getChapterContent)
- ❌ novel543 (missing getChapterContent)
- ❌ shw5 (missing getChapterContent)
- ❌ rayforboe (missing getNovelInfo)
- ❌ powanjuan (missing getNovelInfo)
- ❌ powanjuan (missing getChapterContent)
- ❌ soxs (missing getChapterContent)
- ❌ shuhaige (missing getChapterContent)
- ❌ biqugecompany (missing getChapterContent)
- ❌ snapd (missing getChapterContent)
- ❌ novel543 (missing getNovelInfo)
- ❌ ixdzs (missing getChapterContent)
- ❌ haodoo (missing getNovelInfo)
- ❌ rayforboe (missing getChapterContent)
- ❌ shuhaige (missing getNovelInfo)
- ❌ biquge5200
- ❌ ddxss (missing getNovelInfo)
- ❌ quanben5 (missing getChapterContent)
- ❌ ttkan (missing getChapterContent)
- ❌ trxs (missing getNovelInfo)
- ❌ biqugecompany (missing getNovelInfo)
- ❌ ttkan (missing getNovelInfo)
- ❌ biquge5200 (missing getNovelInfo)
- ❌ shuba69
