#!/usr/bin/env python3
"""
Sync Index YAML Generator for GitHub Actions
=============================================
Scans all language folders and generates complete index.yaml files.
Called by: .github/workflows/sync_index.yml

Usage:
    python scripts/sync_index.py [base_dir]
    
If base_dir not provided, uses current directory.
"""

import os
import sys
import re
from pathlib import Path
from datetime import datetime

# Language display names
LANGUAGE_NAMES = {
    "zh": "Chinese",
    "en": "English",
    "ja": "Japanese",
    "ru": "Russian",
    "id": "Indonesian",
    "pt": "Portuguese",
    "fr": "French",
    "ar": "Arabic",
    "mtl": "Machine Translation",
}

# Source metadata (ID -> display name)
SOURCE_NAMES = {
    # Chinese sources
    "novel543": "Novel543",
    "piaotia": "PiaoTia Literature",
    "quanben5": "QuanBen5",
    "shuba69": "69Shuba",
    "ttkan": "TTKan",
    "twkan": "TWKan",
    "ixdzs": "IXDZS",
    "powanjuan": "PoWanJuan",
    "shuhaige": "ShuHaiGe",
    "ddxss": "DDXSS",
    "shw5": "ShuXiangWanJuan",
    "soxs": "SoXS",
    "trxs": "TRXS",
    "biquge5200": "BiQuGe5200",
    "wanben": "WanBenTXT",
    "biqugecompany": "BiQuGeCompany",
    "rayforboe": "Rayforboe",
    "haodoo": "Haodoo",
    "snapd": "SnapD",
    "timotxt": "TimoTxt",
    "qimao": "QiMao Novel",
    "zongheng": "ZongHeng Literature",
    "xbiquge": "XBiQuGe",
    "fanqie": "FanQie Novel",
    # English sources
    "wuxia_world": "WuxiaWorld",
    "royal_road": "RoyalRoad",
    "novel_fire": "NovelFire",
    "box_novel": "BoxNovel",
    "read_novel_full": "ReadNovelFull",
    "light_novel_world": "LightNovelWorld",
    "novel_cool": "NovelCool",
    "wuxia_box": "WuxiaBox",
    "light_novel_translations": "LightNovelsTranslations",
    "novel_phoenix": "NovelPhoenix",
    "novel_updates": "NovelUpdates",
    "novelhall": "NovelHall",
    "sousetsuka": "Sousetsuka",
    "wuxia_click": "Wuxia.click",
    "lnori": "Lnori",
    "wtrlab": "WTR-LAB",
    "wuxiaworld_site": "WuxiaWorld.Site",
    "novelbuddy_io": "NovelBuddy",
    "boxnovel": "BoxNovel",
    "novelfire": "NovelFire",
    "readnovelfull": "ReadNovelFull",
    "novelnice": "NovelNice",
    "novelbin": "NovelBin",
    "wuxiabox": "WuxiaBox",
    "nobadnovel": "NoBadNovel",
    "scribblehub": "ScribbleHub",
    "novelfull": "NovelFull",
    "allnovel": "AllNovel",
    "novelarrow": "NovelArrow",
    "freewebnovel": "FreeWebNovel",
    "mvlempyr": "MVLEmpyr",
    "novelphoenix": "NovelPhoenix",
    # Japanese sources
    "syosetu": "Syosetu (Narou)",
    # Russian sources
    "bookhamster": "Bookhamster",
    "ifreedom": "iFreedom",
    "jaomix": "Jaomix",
    "ranobehub": "RanobeHub",
    "ranobelib": "RanobeLib",
    # Indonesian sources
    "baca_lightnovel": "BacaLightnovel",
    "indo_webnovel": "IndoWebnovel",
    "novelku": "Novelku",
    "sakura_novel": "SakuraNovel",
    "wbnovel": "WbNovel",
    "more_novel": "MoreNovel",
    "meio_novel": "MeioNovel",
    "bacalightnovel": "BacaLightnovel",
    "sakuranovel": "SakuraNovel",
    "morenovel": "MoreNovel",
    "indowebnovel": "IndoWebnovel",
    "meionovels": "MeioNovels",
    # Portuguese sources
    "saikai": "Saikai",
    # French sources
    "novelfrance": "NovelFrance",
    # Arabic sources
    "truthnovel": "Truth Novel",
    # MTL sources
    "sonicmtl": "SonicMTL",
}

# Icon URLs for known sources
SOURCE_ICONS = {
    "timotxt": "https://i1.timotxt.com/images/timo.png",
    "royal_road": "https://www.royalroad.com/favicon.ico",
    "wuxia_world": "https://wuxiaworld.site/wp-content/uploads/2019/04/favicon-1.ico",
    "novel_fire": "https://novelfire.net/logo.ico",
    "box_novel": "https://boxnovel.com/wp-content/uploads/2018/04/box-icon-150x150.png",
    "light_novel_world": "https://static.lightnovelworld.com/content/img/lightnovelworld/favicon.png",
    "novel_cool": "https://www.novelcool.com/favicon.ico",
    "wuxia_box": "https://www.wuxiabox.com/favicon.ico",
    "novel_phoenix": "https://novelphoenix.com/logo.ico",
    "wuxia_click": "https://wuxia.click/favicon.ico",
    "lnori": "https://lnori.com/favicon.ico",
    "wtrlab": "https://wtr-lab.com/favicon.ico",
    "syosetu": "https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/narou.png",
    "sousetsuka": "https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/sousetsuka.png",
}


