/**
 * ROOMIE · Danh mục 126 đơn vị hành chính cấp xã/phường mới của TP. Hà Nội
 * Theo Nghị quyết số 1656/NQ-UBTVQH15 của Ủy ban Thường vụ Quốc hội (gồm 51 Phường & 75 Xã),
 * đồng thời tương thích ngược 100% với 30 mã khu vực/quận huyện gốc (`hn-*`).
 */

export interface HanoiAdminUnit {
  /** Thứ tự theo Nghị quyết 1656/NQ-UBTVQH15 (1..126) */
  order: number;
  /** Mã chuẩn lưu trong CSDL (`public.geo_units.code`) */
  code: string;
  /** Tên hiển thị tiếng Việt đầy đủ (VD: "Phường Cầu Giấy", "Phường Yên Hòa", "Xã Hòa Lạc") */
  nameVi: string;
  /** Tên tiếng Anh */
  nameEn: string;
  /** Tên ngắn gọn không kèm tiền tố Phường/Xã */
  shortName: string;
  /** Loại đơn vị hành chính mới: Phường (51) hoặc Xã (75) */
  type: "phuong" | "xa";
  /** Mã cụm khu vực địa bàn gốc (VD: "hn-cau-giay", "hn-thanh-xuan") */
  clusterCode: string;
  /** Tên cụm khu vực địa bàn (VD: "Khu vực Cầu Giấy") */
  clusterLabel: string;
}

export interface HanoiAreaCluster {
  code: string;
  label: string;
  shortLabel: string;
  units: HanoiAdminUnit[];
}

