# 3T Office Cloud API (GD1)

FastAPI service for privacy-filtered error reports and the signed update repository. It has no document upload route. Update files are served from a read-only mount; their manifest signature is still verified by the desktop updater using the embedded release public key.

## Local development

Install `requirements-dev.txt`, set temporary `INSTALL_TOKEN_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` values in the shell, then run `uvicorn app:app --reload`. The service reads data from `DATA_DIR`, static update files from `UPDATES_DIR`, report records from `REPORTS_DIR`, database backups from `BACKUPS_DIR`, and application logs from `LOGS_DIR`.

Run API tests from the repository root with `pytest server/3t-api`.

## Endpoints

- `GET /health`
- `POST /api/v1/reports/token` issues a short-lived token bound to an anonymous installation UUID. The server signing secret never leaves the server.
- `POST /api/v1/reports` accepts only the technical report schema, requires `X-Install-Token`, and caps the body at 64 KiB.
- `GET /api/v1/updates/{product}/{channel}/latest` returns the manifest bytes and detached signature as base64 along with parsed manifest metadata.
- `GET /updates/{path}` serves the existing signed repository layout and supports single byte ranges.
- `GET /api/v1/admin/reports` requires HTTP Basic authentication from the server-only `.env`.

The report endpoint rejects extra fields, local paths, document markup, table-like payloads, and stacks that do not consist of sanitized trace frames. It stores no client IP address.
