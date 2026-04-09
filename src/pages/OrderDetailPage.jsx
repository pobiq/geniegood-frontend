import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Toast from "../components/common/Toast";
import { useAddressSearch } from "../hooks/useAddressSearch";
import {
  selectOrderDetail,
  updateOrderAddress,
} from "../services/orderService";
import { getImageUrl } from "../utils/pathUtils";

const SHIPPING_FEE = 3000;

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { orderId } = useParams();
  const [order, setOrder] = useState(null);

  const [toastOption, setToastOption] = useState({
    type: "success",
    show: false,
    message: "굿즈 이미지 생성 완료!",
    duration: 2000,
  });

  // 주소 검색 훅 사용
  const { addressInfo, setAddressInfo, handleAddressSearch } =
    useAddressSearch();

  // orderId에 해당하는 주문 상세 조회
  const {
    data: orderDetail,
    isLoading: isOrderDetailLoading,
    error: orderDetailError,
  } = useQuery({
    queryKey: ["orderDetail", orderId],
    queryFn: async () => {
      const response = await selectOrderDetail(orderId);
      return response;
    },
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (orderDetail) {
      setOrder(orderDetail);
      setAddressInfo({
        zipcode: orderDetail.zipcode,
        address: orderDetail.address,
        detailAddress: orderDetail.detailAddress,
      });
      setToastOption({
        type: "success",
        show: true,
        message: "주문 상세 정보 호출 성공",
        duration: 2000,
      });
    }
  }, [orderDetail]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const period = hours >= 12 ? "오후" : "오전";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;

    return `${year}.${month}.${day} ${period} ${displayHours}:${minutes}`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "주문완료":
        return "bg-yellow-100 text-yellow-700";
      case "배송완료":
        return "bg-green-100 text-green-700";
      case "배송중":
        return "bg-blue-100 text-blue-700";
      case "취소":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleAddressChange = () => {
    updateOrderAddressMutation.mutate(addressInfo);
  };

  const updateOrderAddressMutation = useMutation({
    mutationFn: async (addressInfo) => {
      const response = await updateOrderAddress(orderId, addressInfo);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orderDetail", orderId] });
      setToastOption({
        type: "success",
        show: true,
        message: "주문 주소 수정 성공",
        duration: 2000,
      });
    },
    onError: (error) => {
      setToastOption({
        type: "error",
        show: true,
        message: "주문 주소 수정 실패",
        duration: 2000,
      });
    },
  });

  if (!order) {
    return (
      <div className="bg-[#f5f3f0] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[16px] text-[#6a7282] mb-2">
            주문 정보를 찾을 수 없습니다.
          </p>
          <button
            onClick={() => navigate("/orders")}
            className="text-[14px] text-[#bb4d00] hover:text-[#a64400] transition-colors"
          >
            주문 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.itemTotal, 0);

  return (
    <div className="bg-[#f5f3f0] min-h-screen">
      {/* 로딩 스피너 */}
      {isOrderDetailLoading && (
        <LoadingSpinner
          message="주문 상세 정보 호출 중..."
          position="top-right"
        />
      )}
      {updateOrderAddressMutation.isPending && (
        <LoadingSpinner message="주문 주소 수정 중..." position="top-right" />
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
      <div className="max-w-[1440px] mx-auto px-8 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-[28px] font-semibold text-[#2d2520]">
            주문 상세
          </h1>
          <button
            onClick={() => navigate("/orders")}
            className="text-[14px] text-[#6a7282] hover:text-[#4a5565] transition-colors flex items-center gap-1 cursor-pointer"
          >
            ← 주문 목록으로
          </button>
        </div>

        {/* 주문번호 */}
        <div className="mb-6">
          <span className="text-[14px] text-[#6a7282]">주문번호: </span>
          <span className="text-[16px] font-semibold text-[#0a0a0a]">
            #{order.orderNumber}
          </span>
        </div>

        {/* 2단 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-[6fr_4fr] gap-6">
          {/* 왼쪽: 주문 상품 목록 */}
          <div className="bg-white rounded-[16px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] p-8">
            <h2 className="text-[20px] font-semibold text-[#262626] mb-6">
              주문 상품
            </h2>

            <div className="space-y-6">
              {order.items.map((item) => (
                <div
                  key={item.orderItemId}
                  className="flex gap-4 pb-6 border-b border-[#f3f4f6] last:border-b-0 last:pb-0"
                >
                  {/* 상품 이미지 */}
                  <div className="w-24 h-24 rounded-[10px] overflow-hidden bg-gray-100 shrink-0">
                    <img
                      src={getImageUrl(item.goodsUrl || "")}
                      alt={item.categoryKoreanName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 상품 정보 */}
                  <div className="flex-1">
                    <h3 className="text-[16px] font-semibold text-[#0a0a0a] mb-2">
                      {item.categoryKoreanName}
                    </h3>
                    <div className="flex items-center gap-4 text-[14px] text-[#6a7282] mb-2">
                      <span>수량: {item.quantity}개</span>
                      <span>•</span>
                      <span>단가: {formatPrice(item.priceAtOrder)}원</span>
                    </div>
                    <div className="text-[16px] font-semibold text-[#0a0a0a]">
                      {formatPrice(item.itemTotal)}원
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 오른쪽: 주문 정보 + 배송지 정보 */}
          <div className="space-y-6">
            {/* 주문 정보 카드 */}
            <div className="bg-white rounded-[16px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] p-8">
              <h2 className="text-[20px] font-semibold text-[#262626] mb-6">
                주문 정보
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[14px] text-[#6a7282]">상품 금액</span>
                  <span className="text-[14px] text-[#364153]">
                    {formatPrice(subtotal)}원
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[14px] text-[#6a7282]">배송비</span>
                  <span className="text-[14px] text-[#364153]">
                    {formatPrice(SHIPPING_FEE)}원
                  </span>
                </div>
                <div className="border-t border-[#f3f4f6] pt-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[16px] font-semibold text-[#0a0a0a]">
                      총 결제금액
                    </span>
                    <span className="text-[20px] font-semibold text-[#bb4d00]">
                      {formatPrice(order.totalAmount)}원
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t border-[#f3f4f6]">
                  <span className="text-[14px] text-[#6a7282]">주문일시: </span>
                  <span className="text-[14px] text-[#364153]">
                    {formatDate(order.orderedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* 배송지 정보 카드 */}
            <div className="bg-white rounded-[16px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] p-8">
              <h2 className="text-[20px] font-semibold text-[#262626] mb-6">
                배송지 정보
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] text-[#6a7282] mb-2">
                    우편번호 <span className="text-red-500">*필수</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addressInfo.zipcode}
                      readOnly
                      className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-[8px] text-[14px] text-[#364153] bg-gray-50"
                    />
                    <button
                      onClick={handleAddressSearch}
                      className="px-4 py-2 bg-[#b89a7c] text-white rounded-[8px] text-[14px] font-semibold hover:bg-[#a68a6c] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      주소검색
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[14px] text-[#6a7282] mb-2">
                    주소 <span className="text-red-500">*필수</span>
                  </label>
                  <input
                    type="text"
                    value={addressInfo.address}
                    readOnly
                    className="w-full px-4 py-2 border border-[#e5e7eb] rounded-[8px] text-[14px] text-[#364153] bg-gray-50 mb-2"
                  />
                  <input
                    type="text"
                    id="detailAddress"
                    value={addressInfo.detailAddress}
                    onChange={(e) =>
                      setAddressInfo({
                        ...addressInfo,
                        detailAddress: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-[#e5e7eb] rounded-[8px] text-[14px] text-[#364153] bg-white"
                    placeholder="상세주소"
                  />
                </div>
                <button
                  onClick={handleAddressChange}
                  className="w-full px-4 py-2 bg-white border border-[#4a5565] text-[#6b6b6b] rounded-[8px] text-[14px] font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  주소변경
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
