#!/usr/bin/env python3
"""
Generate Markdown Report from Test Results
"""

import json
from datetime import datetime

def generate_report():
    try:
        with open("test-results.json", "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("No test results found, creating empty report")
        return
    
    results = data.get("results", {})
    timestamp = data.get("timestamp", datetime.now().isoformat())
    
    report = []
    report.append("# 📚 Novel Source Test Report\n")
    report.append(f"**Generated**: {timestamp}\n")
    report.append(f"**Total Sources Tested**: {data.get('total_sources', len(results))}\n")
    
    # Summary stats
    accessible = sum(1 for r in results.values() if r.get("accessible"))
    catalog_ok = sum(1 for r in results.values() if r.get("catalog_ok"))
    search_ok = sum(1 for r in results.values() if r.get("search_ok"))
    
    report.append("## Summary\n")
    report.append("| Metric | Count | Percentage |")
    report.append("|--------|-------|------------|")
    report.append(f"| Total Sources | {len(results)} | 100% |")
    report.append(f"| ✅ Accessible | {accessible} | {accessible/len(results)*100:.0f}% |")
    report.append(f"| 📖 Catalog Working | {catalog_ok} | {catalog_ok/len(results)*100:.0f}% |")
    report.append(f"| 🔍 Search Working | {search_ok} | {search_ok/len(results)*100:.0f}% |\n")
    
    # Detailed results
    report.append("## Source Details\n")
    report.append("| ID | Name | Access | Catalog | Search | CF | Status |")
    report.append("|----|------|--------|---------|--------|-----|--------|")
    
    for sid, r in sorted(results.items()):
        name = r.get("name", sid)
        access = "✅" if r.get("accessible") else "❌"
        catalog = f"✅ ({r.get('catalog_count', 0)})" if r.get("catalog_ok") else "❌"
        search = "✅" if r.get("search_ok") else ("⚠️" if r.get("search_ok") is False else "N/A")
        cf = "🛡️" if r.get("has_cf") else "-"
        status = r.get("status", "ACTIVE")
        
        # Add error indicators
        errors = r.get("errors", [])
        if errors:
            status += " ⚠️"
        
        report.append(f"| {sid} | {name} | {access} | {catalog} | {search} | {cf} | {status} |")
    
    # Failed sources details
    failed = {sid: r for sid, r in results.items() if r.get("errors")}
    if failed:
        report.append("\n## ⚠️ Issues Found\n")
        for sid, r in failed.items():
            report.append(f"### {sid} ({r.get('name', '')})\n")
            for err in r.get("errors", []):
                report.append(f"- ❌ {err}")
            for warn in r.get("warnings", []):
                report.append(f"- ⚠️ {warn}")
            report.append("")
    
    # Recommendations
    report.append("## Recommendations\n")
    
    dead_sources = [sid for sid, r in results.items() if r.get("status") == "DEAD"]
    unreachable = [sid for sid, r in results.items() if r.get("status") == "UNREACHABLE"]
    broken_catalog = [sid for sid, r in results.items() if r.get("accessible") and not r.get("catalog_ok")]
    
    if dead_sources:
        report.append(f"- **Remove Dead Sources**: {', '.join(dead_sources)} - These domains are no longer active\n")
    
    if unreachable:
        report.append(f"- **Monitor Unreachable**: {', '.join(unreachable)} - May be temporary issues or need alternative URLs\n")
    
    if broken_catalog:
        report.append(f"- **Fix Catalog URLs**: {', '.join(broken_catalog)} - Catalog pages returning 404, need URL pattern updates\n")
    
    # Write report
    report_text = "\n".join(report)
    
    with open("test-report.md", "w", encoding="utf-8") as f:
        f.write(report_text)
    
    print(report_text)
    print("\nReport saved to test-report.md")

if __name__ == "__main__":
    generate_report()
