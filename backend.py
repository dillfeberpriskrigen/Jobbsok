#!/usr/bin/python3

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import requests
from datetime import datetime
from sqlalchemy import text, inspect
from regions import regions

app = Flask(__name__)
CORS(app)
# ---------------- CONFIG ----------------
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://jobbot_user:supersecret@localhost/jobbot" #Inte supersäkert TODO: Kanske ett extra secret? svårare att bruteforcea en längre sträng
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
# ---------------- MODELS ----------------
class JobFilter(db.Model):
    __tablename__ = "job_filters"
    id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.String(255), nullable=False)
    filter_type = db.Column(
        db.Enum("exclude", "include"),
        default="exclude",
        nullable=False
    )
    field = db.Column(
        db.Enum("headline", "description"),
        default="headline",
        nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

def get_job_filters(filter_type="exclude"):
    return JobFilter.query.filter_by(filter_type=filter_type).all()


class PromptTemplate(db.Model):
    __tablename__ = "prompt_templates"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True)
    template = db.Column(db.Text)
    updated_at = db.Column(db.DateTime)

class Job(db.Model):
    __tablename__ = "jobs"
    id = db.Column(db.String(64), primary_key=True)
    headline = db.Column(db.Text)
    employer_name = db.Column(db.Text)
    municipality = db.Column(db.Text)
    webpage_url = db.Column(db.Text)
    publication_date = db.Column(db.DateTime)
    application_deadline = db.Column(db.Date)
    description = db.Column(db.Text)
    fetched_at = db.Column(db.DateTime, default=datetime.utcnow)

class JobStatus(db.Model):
    __tablename__ = "job_status"
    job_id = db.Column(db.String(64), db.ForeignKey("jobs.id"), primary_key=True)
    status = db.Column(db.Enum("new", "interesting", "applied", "rejected"), default="new")
    notes = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ---------------- HELPERS ----------------
JOBTECH_URL = "https://jobsearch.api.jobtechdev.se/search"
HEADERS = { # Borde sparas i db
    "accept": "application/json",
    "x-feature-freetext-bool-method": "or",
    "x-feature-disable-smart-freetext": "true"
}

def get_region_codes(region_str):
    regions_lower = {k.lower(): v for k, v in regions.items()}
    selected = [r.strip().lower() for r in region_str.split(",")]
    return [regions_lower[r] for r in selected if r in regions_lower]

def strip_date(dt):
    return dt.split("T")[0] if dt else None
def fetch_jobs_from_api(params):

    #  Definiera match-funktion
    def job_matches_filters(job):
        headline = (job.get("headline") or "").lower().strip()

        for f in filters:
            if f.field != "headline":
                continue  # Ignorera andra fält
            value = f.value.lower().strip()
            if value in headline:
                print(f"Excluding '{headline}' because of filter '{value}'")
                return True

        return False


    filters = JobFilter.query.filter_by(filter_type="exclude").all()


        # 3. Konvertera regioner
    if "region" in params and isinstance(params["region"], str):
        params["region"] = get_region_codes(params["region"])

    if "location" in params and params["location"]:
        params["workplaceAddress.municipality"] = params.pop("location")

    offset = 0
    limit = int(params.get("limit", 50))
    jobs = []

    #  Hämta jobb från API
    while True:
        params["offset"] = offset
        params["limit"] = limit

        try:
            r = requests.get(JOBTECH_URL, params=params, headers=HEADERS, timeout=15)
            r.raise_for_status()
        except Exception as e:
            print(f"❌ Error fetching from API: {e}")
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
                "webpage_url": job.get("webpage_url"),
                "publication_date": job.get("publication_date"),
                "application_deadline": strip_date(job.get("application_deadline")),
                "description": text
            })

        offset += limit

    #  Filtrera med JobFilter
    filtered = [j for j in jobs if not job_matches_filters(j)]

    print(f"⚡ Fetched {len(filtered)} jobs after applying JobFilter")
    return filtered

def store_jobs(jobs):
    stored = 0
    for j in jobs:
        job = Job.query.get(j["id"])
        if not job:
            job = Job(**j)
            db.session.add(job)

        if not JobStatus.query.get(j["id"]):
            db.session.add(JobStatus(job_id=j["id"]))
        stored += 1

    db.session.commit()
    print(f"💾 Stored {stored} jobs in database")

def test_db_connection():
    try:
        with app.app_context():
            db.session.execute(text("SELECT 1"))
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            print("✅ Database connection OK!")
            print("📋 Tables and row counts:")
            for table in tables:
                count = db.session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                print(f" - {table}: {count} rows")
    except Exception as e:
        print(f"❌ Database connection FAILED: {e}")

# ---------------- API ----------------
@app.route("/job-filters")
def list_job_filters():
    return [
        {
            "id": f.id,
            "value": f.value,
            "type": f.filter_type,
            "field": f.field
        }
        for f in JobFilter.query.order_by(JobFilter.value).all()
    ]

@app.route("/job-filters", methods=["POST"])
def add_job_filter():
    data = request.json

    value = data.get("value", "").strip().lower()
    field = data.get("field", "headline")
    filter_type = data.get("type", "exclude")

    if not value:
        return {"ok": False, "message": "Empty value"}, 400

    exists = JobFilter.query.filter_by(
        value=value,
        field=field,
        filter_type=filter_type
    ).first()

    if exists:
        return {"ok": False, "message": "Filter already exists"}, 409

    db.session.add(JobFilter(
        value=value,
        field=field,
        filter_type=filter_type
    ))
    db.session.commit()

    return {"ok": True}



@app.route("/prompt", methods=["POST"])
def build_prompt():
    data = request.json
    job = Job.query.get(data.get("job_id"))
    template = PromptTemplate.query.get(data.get("prompt_template_id"))

    if not job or not template:
        return {"ok": False, "message": "Job or template not found"}, 404

    final_prompt = template.template.replace(
        "{{JOB_DESCRIPTION}}",
        job.description or ""
    )

    return {"ok": True, "prompt": final_prompt}

@app.route("/search", methods=["POST"])
def search():
    params = request.get_json() or {} # Borde tas från DB och UI inte en gammal torr json
    jobs = fetch_jobs_from_api(params)
    store_jobs(jobs)
    rows = db.session.query(Job, JobStatus).join(JobStatus).all()
    return jsonify({
        "ok": True,
        "message": f"Fetched and stored {len(jobs)} jobs",
        "jobs": [
            {
                "id": job.id,
                "headline": job.headline,
                "employer_name": job.employer_name,
                "municipality": job.municipality,
                "webpage_url": job.webpage_url,
                "publication_date": job.publication_date,
                "application_deadline": job.application_deadline,
                "application_deadline_simple": job.application_deadline.strftime("%Y-%m-%d") if job.application_deadline else "",
                "description": job.description,
                "status": status.status
            }
            for job, status in rows
        ]
    })



@app.route("/jobs")
def load_jobs():
    rows = db.session.query(Job, JobStatus).join(JobStatus).all()
    return [
        {
            "id": job.id,
            "headline": job.headline,
            "employer_name": job.employer_name,
            "municipality": job.municipality,
            "webpage_url": job.webpage_url,
            "publication_date": job.publication_date,
            "application_deadline": job.application_deadline,
            "description": job.description,
            "status": status.status
        }
        for job, status in rows
    ]

# ---------------- RUN ----------------
if __name__ == "__main__":
    print("🔹 Testing database connection...")
    test_db_connection()
    app.run(port=3000, debug=True)