export const HANOI_ADMIN_UNITS: HanoiAdminUnit[] = [
  // 1. Khu vực Cầu Giấy (3 phường mới)
  { order: 25, code: "hn-cau-giay", nameVi: "Phường Cầu Giấy", nameEn: "Cau Giay Ward", shortName: "Cầu Giấy", type: "phuong", clusterCode: "hn-cau-giay", clusterLabel: "Khu vực Cầu Giấy" },
  { order: 26, code: "hn-nghia-do", nameVi: "Phường Nghĩa Đô", nameEn: "Nghia Do Ward", shortName: "Nghĩa Đô", type: "phuong", clusterCode: "hn-cau-giay", clusterLabel: "Khu vực Cầu Giấy" },
  { order: 27, code: "hn-yen-hoa", nameVi: "Phường Yên Hòa", nameEn: "Yen Hoa Ward", shortName: "Yên Hòa", type: "phuong", clusterCode: "hn-cau-giay", clusterLabel: "Khu vực Cầu Giấy" },

  // 2. Khu vực Thanh Xuân (3 phường mới)
  { order: 22, code: "hn-thanh-xuan", nameVi: "Phường Thanh Xuân", nameEn: "Thanh Xuan Ward", shortName: "Thanh Xuân", type: "phuong", clusterCode: "hn-thanh-xuan", clusterLabel: "Khu vực Thanh Xuân" },
  { order: 23, code: "hn-khuong-dinh", nameVi: "Phường Khương Đình", nameEn: "Khuong Dinh Ward", shortName: "Khương Đình", type: "phuong", clusterCode: "hn-thanh-xuan", clusterLabel: "Khu vực Thanh Xuân" },
  { order: 24, code: "hn-phuong-liet", nameVi: "Phường Phương Liệt", nameEn: "Phuong Liet Ward", shortName: "Phương Liệt", type: "phuong", clusterCode: "hn-thanh-xuan", clusterLabel: "Khu vực Thanh Xuân" },

  // 3. Khu vực Đống Đa (5 phường mới)
  { order: 9, code: "hn-dong-da", nameVi: "Phường Đống Đa", nameEn: "Dong Da Ward", shortName: "Đống Đa", type: "phuong", clusterCode: "hn-dong-da", clusterLabel: "Khu vực Đống Đa" },
  { order: 10, code: "hn-kim-lien", nameVi: "Phường Kim Liên", nameEn: "Kim Lien Ward", shortName: "Kim Liên", type: "phuong", clusterCode: "hn-dong-da", clusterLabel: "Khu vực Đống Đa" },
  { order: 11, code: "hn-van-mieu-quoc-tu-giam", nameVi: "Phường Văn Miếu - Quốc Tử Giám", nameEn: "Van Mieu - Quoc Tu Giam Ward", shortName: "Văn Miếu - Quốc Tử Giám", type: "phuong", clusterCode: "hn-dong-da", clusterLabel: "Khu vực Đống Đa" },
  { order: 12, code: "hn-lang", nameVi: "Phường Láng", nameEn: "Lang Ward", shortName: "Láng", type: "phuong", clusterCode: "hn-dong-da", clusterLabel: "Khu vực Đống Đa" },
  { order: 13, code: "hn-o-cho-dua", nameVi: "Phường Ô Chợ Dừa", nameEn: "O Cho Dua Ward", shortName: "Ô Chợ Dừa", type: "phuong", clusterCode: "hn-dong-da", clusterLabel: "Khu vực Đống Đa" },

  // 4. Khu vực Hai Bà Trưng (3 phường mới)
  { order: 6, code: "hn-hai-ba-trung", nameVi: "Phường Hai Bà Trưng", nameEn: "Hai Ba Trung Ward", shortName: "Hai Bà Trưng", type: "phuong", clusterCode: "hn-hai-ba-trung", clusterLabel: "Khu vực Hai Bà Trưng" },
  { order: 7, code: "hn-vinh-tuy", nameVi: "Phường Vĩnh Tuy", nameEn: "Vinh Tuy Ward", shortName: "Vĩnh Tuy", type: "phuong", clusterCode: "hn-hai-ba-trung", clusterLabel: "Khu vực Hai Bà Trưng" },
  { order: 8, code: "hn-bach-mai", nameVi: "Phường Bạch Mai", nameEn: "Bach Mai Ward", shortName: "Bạch Mai", type: "phuong", clusterCode: "hn-hai-ba-trung", clusterLabel: "Khu vực Hai Bà Trưng" },

  // 5. Khu vực Ba Đình (3 phường mới)
  { order: 3, code: "hn-ba-dinh", nameVi: "Phường Ba Đình", nameEn: "Ba Dinh Ward", shortName: "Ba Đình", type: "phuong", clusterCode: "hn-ba-dinh", clusterLabel: "Khu vực Ba Đình" },
  { order: 4, code: "hn-ngoc-ha", nameVi: "Phường Ngọc Hà", nameEn: "Ngoc Ha Ward", shortName: "Ngọc Hà", type: "phuong", clusterCode: "hn-ba-dinh", clusterLabel: "Khu vực Ba Đình" },
  { order: 5, code: "hn-giang-vo", nameVi: "Phường Giảng Võ", nameEn: "Giang Vo Ward", shortName: "Giảng Võ", type: "phuong", clusterCode: "hn-ba-dinh", clusterLabel: "Khu vực Ba Đình" },

  // 6. Khu vực Hoàn Kiếm (2 phường mới)
  { order: 1, code: "hn-hoan-kiem", nameVi: "Phường Hoàn Kiếm", nameEn: "Hoan Kiem Ward", shortName: "Hoàn Kiếm", type: "phuong", clusterCode: "hn-hoan-kiem", clusterLabel: "Khu vực Hoàn Kiếm" },
  { order: 2, code: "hn-cua-nam", nameVi: "Phường Cửa Nam", nameEn: "Cua Nam Ward", shortName: "Cửa Nam", type: "phuong", clusterCode: "hn-hoan-kiem", clusterLabel: "Khu vực Hoàn Kiếm" },

  // 7. Khu vực Tây Hồ & Hồng Hà (3 phường mới)
  { order: 28, code: "hn-tay-ho", nameVi: "Phường Tây Hồ", nameEn: "Tay Ho Ward", shortName: "Tây Hồ", type: "phuong", clusterCode: "hn-tay-ho", clusterLabel: "Khu vực Tây Hồ & Hồng Hà" },
  { order: 29, code: "hn-phu-thuong", nameVi: "Phường Phú Thượng", nameEn: "Phu Thuong Ward", shortName: "Phú Thượng", type: "phuong", clusterCode: "hn-tay-ho", clusterLabel: "Khu vực Tây Hồ & Hồng Hà" },
  { order: 14, code: "hn-hong-ha", nameVi: "Phường Hồng Hà", nameEn: "Hong Ha Ward", shortName: "Hồng Hà", type: "phuong", clusterCode: "hn-tay-ho", clusterLabel: "Khu vực Tây Hồ & Hồng Hà" },

  // 8. Khu vực Nam Từ Liêm (4 phường mới)
  { order: 35, code: "hn-tu-liem", nameVi: "Phường Từ Liêm", nameEn: "Tu Liem Ward", shortName: "Từ Liêm", type: "phuong", clusterCode: "hn-nam-tu-liem", clusterLabel: "Khu vực Nam Từ Liêm" },
  { order: 36, code: "hn-xuan-phuong", nameVi: "Phường Xuân Phương", nameEn: "Xuan Phuong Ward", shortName: "Xuân Phương", type: "phuong", clusterCode: "hn-nam-tu-liem", clusterLabel: "Khu vực Nam Từ Liêm" },
  { order: 37, code: "hn-tay-mo", nameVi: "Phường Tây Mỗ", nameEn: "Tay Mo Ward", shortName: "Tây Mỗ", type: "phuong", clusterCode: "hn-nam-tu-liem", clusterLabel: "Khu vực Nam Từ Liêm" },
  { order: 38, code: "hn-dai-mo", nameVi: "Phường Đại Mỗ", nameEn: "Dai Mo Ward", shortName: "Đại Mỗ", type: "phuong", clusterCode: "hn-nam-tu-liem", clusterLabel: "Khu vực Nam Từ Liêm" },

  // 9. Khu vực Bắc Từ Liêm (5 phường mới)
  { order: 30, code: "hn-tay-tuu", nameVi: "Phường Tây Tựu", nameEn: "Tay Tuu Ward", shortName: "Tây Tựu", type: "phuong", clusterCode: "hn-bac-tu-liem", clusterLabel: "Khu vực Bắc Từ Liêm" },
  { order: 31, code: "hn-phu-dien", nameVi: "Phường Phú Diễn", nameEn: "Phu Dien Ward", shortName: "Phú Diễn", type: "phuong", clusterCode: "hn-bac-tu-liem", clusterLabel: "Khu vực Bắc Từ Liêm" },
  { order: 32, code: "hn-xuan-dinh", nameVi: "Phường Xuân Đỉnh", nameEn: "Xuan Dinh Ward", shortName: "Xuân Đỉnh", type: "phuong", clusterCode: "hn-bac-tu-liem", clusterLabel: "Khu vực Bắc Từ Liêm" },
  { order: 33, code: "hn-dong-ngac", nameVi: "Phường Đông Ngạc", nameEn: "Dong Ngac Ward", shortName: "Đông Ngạc", type: "phuong", clusterCode: "hn-bac-tu-liem", clusterLabel: "Khu vực Bắc Từ Liêm" },
  { order: 34, code: "hn-thuong-cat", nameVi: "Phường Thượng Cát", nameEn: "Thuong Cat Ward", shortName: "Thượng Cát", type: "phuong", clusterCode: "hn-bac-tu-liem", clusterLabel: "Khu vực Bắc Từ Liêm" },

  // 10. Khu vực Hoàng Mai (7 phường mới)
  { order: 16, code: "hn-hoang-mai", nameVi: "Phường Hoàng Mai", nameEn: "Hoang Mai Ward", shortName: "Hoàng Mai", type: "phuong", clusterCode: "hn-hoang-mai", clusterLabel: "Khu vực Hoàng Mai" },
  { order: 15, code: "hn-linh-nam", nameVi: "Phường Lĩnh Nam", nameEn: "Linh Nam Ward", shortName: "Lĩnh Nam", type: "phuong", clusterCode: "hn-hoang-mai", clusterLabel: "Khu vực Hoàng Mai" },
  { order: 17, code: "hn-vinh-hung", nameVi: "Phường Vĩnh Hưng", nameEn: "Vinh Hung Ward", shortName: "Vĩnh Hưng", type: "phuong", clusterCode: "hn-hoang-mai", clusterLabel: "Khu vực Hoàng Mai" },
  { order: 18, code: "hn-tuong-mai", nameVi: "Phường Tương Mai", nameEn: "Tuong Mai Ward", shortName: "Tương Mai", type: "phuong", clusterCode: "hn-hoang-mai", clusterLabel: "Khu vực Hoàng Mai" },
  { order: 19, code: "hn-dinh-cong", nameVi: "Phường Định Công", nameEn: "Dinh Cong Ward", shortName: "Định Công", type: "phuong", clusterCode: "hn-hoang-mai", clusterLabel: "Khu vực Hoàng Mai" },
  { order: 20, code: "hn-hoang-liet", nameVi: "Phường Hoàng Liệt", nameEn: "Hoang Liet Ward", shortName: "Hoàng Liệt", type: "phuong", clusterCode: "hn-hoang-mai", clusterLabel: "Khu vực Hoàng Mai" },
  { order: 21, code: "hn-yen-so", nameVi: "Phường Yên Sở", nameEn: "Yen So Ward", shortName: "Yên Sở", type: "phuong", clusterCode: "hn-hoang-mai", clusterLabel: "Khu vực Hoàng Mai" },

  // 11. Khu vực Hà Đông (5 phường mới)
  { order: 43, code: "hn-ha-dong", nameVi: "Phường Hà Đông", nameEn: "Ha Dong Ward", shortName: "Hà Đông", type: "phuong", clusterCode: "hn-ha-dong", clusterLabel: "Khu vực Hà Đông" },
  { order: 44, code: "hn-duong-noi", nameVi: "Phường Dương Nội", nameEn: "Duong Noi Ward", shortName: "Dương Nội", type: "phuong", clusterCode: "hn-ha-dong", clusterLabel: "Khu vực Hà Đông" },
  { order: 45, code: "hn-yen-nghia", nameVi: "Phường Yên Nghĩa", nameEn: "Yen Nghia Ward", shortName: "Yên Nghĩa", type: "phuong", clusterCode: "hn-ha-dong", clusterLabel: "Khu vực Hà Đông" },
  { order: 46, code: "hn-phu-luong", nameVi: "Phường Phú Lương", nameEn: "Phu Luong Ward", shortName: "Phú Lương", type: "phuong", clusterCode: "hn-ha-dong", clusterLabel: "Khu vực Hà Đông" },
  { order: 47, code: "hn-kien-hung", nameVi: "Phường Kiến Hưng", nameEn: "Kien Hung Ward", shortName: "Kiến Hưng", type: "phuong", clusterCode: "hn-ha-dong", clusterLabel: "Khu vực Hà Đông" },

  // 12. Khu vực Long Biên (4 phường mới)
  { order: 39, code: "hn-long-bien", nameVi: "Phường Long Biên", nameEn: "Long Bien Ward", shortName: "Long Biên", type: "phuong", clusterCode: "hn-long-bien", clusterLabel: "Khu vực Long Biên" },
  { order: 40, code: "hn-bo-de", nameVi: "Phường Bồ Đề", nameEn: "Bo De Ward", shortName: "Bồ Đề", type: "phuong", clusterCode: "hn-long-bien", clusterLabel: "Khu vực Long Biên" },
  { order: 41, code: "hn-viet-hung", nameVi: "Phường Việt Hưng", nameEn: "Viet Hung Ward", shortName: "Việt Hưng", type: "phuong", clusterCode: "hn-long-bien", clusterLabel: "Khu vực Long Biên" },
  { order: 42, code: "hn-phuc-loi", nameVi: "Phường Phúc Lợi", nameEn: "Phuc Loi Ward", shortName: "Phúc Lợi", type: "phuong", clusterCode: "hn-long-bien", clusterLabel: "Khu vực Long Biên" },

  // 13. Khu vực Thanh Trì (1 phường, 4 xã mới)
  { order: 48, code: "hn-thanh-liet", nameVi: "Phường Thanh Liệt", nameEn: "Thanh Liet Ward", shortName: "Thanh Liệt", type: "phuong", clusterCode: "hn-thanh-tri", clusterLabel: "Khu vực Thanh Trì" },
  { order: 52, code: "hn-thanh-tri", nameVi: "Xã Thanh Trì", nameEn: "Thanh Tri Commune", shortName: "Thanh Trì", type: "xa", clusterCode: "hn-thanh-tri", clusterLabel: "Khu vực Thanh Trì" },
  { order: 53, code: "hn-dai-thanh", nameVi: "Xã Đại Thanh", nameEn: "Dai Thanh Commune", shortName: "Đại Thanh", type: "xa", clusterCode: "hn-thanh-tri", clusterLabel: "Khu vực Thanh Trì" },
  { order: 54, code: "hn-nam-phu", nameVi: "Xã Nam Phù", nameEn: "Nam Phu Commune", shortName: "Nam Phù", type: "xa", clusterCode: "hn-thanh-tri", clusterLabel: "Khu vực Thanh Trì" },
  { order: 55, code: "hn-ngoc-hoi", nameVi: "Xã Ngọc Hồi", nameEn: "Ngoc Hoi Commune", shortName: "Ngọc Hồi", type: "xa", clusterCode: "hn-thanh-tri", clusterLabel: "Khu vực Thanh Trì" },

  // 14. Khu vực Gia Lâm (4 xã mới)
  { order: 109, code: "hn-gia-lam", nameVi: "Xã Gia Lâm", nameEn: "Gia Lam Commune", shortName: "Gia Lâm", type: "xa", clusterCode: "hn-gia-lam", clusterLabel: "Khu vực Gia Lâm" },
  { order: 110, code: "hn-thuan-an", nameVi: "Xã Thuận An", nameEn: "Thuan An Commune", shortName: "Thuận An", type: "xa", clusterCode: "hn-gia-lam", clusterLabel: "Khu vực Gia Lâm" },
  { order: 111, code: "hn-bat-trang", nameVi: "Xã Bát Tràng", nameEn: "Bat Trang Commune", shortName: "Bát Tràng", type: "xa", clusterCode: "hn-gia-lam", clusterLabel: "Khu vực Gia Lâm" },
  { order: 112, code: "hn-phu-dong", nameVi: "Xã Phù Đổng", nameEn: "Phu Dong Commune", shortName: "Phù Đổng", type: "xa", clusterCode: "hn-gia-lam", clusterLabel: "Khu vực Gia Lâm" },

  // 15. Khu vực Đông Anh (5 xã mới)
  { order: 114, code: "hn-dong-anh", nameVi: "Xã Đông Anh", nameEn: "Dong Anh Commune", shortName: "Đông Anh", type: "xa", clusterCode: "hn-dong-anh", clusterLabel: "Khu vực Đông Anh" },
  { order: 113, code: "hn-thu-lam", nameVi: "Xã Thư Lâm", nameEn: "Thu Lam Commune", shortName: "Thư Lâm", type: "xa", clusterCode: "hn-dong-anh", clusterLabel: "Khu vực Đông Anh" },
  { order: 115, code: "hn-phuc-thinh", nameVi: "Xã Phúc Thịnh", nameEn: "Phuc Thinh Commune", shortName: "Phúc Thịnh", type: "xa", clusterCode: "hn-dong-anh", clusterLabel: "Khu vực Đông Anh" },
  { order: 116, code: "hn-thien-loc", nameVi: "Xã Thiên Lộc", nameEn: "Thien Loc Commune", shortName: "Thiên Lộc", type: "xa", clusterCode: "hn-dong-anh", clusterLabel: "Khu vực Đông Anh" },
  { order: 117, code: "hn-vinh-thanh", nameVi: "Xã Vĩnh Thanh", nameEn: "Vinh Thanh Commune", shortName: "Vĩnh Thanh", type: "xa", clusterCode: "hn-dong-anh", clusterLabel: "Khu vực Đông Anh" },

  // 16. Khu vực Hoài Đức (4 xã mới)
  { order: 102, code: "hn-hoai-duc", nameVi: "Xã Hoài Đức", nameEn: "Hoai Duc Commune", shortName: "Hoài Đức", type: "xa", clusterCode: "hn-hoai-duc", clusterLabel: "Khu vực Hoài Đức" },
  { order: 103, code: "hn-duong-hoa", nameVi: "Xã Dương Hòa", nameEn: "Duong Hoa Commune", shortName: "Dương Hòa", type: "xa", clusterCode: "hn-hoai-duc", clusterLabel: "Khu vực Hoài Đức" },
  { order: 104, code: "hn-son-dong", nameVi: "Xã Sơn Đồng", nameEn: "Son Dong Commune", shortName: "Sơn Đồng", type: "xa", clusterCode: "hn-hoai-duc", clusterLabel: "Khu vực Hoài Đức" },
  { order: 105, code: "hn-an-khanh", nameVi: "Xã An Khánh", nameEn: "An Khanh Commune", shortName: "An Khánh", type: "xa", clusterCode: "hn-hoai-duc", clusterLabel: "Khu vực Hoài Đức" },

  // 17. Khu vực Thạch Thất & Hòa Lạc (5 xã mới)
  { order: 96, code: "hn-hoa-lac", nameVi: "Xã Hòa Lạc", nameEn: "Hoa Lac Commune", shortName: "Hòa Lạc", type: "xa", clusterCode: "hn-thach-that", clusterLabel: "Khu vực Thạch Thất & Hòa Lạc" },
  { order: 93, code: "hn-thach-that", nameVi: "Xã Thạch Thất", nameEn: "Thach That Commune", shortName: "Thạch Thất", type: "xa", clusterCode: "hn-thach-that", clusterLabel: "Khu vực Thạch Thất & Hòa Lạc" },
  { order: 94, code: "hn-ha-bang", nameVi: "Xã Hạ Bằng", nameEn: "Ha Bang Commune", shortName: "Hạ Bằng", type: "xa", clusterCode: "hn-thach-that", clusterLabel: "Khu vực Thạch Thất & Hòa Lạc" },
  { order: 95, code: "hn-tay-phuong", nameVi: "Xã Tây Phương", nameEn: "Tay Phuong Commune", shortName: "Tây Phương", type: "xa", clusterCode: "hn-thach-that", clusterLabel: "Khu vực Thạch Thất & Hòa Lạc" },
  { order: 97, code: "hn-yen-xuan", nameVi: "Xã Yên Xuân", nameEn: "Yen Xuan Commune", shortName: "Yên Xuân", type: "xa", clusterCode: "hn-thach-that", clusterLabel: "Khu vực Thạch Thất & Hòa Lạc" },

  // 18. Khu vực Đan Phượng (3 xã mới)
  { order: 106, code: "hn-dan-phuong", nameVi: "Xã Đan Phượng", nameEn: "Dan Phuong Commune", shortName: "Đan Phượng", type: "xa", clusterCode: "hn-dan-phuong", clusterLabel: "Khu vực Đan Phượng" },
  { order: 107, code: "hn-o-dien", nameVi: "Xã Ô Diên", nameEn: "O Dien Commune", shortName: "Ô Diên", type: "xa", clusterCode: "hn-dan-phuong", clusterLabel: "Khu vực Đan Phượng" },
  { order: 108, code: "hn-lien-minh", nameVi: "Xã Liên Minh", nameEn: "Lien Minh Commune", shortName: "Liên Minh", type: "xa", clusterCode: "hn-dan-phuong", clusterLabel: "Khu vực Đan Phượng" },

  // 19. Khu vực Mê Linh (4 xã mới)
  { order: 118, code: "hn-me-linh", nameVi: "Xã Mê Linh", nameEn: "Me Linh Commune", shortName: "Mê Linh", type: "xa", clusterCode: "hn-me-linh", clusterLabel: "Khu vực Mê Linh" },
  { order: 121, code: "hn-quang-minh", nameVi: "Xã Quang Minh", nameEn: "Quang Minh Commune", shortName: "Quang Minh", type: "xa", clusterCode: "hn-me-linh", clusterLabel: "Khu vực Mê Linh" },
  { order: 119, code: "hn-yen-lang", nameVi: "Xã Yên Lãng", nameEn: "Yen Lang Commune", shortName: "Yên Lãng", type: "xa", clusterCode: "hn-me-linh", clusterLabel: "Khu vực Mê Linh" },
  { order: 120, code: "hn-tien-thang", nameVi: "Xã Tiến Thắng", nameEn: "Tien Thang Commune", shortName: "Tiến Thắng", type: "xa", clusterCode: "hn-me-linh", clusterLabel: "Khu vực Mê Linh" },

  // 20. Khu vực Sóc Sơn & Nội Bài (5 xã mới)
  { order: 122, code: "hn-soc-son", nameVi: "Xã Sóc Sơn", nameEn: "Soc Son Commune", shortName: "Sóc Sơn", type: "xa", clusterCode: "hn-soc-son", clusterLabel: "Khu vực Sóc Sơn & Nội Bài" },
  { order: 124, code: "hn-noi-bai", nameVi: "Xã Nội Bài", nameEn: "Noi Bai Commune", shortName: "Nội Bài", type: "xa", clusterCode: "hn-soc-son", clusterLabel: "Khu vực Sóc Sơn & Nội Bài" },
  { order: 123, code: "hn-da-phuc", nameVi: "Xã Đa Phúc", nameEn: "Da Phuc Commune", shortName: "Đa Phúc", type: "xa", clusterCode: "hn-soc-son", clusterLabel: "Khu vực Sóc Sơn & Nội Bài" },
  { order: 125, code: "hn-trung-gia", nameVi: "Xã Trung Giã", nameEn: "Trung Gia Commune", shortName: "Trung Giã", type: "xa", clusterCode: "hn-soc-son", clusterLabel: "Khu vực Sóc Sơn & Nội Bài" },
  { order: 126, code: "hn-kim-anh", nameVi: "Xã Kim Anh", nameEn: "Kim Anh Commune", shortName: "Kim Anh", type: "xa", clusterCode: "hn-soc-son", clusterLabel: "Khu vực Sóc Sơn & Nội Bài" },

  // 21. Khu vực Chương Mỹ (1 phường, 5 xã mới)
  { order: 49, code: "hn-chuong-my", nameVi: "Phường Chương Mỹ", nameEn: "Chuong My Ward", shortName: "Chương Mỹ", type: "phuong", clusterCode: "hn-chuong-my", clusterLabel: "Khu vực Chương Mỹ" },
  { order: 77, code: "hn-xuan-mai", nameVi: "Xã Xuân Mai", nameEn: "Xuan Mai Commune", shortName: "Xuân Mai", type: "xa", clusterCode: "hn-chuong-my", clusterLabel: "Khu vực Chương Mỹ" },
  { order: 76, code: "hn-phu-nghia", nameVi: "Xã Phú Nghĩa", nameEn: "Phu Nghia Commune", shortName: "Phú Nghĩa", type: "xa", clusterCode: "hn-chuong-my", clusterLabel: "Khu vực Chương Mỹ" },
  { order: 78, code: "hn-tran-phu", nameVi: "Xã Trần Phú", nameEn: "Tran Phu Commune", shortName: "Trần Phú", type: "xa", clusterCode: "hn-chuong-my", clusterLabel: "Khu vực Chương Mỹ" },
  { order: 79, code: "hn-hoa-phu", nameVi: "Xã Hòa Phú", nameEn: "Hoa Phu Commune", shortName: "Hòa Phú", type: "xa", clusterCode: "hn-chuong-my", clusterLabel: "Khu vực Chương Mỹ" },
  { order: 80, code: "hn-quang-bi", nameVi: "Xã Quảng Bị", nameEn: "Quang Bi Commune", shortName: "Quảng Bị", type: "xa", clusterCode: "hn-chuong-my", clusterLabel: "Khu vực Chương Mỹ" },

  // 22. Khu vực Sơn Tây (2 phường, 1 xã mới)
  { order: 50, code: "hn-son-tay", nameVi: "Phường Sơn Tây", nameEn: "Son Tay Ward", shortName: "Sơn Tây", type: "phuong", clusterCode: "hn-son-tay", clusterLabel: "Khu vực Sơn Tây" },
  { order: 51, code: "hn-tung-thien", nameVi: "Phường Tùng Thiện", nameEn: "Tung Thien Ward", shortName: "Tùng Thiện", type: "phuong", clusterCode: "hn-son-tay", clusterLabel: "Khu vực Sơn Tây" },
  { order: 89, code: "hn-doai-phuong", nameVi: "Xã Đoài Phương", nameEn: "Doai Phuong Commune", shortName: "Đoài Phương", type: "xa", clusterCode: "hn-son-tay", clusterLabel: "Khu vực Sơn Tây" },

  // 23. Khu vực Thường Tín (4 xã mới)
  { order: 57, code: "hn-thuong-tin", nameVi: "Xã Thường Tín", nameEn: "Thuong Tin Commune", shortName: "Thường Tín", type: "xa", clusterCode: "hn-thuong-tin", clusterLabel: "Khu vực Thường Tín" },
  { order: 56, code: "hn-thuong-phuc", nameVi: "Xã Thượng Phúc", nameEn: "Thuong Phuc Commune", shortName: "Thượng Phúc", type: "xa", clusterCode: "hn-thuong-tin", clusterLabel: "Khu vực Thường Tín" },
  { order: 58, code: "hn-chuong-duong", nameVi: "Xã Chương Dương", nameEn: "Chuong Duong Commune", shortName: "Chương Dương", type: "xa", clusterCode: "hn-thuong-tin", clusterLabel: "Khu vực Thường Tín" },
  { order: 59, code: "hn-hong-van", nameVi: "Xã Hồng Vân", nameEn: "Hong Van Commune", shortName: "Hồng Vân", type: "xa", clusterCode: "hn-thuong-tin", clusterLabel: "Khu vực Thường Tín" },

  // 24. Khu vực Thanh Oai (4 xã mới)
  { order: 64, code: "hn-thanh-oai", nameVi: "Xã Thanh Oai", nameEn: "Thanh Oai Commune", shortName: "Thanh Oai", type: "xa", clusterCode: "hn-thanh-oai", clusterLabel: "Khu vực Thanh Oai" },
  { order: 65, code: "hn-binh-minh", nameVi: "Xã Bình Minh", nameEn: "Binh Minh Commune", shortName: "Bình Minh", type: "xa", clusterCode: "hn-thanh-oai", clusterLabel: "Khu vực Thanh Oai" },
  { order: 66, code: "hn-tam-hung", nameVi: "Xã Tam Hưng", nameEn: "Tam Hung Commune", shortName: "Tam Hưng", type: "xa", clusterCode: "hn-thanh-oai", clusterLabel: "Khu vực Thanh Oai" },
  { order: 67, code: "hn-dan-hoa", nameVi: "Xã Dân Hòa", nameEn: "Dan Hoa Commune", shortName: "Dân Hòa", type: "xa", clusterCode: "hn-thanh-oai", clusterLabel: "Khu vực Thanh Oai" },

  // 25. Khu vực Quốc Oai (4 xã mới)
  { order: 98, code: "hn-quoc-oai", nameVi: "Xã Quốc Oai", nameEn: "Quoc Oai Commune", shortName: "Quốc Oai", type: "xa", clusterCode: "hn-quoc-oai", clusterLabel: "Khu vực Quốc Oai" },
  { order: 99, code: "hn-hung-dao", nameVi: "Xã Hưng Đạo", nameEn: "Hung Dao Commune", shortName: "Hưng Đạo", type: "xa", clusterCode: "hn-quoc-oai", clusterLabel: "Khu vực Quốc Oai" },
  { order: 100, code: "hn-kieu-phu", nameVi: "Xã Kiều Phú", nameEn: "Kieu Phu Commune", shortName: "Kiều Phú", type: "xa", clusterCode: "hn-quoc-oai", clusterLabel: "Khu vực Quốc Oai" },
  { order: 101, code: "hn-phu-cat", nameVi: "Xã Phú Cát", nameEn: "Phu Cat Commune", shortName: "Phú Cát", type: "xa", clusterCode: "hn-quoc-oai", clusterLabel: "Khu vực Quốc Oai" },

  // 26. Khu vực Phúc Thọ (3 xã mới)
  { order: 90, code: "hn-phuc-tho", nameVi: "Xã Phúc Thọ", nameEn: "Phuc Tho Commune", shortName: "Phúc Thọ", type: "xa", clusterCode: "hn-phuc-tho", clusterLabel: "Khu vực Phúc Thọ" },
  { order: 91, code: "hn-phuc-loc", nameVi: "Xã Phúc Lộc", nameEn: "Phuc Loc Commune", shortName: "Phúc Lộc", type: "xa", clusterCode: "hn-phuc-tho", clusterLabel: "Khu vực Phúc Thọ" },
  { order: 92, code: "hn-hat-mon", nameVi: "Xã Hát Môn", nameEn: "Hat Mon Commune", shortName: "Hát Môn", type: "xa", clusterCode: "hn-phuc-tho", clusterLabel: "Khu vực Phúc Thọ" },

  // 27. Khu vực Phú Xuyên (4 xã mới)
  { order: 60, code: "hn-phu-xuyen", nameVi: "Xã Phú Xuyên", nameEn: "Phu Xuyen Commune", shortName: "Phú Xuyên", type: "xa", clusterCode: "hn-phu-xuyen", clusterLabel: "Khu vực Phú Xuyên" },
  { order: 61, code: "hn-phuong-duc", nameVi: "Xã Phượng Dực", nameEn: "Phuong Duc Commune", shortName: "Phượng Dực", type: "xa", clusterCode: "hn-phu-xuyen", clusterLabel: "Khu vực Phú Xuyên" },
  { order: 62, code: "hn-chuyen-my", nameVi: "Xã Chuyên Mỹ", nameEn: "Chuyen My Commune", shortName: "Chuyên Mỹ", type: "xa", clusterCode: "hn-phu-xuyen", clusterLabel: "Khu vực Phú Xuyên" },
  { order: 63, code: "hn-dai-xuyen", nameVi: "Xã Đại Xuyên", nameEn: "Dai Xuyen Commune", shortName: "Đại Xuyên", type: "xa", clusterCode: "hn-phu-xuyen", clusterLabel: "Khu vực Phú Xuyên" },

  // 28. Khu vực Ứng Hòa (4 xã mới)
  { order: 71, code: "hn-ung-hoa", nameVi: "Xã Ứng Hòa", nameEn: "Ung Hoa Commune", shortName: "Ứng Hòa", type: "xa", clusterCode: "hn-ung-hoa", clusterLabel: "Khu vực Ứng Hòa" },
  { order: 68, code: "hn-van-dinh", nameVi: "Xã Vân Đình", nameEn: "Van Dinh Commune", shortName: "Vân Đình", type: "xa", clusterCode: "hn-ung-hoa", clusterLabel: "Khu vực Ứng Hòa" },
  { order: 69, code: "hn-ung-thien", nameVi: "Xã Ứng Thiên", nameEn: "Ung Thien Commune", shortName: "Ứng Thiên", type: "xa", clusterCode: "hn-ung-hoa", clusterLabel: "Khu vực Ứng Hòa" },
  { order: 70, code: "hn-hoa-xa", nameVi: "Xã Hòa Xá", nameEn: "Hoa Xa Commune", shortName: "Hòa Xá", type: "xa", clusterCode: "hn-ung-hoa", clusterLabel: "Khu vực Ứng Hòa" },

  // 29. Khu vực Mỹ Đức (4 xã mới)
  { order: 72, code: "hn-my-duc", nameVi: "Xã Mỹ Đức", nameEn: "My Duc Commune", shortName: "Mỹ Đức", type: "xa", clusterCode: "hn-my-duc", clusterLabel: "Khu vực Mỹ Đức" },
  { order: 75, code: "hn-huong-son", nameVi: "Xã Hương Sơn", nameEn: "Huong Son Commune", shortName: "Hương Sơn", type: "xa", clusterCode: "hn-my-duc", clusterLabel: "Khu vực Mỹ Đức" },
  { order: 73, code: "hn-hong-son", nameVi: "Xã Hồng Sơn", nameEn: "Hong Son Commune", shortName: "Hồng Sơn", type: "xa", clusterCode: "hn-my-duc", clusterLabel: "Khu vực Mỹ Đức" },
  { order: 74, code: "hn-phuc-son", nameVi: "Xã Phúc Sơn", nameEn: "Phuc Son Commune", shortName: "Phúc Sơn", type: "xa", clusterCode: "hn-my-duc", clusterLabel: "Khu vực Mỹ Đức" },

  // 30. Khu vực Ba Vì (8 xã mới)
  { order: 87, code: "hn-ba-vi", nameVi: "Xã Ba Vì", nameEn: "Ba Vi Commune", shortName: "Ba Vì", type: "xa", clusterCode: "hn-ba-vi", clusterLabel: "Khu vực Ba Vì" },
  { order: 82, code: "hn-quang-oai", nameVi: "Xã Quảng Oai", nameEn: "Quang Oai Commune", shortName: "Quảng Oai", type: "xa", clusterCode: "hn-ba-vi", clusterLabel: "Khu vực Ba Vì" },
  { order: 81, code: "hn-minh-chau", nameVi: "Xã Minh Châu", nameEn: "Minh Chau Commune", shortName: "Minh Châu", type: "xa", clusterCode: "hn-ba-vi", clusterLabel: "Khu vực Ba Vì" },
  { order: 83, code: "hn-vat-lai", nameVi: "Xã Vật Lại", nameEn: "Vat Lai Commune", shortName: "Vật Lại", type: "xa", clusterCode: "hn-ba-vi", clusterLabel: "Khu vực Ba Vì" },
  { order: 84, code: "hn-co-do", nameVi: "Xã Cổ Đô", nameEn: "Co Do Commune", shortName: "Cổ Đô", type: "xa", clusterCode: "hn-ba-vi", clusterLabel: "Khu vực Ba Vì" },
  { order: 85, code: "hn-bat-bat", nameVi: "Xã Bất Bạt", nameEn: "Bat Bat Commune", shortName: "Bất Bạt", type: "xa", clusterCode: "hn-ba-vi", clusterLabel: "Khu vực Ba Vì" },
  { order: 86, code: "hn-suoi-hai", nameVi: "Xã Suối Hai", nameEn: "Suoi Hai Commune", shortName: "Suối Hai", type: "xa", clusterCode: "hn-ba-vi", clusterLabel: "Khu vực Ba Vì" },
  { order: 88, code: "hn-yen-bai", nameVi: "Xã Yên Bài", nameEn: "Yen Bai Commune", shortName: "Yên Bài", type: "xa", clusterCode: "hn-ba-vi", clusterLabel: "Khu vực Ba Vì" },
];

