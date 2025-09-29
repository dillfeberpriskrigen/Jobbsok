#!/usr/bin/python3

import requests
import csv
import os
import argparse
from datetime import datetime
import json

from regions import regions


def strip_date(datetime_str):
    if datetime_str:
        return datetime_str.split("T")[0]
    return ""

# =====================================
# Konfiguration
# =====================================

fields = [
    "id",
    "intressant",
    "ansokt",
    "headline",
    "webpage_url",
    "employer_name",
    "municipality",
    "application_deadline_simple",
    "publication_date",
    "last_publication_date",
    "application_deadline",
]

all_jobs_file = "ofiltreradeJobb.csv"
filtered_jobs_file = "filtreradeJobb.csv"
expired_jobs_file = "gamlaJobb.csv"
last_run_file = "last_run.txt"

trainee_file = "Trainee.csv"
trainee_fields = fields.copy()

# =====================================
# Hjälpfunktioner
# =====================================

def load_params(parameter_file):
    with open(parameter_file, "r", encoding="utf-8") as f:
        params = json.load(f)
    if "region" in params:
        params["region"] = get_region_codes(params["region"])

    return params


def get_region_codes(region_str):
    """
    Tar en sträng med regioner separerade med komma, t.ex.
    "Dalarna, Östergötland, Kalmar", och returnerar en lista
    med motsvarande regionkoder.
    """
    # Gör allt lowercase för mer tolerant matchning
    regions_lower = {k.lower(): v for k, v in regions.items()}
    selected = [r.strip().lower() for r in region_str.split(",")]
    codes = [regions_lower[r] for r in selected if r in regions_lower]
    return codes


def load_bad_keywords(filename="bad_keywords.txt"):
    if not os.path.exists(filename):
        print(f"Varning: {filename} finns inte – inga filterord laddas.")
        return set()
    with open(filename, encoding="utf-8") as f:
        # strippar radslut, hoppar över tomma rader
        return {line.strip() for line in f if line.strip()}
bad_keywords = load_bad_keywords("bad_keywords.txt")

def load_last_run():
    if os.path.exists(last_run_file):
        with open(last_run_file, "r") as f:
            timestamp = f.read().strip()
            try:
                return datetime.fromisoformat(timestamp)
            except ValueError:
                return None
    return None

def save_last_run():
    now = datetime.now().replace(second=0, microsecond=0)
    with open(last_run_file, "w") as f:
        f.write(now.isoformat())

def write_sorted_csv(filename, rows, fieldnames=None):
    sorted_rows = sorted(
        rows,
        key=lambda r: r.get("publication_date") or "",
        reverse=True
    )
    if not fieldnames:
        fieldnames = rows[0].keys() if rows else []
    with open(filename, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sorted_rows)

# =====================================
# Flytta gamla jobb
# =====================================

def move_expired_jobs():
    expired_rows = []

    for filename in [all_jobs_file, filtered_jobs_file]:
        if not os.path.exists(filename):
            continue

        with open(filename, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        active_rows = []
        for row in rows:
            deadline_date = row.get("application_deadline_simple", "")
            if deadline_date:
                try:
                    deadline_obj = datetime.strptime(deadline_date, "%Y-%m-%d").date()
                    if deadline_obj < datetime.today().date():
                        expired_rows.append(row)
                        continue
                except ValueError:
                    pass
            active_rows.append(row)

        write_sorted_csv(filename, active_rows, fieldnames=fields)

    if expired_rows:
        if os.path.exists(expired_jobs_file):
            with open(expired_jobs_file, newline="", encoding="utf-8") as f:
                old_expired = list(csv.DictReader(f))
        else:
            old_expired = []

        all_expired = old_expired + expired_rows
        write_sorted_csv(expired_jobs_file, all_expired, fieldnames=fields)
        print(f"Flyttade {len(expired_rows)} gamla jobb till {expired_jobs_file}")

# =====================================
# Hämta jobb generellt
# =====================================

def fetch_jobs(params, output_file, fieldnames, fetch_all=False):
    existing_ids = set()
    if os.path.exists(output_file):
        with open(output_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing_ids.add(row["id"])

    url = "https://jobsearch.api.jobtechdev.se/search"
    headers = {
        "accept": "application/json",
        "x-feature-freetext-bool-method": "or",
        "x-feature-disable-smart-freetext": "true"
    }

    if not fetch_all:
        last_run = load_last_run()
        if last_run:
            params["published-after"] = last_run.replace(microsecond=0).isoformat()
            print(f"Hämtar jobb publicerade efter {params['published-after']}")
        else:
            print("Ingen tidigare körning hittad – hämtar alla jobb")

    new_rows = []
    offset = 0
    total_jobs = 1
    while offset < total_jobs:
        params["offset"] = offset
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()
        hits = data.get("hits", [])
        total_jobs = data.get("total", {}).get("value", 0)

        if not hits:
            break

        for job in hits:
            job_id = job.get("id")
            if job_id in existing_ids:
                continue

            row = {
                "id": job_id,
                "headline": job.get("headline"),
                "webpage_url": job.get("webpage_url"),
                "employer_name": job.get("employer", {}).get("name") if job.get("employer") else "",
                "municipality": job.get("workplace_address", {}).get("municipality") if job.get("workplace_address") else "",
                "application_deadline_simple": strip_date(job.get("application_deadline")),
                "publication_date": job.get("publication_date"),
                "last_publication_date": job.get("last_publication_date"),
                "application_deadline": job.get("application_deadline"),
            }

            new_rows.append(row)
            existing_ids.add(job_id)

        offset += params.get("limit", 50)
        print(f"Hämtat {min(offset, total_jobs)} av {total_jobs} jobb")

    if new_rows:
        if os.path.exists(output_file):
            with open(output_file, newline="", encoding="utf-8") as f:
                old_rows = list(csv.DictReader(f))
        else:
            old_rows = []
        write_sorted_csv(output_file, old_rows + new_rows, fieldnames=fieldnames)

    print(f"Nya jobb tillagda i {output_file}: {len(new_rows)}")
    save_last_run()

# Sortera jobb
#
#

def filter_jobs(input_file, output_file, bad_keywords, fieldnames):
    if not os.path.exists(input_file):
        print(f"{input_file} finns inte – hoppar över filtrering")
        return

    with open(input_file, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    filtered_rows = []
    for row in rows:
        headline = row.get("headline", "").lower()
        employer = row.get("employer_name", "").lower()

        if any(bad.lower() in headline or bad.lower() in employer for bad in bad_keywords):
            continue  # hoppa över oönskade jobb
        filtered_rows.append(row)

    write_sorted_csv(output_file, filtered_rows, fieldnames=fieldnames)
    print(f"Filtrerade {len(filtered_rows)} jobb till {output_file}")


# =====================================
# Main
# =====================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Jobbfångare")
    parser.add_argument("--all", action="store_true", help="Hämta alla jobb istället för endast nya")
    args = parser.parse_args()

    move_expired_jobs()

    default_params = load_params("params.json")
    trainee_params = load_params("trainee_params.json")

    fetch_jobs(default_params, all_jobs_file, fields, fetch_all=args.all)
    filter_jobs(all_jobs_file, filtered_jobs_file, bad_keywords, fields)



    fetch_jobs(trainee_params, trainee_file, fields, fetch_all=args.all)
    
    print("Klar!")

