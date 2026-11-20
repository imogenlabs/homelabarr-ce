# Metrics

`docker-hub-pulls.csv` holds the all-time Docker Hub pull totals for the frontend and backend images, one row per day (UTC), written by the "Docker Hub pull counts" workflow on `main`. Docker Hub keeps no history, so the daily change is worked out from these rows.

`docker-hub-pulls-monthly-history.csv` holds the same totals at roughly month ends from June to October 2026, before the daily log began. They were read on 20 Nov 2026 from the Unraid Community Apps feed (`downloadtrend` and `trendsDate` for the two Homelabarr templates), which samples Docker Hub about once a month. The feed has no frontend figure dated 30 June.

Pulls are not users: every new image is pulled again by each install that updates itself, so months with many releases show more pulls.

This branch holds data only and is never merged.
