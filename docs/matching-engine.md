# ROOMIE — Matching Engine Documentation (v1.0.0)

## 1. Tổng quan Kiến trúc (Architecture Overview)

ROOMIE Matching Engine là một engine thuần toán học (pure deterministic algorithm), được xây dựng độc lập trong module `src/lib/matching/`. Engine không sử dụng LLM, không sinh số ngẫu nhiên, không phụ thuộc vào đồng hồ hệ thống (stateless & deterministic).

### Pipeline 5 bước xử lý:
1. **Bước 1 · Lọc cứng (Hard Filters - H0 đến H11):**
   - Thực thi tại lớp cơ sở dữ liệu qua hàm PostgreSQL `fn_pair_ineligibility_reasons` / `fn_is_pair_eligible` và ánh xạ tương đương tại `src/lib/matching/hard-filters.ts`.
   - Các ứng viên không thỏa mãn điều kiện tiên quyết (ví dụ: cùng có phòng, giới tính không phù hợp, tiền phòng vượt ngân sách, vi phạm dealbreaker tuổi, hút thuốc...) sẽ bị loại bỏ hoàn toàn trước khi tính điểm độ tương hợp.
2. **Bước 2 · Chấm điểm 27 chiều & 6 nhóm (Category & Dimension Scoring):**
   - Đánh giá tất cả 30 câu hỏi bản khảo sát qua 27 chiều đo lường (Dimensions).
   - Mỗi chiều áp dụng một trong các quy tắc so sánh: SYM (khoảng cách thứ bậc), TIME (chênh lệch giờ liên tục), DIR (nhu cầu ↔ chịu đựng 2 chiều), JAC (Jaccard đa lựa chọn), MATRIX (ma trận tương thích chi phí), JOINT (đồng thuận tích cực).
   - Tổng hợp điểm theo từng nhóm với cơ chế tự động tái chuẩn hóa trọng số khi có câu trả lời thiếu.
3. **Bước 3 · Điểm tương thích cuối cùng (Weighted Final Score):**
   - Áp dụng đúng 6 trọng số nhóm đã phê duyệt để tính ra điểm tương thích tổng thể từ 0 đến 100 dạng số thực chưa làm tròn (unrounded float).
4. **Bước 4 · Xếp hạng & Phá vỡ thế hòa 4 tầng (Ranking & Tie-Breaking):**
   - Sắp xếp toàn bộ ứng viên hợp lệ theo thứ tự:
     1. `finalScore` giảm dần (độ chính xác số thực).
     2. `housingFit` giảm dần (độ vừa vặn ngân sách phòng).
     3. `isVerified` giảm dần (ưu tiên người dùng đã xác minh danh tính CCCD).
     4. `userId` tăng dần (đảm bảo thứ tự tuyệt đối và nhất quán 100% giữa các lần gọi).
5. **Bước 5 · Giải thích độ tương thích (Deterministic Explanations):**
   - Tạo danh sách "Tại sao hai bạn hợp nhau" (Why you match - điểm ≥ 85) và "Cần trao đổi thêm" (Things to discuss - điểm ≤ 65 hoặc độ lệch định hướng ≥ 1.5).
   - Trích xuất trực tiếp giá trị câu trả lời thực tế của hai người dùng để hiển thị nội dung cá nhân hóa, dễ hiểu.

---

## 2. Trọng số 6 nhóm danh mục (Category Weights)

| Nhóm | Tên tiếng Việt | Tên tiếng Anh | Trọng số | Các câu hỏi |
|---|---|---|---|---|
| `lifestyle` | Thói quen sinh hoạt | Lifestyle Habits | **25% (0.25)** | Q1 – Q5 |
| `cleanliness` | Sạch sẽ & ngăn nắp | Cleanliness & Organization | **20% (0.20)** | Q6 – Q10 |
| `schedule_noise` | Lịch sinh hoạt & tiếng ồn | Schedule & Noise | **15% (0.15)** | Q11 – Q15 |
| `social_space` | Đời sống xã hội & không gian riêng | Social Life & Personal Space | **15% (0.15)** | Q16 – Q20 |
| `financial` | Tiền bạc & trách nhiệm | Money & Responsibility | **10% (0.10)** | Q21 – Q25 |
| `communication` | Tính cách & giao tiếp | Personality & Communication | **15% (0.15)** | Q26 – Q30 |