/**
 * Bản đồ tra cứu nhanh theo mã (`code`)
 */
const UNIT_BY_CODE = new Map<string, HanoiAdminUnit>(
  HANOI_ADMIN_UNITS.map((u) => [u.code, u])
);

/**
 * Nhóm 30 cụm địa bàn Hà Nội để hiển thị trong `<optgroup>` hoặc bộ lọc theo khu vực
 */
export const HANOI_AREA_CLUSTERS: HanoiAreaCluster[] = (() => {
  const map = new Map<string, HanoiAreaCluster>();
  for (const unit of HANOI_ADMIN_UNITS) {
    let group = map.get(unit.clusterCode);
    if (!group) {
      group = {
        code: unit.clusterCode,
        label: unit.clusterLabel,
        shortLabel: unit.clusterLabel.replace(/^Khu vực\s+/i, ""),
        units: [],
      };
      map.set(unit.clusterCode, group);
    }
    group.units.push(unit);
  }
  return Array.from(map.values());
})();

/**
 * Tương thích ngược với các mã khu vực cũ (VD: `hn-nam-tu-liem`, `hn-bac-tu-liem`, `thanh_xuan`, v.v.)
 */
const LEGACY_LABELS: Record<string, string> = {
  "hn-nam-tu-liem": "Khu vực Nam Từ Liêm (Từ Liêm, Xuân Phương, Tây Mỗ, Đại Mỗ)",
  "hn-bac-tu-liem": "Khu vực Bắc Từ Liêm (Phú Diễn, Xuân Đỉnh, Đông Ngạc, Tây Tựu, Thượng Cát)",
  "nam-tu-liem": "Khu vực Nam Từ Liêm",
  "bac-tu-liem": "Khu vực Bắc Từ Liêm",
};

