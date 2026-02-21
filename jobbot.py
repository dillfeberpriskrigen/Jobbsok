#!/usr/bin/python3

import sys
from datetime import datetime
import requests
from sqlalchemy import create_engine, Column, String, Text, DateTime, Date
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import text

# ---------------- CONFIG ----------------
DB_URI = "mysql+pymysql://jobbot_user:supersecret@127.0.0.1:3306/jobbot_db"

# Pre-specified parameters for fetching jobs
FETCH_PARAMS = {
    "region": [    "DGQd_uYs_oKb",
    "oDpK_oZ2_WYt",    "K8iD_VQv_2BA",    "zupA_8Nt_xcD",    "wjee_qH2_yb6",   "65Ms_7r1_RTG",    "MtbE_xWT_eMi",    "9QUH_2bb_6Np",    "tF3y_MF9_h5G",
    "9hXe_F4g_eTG",    "CaRE_1nn_cSU",    "CifL_Rzy_Mku",    "s93u_BEb_sx2",    "zBon_eET_fFU",    "EVVp_h6U_GSZ",    "g5Tt_CAV_zBd",    "NvUF_SP1_1zo",    "G6DV_fKE_Viz",    "zdoY_6u5_Krt",    "xTCk_nT5_Zjm",    "oLT3_Q9p_3nn"],
    "jobTitles": [""],  # example job titles
    "limit": 50
}

JOBTECH_URL = "https://jobsearch.api.jobtechdev.se/search"
HEADERS = {
    "accept": "application/json",
    "x-feature-freetext-bool-method": "or",
    "x-feature-disable-smart-freetext": "true"
}

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

def fetch_jobs(params):
    offset = 0
    limit = int(params.get("limit", 50))
    jobs = []

    while True:
        params["offset"] = offset
        params["limit"] = limit
        try:
            r = requests.get(JOBTECH_URL, params=params, headers=HEADERS, timeout=15)
            r.raise_for_status()
        except Exception as e:
            print(f"API error: {e}")
            break

        data = r.json()
        hits = data.get("hits", [])
        total = data.get("total", {}).get("value", 0)
        if not hits or offset >= total:
            break

        for job in hits:
            desc = job.get("description", {})
            text = desc.get("text", "") if isinstance(desc, dict) else str(desc)
            jobs.append({
                "id": job["id"],
                "headline": job.get("headline"),
                "employer_name": job.get("employer", {}).get("name") if job.get("employer") else "",
                "municipality": job.get("workplace_address", {}).get("municipality") if job.get("workplace_address") else "",
                "region": job.get("workplace_address", {}).get("region") if job.get("workplace_address") else "",
                "webpage_url": job.get("webpage_url"),
                "publication_date": job.get("publication_date"),
                "application_deadline": strip_date(job.get("application_deadline")),
                "description": text
            })
        offset += limit

    return jobs

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

    # Create tables if missing
    Base.metadata.create_all(engine)

    # CLI argument for testing DB only
    if len(sys.argv) > 1 and sys.argv[1] == "--test-db":
        test_db(engine)
        return

    # Test DB connection
    if not test_db(engine):
        print("Database not available. Exiting.")
        return

    # Fetch jobs and store
    jobs = fetch_jobs(FETCH_PARAMS)
    save_jobs(session, jobs)

if __name__ == "__main__":
    main()