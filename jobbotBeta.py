#!/usr/bin/python3

#########################################
#Script Name:				#
#Decription: 				#
#Args:					#
#Author:				#
#Email:					#
#########################################
#!/usr/bin/python3

#########################################
# Script Name: jobtech_scraper.py
# Description: Fetch jobs from JobTech API with full/diff mode
# Author: Your Name
# Email: your.email@example.com
#########################################

import sys
import time
import json
from datetime import datetime
import requests
from sqlalchemy import create_engine, Column, String, Text, DateTime, Date
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import text
import os

# ---------------- CONFIG ----------------
DB_URI = "mysql+pymysql://jobbot_user:supersecret@127.0.0.1:3306/jobbot_db"
STATE_FILE = "jobbot_state.json"

JOBTECH_URL = "https://jobsearch.api.jobtechdev.se/search"
HEADERS = {
    "accept": "application/json",
    "x-feature-freetext-bool-method": "or",
    "x-feature-disable-smart-freetext": "true"
}

FETCH_PARAMS_TEMPLATE = {
    "jobTitles": [""],  # example job titles
    "limit": 50,
}

MAX_OFFSET = 2000
PAUSE_BETWEEN_REQUESTS = 2  # seconds
PAUSE_BETWEEN_REGIONS = 2   # seconds

REGIONS = [
    "DGQd_uYs_oKb","oDpK_oZ2_WYt","K8iD_VQv_2BA","zupA_8Nt_xcD",
    "wjee_qH2_yb6","65Ms_7r1_RTG","MtbE_xWT_eMi","9QUH_2bb_6Np",
    "tF3y_MF9_h5G","9hXe_F4g_eTG","CaRE_1nn_cSU","CifL_Rzy_Mku",
    "s93u_BEb_sx2","zBon_eET_fFU","EVVp_h6U_GSZ","g5Tt_CAV_zBd",
    "NvUF_SP1_1zo","G6DV_fKE_Viz","zdoY_6u5_Krt","xTCk_nT5_Zjm",
    "oLT3_Q9p_3nn"
]

# ---------------- DATABASE SETUP ----------------
Base = declarative_base()

class Job(Base):
    __tablename__ = "jobs"
    id = Column(String(64), primary_key=True)
    headline = Column(Text, nullable=False)
    employer_name = Column(Text)
    municipality = Column(Text)
    region = Column(Text)
    webpage_url = Column(Text)
    publication_date = Column(DateTime)
    application_deadline = Column(Date)
    description = Column(Text)
    fetched_at = Column(DateTime, default=datetime.utcnow)

# ---------------- HELPERS ----------------
def strip_date(dt):
    if not dt:
        return None
    return datetime.strptime(dt.split("T")[0], "%Y-%m-%d").date()

def test_db(engine):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connection successful.")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def load_state():
    if not os.path.exists(STATE_FILE):
        # default state
        return {"mode": "full", "last_run": None}
    with open(STATE_FILE, "r") as f:
        return json.load(f)

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

# ---------------- FETCH FUNCTION ----------------
def fetch_jobs_for_region(region, last_run=None):
    """
    Fetch jobs for a region using ascending publication date.
    If total hits > MAX_OFFSET, chunk using published-after.
    """
    jobs = []
    batch_num = 1
    params = FETCH_PARAMS_TEMPLATE.copy()
    params["region"] = [region]
    params["sort"] = "pubdate-asc"  # Oldest first

    if last_run:
        params["published-after"] = last_run

    while True:
        offset = 0
        first_request = True
        total_hits = 0

        while True:
            params["offset"] = offset
            try:
                r = requests.get(JOBTECH_URL, params=params, headers=HEADERS, timeout=20)
                r.raise_for_status()
            except Exception as e:
                print(f"API error for region {region}: {e}")
                return jobs

            data = r.json()
            hits = data.get("hits", [])
            total_hits = data.get("total", {}).get("value", 0)

            if first_request:
                total_pages = (total_hits // params["limit"]) + 1
                print(f"  ℹ Region {region} total jobs: {total_hits}, total pages: {total_pages}")
                first_request = False

            if not hits:
                break

            print(f"  Batch {batch_num}: fetched {len(hits)} jobs (offset {offset}/{total_hits})")
            batch_num += 1

            for job in hits:
                desc = job.get("description", {})
                text_desc = desc.get("text", "") if isinstance(desc, dict) else str(desc)
                jobs.append({
                    "id": job["id"],
                    "headline": job.get("headline"),
                    "employer_name": job.get("employer", {}).get("name") if job.get("employer") else "",
                    "municipality": job.get("workplace_address", {}).get("municipality") if job.get("workplace_address") else "",
                    "region": job.get("workplace_address", {}).get("region") if job.get("workplace_address") else "",
                    "webpage_url": job.get("webpage_url"),
                    "publication_date": job.get("publication_date"),
                    "application_deadline": strip_date(job.get("application_deadline")),
                    "description": text_desc
                })

            offset += params["limit"]

            # Handle max offset
            if offset >= MAX_OFFSET:
                last_pub = hits[-1].get("publication_date")
                if last_pub:
                    print(f"  ⚠ Reached max offset ({MAX_OFFSET}). Continuing from {last_pub}")
                    params["published-after"] = last_pub
                    break  # break inner loop to start new chunk
                else:
                    break

            # Stop when last page reached
            if offset >= total_hits:
                break

            time.sleep(PAUSE_BETWEEN_REQUESTS)

        # Stop if no more hits or less than MAX_OFFSET
        if total_hits <= MAX_OFFSET or not hits:
            break

    return jobs

# ---------------- DATABASE SAVE ----------------
def save_jobs(session, jobs):
    stored = 0
    for j in jobs:
        existing = session.query(Job).get(j["id"])
        if not existing:
            job = Job(**j)
            session.add(job)
            stored += 1
    session.commit()
    print(f"✅ Stored {stored} new jobs.")

# ---------------- MAIN ----------------
def main():
    engine = create_engine(DB_URI)
    Session = sessionmaker(bind=engine)
    session = Session()
    Base.metadata.create_all(engine)

    if len(sys.argv) > 1 and sys.argv[1] == "--test-db":
        test_db(engine)
        return

    if not test_db(engine):
        print("Database not available. Exiting.")
        return

    # ---------------- STATE MANAGEMENT ----------------
    state = load_state()
    MODE = state.get("mode", "full")
    last_run_time = state.get("last_run") if MODE == "diff" else None

    if MODE == "full":
        print("⚡ Full run mode: fetching entire database.")
    else:
        print(f"⚡ Diff mode: fetching jobs since last run at {last_run_time}")

    # ---------------- FETCH REGIONS ----------------
    for region in REGIONS:
        print(f"🔹 Fetching jobs for region: {region}")
        jobs = fetch_jobs_for_region(region, last_run=last_run_time)
        save_jobs(session, jobs)
        print(f"⏸ Completed region {region}, pausing before next...")
        time.sleep(PAUSE_BETWEEN_REGIONS)

    # ---------------- UPDATE STATE ----------------
    current_time = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    state["last_run"] = current_time

    if MODE == "full":
        state["mode"] = "diff"

    save_state(state)
    print(f"✅ Script finished. last_run updated to {current_time}. Mode is now {state['mode']}.")

if __name__ == "__main__":
    main()
