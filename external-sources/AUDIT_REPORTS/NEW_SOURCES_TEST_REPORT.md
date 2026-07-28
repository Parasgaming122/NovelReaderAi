# 🆕 New Chinese Sources - Test Report

**Generated:** 2026-07-24 09:00:18 UTC

This report focuses exclusively on the newly added Chinese novel sources.

## Functional Test Results

| Source ID | Name | Base URL | Status | Response Time | Issues |
|-----------|------|----------|--------|--------------|--------|
| `biquge5200` | 笔趣阁5200 | [https://www.biquge5200.cc/](https://www.biquge5200.cc/) | ❌ url_error | N/A | 0 |
| `biqugecompany` | 笔趣阁Company | [https://www.biquge.company/](https://www.biquge.company/) | ✅ Working | 715ms | 0 |
| `ddxss` | 顶点小说 | [https://www.ddxss.cc/](https://www.ddxss.cc/) | ✅ Working | 722ms | 0 |
| `haodoo` | 好读 | [https://www.haodoo.net/](https://www.haodoo.net/) | ✅ Working | 127ms | 0 |
| `ixdzs` | 爱下电子书 | [https://ixdzs8.com/](https://ixdzs8.com/) | ✅ Working | 300ms | 1 |
| `novel543` | Novel543 | [https://www.novel543.com/](https://www.novel543.com/) | ✅ Working | 187ms | 2 |
| `piaotia` | PiaoTia | [https://www.piaotia.com](https://www.piaotia.com) | ✅ Working | 225ms | 2 |
| `powanjuan` | 破万卷 | [https://www.powanjuan.cc/](https://www.powanjuan.cc/) | ✅ Working | 134ms | 0 |
| `quanben5` | Quanben5 | [https://big5.quanben5.com/](https://big5.quanben5.com/) | ✅ Working | 477ms | 0 |
| `rayforboe` | 顶级看书网 | [https://www.rayforboe.com/](https://www.rayforboe.com/) | ✅ Working | 113ms | 0 |
| `shuba69` | 69shuba | [https://www.69shuba.com/](https://www.69shuba.com/) | ❌ http_error | N/A | 1 |
| `shuhaige` | 书海阁 | [https://m.shuhaige.net/](https://m.shuhaige.net/) | ✅ Working | 22196ms | 0 |
| `shw5` | 书香万卷 | [https://www.shw5.cc/](https://www.shw5.cc/) | ✅ Working | 115ms | 0 |
| `snapd` | SnapD小说 | [https://m.snapd.net/](https://m.snapd.net/) | ✅ Working | 105ms | 0 |
| `soxs` | 搜小说网 | [https://www.soxs.cc/](https://www.soxs.cc/) | ✅ Working | 1204ms | 0 |
| `trxs` | 天人小说 | [https://trxs.cc/](https://trxs.cc/) | ✅ Working | 247ms | 0 |
| `ttkan` | TTKan | [https://www.ttkan.co/](https://www.ttkan.co/) | ✅ Working | 34ms | 1 |
| `twkan` | TWKan | [https://twkan.com/](https://twkan.com/) | ❌ http_error | N/A | 1 |
| `wanben` | 万本TXT | [https://www.10000txt.com/](https://www.10000txt.com/) | ✅ Working | 772ms | 0 |

## Ponytail Code Quality Analysis

### biquge5200

✅ **Clean** - No ponytail issues found

### biqugecompany

✅ **Clean** - No ponytail issues found

### ddxss

✅ **Clean** - No ponytail issues found

### haodoo

✅ **Clean** - No ponytail issues found

### ixdzs

**Findings:**

- `L106` [`stdlib_candidates`] Complex string matching
  ```
  local lastId = string.match(lastUrl, "/p(%d+)%.html$")
  ```

### novel543

**Findings:**

- `L130` [`stdlib_candidates`] Complex string matching
  ```
  local chapterFile = string.match(url, "/([^/]+)%.html$") or ""
  ```
- `L149` [`stdlib_candidates`] Complex string matching
  ```
  if string.match(fname, "^" .. chapterFile:gsub("%-", "%%-") .. "_%d+%.html$") then
  ```

### piaotia

**Findings:**

- `L22` [`stdlib_candidates`] Complex string matching
  ```
  local folderId, bookId = string.match(bookUrl, "/(%d+)/(%d+)%.html$")
  ```
- `L24` [`stdlib_candidates`] Complex string matching
  ```
  folderId, bookId = string.match(bookUrl, "/(%d+)/(%d+)/?$")
  ```

### powanjuan

✅ **Clean** - No ponytail issues found

### quanben5

✅ **Clean** - No ponytail issues found

### rayforboe

✅ **Clean** - No ponytail issues found

### shuba69

**Findings:**

- `L110` [`stdlib_candidates`] Complex string matching
  ```
  local id = string.match(bookUrl, "/(%d+)%.htm$")
  ```

### shuhaige

✅ **Clean** - No ponytail issues found

### shw5

✅ **Clean** - No ponytail issues found

### snapd

✅ **Clean** - No ponytail issues found

### soxs

✅ **Clean** - No ponytail issues found

### trxs

✅ **Clean** - No ponytail issues found

### ttkan

**Findings:**

- `L150` [`stdlib_candidates`] Complex string matching
  ```
  local chapterName = string.match(match, '"chapter_name"%s*:%s*"([^"]+)"')
  ```

### twkan

**Findings:**

- `L115` [`stdlib_candidates`] Complex string matching
  ```
  local bookId = string.match(bookUrl, "/book/([^/.]+)%.html")
  ```

### wanben

✅ **Clean** - No ponytail issues found

## Verdict

| Metric | Result |
|--------|--------|
| **Sources Tested** | 19 |
| **Passing** | 16 |
| **Failing** | 3 |
| **Pass Rate** | 84.2% |

✅ **Good** - 16/19 sources working. Minor fixes needed.