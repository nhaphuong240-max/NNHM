# Document Vault (MOD-TR)

UC-TR-02 · SCR-DEV-006 · BR-08 · BR-24

## Storage adapter

| Mode | Env | Adapter |
|------|-----|---------|
| **local** (pilot default) | `DOCUMENTS_STORAGE=local` | `./uploads/{tenantId}/{storageKey}` |
| **s3** (stub) | `DOCUMENTS_STORAGE=s3` | Presign placeholder; put/get need AWS SDK |

```
documents/storage/
  storage.types.ts      # DocumentStorageAdapter interface
  local-storage.adapter.ts
  s3-storage.adapter.ts
```

Swap adapter via `DOCUMENTS_STORAGE` — no code changes in `DocumentsService`.

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/documents?entityType=&entityId=&folder=` | List vault |
| POST | `/documents/upload` | multipart `file` + metadata |
| POST | `/documents/presign` | S3-ready presign stub |
| GET | `/documents/:id/download` | Stream + `X-WEREAL-Watermark` header |
| GET | `/documents/:id/access-log` | Download audit |

Pilot watermark = response header (PDF overlay deferred).

## Env

```
DOCUMENTS_STORAGE=local
DOCUMENTS_LOCAL_ROOT=./uploads
# DOCUMENTS_S3_BUCKET=wereal-documents-dev
# DOCUMENTS_S3_ENDPOINT=http://localhost:9000
```

## Seed

`doc_seed_legal01` — sample legal pack on `prj_sunrise` after API restart.
