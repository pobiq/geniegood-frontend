import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Toast from "../components/common/Toast";
import { cancelOrder, selectAllOrders } from "../services/orderService";
import { getImageUrl } from "../utils/pathUtils";

export default function OrderAllListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState("전체");
  const [selectedPeriod, setSelectedPeriod] = useState("최근 3개월");
  const [currentPage, setCurrentPage] = useState(0);

  const [toastOption, setToastOption] = useState({
    type: "",
    show: false,
    message: "",
    duration: 2000,
  });

  const statusOptions = ["전체", "주문완료", "배송중", "배송완료", "취소"];
  const periodOptions = [
    "전체",
    "최근 1개월",
    "최근 3개월",
    "최근 6개월",
    "최근 1년",
  ];

  // 기간 문자열을 숫자로 변환
  const periodToMonths = (period) => {
    const periodMap = {
      전체: null,
      "최근 1개월": 1,
      "최근 3개월": 3,
      "최근 6개월": 6,
      "최근 1년": 12,
    };
    return periodMap[period] || null;
  };

  // 전체 주문 내역 조회
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    isSuccess: isOrdersSuccess,
    error: ordersError,
  } = useQuery({
    queryKey: ["selectAllOrders", selectedPeriod, currentPage],
    queryFn: async () => {
      const response = await selectAllOrders({
        months: periodToMonths(selectedPeriod),
        page: currentPage,
      });
      return response;
    },
    refetchOnMount: "always",
  });

  // 기간 변경 시 첫 페이지로 리셋
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setCurrentPage(0);
  };

  // 주문 목록과 필터링
  const orders = ordersData?.contents || [];
  const filteredOrders =
    selectedStatus === "전체"
      ? orders
      : orders.filter((order) => order.status === selectedStatus);

  // 페이지네이션 정보
  const totalPages = ordersData?.totalPages || 0;
  const totalElements = ordersData?.totalElements || 0;

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 페이지 번호 배열 생성
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5; // 최대 표시할 페이지 수
    let startPage = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(0, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handleViewOrderDetail = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  const handleCancelOrder = (orderId) => {
    cancelOrderMutation.mutate(orderId);
  };
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      return await cancelOrder(orderId);
    },
    onSuccess: (data) => {
      setToastOption({
        type: "success",
        show: true,
        message: "주문 취소 성공",
        duration: 2000,
      });
      queryClient.invalidateQueries({
        queryKey: ["selectAllOrders", selectedPeriod, currentPage],
      });
    },
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  return (
    <div className="bg-[#f5f3f0] min-h-screen">
      {/* 로딩 스피너 */}
      {isOrdersLoading && (
        <LoadingSpinner message="주문 내역을 불러오는 중..." />
      )}

      {/* 토스트 */}
      {toastOption.show && (
        <Toast
          type={toastOption.type}
          message={toastOption.message}
          position="top-right"
          duration={toastOption.duration}
          onClose={() => setToastOption({ ...toastOption, show: false })}
        />
      )}

      <div className="max-w-[1200px] mx-auto px-8 py-8">
        {/* 페이지 제목 */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] font-semibold text-[#2d2520]">
            전체 주문 내역
          </h1>
          <button
            onClick={() => navigate("/mypage")}
            className="text-[#7a7f87] px-3 py-1 text-[12px] transition-colors cursor-pointer"
          >
            ← 마이페이지로 돌아가기
          </button>
        </div>

        {/* 필터 섹션 */}
        <div className="bg-white rounded-[16px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            {/* 상태 필터 탭 */}
            <div className="flex gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-4 py-2 rounded-[8px] text-[14px] font-semibold transition-colors cursor-pointer ${
                    selectedStatus === status
                      ? "bg-[#bb4d00] text-white"
                      : "bg-[#f3f4f6] text-[#6a7282] hover:bg-[#e5e7eb]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* 기간 선택 selectbox */}
            <div className="flex items-center gap-2">
              <label className="text-[14px] text-[#4a5565] font-semibold">
                기간:
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="border border-[#d1d5dc] rounded-[8px] px-3 py-2 text-[14px] text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#b89a7c] bg-white cursor-pointer"
              >
                {periodOptions.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 주문 목록 */}
        <div className="bg-white rounded-[16px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] p-8">
          {ordersError ? (
            <div className="text-center py-16">
              <p className="text-[16px] text-red-600 mb-2">
                주문 내역을 불러오는데 실패했습니다.
              </p>
              <p className="text-[14px] text-[#6a7282]">
                {ordersError.message}
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[16px] text-[#6a7282] mb-2">
                주문 내역이 없습니다.
              </p>
              <p className="text-[14px] text-[#99a1af]">
                {selectedStatus !== "전체" &&
                  `${selectedStatus} 상태의 주문이 없습니다.`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => {
                // AllOrderResponseDTO에서 직접 사용
                const orderTitle = order.orderTitle || "주문 상품";
                const orderImage = order.goodsUrl || "";

                return (
                  <div
                    key={order.orderId}
                    className="border-b border-[#f3f4f6] pb-6 last:border-b-0 last:pb-0"
                  >
                    {/* 주문 헤더 */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-[14px] text-[#6a7282] mr-2">
                            주문번호
                          </span>
                          <span className="text-[14px] font-semibold text-[#364153]">
                            {order.orderNumber}
                          </span>
                        </div>
                        <div className="h-4 w-px bg-[#e5e7eb]"></div>
                        <span className="text-[14px] text-[#6a7282]">
                          {formatDate(order.orderedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-[6px] text-[12px] font-semibold ${
                            order.status === "배송완료"
                              ? "bg-green-100 text-green-700"
                              : order.status === "배송중"
                                ? "bg-blue-100 text-blue-700"
                                : order.status === "주문완료"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                          }`}
                        >
                          {order.status}
                        </span>
                        <span className="text-[16px] font-semibold text-[#0a0a0a]">
                          {formatPrice(order.totalAmount)}원
                        </span>
                      </div>
                    </div>

                    {/* 주문 정보 */}
                    <div className="flex gap-4">
                      {/* 주문 이미지 */}
                      <div className="w-20 h-20 rounded-[10px] overflow-hidden bg-gray-100 shrink-0">
                        {orderImage ? (
                          <img
                            src={getImageUrl(orderImage)}
                            alt={orderTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#6a7282] text-[12px]">
                            이미지 없음
                          </div>
                        )}
                      </div>

                      {/* 주문 상세 */}
                      <div className="flex-1">
                        <h3 className="text-[16px] font-semibold text-[#0a0a0a] mb-1">
                          {orderTitle}
                        </h3>
                        <p className="text-[14px] text-[#6a7282] mb-3">
                          {formatDate(order.orderedAt)}
                        </p>

                        {/* 버튼들 */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewOrderDetail(order.orderId)}
                            className="bg-[#b89a7c] text-white px-4 py-2 rounded-[10px] text-[14px] font-semibold hover:bg-[#a68a6c] transition-colors cursor-pointer"
                          >
                            상세보기
                          </button>
                          {order.status === "주문완료" && (
                            <button
                              onClick={() => handleCancelOrder(order.orderId)}
                              className="bg-white border border-[#4a5565] text-[#6b6b6b] px-4 py-2 rounded-[10px] text-[14px] font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              주문 취소
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className={`px-3 py-2 rounded-[8px] text-[14px] transition-colors ${
                  currentPage === 0
                    ? "text-[#d1d5dc] cursor-not-allowed"
                    : "text-[#6a7282] hover:bg-gray-50"
                }`}
              >
                이전
              </button>
              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-2 rounded-[8px] text-[14px] font-semibold transition-colors ${
                    currentPage === pageNum
                      ? "text-white bg-[#bb4d00]"
                      : "text-[#6a7282] hover:bg-gray-50"
                  }`}
                >
                  {pageNum + 1}
                </button>
              ))}
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                }
                disabled={currentPage >= totalPages - 1}
                className={`px-3 py-2 rounded-[8px] text-[14px] transition-colors ${
                  currentPage >= totalPages - 1
                    ? "text-[#d1d5dc] cursor-not-allowed"
                    : "text-[#6a7282] hover:bg-gray-50"
                }`}
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