*Tổng trọng số = 100% (1.000).*

---

## 3. Bảng 27 chiều tương thích (Dimensions Catalog)

Tất cả 30 câu hỏi của bản khảo sát đều được sử dụng đầy đủ (bao gồm 27 chiều tương ứng):

| Chiều | Nhóm | Quy tắc | Trọng số trong nhóm | Mô tả & Câu hỏi nguồn |
|---|---|---|---|---|
| `L1_cooking` | lifestyle | SYM | 0.20 | Q1: Tần suất nấu ăn tại nhà (1–5) |
| `L2_eating` | lifestyle | SYM | 0.15 | Q2: Tần suất ăn uống tại phòng (1–5) |
| `L3_time_at_home` | lifestyle | SYM | 0.20 | Q3: Thời lượng ở nhà mỗi ngày (1–5) |
| `L4_routine_flexibility` | lifestyle | DIR | 0.45 | A.Q4 (cố định lịch) ↔ B.Q5 (linh hoạt) và ngược lại |
| `C1_cleanliness_standard` | cleanliness | SYM | 0.30 | Q6: Tiêu chuẩn sạch sẽ mong muốn (1–5) |
| `C2_chore_pace` | cleanliness | DIR | 0.25 | A.Q8 (tiến độ dọn khu vực chung) ↔ B.Q7 (tần suất dọn phòng) |
| `C3_mess_tolerance` | cleanliness | DIR | 0.30 | Bừa bộn B (6 - B.Q9) ↔ Chịu đựng A (6 - A.Q10) và ngược lại |
| `C4_tidiness` | cleanliness | SYM | 0.15 | Q9: Mức độ ngăn nắp cá nhân (1–5) |
| `S1_bedtime` | schedule_noise | TIME | 0.20 | Q11: Giờ đi ngủ (Trước 22h ... Sau 01h) |
| `S2_wake_time` | schedule_noise | TIME | 0.20 | Q12: Giờ thức dậy (Trước 6h ... Sau 9h) |
| `S3_night_noise` | schedule_noise | DIR | 0.25 | Gây ồn từ hoạt động đêm Q14 ↔ Chịu ồn ban đêm Q13 |
| `S4_night_activities` | schedule_noise | JAC | 0.10 | Q14: Hoạt động ban đêm (chọn nhiều - Jaccard overlap) |
| `S5_quiet_time` | schedule_noise | SYM | 0.25 | Q15: Tầm quan trọng của không gian yên tĩnh (1–5) |
| `P1_guests` | social_space | DIR | 0.30 | A.Q16 (nhu cầu mời bạn) ↔ B.Q17 (thoải mái khi có khách) |
| `P2_interaction_vs_space` | social_space | DIR | 0.25 | A.Q19 (nhu cầu tương tác) ↔ (6 - B.Q18) (chịu đựng không gian riêng) |
| `P3_interaction_desire` | social_space | SYM | 0.15 | Q19: Mong muốn tương tác, giao lưu (1–5) |
| `P4_personal_space_need` | social_space | SYM | 0.10 | Q18: Nhu cầu không gian riêng tư (1–5) |
| `P5_privacy_importance` | social_space | SYM | 0.20 | Q20: Tầm quan trọng của sự riêng tư (1–5) |
| `F1_on_time_payment` | financial | SYM | 0.30 | Q21: Đóng tiền phòng & hóa đơn đúng hạn (1–5) |
| `F2_cost_split_method` | financial | MATRIX | 0.25 | Q22: Phương thức chia chi phí (50/50, theo mức dùng, tùy trường hợp, khác) |
| `F3_reminder_comfort` | financial | SYM | 0.15 | Q23: Thoải mái khi nhắc nhở tiền bạc (1–5) |
| `F4_cost_sharing` | financial | SYM | 0.20 | Q24: Sẵn sàng chia sẻ chi phí chung (1–5) |
| `F5_expense_tracking` | financial | SYM | 0.10 | Q25: Tầm quan trọng của ghi chép chi tiêu (1–5) |
| `M1_prefers_direct_talk` | communication | SYM | 0.20 | Q26: Thích nói chuyện trực tiếp khi có vấn đề (1–5) |
| `M2_voicing_vs_calm` | communication | DIR | 0.30 | A.Q27 (nói ra khi khó chịu) ↔ B.Q29 (giữ bình tĩnh khi bất đồng) |
| `M3_willing_to_compromise` | communication | JOINT | 0.25 | Q28: Sẵn sàng thỏa hiệp (đồng thuận tích cực) |
| `M4_different_lifestyles` | communication | JOINT | 0.25 | Q30: Thoải mái với lối sống khác biệt (đồng thuận tích cực) |

