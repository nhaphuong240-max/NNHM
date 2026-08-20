## Summary

<!-- Mô tả ngắn thay đổi + link ticket/UC -->

## Liên kết

- UC/FR: 
- Sprint task: 
- OpenAPI thay đổi: [ ] Không · [ ] Có (đính kèm path)

## Checklist review

- [ ] Khớp `openapi.yaml` / không breaking API
- [ ] Tenant scope + audit (nếu mutation)
- [ ] Không cross-module repository import (ADR-001)
- [ ] Unit test critical path
- [ ] Không secret trong diff

## Test plan

<!-- Cách reviewer verify locally -->

```bash
cd apps/api && npm test
```

## Screenshots / demo

<!-- Nếu có UI -->
