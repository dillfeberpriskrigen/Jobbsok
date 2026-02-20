#!/usr/bin/python3

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask.cli import with_appcontext
import click
from datetime import datetime
from sqlalchemy import or_
import requests
# ---------------- APP ----------------

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://jobbot_user:supersecret@localhost/jobbot"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# ---------------- MODELS ----------------

class JobFilter(db.Model):
    __tablename__ = "job_filters"
    id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.String(255), nullable=False)
    filter_type = db.Column(db.Enum("exclude", "include"), default="exclude", nullable=False)
    field = db.Column(db.Enum("headline", "description"), default="headline", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Job(db.Model):
    __tablename__ = "jobs"
    id = db.Column(db.String(64), primary_key=True)
    headline = db.Column(db.Text, nullable=False)
    employer_name = db.Column(db.Text)
    municipality = db.Column(db.Text)
    region = db.Column(db.Text)
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

# ---------------- SAFE DB INIT ----------------

@click.command("ensure-db")
@with_appcontext
def ensure_db():
    db.create_all()
    click.echo("✅ Tables verified / created if missing.")

app.cli.add_command(ensure_db)


# Helpers
from regions import regions  ## Behöver jag ens detta längre? Behåll så länge. TODO: DUbbeklkolla

def get_region_codes(region_str):
    """
    Convert comma-separated frontend region names to JobTechDev codes.
    """
    regions_lower = {k.lower(): v for k, v in regions.items()}
    selected = [r.strip().lower() for r in region_str.split(",")]
    return [regions_lower[r] for r in selected if r in regions_lower]



def format_deadline(date_string):
    if not date_string:
        return ""
    try:
        dt = datetime.strptime(date_string.split("T")[0], "%Y-%m-%d")
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return date_string



# ---------------- FILTER ROUTES ----------------

@app.route("/filters", methods=["GET"])
def list_filters():
    filters = JobFilter.query.order_by(JobFilter.value).all()
    return jsonify([{"id": f.id, "value": f.value, "type": f.filter_type, "field": f.field} for f in filters])

@app.route("/filters", methods=["POST"])
def add_filter():
    data = request.json or {}
    value = (data.get("value") or "").strip().lower()
    field = data.get("field") or "headline"
    filter_type = data.get("type") or "exclude"

    if not value:
        return jsonify({"ok": False, "message": "Value required"}), 400

    exists = JobFilter.query.filter_by(value=value, field=field, filter_type=filter_type).first()
    if exists:
        return jsonify({"ok": False, "message": "Filter exists"}), 409

    new_filter = JobFilter(value=value, field=field, filter_type=filter_type)
    db.session.add(new_filter)
    db.session.commit()
    return jsonify({"ok": True, "id": new_filter.id})

@app.route("/filters/<int:filter_id>", methods=["DELETE"])
def delete_filter(filter_id):
    f = JobFilter.query.get(filter_id)
    if not f:
        return jsonify({"ok": False, "message": "Not found"}), 404
    db.session.delete(f)
    db.session.commit()
    return jsonify({"ok": True})

# ---------------- JOBTECH FETCH ----------------

JOBTECH_URL = "https://jobsearch.api.jobtechdev.se/search"
HEADERS = {
    "accept": "application/json",
    "x-feature-freetext-bool-method": "or",
    "x-feature-disable-smart-freetext": "true"
}
# Helper - konsolidera
def strip_date(dt):
    if not dt:
        return None
    return datetime.strptime(dt.split("T")[0], "%Y-%m-%d").date()



@app.route("/jobs/fetch", methods=["POST"])
def fetch_new_jobs():
    params = request.get_json() or {}

    # Convert frontend regions to JobTechDev codes
    if "region" in params and isinstance(params["region"], str):
        params["region"] = get_region_codes(params["region"])

    # Use jobTitles as free text query
    if "jobTitles" in params and params["jobTitles"]:
        params["q"] = " OR ".join([f'"{t}"' for t in params["jobTitles"]])

    headers = {
        "accept": "application/json",
        "x-feature-freetext-bool-method": "or",
        "x-feature-disable-smart-freetext": "true"
    }

    offset = 0
    limit = int(params.get("limit", 50))
    jobs = []

    while True:
        params["offset"] = offset
        params["limit"] = limit
        try:
            r = requests.get(
                "https://jobsearch.api.jobtechdev.se/search",
                params=params,
                headers=headers,
                timeout=15
            )
            r.raise_for_status()
        except Exception as e:
            return jsonify({"ok": False, "message": f"API error: {e}"}), 500

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

    # Store jobs in DB
    stored = 0
    for j in jobs:
        job = Job.query.get(j["id"])
        if not job:
            job = Job(**j)
            db.session.add(job)
            db.session.add(JobStatus(job_id=j["id"]))
            stored += 1
    db.session.commit()

    return jsonify({"ok": True, "stored": stored, "jobs": jobs})

@app.route("/jobs/search", methods=["POST"])
def get_jobs_from_db():
    """
    Get jobs from database.
    Frontend may send:
    {
        "regions": [],      # list of region codes
        "jobTitles": [],    # list of job title fragments
        "status": []        # list of statuses
    }

    Logic:
    - Region: any selected region (OR)
    - Job title: any selected title (OR)
    - Combined: region AND title
    """

    
    data = request.json or {}

    regions = data.get("regions") or []
    job_titles = data.get("jobTitles") or []
    statuses = data.get("status") or []
    #DEBUG
    print(regions, job_titles)
    #DEBUG
    query = db.session.query(Job, JobStatus).join(JobStatus)

    # -----------------------------
    # Region filter: match any selected region
    # -----------------------------
    if regions:
        query = query.filter(Job.region.in_(regions))

    # -----------------------------
    # Job title filter: match any selected title fragment
    # -----------------------------
    if job_titles:
        patterns = [f"%{t.lower()}%" for t in job_titles]
        query = query.filter(or_(*[Job.headline.ilike(p) for p in patterns]))

    # -----------------------------
    # Status filter
    # -----------------------------
    if statuses:
        query = query.filter(JobStatus.status.in_(statuses))

    # -----------------------------
    # Ordering: newest first
    # -----------------------------
    rows = query.order_by(Job.publication_date.desc()).all()

    # -----------------------------
    # Return JSON
    # -----------------------------
    return jsonify([
        {
            "id": job.id,
            "headline": job.headline,
            "employer_name": job.employer_name,
            "municipality": job.municipality,
            "region": job.region,
            "webpage_url": job.webpage_url,
            "publication_date": job.publication_date.isoformat() if job.publication_date else None,
            "application_deadline": job.application_deadline.isoformat() if job.application_deadline else None,
            "description": job.description,
            "status": status.status
        }
        for job, status in rows
    ])
# ---------------- JOB CRUD ----------------

@app.route("/jobs/<job_id>", methods=["DELETE"])
def delete_job(job_id):
    JobStatus.query.filter_by(job_id=job_id).delete()
    Job.query.filter_by(id=job_id).delete()
    db.session.commit()
    return jsonify({"ok": True})

@app.route("/jobs/<job_id>/status", methods=["PUT"])
def update_status(job_id):
    data = request.json or {}
    status = JobStatus.query.get(job_id)

    if not status:
        return jsonify({"ok": False, "message": "Not found"}), 404

    if data.get("status"):
        status.status = data["status"]
    if "notes" in data:
        status.notes = data["notes"]

    db.session.commit()
    return jsonify({"ok": True})

# ---------------- RUN ----------------

if __name__ == "__main__":
    app.run(port=3000, debug=True)

