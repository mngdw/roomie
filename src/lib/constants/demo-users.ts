/**
 * Predefined seed users for testing and evaluating ROOMIE matching engine.
 */
export const DEMO_USERS = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    displayName: "Ngọc",
    fullName: "Nguyễn Bảo Ngọc",
    gender: "female",
    age: 22,
    housingStatus: "looking_for_room",
    roleDescription: "Tìm phòng ở Thanh Xuân, ngân sách 2.4M",
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    displayName: "Linh",
    fullName: "Trần Thùy Linh",
    gender: "female",
    age: 23,
    housingStatus: "has_room",
    roleDescription: "Có phòng Thanh Xuân (2.4M/người), sạch sẽ",
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    displayName: "Minh",
    fullName: "Lê Ngọc Minh",
    gender: "female",
    age: 24,
    housingStatus: "has_room",
    roleDescription: "Có phòng Cầu Giấy (2.3M/người), đi làm văn phòng",
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    displayName: "Trang",
    fullName: "Phạm Thu Trang",
    gender: "female",
    age: 23,
    housingStatus: "has_room",
    roleDescription: "Có phòng Hai Bà Trưng, ngủ muộn",
  },
  {
    id: "a0000000-0000-4000-8000-000000000005",
    displayName: "Mai",
    fullName: "Hoàng Thanh Mai",
    gender: "female",
    age: 21,
    housingStatus: "has_room",
    roleDescription: "Có phòng Đống Đa, ít nấu nướng",
  },
  {
    id: "a0000000-0000-4000-8000-00000000000a",
    displayName: "Khoa",
    fullName: "Trịnh Đăng Khoa",
    gender: "male",
    age: 25,
    housingStatus: "looking_for_room",
    roleDescription: "Nam, có hút thuốc",
  },
] as const;

export const DEFAULT_USER_ID = DEMO_USERS[0].id;
