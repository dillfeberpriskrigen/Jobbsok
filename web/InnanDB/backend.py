from flask import Flask, request, jsonify
import requests
from regions import regions

app = Flask(__name__)

JOBTECH_URL = "https://jobsearch.api.jobtechdev.se/search"
HEADERS = {
    "accept": "application/json",
    "x-feature-freetext-bool-method": "or",
    "x-feature-disable-smart-freetext": "true"
}

BAD_KEYWORDS = {"personlig assistent", "präst", "unpaid"}
def extract_description(job):
    desc = job.get("description", "")
    if isinstance(desc, dict):
        # Try Swedish first, then English
        return desc.get("sv") or desc.get("en") or ""
    elif isinstance(desc, str):
        return desc
    return ""

def get_region_codes(region_str):
    regions_lower = {k.lower(): v for k, v in regions.items()}
    selected = [r.strip().lower() for r in region_str.split(",")]
    return [regions_lower[r] for r in selected if r in regions_lower]

def strip_date(dt_str):
    if dt_str:
        return dt_str.split("T")[0]
    return ""

def fetch_jobs(params):
    """Fetch jobs from JobTech API and filter bad keywords."""
    # Convert region string to codes if provided
    if "region" in params and isinstance(params["region"], str):
        params["region"] = get_region_codes(params["region"])

    offset = 0
    limit = params.get("limit", 50)
    jobs = []

    while True:
        params["offset"] = offset
        params["limit"] = limit

        try:
            r = requests.get(JOBTECH_URL, params=params, headers=HEADERS, timeout=10)
            r.raise_for_status()
        except requests.exceptions.HTTPError as e:
            print("API error:", e)
            break

        data = r.json()
        hits = data.get("hits", [])
        total_jobs = data.get("total", {}).get("value", 0)

        if not hits or offset >= total_jobs:
            break

        for job in hits:
            jobs.append({
                "id": job.get("id"),
                "headline": job.get("headline"),
                "webpage_url": job.get("webpage_url"),
                "employer_name": job.get("employer", {}).get("name") if job.get("employer") else "",
                "municipality": job.get("workplace_address", {}).get("municipality") if job.get("workplace_address") else "",
                "application_deadline_simple": strip_date(job.get("application_deadline")),
                "publication_date": job.get("publication_date"),
                "last_publication_date": job.get("last_publication_date"),
                "application_deadline": job.get("application_deadline"),
                "description": job.get("description", {}).get("text", "")

            })

        offset += limit

    # Apply BAD_KEYWORDS filter
    filtered = [
        j for j in jobs
        if not any(bad.lower() in (j["headline"] + j["employer_name"]).lower() for bad in BAD_KEYWORDS)
    ]
    return filtered

@app.route("/search", methods=["GET", "POST"])
def search():
    # Accept params via query string or JSON POST
    if request.method == "POST":
        params = request.get_json() or {}
    else:
        params = request.args.to_dict()

    # Convert limit/offset to int if passed as strings
    if "limit" in params: params["limit"] = int(params["limit"])
    if "offset" in params: params["offset"] = int(params["offset"])

    jobs = fetch_jobs(params)
    response = jsonify(jobs)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

if __name__ == "__main__":
    app.run(port=3000, debug=True)