---

## 4. Công thức toán học chi tiết (Scoring Rules)

### 4.1 Thang đo thứ bậc (SYM)
Áp dụng cho các câu hỏi đo lường mức độ tương đồng 1–5:
$$\text{similarity} = 1 - \frac{|a - b|}{4}$$
$$\text{score} = \text{similarity} \times 100$$
- Chênh lệch 0: 100%
- Chênh lệch 1: 75%
- Chênh lệch 2: 50%
- Chênh lệch 3: 25%
- Chênh lệch 4: 0%

### 4.2 Thang đo thời gian (TIME) — Q11 & Q12
Quy đổi các mốc lựa chọn thành số giờ thực tế liên tục trên trục thời gian:
- **Q11 Giờ đi ngủ:**
  - 1 (Trước 22h): 21.0h
  - 2 (22h–23h): 22.5h
  - 3 (23h–00h): 23.5h
  - 4 (00h–01h): 24.5h
  - 5 (Sau 01h): 26.0h
- **Q12 Giờ thức dậy:**
  - 1 (Trước 6h): 5.0h
  - 2 (6h–7h): 6.5h
  - 3 (7h–8h): 7.5h
  - 4 (8h–9h): 8.5h
  - 5 (Sau 9h): 10.0h

$$\text{similarity} = \max\left(0, 1 - \frac{|\text{hour}_A - \text{hour}_B|}{4.0}\right)$$
$$\text{score} = \text{similarity} \times 100$$
Nếu chênh lệch quá 4 tiếng (ví dụ ngủ lúc 21h và ngủ lúc 2h sáng), điểm tương thích về giờ giấc là 0%.

### 4.3 Đánh giá hai chiều theo nhu cầu và độ chịu đựng (DIR)
Sử dụng nguyên lý: *"Sự bao dung vượt mức không bị phạt, nhưng thiếu hụt độ chịu đựng sẽ gây xung đột"*.
- Điểm đánh giá một chiều:
  $$s_{XY} = \left(1 - \frac{\max(0, \text{demand}_X - \text{tolerance}_Y)}{4}\right) \times 100$$
- Tổng hợp hai chiều theo nguyên lý mắt xích yếu nhất (Weakest-Link Blend):
  $$\text{score} = 0.5 \times \frac{s_{AB} + s_{BA}}{2} + 0.5 \times \min(s_{AB}, s_{BA})$$
- Đảm bảo tính chất đối xứng tuyệt đối: $\text{score}(A, B) = \text{score}(B, A)$.

**Bảng trọng số gây ồn hoạt động ban đêm (Q14 Noise Emission):**
- Ngủ: 0.00
- Học: 0.00
- Làm việc: 0.15
- Xem phim: 0.50
- Chơi game: 0.75
- Nói chuyện bạn bè: 0.75
- Khác: 0.40
$$\text{emission} = 1.0 + 4.0 \times \max_{opt \in Q14}(w_{opt})$$

### 4.4 Độ đo Jaccard cho câu hỏi đa lựa chọn (JAC) — Q14
$$J = \frac{|A \cap B|}{|A \cup B|} \times 100$$
(Nếu cả hai tập rỗng thì điểm là 100%).

### 4.5 Ma trận tương thích chi phí (MATRIX) — Q22
| Lựa chọn | Chia 50/50 (1) | Theo mức sử dụng (2) | Tùy trường hợp (3) | Cách khác (4) |
|---|---|---|---|---|
| **Chia 50/50 (1)** | 1.0 (100%) | 0.4 (40%) | 0.7 (70%) | 0.5 (50%) |
| **Theo mức sử dụng (2)** | 0.4 (40%) | 1.0 (100%) | 0.7 (70%) | 0.5 (50%) |
| **Tùy trường hợp (3)** | 0.7 (70%) | 0.7 (70%) | 1.0 (100%) | 0.6 (60%) |
| **Cách khác (4)** | 0.5 (50%) | 0.5 (50%) | 0.6 (60%) | 0.6 (60%) |

