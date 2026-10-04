# Báo cáo đo thời gian mở Doc (VN Writer)

- **Ngày đo**: 2026-10-04T03:34:44.862Z
- **Môi trường**: Windows 11, Node.js v20.20.2, LibreOffice adapter qua CDP
- **Tình trạng hệ thống**: Máy có tải nền (RAM tổng: 15.85 GB, RAM dùng: 8.23 GB ~ 51.9%, RAM trống: 7.62 GB)
- **Tiêu chí cảnh báo**: 
  - Thời gian mở > 30 giây
  - Hoặc tỉ lệ thời gian > 5 giây / MB

## 1. Bảng kết quả chi tiết (24 tệp)

| Tệp | Tên gốc / Mô tả | Kích thước (MB) | Thời gian (giây) | Tỉ lệ (s/MB) | Ghi chú | Tệp log thô |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `d01.docx` | 2. ĐIỀU LỆ.docx | 0.078 | 7.44 | 95.0 | **> 5s/MB** (95.0s/MB) | [`doc_open_d01_run1.log`](docs/perf-measure/logs/doc_open_d01_run1.log) |
| `d02.docx` | 22.05.20-Hop dong dich vu camera.docx | 0.051 | 6.38 | 125.0 | **> 5s/MB** (125.0s/MB) | [`doc_open_d02_run1.log`](docs/perf-measure/logs/doc_open_d02_run1.log) |
| `d03.docx` | 6. QUYẾT ĐỊNH BAN HÀNH DẤU.docx | 0.021 | 5.23 | 252.5 | **> 5s/MB** (252.5s/MB) | [`doc_open_d03_run1.log`](docs/perf-measure/logs/doc_open_d03_run1.log) |
| `d04.docx` | Báo giá AIO Viettel 03 10 2023.docx | 2.109 | 6.49 | 3.1 | Bình thường | [`doc_open_d04_run1.log`](docs/perf-measure/logs/doc_open_d04_run1.log) |
| `d05.docx` | Biên bản đối chiếu.docx | 0.010 | 5.42 | 558.4 | **> 5s/MB** (558.4s/MB) | [`doc_open_d05_run1.log`](docs/perf-measure/logs/doc_open_d05_run1.log) |
| `d06.docx` | BV hoàn công SG.docx | 0.262 | 11.38 | 43.4 | **> 5s/MB** (43.4s/MB) | [`doc_open_d06_run1.log`](docs/perf-measure/logs/doc_open_d06_run1.log) |
| `d07.docx` | CAC LOAI MAU HOP DONG LAO DONG.docx | 0.043 | 7.14 | 165.9 | **> 5s/MB** (165.9s/MB) | [`doc_open_d07_run1.log`](docs/perf-measure/logs/doc_open_d07_run1.log) |
| `d08.docx` | Công văn BẢI TRÌ SẢN PHẨM.docx | 0.088 | 5.75 | 65.6 | **> 5s/MB** (65.6s/MB) | [`doc_open_d08_run1.log`](docs/perf-measure/logs/doc_open_d08_run1.log) |
| `d09.docx` | ĐỀ CƯƠNG BÁO CÁO TỔNG  HỢP - PHẠM TRUNG HIẾU.docx | 0.069 | 10.27 | 149.2 | **> 5s/MB** (149.2s/MB) | [`doc_open_d09_run1.log`](docs/perf-measure/logs/doc_open_d09_run1.log) |
| `d10.docx` | đề nghị thanh toán vcm.docx | 0.786 | 300.02 | 381.8 | **> 30s**; **> 5s/MB** (381.8s/MB); **LỖI** | [`doc_open_d10_run1.log`](docs/perf-measure/logs/doc_open_d10_run1.log) |
| `d11.docx` | Đề số 06.docx | 0.021 | 5.59 | 263.5 | **> 5s/MB** (263.5s/MB) | [`doc_open_d11_run1.log`](docs/perf-measure/logs/doc_open_d11_run1.log) |
| `d12.docx` | DonDatHang_PO0000006488.docx | 0.025 | 5.15 | 203.5 | **> 5s/MB** (203.5s/MB) | [`doc_open_d12_run1.log`](docs/perf-measure/logs/doc_open_d12_run1.log) |
| `d13.docx` | HappyKids_TaiLieuTongHop_DuAn_VI.docx | 0.176 | 5.63 | 32.0 | **> 5s/MB** (32.0s/MB) | [`doc_open_d13_run1.log`](docs/perf-measure/logs/doc_open_d13_run1.log) |
| `d14.docx` | HDSD KAADAS S500-C.docx | 0.021 | 5.24 | 247.3 | **> 5s/MB** (247.3s/MB) | [`doc_open_d14_run1.log`](docs/perf-measure/logs/doc_open_d14_run1.log) |
| `d15.docx` | HỢP ĐỒNG ĐẠI LÝ- NHÀ THÔNG MINH 3T QUẢNG BÌNH.docx | 0.656 | 7.02 | 10.7 | **> 5s/MB** (10.7s/MB) | [`doc_open_d15_run1.log`](docs/perf-measure/logs/doc_open_d15_run1.log) |
| `d16.docx` | HỢP ĐỒNG DỊCH VỤ NHÀ DÂN.docx | 0.131 | 7.04 | 53.7 | **> 5s/MB** (53.7s/MB) | [`doc_open_d16_run1.log`](docs/perf-measure/logs/doc_open_d16_run1.log) |
| `d17.docx` | Hợp Đồng Lao Động.docx | 0.023 | 5.30 | 235.2 | **> 5s/MB** (235.2s/MB) | [`doc_open_d17_run1.log`](docs/perf-measure/logs/doc_open_d17_run1.log) |
| `d18.docx` | Laptop Dell Vostro 15 3591...docx | 0.246 | 5.24 | 21.3 | **> 5s/MB** (21.3s/MB) | [`doc_open_d18_run1.log`](docs/perf-measure/logs/doc_open_d18_run1.log) |
| `d19.docx` | Microsoft Open License Purchase Order_3T.docx | 0.017 | 5.21 | 303.2 | **> 5s/MB** (303.2s/MB) | [`doc_open_d19_run1.log`](docs/perf-measure/logs/doc_open_d19_run1.log) |
| `d20.docx` | PL3a-Giay yeu cau BH tau ca 2024.docx | 0.284 | 9.69 | 34.1 | **> 5s/MB** (34.1s/MB) | [`doc_open_d20_run1.log`](docs/perf-measure/logs/doc_open_d20_run1.log) |
| `d21.docx` | Sở hữu ngoại hình mới.docx | 1.775 | 5.75 | 3.2 | Bình thường | [`doc_open_d21_run1.log`](docs/perf-measure/logs/doc_open_d21_run1.log) |
| `d22.docx` | Hợp Đồng Lao Động (trùng d17).docx | 0.023 | 5.30 | 235.3 | **> 5s/MB** (235.3s/MB) | [`doc_open_d22_run1.log`](docs/perf-measure/logs/doc_open_d22_run1.log) |
| `d23.docx` | 6. QUYẾT ĐỊNH BAN HÀNH DẤU (trùng d03).docx | 0.021 | 5.24 | 253.0 | **> 5s/MB** (253.0s/MB) | [`doc_open_d23_run1.log`](docs/perf-measure/logs/doc_open_d23_run1.log) |
| `d24.docx` | aquara final (1) (2).docx | 22.671 | 15.13 | 0.7 | Bình thường | [`doc_open_d24_run1.log`](docs/perf-measure/logs/doc_open_d24_run1.log) |

