# Bằng chứng G01, G02, G05

File này chỉ liệt kê job đang có. Job xanh không đổi trạng thái chờ ký và không phải chữ ký của người duyệt.

| Gate | Job | Việc job đang làm | Trạng thái |
| --- | --- | --- | --- |
| G01 | `t02-isolated-db` | `scripts/t02-rls-hold-proof.js` và `scripts/t02-rls-app-proof.js` | chờ ký |
| G02 | `t02-isolated-db` | Cùng harness, proof ít nhất 50 insert một căn và một hold active | chờ ký |
| G05 | `api` | `settlement-label.service.spec.ts`. Không có chứng từ thì nhãn không phải `PAID` | chờ ký |

G03, G04, G07, G08, G10, G11, và G12 không có định nghĩa trong repo. Đợt này không thêm tiêu chí cho các gate đó.