### 4.6 Đồng thuận tích cực (JOINT) — Q28 & Q30
Tránh trường hợp hai người cùng không chịu thỏa hiệp (1 và 1) lại được coi là giống nhau:
$$\text{joint}(a, b) = 0.5 \times \frac{\min(a, b) - 1}{4} + 0.5 \times \frac{\frac{a + b}{2} - 1}{4}$$
- 5 & 5 $\rightarrow$ 100%
- 3 & 3 $\rightarrow$ 50%
- 5 & 1 $\rightarrow$ 25%
- 1 & 1 $\rightarrow$ 0%

---

## 5. Xử lý câu trả lời bị thiếu & Tái chuẩn hóa trọng số (Missing Answers & Renormalization)

1. **Không ngầm định câu thiếu là khớp:** Câu hỏi bị thiếu không được cộng điểm tự động.
2. **Tái chuẩn hóa trong nhóm:** Nếu một nhóm có chiều bị thiếu:
   $$\text{categoryScore} = \frac{\sum_{i \in answered} w_i \times s_i}{\sum_{i \in answered} w_i}$$
3. **Tái chuẩn hóa giữa các nhóm:** Nếu cả một nhóm bị thiếu:
   $$\text{finalScore} = \frac{\sum_{k \in answered} W_k \times \text{categoryScore}_k}{\sum_{k \in answered} W_k}$$
   Đảm bảo điểm số luôn nằm chính xác trong khoảng $[0, 100]$.

---

## 6. Bộ lọc cứng (Hard Filters H0–H11)

| Mã | Tên điều kiện | Tiêu chí |
|---|---|---|
| H0 | Basic State | Không phải chính mình; hồ sơ hoàn thiện; đã trả lời đủ 30 câu hỏi; đang tìm kiếm. |
| H1 | Housing Roles | Cấm ghép cặp `has_room ↔ has_room` (cả 2 đều có phòng). Cho phép: `has_room ↔ looking` và `looking ↔ looking`. |
| H2 | Gender | Giới tính của A thuộc danh sách A chấp nhận VÀ ngược lại. |
| H3 | Age | Nếu đánh dấu `age_is_dealbreaker = true`: tuổi đối phương phải thuộc `[age_min, age_max]`. |
| H4 | Smoking | Nếu chính sách là `non_smoker_only`: đối phương phải có `is_smoker = false`. |
| H5 | Location | Quận của phòng nằm trong danh sách quận mong muốn của người tìm phòng (hoặc cùng thành phố). |
| H6 | Budget | Chi phí/người $\le$ ngân sách tối đa của người tìm phòng (`budget_max`). |
| H7 | Move-in Date | Chênh lệch ngày chuyển đến $\le$ số ngày linh hoạt (`move_in_flex_days`, mặc định 30 ngày). |
| H8 | Room Type | Loại phòng (chung/riêng) nằm trong danh sách loại phòng mong muốn. |
| H9 | Availability | Phòng còn chỗ trống (`current_occupants < capacity_total`). |
| H10 | Facilities | Các tiện ích bắt buộc (`must_have_facilities`) phải là tập con của tiện ích phòng (`room.facilities`). |
| H11 | Media | Nếu người tìm phòng yêu cầu ảnh/video, phòng phải có ít nhất 1 ảnh. |

---

## 7. Phá vỡ thế hòa (Tie-Breaking Order)

Khi nhiều ứng viên có điểm số gần nhau, hệ thống phân định thứ tự ưu tiên tuyệt đối theo 4 tầng:
1. `finalScore` (float chưa làm tròn) giảm dần.
2. `housingFit` giảm dần:
   - Đối với người tìm phòng và chủ phòng: $\frac{\text{budget\_max} - \text{per\_person\_rent}}{\text{budget\_max}}$ (giới hạn 0.0 đến 1.0).
   - Trường hợp còn lại: 0.5.
3. `isVerified` giảm dần (ưu tiên hồ sơ đã xác thực danh tính CCCD).
4. `userId` tăng dần (thứ tự chữ cái mã định danh, đảm bảo tính tất định 100%).
