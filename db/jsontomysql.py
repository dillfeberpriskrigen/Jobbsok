#!/usr/bin/python3

#########################################
#Script Name:				#
#Decription: 				#
#Args:					#
#Author:				#
#Email:					#
#########################################
import json
from pathlib import Path
import pymysql

JSON_PATH = Path("all-concepts.json")

MYSQL = dict(
    host="localhost",
    user="jobbot_user",
    password="supersecret",
    database="jobbot_db",   # <- your DB name
    charset="utf8mb4",
    autocommit=False,
)

def get_concepts(payload):
    if isinstance(payload, dict):
        if "data" in payload and isinstance(payload["data"], dict) and "concepts" in payload["data"]:
            return payload["data"]["concepts"]
        if "concepts" in payload:
            return payload["concepts"]
    raise ValueError("Could not find concepts array in JSON")

def label(c):
    return c.get("preferred_label") or c.get("label") or c.get("term") or ""

def concept_type(c):
    t = c.get("type") or c.get("concept_type") or c.get("conceptType") or ""
    if isinstance(t, dict):
        return t.get("id") or t.get("preferred_label") or json.dumps(t, ensure_ascii=False)
    return str(t) if t is not None else ""

def iter_ids(x):
    if x is None:
        return
    if isinstance(x, str):
        yield x
    elif isinstance(x, dict) and "id" in x:
        yield x["id"]
    elif isinstance(x, list):
        for item in x:
            if isinstance(item, str):
                yield item
            elif isinstance(item, dict) and "id" in item:
                yield item["id"]

def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i+n]

payload = json.loads(JSON_PATH.read_text(encoding="utf-8"))
concepts = get_concepts(payload)

conn = pymysql.connect(**MYSQL)
try:
    with conn.cursor() as cur:
        # Helpful for first load
        cur.execute("SET foreign_key_checks=0;")

        # 1) concepts
        concept_rows = []
        for c in concepts:
            cid = c.get("id")
            if not cid:
                continue
            concept_rows.append((
                cid,
                label(c),
                concept_type(c),
                c.get("ssyk_code_2012"),
                c.get("isco_code_08"),
                json.dumps(c, ensure_ascii=False),
            ))

        for batch in chunked(concept_rows, 2000):
            cur.executemany(
                """
                INSERT INTO concepts
                  (id, preferred_label, concept_type, ssyk_code_2012, isco_code_08, raw_json)
                VALUES (%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                  preferred_label=VALUES(preferred_label),
                  concept_type=VALUES(concept_type),
                  ssyk_code_2012=VALUES(ssyk_code_2012),
                  isco_code_08=VALUES(isco_code_08),
                  raw_json=VALUES(raw_json);
                """,
                batch
            )
            conn.commit()

        # 2) relations
        rel_rows = []
        for c in concepts:
            src = c.get("id")
            if not src:
                continue
            for rel_type in ("broader", "narrower", "related"):
                for dst in iter_ids(c.get(rel_type)):
                    if dst:
                        rel_rows.append((src, rel_type, dst))

        # de-dupe
        rel_rows = list(set(rel_rows))

        for batch in chunked(rel_rows, 5000):
            cur.executemany(
                "INSERT IGNORE INTO concept_relations (src_id, rel_type, dst_id) VALUES (%s,%s,%s);",
                batch
            )
            conn.commit()

        cur.execute("SET foreign_key_checks=1;")
        conn.commit()

    print("Loaded concepts:", len(concept_rows))
    print("Loaded relations:", len(rel_rows))

finally:
    conn.close()
