#!/usr/bin/python3

#########################################
#Script Name:				#
#Decription: 				#
#Args:					#
#Author:				#
#Email:					#
#########################################
import json
import os
from pathlib import Path
import requests
import pymysql

# Source dataset (latest is fine; you can pin to a version if you want stability)
DATA_URL = (
    "https://data.jobtechdev.se/taxonomy/version/latest/query/"
    "ssyk-level-4-with-related-skills-and-occupations/"
    "ssyk-level-4-with-related-skills-and-occupations.json"
)

# If you already downloaded the file, set LOCAL_JSON to that path and it will be used instead.
LOCAL_JSON = None  # e.g. "ssyk-level-4-with-related-skills-and-occupations.json"

MYSQL = dict(
    host="localhost",
    user="jobbot_user",
    password="supersecret",
    database="jobbot_db",
    charset="utf8mb4",
    autocommit=False,
)

BATCH = 2000


def download_json(url: str, out_path: Path) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    out_path.write_bytes(r.content)
    return out_path


def get_concepts(payload: dict) -> list[dict]:
    # expected: {"data":{"concepts":[...]}}
    return payload["data"]["concepts"]


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def main():
    # 1) Load JSON
    if LOCAL_JSON:
        json_path = Path(LOCAL_JSON)
    else:
        json_path = Path("data") / "ssyk-level-4-with-related-skills-and-occupations.json"
        if not json_path.exists():
            print("Downloading:", DATA_URL)
            download_json(DATA_URL, json_path)

    payload = json.loads(json_path.read_text(encoding="utf-8"))
    concepts = get_concepts(payload)

    # 2) Prepare rows
    ssyk_rows = []
    occ_rows = {}   # id -> label
    skill_rows = {} # id -> label
    ssyk_occ = set()
    ssyk_skill = set()

    for c in concepts:
        ssyk_id = c.get("id")
        ssyk_label = c.get("preferred_label") or ""
        definition = c.get("definition") or ""
        ssyk_rows.append((ssyk_id, ssyk_label, definition))

        # narrower: occupation-name titles under this SSYK group
        for occ in (c.get("narrower") or []):
            oid = occ.get("id")
            olab = occ.get("preferred_label") or ""
            if oid:
                occ_rows[oid] = olab
                ssyk_occ.add((ssyk_id, oid))

        # related: skills for this SSYK group
        for sk in (c.get("related") or []):
            sid = sk.get("id")
            slab = sk.get("preferred_label") or ""
            if sid:
                skill_rows[sid] = slab
                ssyk_skill.add((ssyk_id, sid))

    occ_rows_list = [(oid, occ_rows[oid]) for oid in occ_rows]
    skill_rows_list = [(sid, skill_rows[sid]) for sid in skill_rows]

    print("SSYK4 groups:", len(ssyk_rows))
    print("Occupation names:", len(occ_rows_list))
    print("Skills:", len(skill_rows_list))
    print("Links ssyk->occ:", len(ssyk_occ))
    print("Links ssyk->skill:", len(ssyk_skill))

    # 3) Load into MySQL
    conn = pymysql.connect(**MYSQL)
    try:
        with conn.cursor() as cur:
            # Schema
            cur.execute("""
                CREATE TABLE IF NOT EXISTS ssyk4 (
                  id VARCHAR(64) PRIMARY KEY,
                  label TEXT,
                  definition TEXT,
                  KEY idx_label (label(191))
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS occupation_name (
                  id VARCHAR(64) PRIMARY KEY,
                  label TEXT,
                  KEY idx_label (label(191))
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS skill (
                  id VARCHAR(64) PRIMARY KEY,
                  label TEXT,
                  KEY idx_label (label(191))
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS ssyk4_occupation (
                  ssyk4_id VARCHAR(64) NOT NULL,
                  occupation_id VARCHAR(64) NOT NULL,
                  PRIMARY KEY (ssyk4_id, occupation_id),
                  KEY idx_occ (occupation_id),
                  CONSTRAINT fk_so_ssyk FOREIGN KEY (ssyk4_id) REFERENCES ssyk4(id) ON DELETE CASCADE,
                  CONSTRAINT fk_so_occ  FOREIGN KEY (occupation_id) REFERENCES occupation_name(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS ssyk4_skill (
                  ssyk4_id VARCHAR(64) NOT NULL,
                  skill_id VARCHAR(64) NOT NULL,
                  PRIMARY KEY (ssyk4_id, skill_id),
                  KEY idx_skill (skill_id),
                  CONSTRAINT fk_ss_ssyk FOREIGN KEY (ssyk4_id) REFERENCES ssyk4(id) ON DELETE CASCADE,
                  CONSTRAINT fk_ss_skill FOREIGN KEY (skill_id) REFERENCES skill(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)

            conn.commit()

            # Optional: clean reload (comment out if you want incremental updates)
            cur.execute("SET foreign_key_checks=0;")
            cur.execute("TRUNCATE TABLE ssyk4_skill;")
            cur.execute("TRUNCATE TABLE ssyk4_occupation;")
            cur.execute("TRUNCATE TABLE skill;")
            cur.execute("TRUNCATE TABLE occupation_name;")
            cur.execute("TRUNCATE TABLE ssyk4;")
            cur.execute("SET foreign_key_checks=1;")
            conn.commit()

            # Insert base tables
            for batch in chunked(ssyk_rows, BATCH):
                cur.executemany(
                    "INSERT INTO ssyk4 (id, label, definition) VALUES (%s,%s,%s)",
                    batch
                )
                conn.commit()

            for batch in chunked(occ_rows_list, BATCH):
                cur.executemany(
                    "INSERT INTO occupation_name (id, label) VALUES (%s,%s)",
                    batch
                )
                conn.commit()

            for batch in chunked(skill_rows_list, BATCH):
                cur.executemany(
                    "INSERT INTO skill (id, label) VALUES (%s,%s)",
                    batch
                )
                conn.commit()

            # Insert links
            ssyk_occ_list = list(ssyk_occ)
            ssyk_skill_list = list(ssyk_skill)

            for batch in chunked(ssyk_occ_list, 5000):
                cur.executemany(
                    "INSERT INTO ssyk4_occupation (ssyk4_id, occupation_id) VALUES (%s,%s)",
                    batch
                )
                conn.commit()

            for batch in chunked(ssyk_skill_list, 5000):
                cur.executemany(
                    "INSERT INTO ssyk4_skill (ssyk4_id, skill_id) VALUES (%s,%s)",
                    batch
                )
                conn.commit()

        print("Done.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