## 2. Đo lặp lại xác nhận cho 3 tệp chậm nhất

| Tệp | Kích thước (MB) | Lần 1 (s) | Lần 2 (s) | Chênh lệch | Kết luận |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `d10.docx` (đề nghị thanh toán vcm.docx) | 0.786 | 300.02 | 300.02 | 0.00s | Chậm (> 30s) |
| `d24.docx` (aquara final (1) (2).docx) | 22.671 | 15.13 | 14.80 | -0.33s | Ổn định |
| `d06.docx` (BV hoàn công SG.docx) | 0.262 | 11.38 | 9.94 | -1.43s | Ổn định |

## 3. Phân tích tệp chậm bất thường

### Tệp `d01.docx` (2. ĐIỀU LỆ.docx)
- **Kích thước**: 0.078 MB
- **Thời gian mở lần 1**: 7.44 giây (95.0 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=63.0 soffice_spawn=15.0 pipe_resolve=3203.0 desktop_service=16.0 resolve_attempts=150
[VNO Open Perf] worker_start_and_profile_ready: 3411.8 ms app=writer
[VNO Open Perf] uno_load_and_store: 1854.3 ms app=writer bytes=217791
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d02.docx` (22.05.20-Hop dong dich vu camera.docx)
- **Kích thước**: 0.051 MB
- **Thời gian mở lần 1**: 6.38 giây (125.0 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=47.0 soffice_spawn=31.0 pipe_resolve=3156.0 desktop_service=0.0 resolve_attempts=148
[VNO Open Perf] worker_start_and_profile_ready: 3359.6 ms app=writer
[VNO Open Perf] uno_load_and_store: 1795.7 ms app=writer bytes=116006
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d03.docx` (6. QUYẾT ĐỊNH BAN HÀNH DẤU.docx)
- **Kích thước**: 0.021 MB
- **Thời gian mở lần 1**: 5.23 giây (252.5 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=93.0 soffice_spawn=16.0 pipe_resolve=3203.0 desktop_service=0.0 resolve_attempts=150
[VNO Open Perf] worker_start_and_profile_ready: 3439.5 ms app=writer
[VNO Open Perf] uno_load_and_store: 781.1 ms app=writer bytes=11538
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d05.docx` (Biên bản đối chiếu.docx)
- **Kích thước**: 0.010 MB
- **Thời gian mở lần 1**: 5.42 giây (558.4 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=46.0 soffice_spawn=32.0 pipe_resolve=3250.0 desktop_service=0.0 resolve_attempts=152
[VNO Open Perf] worker_start_and_profile_ready: 3445.6 ms app=writer
[VNO Open Perf] uno_load_and_store: 922.1 ms app=writer bytes=19681
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d06.docx` (BV hoàn công SG.docx)
- **Kích thước**: 0.262 MB
- **Thời gian mở lần 1**: 11.38 giây (43.4 s/MB)
- **Thời gian mở lần 2**: 9.94 giây
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=47.0 soffice_spawn=16.0 pipe_resolve=3187.0 desktop_service=16.0 resolve_attempts=150
[VNO Open Perf] worker_start_and_profile_ready: 3382.0 ms app=writer
[VNO Open Perf] uno_fallback_to_convert_to: app=writer reason=writer-docx-textboxes
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d07.docx` (CAC LOAI MAU HOP DONG LAO DONG.docx)
- **Kích thước**: 0.043 MB
- **Thời gian mở lần 1**: 7.14 giây (165.9 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=109.0 soffice_spawn=0.0 pipe_resolve=3687.0 desktop_service=0.0 resolve_attempts=163
[VNO Open Perf] worker_start_and_profile_ready: 3981.7 ms app=writer
[VNO Open Perf] uno_load_and_store: 1752.5 ms app=writer bytes=157496
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d08.docx` (Công văn BẢI TRÌ SẢN PHẨM.docx)
- **Kích thước**: 0.088 MB
- **Thời gian mở lần 1**: 5.75 giây (65.6 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=109.0 soffice_spawn=16.0 pipe_resolve=3672.0 desktop_service=0.0 resolve_attempts=165
[VNO Open Perf] worker_start_and_profile_ready: 3944.5 ms app=writer
[VNO Open Perf] uno_load_and_store: 766.8 ms app=writer bytes=10785
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d09.docx` (ĐỀ CƯƠNG BÁO CÁO TỔNG  HỢP - PHẠM TRUNG HIẾU.docx)
- **Kích thước**: 0.069 MB
- **Thời gian mở lần 1**: 10.27 giây (149.2 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=62.0 soffice_spawn=0.0 pipe_resolve=3109.0 desktop_service=16.0 resolve_attempts=145
[VNO Open Perf] worker_start_and_profile_ready: 3295.6 ms app=writer
[VNO Open Perf] uno_fallback_to_convert_to: app=writer reason=writer-docx-textboxes
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d10.docx` (đề nghị thanh toán vcm.docx)
- **Kích thước**: 0.786 MB
- **Thời gian mở lần 1**: 300.02 giây (381.8 s/MB)
- **Thời gian mở lần 2**: 300.02 giây
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```

```
### Tệp `d11.docx` (Đề số 06.docx)
- **Kích thước**: 0.021 MB
- **Thời gian mở lần 1**: 5.59 giây (263.5 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=93.0 soffice_spawn=0.0 pipe_resolve=3188.0 desktop_service=16.0 resolve_attempts=149
[VNO Open Perf] worker_start_and_profile_ready: 3440.3 ms app=writer
[VNO Open Perf] uno_load_and_store: 988.6 ms app=writer bytes=44488
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d12.docx` (DonDatHang_PO0000006488.docx)
- **Kích thước**: 0.025 MB
- **Thời gian mở lần 1**: 5.15 giây (203.5 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=62.0 soffice_spawn=16.0 pipe_resolve=3156.0 desktop_service=0.0 resolve_attempts=150
[VNO Open Perf] worker_start_and_profile_ready: 3362.2 ms app=writer
[VNO Open Perf] uno_load_and_store: 797.3 ms app=writer bytes=24806
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d13.docx` (HappyKids_TaiLieuTongHop_DuAn_VI.docx)
- **Kích thước**: 0.176 MB
- **Thời gian mở lần 1**: 5.63 giây (32.0 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=62.0 soffice_spawn=16.0 pipe_resolve=3187.0 desktop_service=16.0 resolve_attempts=150
[VNO Open Perf] worker_start_and_profile_ready: 3394.3 ms app=writer
[VNO Open Perf] uno_load_and_store: 1101.3 ms app=writer bytes=72631
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d14.docx` (HDSD KAADAS S500-C.docx)
- **Kích thước**: 0.021 MB
- **Thời gian mở lần 1**: 5.24 giây (247.3 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=47.0 soffice_spawn=47.0 pipe_resolve=3188.0 desktop_service=0.0 resolve_attempts=150
[VNO Open Perf] worker_start_and_profile_ready: 3400.4 ms app=writer
[VNO Open Perf] uno_load_and_store: 816.2 ms app=writer bytes=16779
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d15.docx` (HỢP ĐỒNG ĐẠI LÝ- NHÀ THÔNG MINH 3T QUẢNG BÌNH.docx)
- **Kích thước**: 0.656 MB
- **Thời gian mở lần 1**: 7.02 giây (10.7 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=63.0 soffice_spawn=0.0 pipe_resolve=3984.0 desktop_service=0.0 resolve_attempts=177
[VNO Open Perf] worker_start_and_profile_ready: 4231.8 ms app=writer
[VNO Open Perf] uno_load_and_store: 1494.2 ms app=writer bytes=64896
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d16.docx` (HỢP ĐỒNG DỊCH VỤ NHÀ DÂN.docx)
- **Kích thước**: 0.131 MB
- **Thời gian mở lần 1**: 7.04 giây (53.7 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=47.0 soffice_spawn=15.0 pipe_resolve=3594.0 desktop_service=0.0 resolve_attempts=168
[VNO Open Perf] worker_start_and_profile_ready: 3772.8 ms app=writer
[VNO Open Perf] uno_load_and_store: 1797.0 ms app=writer bytes=107305
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d17.docx` (Hợp Đồng Lao Động.docx)
- **Kích thước**: 0.023 MB
- **Thời gian mở lần 1**: 5.30 giây (235.2 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=47.0 soffice_spawn=16.0 pipe_resolve=3218.0 desktop_service=0.0 resolve_attempts=152
[VNO Open Perf] worker_start_and_profile_ready: 3416.0 ms app=writer
[VNO Open Perf] uno_load_and_store: 880.5 ms app=writer bytes=43901
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d18.docx` (Laptop Dell Vostro 15 3591...docx)
- **Kích thước**: 0.246 MB
- **Thời gian mở lần 1**: 5.24 giây (21.3 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=47.0 soffice_spawn=15.0 pipe_resolve=3266.0 desktop_service=0.0 resolve_attempts=154
[VNO Open Perf] worker_start_and_profile_ready: 3460.5 ms app=writer
[VNO Open Perf] uno_load_and_store: 768.4 ms app=writer bytes=15353
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d19.docx` (Microsoft Open License Purchase Order_3T.docx)
- **Kích thước**: 0.017 MB
- **Thời gian mở lần 1**: 5.21 giây (303.2 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=62.0 soffice_spawn=16.0 pipe_resolve=3234.0 desktop_service=0.0 resolve_attempts=151
[VNO Open Perf] worker_start_and_profile_ready: 3433.4 ms app=writer
[VNO Open Perf] uno_load_and_store: 812.5 ms app=writer bytes=15460
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d20.docx` (PL3a-Giay yeu cau BH tau ca 2024.docx)
- **Kích thước**: 0.284 MB
- **Thời gian mở lần 1**: 9.69 giây (34.1 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=47.0 soffice_spawn=31.0 pipe_resolve=3172.0 desktop_service=0.0 resolve_attempts=149
[VNO Open Perf] worker_start_and_profile_ready: 3384.7 ms app=writer
[VNO Open Perf] uno_fallback_to_convert_to: app=writer reason=writer-docx-textboxes
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d22.docx` (Hợp Đồng Lao Động (trùng d17).docx)
- **Kích thước**: 0.023 MB
- **Thời gian mở lần 1**: 5.30 giây (235.3 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=94.0 soffice_spawn=0.0 pipe_resolve=3219.0 desktop_service=0.0 resolve_attempts=154
[VNO Open Perf] worker_start_and_profile_ready: 3437.3 ms app=writer
[VNO Open Perf] uno_load_and_store: 879.8 ms app=writer bytes=43901
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```
### Tệp `d23.docx` (6. QUYẾT ĐỊNH BAN HÀNH DẤU (trùng d03).docx)
- **Kích thước**: 0.021 MB
- **Thời gian mở lần 1**: 5.24 giây (253.0 s/MB)
- **Chi tiết log phân rã thời gian (Perf breakdown)**:
```
[VNO Open Perf] profile_seeded: app=writer
[VNO Open Perf] worker_stage_breakdown: app=writer python_and_uno_import=62.0 soffice_spawn=16.0 pipe_resolve=3203.0 desktop_service=0.0 resolve_attempts=151
[VNO Open Perf] worker_start_and_profile_ready: 3408.5 ms app=writer
[VNO Open Perf] uno_load_and_store: 787.6 ms app=writer bytes=11538
[VNO Open Perf] background_filter_warmup_skipped: app=writer reason=profile-already-primed
```

## 4. Kết luận & Kiến nghị
- Đã đo đầy đủ 24 tệp .docx trong bộ test landocx.
- Mọi số liệu đo được ghi trực tiếp từ lệnh CDP `TOTAL_MS` và lưu tại thư mục `docs/perf-measure/logs/`.