const LEGACY_SHORT_LABELS: Record<string, string> = {
  "hn-nam-tu-liem": "Nam Từ Liêm (Từ Liêm mới)",
  "hn-bac-tu-liem": "Bắc Từ Liêm (Phú Diễn / Xuân Đỉnh mới)",
};

/**
 * Chuẩn hóa mã khu vực về định dạng `hn-*` hợp lệ trong `public.geo_units`
 */
export function normalizeHanoiAreaCode(raw?: string | null): string {
  if (!raw) return "hn-cau-giay";
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^cluster:/, "")
    .replace(/_/g, "-");
  const withPrefix = cleaned.startsWith("hn-") ? cleaned : `hn-${cleaned}`;
  if (UNIT_BY_CODE.has(withPrefix)) return withPrefix;
  if (withPrefix === "hn-nam-tu-liem" || withPrefix === "hn-bac-tu-liem") {
    return withPrefix;
  }
  return "hn-cau-giay";
}

/**
 * Trả về tên hiển thị tiếng Việt chuẩn của Phường/Xã mới hoặc Khu vực Hà Nội
 */
export function getHanoiAreaLabel(
  raw?: string | null,
  options?: { includeCluster?: boolean; short?: boolean }
): string {
  if (!raw) return "Hà Nội";
  const cleaned = raw.trim().toLowerCase().replace(/_/g, "-");
  const code = cleaned.startsWith("hn-") ? cleaned : `hn-${cleaned}`;

  const unit = UNIT_BY_CODE.get(code);
  if (unit) {
    if (options?.short) {
      return unit.nameVi;
    }
    if (options?.includeCluster) {
      const clusterShort = unit.clusterLabel.replace(/^Khu vực\s+/i, "");
      if (unit.shortName.toLowerCase() !== clusterShort.toLowerCase()) {
        return `${unit.nameVi} (${clusterShort})`;
      }
    }
    return unit.nameVi;
  }

  if (options?.short && LEGACY_SHORT_LABELS[code]) {
    return LEGACY_SHORT_LABELS[code];
  }
  if (LEGACY_LABELS[code]) {
    return LEGACY_LABELS[code];
  }

  return raw;
}

