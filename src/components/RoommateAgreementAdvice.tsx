"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Moon,
  Sparkles,
  Users,
  DollarSign,
  Copy,
  Check,
  FileText,
  HeartHandshake,
} from "lucide-react";

interface RoommateAgreementAdviceProps {
  viewerName: string;
  candidateName: string;
}

export function RoommateAgreementAdvice({
  viewerName,
  candidateName,
}: RoommateAgreementAdviceProps) {
  const [copied, setCopied] = useState(false);

  const agreements = [
    {
      icon: Moon,
      title: "1. Khung giờ yên tĩnh ban đêm (Quiet Hours)",
      detail:
        "Sau 23:30, vui lòng đeo tai nghe khi nghe nhạc, xem phim hoặc gọi điện thoại. Tắt đèn trần chính và sử dụng đèn bàn cá nhân để không làm phiền giấc ngủ của bạn cùng phòng.",
      color: "indigo",
    },
    {
      icon: Sparkles,
      title: "2. Phân chia việc nhà & Vệ sinh (Cleaning Routine)",
      detail:
        "Luân phiên dọn dẹp khu vực chung (nhà vệ sinh, bếp) theo tuần chẵn/lẻ. Bát đĩa sau khi nấu ăn rửa sạch trong vòng 3-4 tiếng, không ngâm qua đêm.",
      color: "teal",
    },
    {
      icon: Users,
      title: "3. Quy định tiếp khách & bạn bè (Guest Policy)",
      detail:
        "Báo trước cho nhau ít nhất vài tiếng khi có bạn bè đến phòng chơi. Khách ở lại qua đêm cần có sự đồng thuận trước của cả hai bạn để đảm bảo không gian riêng tư.",
      color: "purple",
    },
    {
      icon: DollarSign,
      title: "4. Minh bạch chi phí sinh hoạt (Shared Bills)",
      detail:
        "Tiền điện, nước, wifi và đồ dùng chung (nước rửa chén, túi rác) chia đều theo đầu người và thanh toán vào ngày mùng 5 hàng tháng. Sử dụng ứng dụng ghi chép chung để đối soát rõ ràng.",
      color: "blue",
    },
  ];

  const handleCopy = () => {
    const text = `📋 BẢN QUY ƯỚC Ở CHUNG ĐỀ XUẤT (ROOMIE) - ${viewerName} & ${candidateName}
--------------------------------------------------
1. KHUNG GIỜ YÊN TĨNH: Sau 23h30 đeo tai nghe, tắt đèn chính phòng ngủ.
2. DỌN DẸP & VIỆC NHÀ: Luân phiên dọn phòng tắm theo tuần; rửa bát đĩa ngay sau khi ăn.
3. TIẾP KHÁCH: Báo trước khi có bạn đến chơi; khách ngủ qua đêm cần thống nhất trước.
4. CHI PHÍ ĐIỆN NƯỚC: Chia đều theo đầu người, thanh toán mùng 5 hàng tháng.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-white rounded-3xl border border-blue-200/80 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-blue-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-2">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Đề xuất từ ROOMIE Engine</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Gợi ý thỏa thuận quy ước sống chung
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Dựa trên phân tích tương thích, đây là 4 điều khoản thực tế giúp {viewerName} và {candidateName} sống chung thoải mái, tránh mọi xích mích không đáng có.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-2xs transition-all hover:scale-102"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">Đã sao chép!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Sao chép gửi qua chat</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agreements.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  {item.title}
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-9">
                {item.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
