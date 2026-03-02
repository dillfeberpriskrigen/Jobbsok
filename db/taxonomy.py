#!/usr/bin/python3

#########################################
#Script Name:				#
#Decription: 				#
#Args:					#
#Author:				#
#Email:					#
#########################################
import json
import pathlib
import requests

URL = "https://data.jobtechdev.se/taxonomy/version/latest/query/all-concepts/all-concepts.json"
OUT = pathlib.Path("all-concepts.json")

r = requests.get(URL, stream=True, timeout=120)
r.raise_for_status()

with OUT.open("wb") as f:
    for chunk in r.iter_content(chunk_size=1024 * 1024):
        if chunk:
            f.write(chunk)

print("Saved:", OUT, "bytes:", OUT.stat().st_size)

# Optional: quick sanity check
data = json.loads(OUT.read_text(encoding="utf-8"))
print("Top-level keys:", list(data.keys()))