/**
 * Kiểm tra xem mã khu vực của ứng viên có khớp với bộ lọc khu vực đang chọn hay không.
 * Hỗ trợ:
 * - Lọc theo cụm địa bàn (`cluster:hn-cau-giay` -> khớp cả Phường Cầu Giấy, Phường Nghĩa Đô, Phường Yên Hòa)
 * - Lọc chính xác theo từng Phường/Xã mới (`hn-yen-hoa`, `hn-khuong-dinh`, `hn-hoa-lac`...)
 * - Nếu chọn mã trùng tên cụm (`hn-cau-giay`), hỗ trợ đối sánh thông minh.
 */
export function matchesHanoiAreaFilter(
  candidateCode?: string | null,
  filterValue?: string | null
): boolean {
  if (!filterValue) return true;
  if (!candidateCode) return false;

  const normCand = normalizeHanoiAreaCode(candidateCode);
  const candUnit = UNIT_BY_CODE.get(normCand);

  if (filterValue.startsWith("cluster:")) {
    const clusterCode = filterValue.replace(/^cluster:/, "");
    if (normCand === clusterCode) return true;
    if (candUnit && candUnit.clusterCode === clusterCode) return true;
    return false;
  }

  const normFilter = normalizeHanoiAreaCode(filterValue);
  if (normCand === normFilter) return true;

  // Nếu filter là mã cụm truyền thống (như hn-nam-tu-liem, hn-bac-tu-liem) thì khớp toàn bộ phường thuộc cụm đó
  if (
    (normFilter === "hn-nam-tu-liem" || normFilter === "hn-bac-tu-liem") &&
    candUnit?.clusterCode === normFilter
  ) {
    return true;
  }

  return false;
}
