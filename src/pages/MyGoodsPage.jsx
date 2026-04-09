import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrashIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";

import { useAddressSearch } from "../hooks/useAddressSearch";
import { useMutation } from "@tanstack/react-query";
import {
  deleteMyGoods,
  selectAllMyGoods,
  downloadMyGoodsImg,
  downloadMyGoodsImgZip,
} from "../services/goodsService";
import { createOrder } from "../services/orderService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import PaymentModal from "../components/common/PaymentModal";
import Toast from "../components/common/Toast";
import { getImageUrl } from "../utils/pathUtils";
import { useAuthStore } from "../stores/authStore";

export default function MyGoodsPage() {
  const [goods, setGoods] = useState([]);
  const navigate = useNavigate();

  // 주소 검색 훅 사용
  const { addressInfo, setAddressInfo, handleAddressSearch } =
    useAddressSearch();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null); // 결제 대기 중인 주문 데이터
  const portoneScriptLoaded = useRef(false);

  const [toastOption, setToastOption] = useState({
    type: "",
    show: false,
    message: "",
    duration: 2000,
  });

  const user = useAuthStore((state) => state.user);

  // 포트원(아임포트) 스크립트 로드
  useEffect(() => {
    if (portoneScriptLoaded.current) return;

    const script = document.createElement("script");
    script.src = "https://cdn.iamport.kr/js/iamport.payment-1.2.0.js";
    script.async = true;
    script.onload = () => {
      portoneScriptLoaded.current = true;
    };
    document.head.appendChild(script);
  }, []);

  // 내가 생성한 굿즈 목록 불러오기 mutation
  const selectAllGoodsMutation = useMutation({
    mutationFn: async () => {
      return await selectAllMyGoods();
    },
    onSuccess: (data) => {
      let goodsList = [];
      data.forEach((item) => {
        goodsList.push({
          id: item.goodsId,
          quantity: 1,
          price: item.price,
          checked: false,
          image: item.goodsUrl,
        });
      });
      setGoods(goodsList);

      setToastOption({
        type: "success",
        show: true,
        message: "굿즈 목록 불러오기 성공",
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error("굿즈 목록 불러오기 실패:", error);
      setToastOption({
        type: "error",
        show: true,
        message: error.message,
        duration: 2000,
      });
    },
  });

  // 맨처음 페이지 도착할때 내가 생성한 굿즈 목록 불러오기
  useEffect(() => {
    selectAllGoodsMutation.mutate();
  }, []);

  // 모두 선택/해제
  const handleSelectAll = (checked) => {
    setGoods(goods.map((item) => ({ ...item, checked })));
  };

  // 개별 선택/해제
  const handleToggleCheck = (id) => {
    setGoods(
      goods.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  // 수량 증가
  const handleIncreaseQuantity = (id) => {
    setGoods(
      goods.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  // 수량 감소
  const handleDecreaseQuantity = (id) => {
    setGoods(
      goods.map((item) =>
        item.id === id && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  };

  // 선택된 항목 수
  const selectedCount = goods.filter((item) => item.checked).length;
  const allSelected = goods.length > 0 && goods.every((item) => item.checked);

  // 총 수량
  const totalQuantity = goods
    .filter((item) => item.checked)
    .reduce((sum, item) => sum + item.quantity, 0);

  // 총 금액
  const totalAmount = goods
    .filter((item) => item.checked)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 배송비
  const shippingFee = 3000;

  // 결제금액
  const paymentAmount = totalAmount + shippingFee;

  const deleteMyGoodsMutation = useMutation({
    mutationFn: async (goodsIds) => {
      return await deleteMyGoods(goodsIds);
    },
    onSuccess: (data) => {
      selectAllGoodsMutation.mutate();
    },
    onError: (error) => {
      console.error("굿즈 삭제 실패:", error);
      setToastOption({
        type: "error",
        show: true,
        message: error.message,
        duration: 2000,
      });
    },
  });

  // 삭제
  const handleDelete = () => {
    // 삭제 로직 구현
    const goodsIds = goods
      .filter((item) => item.checked)
      .map((item) => item.id);

    deleteMyGoodsMutation.mutate(goodsIds);
  };

  // 다운로드
  const handleDownload = async () => {
    // 선택된 굿즈 가져오기
    const selectedGoods = goods.filter((item) => item.checked);

    if (selectedGoods.length === 0) {
      alert("다운로드할 굿즈를 선택해주세요.");
      return;
    }

    try {
      // 여러 개 선택 시 ZIP으로 다운로드, 단건 선택 시 개별 다운로드
      if (selectedGoods.length > 1) {
        // ZIP 다운로드
        const imageUrls = selectedGoods.map((item) => item.image);
        const blob = await downloadMyGoodsImgZip(imageUrls);

        // Blob URL 생성
        const blobUrl = window.URL.createObjectURL(blob);

        // 다운로드 링크 생성
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `굿즈_${selectedGoods.length}개.zip`;
        document.body.appendChild(link);

        // 다운로드 트리거
        link.click();

        // 정리
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        setToastOption({
          type: "success",
          show: true,
          message: `${selectedGoods.length}개의 굿즈를 ZIP 파일로 다운로드했습니다.`,
          duration: 2000,
        });
      } else {
        // 단건 다운로드
        const item = selectedGoods[0];
        const blob = await downloadMyGoodsImg(item.image);

        // Blob URL 생성
        const blobUrl = window.URL.createObjectURL(blob);

        // 다운로드 링크 생성
        const link = document.createElement("a");
        link.href = blobUrl;

        // 파일명 설정 (URL에서 추출하거나 기본값 사용)
        const urlParts = item.image.split("/");
        const fileName = urlParts[urlParts.length - 1] || `굿즈-${item.id}.jpg`;
        link.download = fileName;

        document.body.appendChild(link);

        // 다운로드 트리거
        link.click();

        // 정리
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        setToastOption({
          type: "success",
          show: true,
          message: "굿즈를 다운로드했습니다.",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("다운로드 실패:", error);
      setToastOption({
        type: "error",
        show: true,
        message: "이미지 다운로드에 실패했습니다.",
        duration: 2000,
      });
    }
  };

  const createOrderMutation = useMutation({
    mutationFn: async (createOrderRequest) => {
      return await createOrder(createOrderRequest);
    },
    onSuccess: (data) => {
      setToastOption({
        type: "success",
        show: true,
        message: "주문 생성 성공",
        duration: 2000,
      });
      setIsPaymentModalOpen(true);
    },
    onError: (error) => {
      console.error("주문 생성 실패:", error);
      setToastOption({
        type: "error",
        show: true,
        message: "주문 생성 실패",
        duration: 2000,
      });
    },
  });

  // 주문하기
  const handleOrder = () => {
    // 배송 정보 검증
    if (!addressInfo.zipcode || !addressInfo.address) {
      alert("배송 정보를 입력해주세요.");
      return;
    }

    // 선택된 굿즈가 있는지 확인
    if (selectedCount === 0) {
      alert("주문할 굿즈를 선택해주세요.");
      return;
    }

    // 주문 요청 데이터 생성
    const createOrderRequest = {
      items: goods
        .filter((item) => item.checked)
        .map((item) => ({
          goodsId: item.id,
          quantity: item.quantity,
        })),
      zipcode: addressInfo.zipcode,
      address: addressInfo.address,
      detailAddress: addressInfo.detailAddress,
      method: "",
    };

    // 주문 데이터 저장 (결제 완료 후 사용)
    setPendingOrderData(createOrderRequest);

    // 결제 모달 열기
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="bg-[#fafaf8] min-h-screen">
      {/* 로딩 스피너 */}
      {selectAllGoodsMutation.isPending && (
        <LoadingSpinner
          message="굿즈 목록 불러오는중..."
          position="top-right"
        />
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
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* 제목 */}
        <h1 className="text-[28px] font-semibold text-[#0a0a0a] mb-8">
          내가 생성한 굿즈
        </h1>

        <div className="flex gap-10 items-start">
          {/* 왼쪽: 굿즈 목록 */}
          <div className="flex-1">
            {/* 액션 바  */}
            <div className="flex items-center justify-end gap-4 mb-6">
              {/* 전체 선택 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="
              appearance-none
              w-5 h-5
              rounded-[4px]
              bg-white
              border border-[#e5ded3]
              cursor-pointer
              flex items-center justify-center
              checked:bg-[#bfa37c]
              checked:border-[#bfa37c]
              checked:before:content-['✓']
              checked:before:text-white
              checked:before:text-[14px]
              checked:before:font-extrabold
              focus:outline-none
            "
                />
                <span className="text-[18px] text-[#0a0a0a]">전체 선택</span>
              </div>

              {/* 선택됨 뱃지 */}
              <div className="bg-[#f3f4f6] rounded-full px-3 py-1.5">
                <span className="text-[13px] font-medium text-[#4a5565]">
                  선택됨: {selectedCount}개
                </span>
              </div>

              {/* 삭제 버튼 */}
              <button
                onClick={handleDelete}
                className="bg-white border border-[#e5e7eb] h-10 px-4 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <TrashIcon className="w-[18px] h-[18px] text-[#4b5563]" />
                <span className="text-[14px] text-[#0a0a0a] font-medium">
                  삭제
                </span>
              </button>

              {/* 다운로드 버튼 */}
              <button
                onClick={handleDownload}
                className="bg-white border border-[#e5e7eb] h-10 px-4 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <ArrowDownTrayIcon className="w-4 h-4 text-[#4b5563]" />
                <span className="text-[14px] text-[#0a0a0a] font-medium">
                  다운로드
                </span>
              </button>
            </div>

            {/* 굿즈 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
              {goods.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-[16px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)] w-full max-w-[400px] overflow-hidden relative"
                >
                  {/* 체크박스 */}
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleToggleCheck(item.id)}
                      className="
                    appearance-none
                    w-5 h-5
                    rounded-[4px]
                    bg-white
                    border border-[#e5ded3]
                    cursor-pointer
                    flex items-center justify-center
                    checked:bg-[#bfa37c]
                    checked:border-[#bfa37c]
                    checked:before:content-['✓']
                    checked:before:text-white
                    checked:before:text-[14px]
                    checked:before:font-extrabold
                    focus:outline-none"
                    />
                  </div>

                  {/* 이미지 */}
                  <div
                    onClick={() => handleToggleCheck(item.id)}
                    className="bg-[#f5f0eb] aspect-[3/4] mb-1  flex items-center justify-center overflow-hidden rounded-t-[16px] cursor-pointer"
                  >
                    <img
                      src={getImageUrl(item.image)}
                      alt={`굿즈 ${item.id}`}
                      className="w-full h-full object-covertransition-transform duration-300 hover:scale-105"
                    />
                  </div>

                  {/* 수량 선택기 */}
                  <div className="px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[16px] text-[#364153]">수량</span>
                      <div className="bg-white border border-[#d1d5dc] rounded-[10px] flex items-center gap-3 h-10 px-1">
                        <button
                          onClick={() => handleDecreaseQuantity(item.id)}
                          disabled={item.quantity <= 1}
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            item.quantity <= 1
                              ? "border border-[#0a0a0a] opacity-30"
                              : "border border-[#d1d5dc]"
                          }`}
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                        <span className="text-[14px] text-[#0a0a0a] min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleIncreaseQuantity(item.id)}
                          className="w-7 h-7 rounded-full border border-[#d1d5dc] flex items-center justify-center"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 가격 */}
                    <div className="border-[#e7e2da] pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[16px] text-[#364153]">가격</span>
                        <span className="text-[20px] text-[#0a0a0a]">
                          {item.price.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 오른쪽: 배송 정보 및 주문 정보 */}
          <div className="w-full max-w-[400px] bg-white rounded-[16px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)] p-6 h-fit sticky top-10">
            {/* 배송 정보 */}
            <div>
              <h2 className="text-[20px] text-[#0a0a0a] mb-6">배송 정보</h2>

              {/* 우편번호 */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-[14px] font-semibold text-[#4a5565]">
                    우편번호
                  </label>
                  <span className="text-[14px] text-[#fb2c36]">* 필수</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addressInfo.zipcode}
                    readOnly
                    placeholder="우편번호"
                    className="flex-1 border border-[#d1d5dc] rounded-[10px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#b89b7a]"
                  />
                  <button
                    onClick={handleAddressSearch}
                    className="bg-[#b89b7a] text-white px-4 py-2 rounded-[10px] text-[14px] font-semibold hover:bg-[#a68a6c] transition-colors"
                  >
                    주소검색
                  </button>
                </div>
              </div>

              {/* 주소 */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-[14px] font-semibold text-[#4a5565]">
                    주소
                  </label>
                  <span className="text-[14px] text-[#fb2c36]">* 필수</span>
                </div>
                <input
                  type="text"
                  value={addressInfo.address}
                  readOnly
                  placeholder="ex 주소"
                  className="w-full border border-[#d1d5dc] rounded-[10px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#b89b7a]"
                />
              </div>

              {/* 상세 주소 */}
              <div className="mb-4">
                <label className="text-[14px] font-semibold text-[#4a5565] block mb-2">
                  상세 주소
                </label>
                <input
                  type="text"
                  value={addressInfo.detailAddress}
                  onChange={(e) =>
                    setAddressInfo({
                      ...addressInfo,
                      detailAddress: e.target.value,
                    })
                  }
                  placeholder="주소를 입력해주세요"
                  className="w-full border border-[#d1d5dc] rounded-[10px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#b89b7a]"
                />
              </div>
            </div>

            {/* 주문 정보 */}
            <div className="border-t border-[rgba(0,0,0,0.1)] pt-6">
              <h2 className="text-[20px] text-[#0a0a0a] mb-4">주문 정보</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-[16px] text-[#4a5565]">총 수량</span>
                  <span className="text-[16px] text-[#0a0a0a]">
                    {totalQuantity}개
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[16px] text-[#4a5565]">총 금액</span>
                  <span className="text-[16px] text-[#0a0a0a]">
                    {totalAmount.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[16px] text-[#4a5565]">배송비</span>
                  <span className="text-[16px] text-[#0a0a0a]">
                    {shippingFee.toLocaleString()}원
                  </span>
                </div>
              </div>

              <div className="border-t border-[rgba(0,0,0,0.1)] pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-[20px] text-[#0a0a0a]">결제금액</span>
                  <span className="text-[24px] text-[#0a0a0a]">
                    {paymentAmount.toLocaleString()}원
                  </span>
                </div>
              </div>

              <button
                onClick={handleOrder}
                className="w-full bg-[#b89b7a] text-white py-3.5 rounded-[12px] text-[18px] font-semibold hover:bg-[#a68a6c] transition-colors"
              >
                굿즈 주문하기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 결제하기 모달 */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPendingOrderData(null);
        }}
        paymentAmount={paymentAmount}
        onPayment={async (paymentData) => {
          if (!window.IMP) {
            alert("포트원을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
          }

          if (!pendingOrderData) {
            alert("주문 정보가 없습니다.");
            return;
          }

          try {
            // 포트원 초기화
            window.IMP.init(import.meta.env.VITE_PORTONE_IMP_ID);

            // 주문 ID 생성
            const orderId = `ORDER_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`;

            // 결제 수단에 따른 포트원 PG사 코드 매핑
            const pgMap = {
              tosspay: "tosspay.tosstest",
              kakaopay: "kakaopay.TC0ONETIME",
              card: "mobilians.170622040674", // 또는 "kcp" (포트원 콘솔에서 설정한 PG사에 따라 다름)
              phone: "mobilians.170622040674", // 또는 "kcp"
            };

            // 결제 방법 매핑
            const payMethodMap = {
              tosspay: "tosspay",
              kakaopay: "kakaopay",
              card: "card",
              phone: "phone",
            };

            const pgCode = pgMap[paymentData.paymentMethod];
            const pay_method = payMethodMap[paymentData.paymentMethod];

            if (!pgCode || !pay_method) {
              alert("지원하지 않는 결제 수단입니다.");
              return;
            }

            // 결제 요청 옵션 기본 설정
            const paymentOptions = {
              pg: pgCode, // PG사 코드
              pay_method: pay_method, // 결제 방법
              merchant_uid: orderId, // 주문 ID
              name: `굿즈 ${selectedCount}개 주문`, // 상품명
              amount: 1000, // 결제 금액
              buyer_name: `${user?.nickname}`, // 구매자 이름 (실제로는 사용자 정보에서 가져오기)
              buyer_tel: "", // 구매자 전화번호 (실제로는 사용자 정보에서 가져오기)
            };

            // 주문 데이터에 결제 수단 추가 (결제 성공 시 사용)
            const orderDataWithMethod = {
              ...pendingOrderData,
              method: pay_method,
            };

            // 결제 요청 (프론트엔드에서 직접 처리)
            window.IMP.request_pay(paymentOptions, async (response) => {
              // 결제 모달 닫기
              setIsPaymentModalOpen(false);

              if (response.success) {
                // 결제 성공 - 주문 생성
                try {
                  await createOrder(orderDataWithMethod);

                  navigate("/orders");
                } catch (error) {
                  console.error("주문 생성 실패:", error);
                  setToastOption({
                    type: "error",
                    show: true,
                    message: error.message || "주문 생성에 실패했습니다.",
                    duration: 3000,
                  });
                }
              } else {
                // 결제 실패
                console.error("결제 실패:", response);
                const errorMessage =
                  response.error_msg || "결제 처리 중 오류가 발생했습니다.";

                // 사용자가 결제를 취소한 경우
                if (response.error_code === "PAY_CANCEL") {
                  setToastOption({
                    type: "info",
                    show: true,
                    message: "결제가 취소되었습니다.",
                    duration: 2000,
                  });
                } else {
                  setToastOption({
                    type: "error",
                    show: true,
                    message: errorMessage,
                    duration: 2000,
                  });
                }
              }
            });
          } catch (error) {
            console.error("결제 실패:", error);
            setToastOption({
              type: "error",
              show: true,
              message: error.message || "결제 처리 중 오류가 발생했습니다.",
              duration: 2000,
            });
          }
        }}
      />
    </div>
  );
}
