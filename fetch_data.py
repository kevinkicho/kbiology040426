#!/usr/bin/env python3
"""
fetch_data.py — Pre-fetch NIH data for kbiology.
Run once: python fetch_data.py
Requires: pip install requests
"""
import json, time, sys
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("Run: pip install requests")

DATA = Path(__file__).parent / "data"
DATA.mkdir(exist_ok=True)
MANIFEST = json.loads((DATA / "molecules_manifest.json").read_text())
HDR = {"User-Agent": "kbiology-learning-tool/1.0 (educational)"}

def pubchem(cid):
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/property/MolecularFormula,MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,TPSA,IUPACName/JSON"
    try:
        r = requests.get(url, headers=HDR, timeout=10); r.raise_for_status()
        p = r.json()["PropertyTable"]["Properties"][0]
    except Exception as e:
        print(f"  WARN CID {cid}: {e}"); p = {}
    time.sleep(0.4)
    return {"cid":cid,"formula":p.get("MolecularFormula",""),"weight":p.get("MolecularWeight",""),
            "xlogp":p.get("XLogP",""),"hbd":p.get("HBondDonorCount",""),"hba":p.get("HBondAcceptorCount",""),
            "tpsa":p.get("TPSA",""),"iupac":p.get("IUPACName",""),
            "url":f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}"}

def pdb(pid):
    url = f"https://data.rcsb.org/rest/v1/core/entry/{pid.upper()}"
    try:
        r = requests.get(url, headers=HDR, timeout=10); r.raise_for_status(); d = r.json()
        ref = (d.get("refine") or [{}])[0] or {}
        res = ref.get("ls_dres_high") or ref.get("ls_d_res_high","")
        # EM structures use em_3d_reconstruction instead
        if not res and d.get("em3d_reconstruction"):
            res = (d["em3d_reconstruction"][0] or {}).get("resolution","")
    except Exception as e:
        print(f"  WARN PDB {pid}: {e}"); d = {}; res = ""
    time.sleep(0.4)
    return {"pdb_id":pid.upper(),"title":d.get("struct",{}).get("title","") if d.get("struct") else "",
            "method":((d.get("exptl") or [{}])[0] or {}).get("method",""),
            "resolution":str(res),
            "url":f"https://www.rcsb.org/structure/{pid.upper()}"}

def pubmed(pmid):
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={pmid}&retmode=xml"
    try:
        import xml.etree.ElementTree as ET
        r = requests.get(url, headers=HDR, timeout=15); r.raise_for_status()
        root = ET.fromstring(r.text); art = root.find(".//Article")
        title = art.findtext("ArticleTitle","") if art else ""
        abstract = " ".join(t.text or "" for t in root.findall(".//AbstractText"))
        year = root.findtext(".//PubDate/Year") or ""
        journal = art.findtext(".//Journal/Title","") if art else ""
    except Exception as e:
        print(f"  WARN PMID {pmid}: {e}"); title=abstract=year=journal=""
    time.sleep(0.4)
    return {"pmid":pmid,"title":title,"abstract":abstract,"year":year,"journal":journal,
            "url":f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"}

print("=== kbiology fetch_data.py ===")
print(f"\nFetching {len(MANIFEST['compounds'])} compounds...")
compounds = {}
for c in MANIFEST["compounds"]:
    print(f"  {c['cid']} {c['name']}")
    compounds[str(c["cid"])] = {**pubchem(c["cid"]), "topic": c["topic"]}

print(f"\nFetching {len(MANIFEST['proteins'])} proteins...")
proteins = {}
for p in MANIFEST["proteins"]:
    print(f"  PDB {p['pdb_id']}")
    proteins[p["pdb_id"].upper()] = {**pdb(p["pdb_id"]), "topic": p["topic"]}

print(f"\nFetching {len(MANIFEST['pubmed_ids'])} papers...")
papers = {}
for p in MANIFEST["pubmed_ids"]:
    print(f"  PMID {p['pmid']}")
    papers[str(p["pmid"])] = {**pubmed(p["pmid"]), "topic": p["topic"]}

(DATA/"compounds.json").write_text(json.dumps(compounds, indent=2))
(DATA/"proteins.json").write_text(json.dumps(proteins,  indent=2))
(DATA/"papers.json").write_text(json.dumps(papers,     indent=2))
print(f"\nDone. compounds: {len(compounds)}, proteins: {len(proteins)}, papers: {len(papers)}")