def get_source_name(file_id: str) -> str:
    """Get display name for a source ID"""
    return SOURCE_NAMES.get(file_id, file_id.replace("_", " ").title())


def get_source_icon(file_id: str, lang: str) -> str:
    """Get icon URL for a source"""
    if file_id in SOURCE_ICONS:
        return SOURCE_ICONS[file_id]
    return f"https://github.com/Parasgaming122/external-sources/main/icons/{file_id}.png"


def get_version_from_file(filepath: Path) -> str:
    """Try to extract version from source file"""
    try:
        content = filepath.read_text(encoding='utf-8', errors='ignore')
        match = re.search(r'version\s*=\s*["\']?([\d.]+)["\']?', content, re.IGNORECASE)
        if match:
            return match.group(1)
        match = re.search(r'@version\s+([\d.]+)', content)
        if match:
            return match.group(1)
    except Exception:
        pass
    return "1.0.0"


def generate_language_index(lang: str, base_dir: Path) -> dict:
    """Generate index.yaml content for a language folder"""
    lang_dir = base_dir / lang
    if not lang_dir.exists():
        return None
    
    lua_files = sorted([f for f in lang_dir.glob("*.lua") if f.name != "index"])
    if not lua_files:
        return None
    
    sources = []
    for lua_file in lua_files:
        file_id = lua_file.stem
        version = get_version_from_file(lua_file)
        
        source_entry = {
            "id": file_id,
            "name": get_source_name(file_id),
            "version": version,
            "url": f"https://raw.githubusercontent.com/Parasgaming122/external-sources/refs/heads/main/{lang}/{lua_file.name}",
            "icon": get_source_icon(file_id, lang),
            "language": lang,
        }
        sources.append(source_entry)
    
    return {
        "language": lang,
        "name": LANGUAGE_NAMES.get(lang, lang.upper()),
        "sources": sources,
    }


def write_yaml(data: dict, filepath: Path):
    """Write index data to YAML file with proper formatting"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f'language: "{data["language"]}"\n')
        f.write(f'name: "{data["name"]}"\n')
        f.write('sources:\n')
        
        for src in data['sources']:
            f.write(f'  - id: "{src["id"]}"\n')
            f.write(f'    name: "{src["name"]}"\n')
            f.write(f'    version: "{src["version"]}"\n')
            f.write(f'    url: "{src["url"]}"\n')
            f.write(f'    icon: "{src["icon"]}"\n')
            f.write(f'    language: "{src["language"]}"\n')
            f.write('\n')


def write_main_index(languages_data: dict, base_dir: Path):
    """Write root index.yaml"""
    main_path = base_dir / "index.yaml"
    
    with open(main_path, 'w', encoding='utf-8') as f:
        f.write('languages:\n')
        
        # Language order
        lang_order = ["zh", "en", "ja", "ru", "id", "pt", "fr", "ar", "mtl"]
        
        for lang in lang_order:
            if lang in languages_data:
                f.write(f'  {lang}:\n')
                f.write(f'    name: "{languages_data[lang]["name"]}"\n')
                f.write(f'    url: "https://raw.githubusercontent.com/Parasgaming122/external-sources/refs/heads/main/{lang}/index.yaml"\n')


def main():
    # Get base directory from args or default to current
    if len(sys.argv) > 1:
        base_dir = Path(sys.argv[1]).resolve()
    else:
        base_dir = Path.cwd()
    
    print("=" * 60)
    print("  SYNC INDEX.YAML")
    print("=" * 60)
    print(f"Base directory: {base_dir}")
    print()
    
    # Process each language folder
    lang_dirs = ["zh", "en", "ja", "ru", "id", "pt", "fr", "ar", "mtl"]
    languages_data = {}
    total_sources = 0
    
    for lang in lang_dirs:
        print(f"📁 Processing {lang}/...")
        
        index_data = generate_language_index(lang, base_dir)
        if index_data:
            output_path = base_dir / lang / "index.yaml"
            write_yaml(index_data, output_path)
            
            source_count = len(index_data['sources'])
            total_sources += source_count
            languages_data[lang] = index_data
            
            print(f"  ✅ {output_path.name} ({source_count} sources)")
        else:
            print(f"  ⚠️  No sources found")
    
    # Generate main index
    print()
    print("📁 Processing root index.yaml...")
    write_main_index(languages_data, base_dir)
    print(f"  ✅ index.yaml ({len(languages_data)} languages)")
    
    # Summary
    print()
    print("=" * 60)
    print("  SYNC COMPLETE")
    print("=" * 60)
    print(f"Total sources: {total_sources}")
    print(f"Languages: {len(languages_data)}")
    print()


if __name__ == "__main__":
    main()
