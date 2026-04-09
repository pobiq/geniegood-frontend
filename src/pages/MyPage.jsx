import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CameraIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

import defaultProfileIcon from "../assets/img/defaultProfileIcon.png";
import {
  checkNicknameDuplicate,
  updateNickname,
  uploadProfileImage,
  withdrawUser,
} from "../services/userService";

import LoadingSpinner from "../components/common/LoadingSpinner";
import Toast from "../components/common/Toast";
import { selectRecentOrder } from "../services/orderService";
import { useAuthStore } from "../stores/authStore";
import { getImageUrl } from "../utils/pathUtils";

export default function MyPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { user, setUser } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [profileImage, setProfileImage] = useState(
    getImageUrl(user?.profileUrl) || defaultProfileIcon,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isNicknameAvailable, setIsNicknameAvailable] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const [toastOption, setToastOption] = useState({
    type: "",
    show: false,
    message: "",
    duration: 2000,
  });

  // authStore의 user가 변경되면 상태 업데이트
  useEffect(() => {
    if (user) {
      if (user.nickname) {
        setNickname(user.nickname);
      }
      if (user.profileUrl) {
        setProfileImage(getImageUrl(user.profileUrl));
      } else {
        setProfileImage(defaultProfileIcon);
      }
    }
  }, [user]);

  // 최근 주문 내역 2개 호출
  const {
    data: recentOrders,
    isRecentOrdersLoading,
    isRecentOrdersError,
    recentOrderserror,
  } = useQuery({
    queryKey: ["selectRecentOrders"],
    queryFn: async () => {
      const response = await selectRecentOrder();
      return response;
    },
    refetchOnMount: "always",
  });

  // 닉네임 중복확인 query
  const {
    data: checkNicknameData,
    isLoading: isCheckingNickname,
    error: checkNicknameError,
    refetch: checkNicknameRefetch,
  } = useQuery({
    queryKey: ["checkNickname", nickname],
    queryFn: async () => {
      const response = await checkNicknameDuplicate(nickname);
      return response;
    },
    enabled: false,
  });

  // 닉네임 중복확인 결과 처리
  useEffect(() => {
    if (checkNicknameData) {
      setIsNicknameAvailable(checkNicknameData.available);
      if (checkNicknameData.available) {
        setToastOption({
          type: "success",
          message: checkNicknameData.message || "사용 가능한 닉네임입니다.",
          show: true,
          duration: 2000,
        });
      } else {
        setToastOption({
          type: "error",
          message: checkNicknameData.message || "이미 사용 중인 닉네임입니다.",
          show: true,
          duration: 2000,
        });
      }
    }
  }, [checkNicknameData]);

  // 닉네임 중복확인 에러 처리
  useEffect(() => {
    if (checkNicknameError) {
      console.error("닉네임 중복확인 실패:", checkNicknameError);
      alert(
        checkNicknameError.response?.data?.message ||
          "닉네임 중복확인에 실패했습니다.",
      );
      setIsNicknameAvailable(false);
    }
  }, [checkNicknameError]);

  // 닉네임 유효성 검사
  const CheckNicknameValidation = () => {
    if (
      !nickname ||
      nickname.trim().length < 2 ||
      nickname.trim().length > 10
    ) {
      setToastOption({
        type: "error",
        message: "닉네임은 2~10자로 입력해주세요.",
        show: true,
        duration: 2000,
      });
      return false;
    }

    // 한글만 허용하는 정규식
    const koreanRegex = /^[가-힣]+$/;
    if (!koreanRegex.test(nickname)) {
      setToastOption({
        type: "error",
        message: "닉네임은 한글만 입력 가능합니다.",
        show: true,
        duration: 2000,
      });
      return false;
    }
    return true;
  };

  // 닉네임 중복확인
  const handleCheckDuplicate = () => {
    if (!CheckNicknameValidation()) {
      return;
    }
    checkNicknameRefetch();
  };

  // 닉네임 변경 mutation
  const updateNicknameMutation = useMutation({
    mutationFn: async (nickname) => {
      const response = await updateNickname(nickname);
      return response;
    },
    onSuccess: (data) => {
      setNickname(nickname);
      setUser({ ...user, nickname: nickname });
      setToastOption({
        type: "success",
        message: data.message || "닉네임이 변경되었습니다.",
        show: true,
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error("닉네임 변경 실패:", error);
      setToastOption({
        type: "error",
        message: error.message || "닉네임 변경에 실패했습니다.",
        show: true,
        duration: 2000,
      });
    },
  });

  // 닉네임 변경
  const handleChangeNickname = () => {
    // 중복확인을 하지 않았으면 변경 불가
    if (!isNicknameAvailable) {
      setToastOption({
        type: "error",
        message: "먼저 닉네임 중복확인을 해주세요.",
        show: true,
        duration: 2000,
      });
      return;
    }
    updateNicknameMutation.mutate(nickname);
  };

  // 프로필 이미지 변경
  const handleChangeProfileImage = () => {
    fileInputRef.current?.click();
  };

  // 파일 유효성 검사
  const validateFile = (file) => {
    // jpg, jpeg, png만 허용
    if (
      !file.type.startsWith("image/") &&
      !(
        file.type.endsWith("jpg") ||
        file.type.endsWith("jpeg") ||
        file.type.endsWith("png")
      )
    ) {
      setToastOption({
        type: "error",
        message: "jpg, jpeg, png 파일만 업로드 가능합니다.",
        show: true,
        duration: 2000,
      });
      return false;
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setToastOption({
        type: "error",
        message: "파일 크기는 10MB를 초과할 수 없습니다.",
        show: true,
        duration: 2000,
      });
      return false;
    }
    return true;
  };

  // 프로필 이미지 업로드 mutation
  const uploadProfileImageMutation = useMutation({
    mutationFn: async (file) => {
      const response = await uploadProfileImage(file);
      return response;
    },
    onSuccess: (data) => {
      setProfileImage(data.profileUrl);
      setUser({ ...user, profileUrl: data.profileUrl });
      setToastOption({
        type: "success",
        message: data.message || "프로필 이미지가 업로드되었습니다.",
        show: true,
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error("프로필 이미지 업로드 실패:", error);
      setToastOption({
        type: "error",
        message: error.message || "프로필 이미지 업로드에 실패했습니다.",
        show: true,
        duration: 2000,
      });
    },
  });

  // 파일 선택 핸들러
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!validateFile(file)) {
      return;
    }

    // 미리보기 표시
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result);
    };
    reader.readAsDataURL(file);

    // 업로드
    setIsUploading(true);
    const previousImageUrl = user?.profileUrl; // 이전 이미지 URL 저장

    uploadProfileImageMutation.mutate(file);

    try {
      const response = await uploadProfileImage(file);
      setProfileImage(response.profileUrl);
      // authStore의 user도 업데이트
      setUser({ ...user, profileUrl: response.profileUrl });
    } catch (error) {
      console.error("프로필 이미지 업로드 실패:", error);
      // 업로드 실패 시 이전 이미지로 복원
      if (previousImageUrl) {
        setProfileImage(previousImageUrl);
      } else {
        setProfileImage(defaultProfileIcon);
      }
    } finally {
      setIsUploading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 주문 상세보기
  const handleViewOrderDetail = (orderId) => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }
    navigate(`/orders/${orderId}`);
  };

  // 주문 취소
  const handleCancelOrder = (orderId) => {
    // 주문 취소 로직 구현
    if (window.confirm("주문을 취소하시겠습니까?")) {
    }
  };

  // 전체 주문 보기
  const handleViewAllOrders = () => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }
    navigate("/orders");
  };

  // 자주묻는질문
  const handleFAQ = () => {
    navigate("/question");
  };

  // 회원탈퇴 모달 열기
  const handleWithdraw = () => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }
    setIsWithdrawModalOpen(true);
  };

  // 회원탈퇴 모달 닫기
  const handleCloseWithdrawModal = () => {
    setIsWithdrawModalOpen(false);
  };

  // 회원탈퇴 실행
  const handleConfirmWithdraw = () => {
    // TODO: 회원탈퇴 API 호출
    withdrawUserMutation.mutate();
  };

  const withdrawUserMutation = useMutation({
    mutationFn: async () => {
      const response = await withdrawUser();
      return response.data;
    },
    onSuccess: (data) => {
      if (data.status === "SUCCESS") {
        alert(data.message || "회원탈퇴가 완료되었습니다.");
        setIsWithdrawModalOpen(false);
        // API 호출 후 로그아웃 처리
        navigate("/");
      } else {
        alert(data.message || "회원탈퇴에 실패했습니다.");
      }
    },
    onError: (error) => {
      console.error("회원탈퇴 실패:", error);
      setToastOption({
        type: "error",
        message: error.message || "회원탈퇴에 실패했습니다.",
        show: true,
        duration: 2000,
      });
    },
  });

  return (
    <div className="bg-[#f5f3f0] pt-20 pb-23">
      {/* 로딩 스피너 */}
      {isCheckingNickname && (
        <LoadingSpinner message="닉네임 중복체크 중..." position="top-right" />
      )}
      {updateNicknameMutation.isPending && (
        <LoadingSpinner message="닉네임 변경 중..." position="top-right" />
      )}
      {isRecentOrdersLoading && (
        <LoadingSpinner message="주문 내역 호출 중..." position="top-right" />
      )}
      {uploadProfileImageMutation.isPending && (
        <LoadingSpinner
          message="프로필 이미지 업로드 중..."
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

      {/* 회원탈퇴 모달 */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-[#fafaf8] rounded-[16px] shadow-lg w-[500px] max-w-[90vw] relative p-8">
            {/* 닫기 버튼 */}
            <button
              onClick={handleCloseWithdrawModal}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* 아이콘 */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="rounded-full w-28 h-28 flex items-center justify-center overflow-hidden cursor-pointer">
                  <img
                    src={profileImage}
                    alt="프로필"
                    className="w-28 h-28 object-cover rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* 메인 질문 */}
            <h2 className="text-[20px] font-semibold text-[#0a0a0a] text-center mb-2">
              정말로 계정을 삭제하시겠습니까?
            </h2>

            {/* 경고 텍스트 */}
            <p className="text-[14px] text-[#6a7282] text-center mb-6">
              (탈퇴 시 모든 데이터가 영구 삭제됩니다)
            </p>

            {/* 삭제될 정보 */}
            <div className="bg-[#fff4e6] rounded-[8px] p-4 mb-6">
              <p className="text-[14px] font-semibold text-[#0a0a0a] mb-3">
                삭제될 정보:
              </p>
              <ul className="space-y-2 text-[14px] text-[#364153]">
                <li>• 생성한 이미지 및 굿즈</li>
                <li>• 활동 기록</li>
              </ul>
            </div>

            {/* 버튼들 */}
            <div className="flex gap-3">
              <button
                onClick={handleConfirmWithdraw}
                className="flex-1 bg-[#bb4d00] text-white py-3 rounded-[10px] text-[14px] font-semibold hover:bg-[#a64400] transition-colors"
              >
                회원탈퇴
              </button>
              <button
                onClick={handleCloseWithdrawModal}
                className="flex-1 bg-white border border-[#d1d5dc] text-[#6b6b6b] py-3 rounded-[10px] text-[14px] font-semibold hover:bg-gray-50 transition-colors"
              >
                취소하기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-8 py-8">
        {/* 페이지 제목 */}
        <h1 className="text-[28px] font-semibold text-[#2d2520] text-center mb-12">
          마이페이지
        </h1>

        <div className="flex gap-6 justify-center">
          {/* 왼쪽: 내 정보 패널 */}
          <div className="bg-white rounded-[16px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] w-[588px]  p-8">
            <h2 className="text-[20px] font-semibold text-[#262626] mb-8">
              내 정보
            </h2>

            {/* 프로필 이미지 */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div className="rounded-full w-28 h-28 flex items-center justify-center overflow-hidden">
                  <img
                    src={profileImage}
                    alt="프로필"
                    className="w-28 h-28 object-cover rounded-full"
                  />
                </div>
                <button
                  onClick={handleChangeProfileImage}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 bg-white border border-[#e5e7eb] rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CameraIcon className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* 멤버십 배지 */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
                    user?.subscriptionPlan === "PRO"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {user?.subscriptionPlan === "PRO"
                    ? "⭐ PRO 멤버십"
                    : "🆓 FREE 멤버십"}
                </div>
                {user?.subscriptionPlan === "PRO" &&
                  user?.subscriptionExpiryDate && (
                    <span>기간 : {user.subscriptionExpiryDate} 까지</span>
                  )}
              </div>
            </div>

            {/* 닉네임 입력 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[14px] font-semibold text-[#4a5565]">
                  닉네임
                </label>
                <span className="text-[14px] text-[#fb2c36]">* 필수</span>
                {isNicknameAvailable && (
                  <CheckIcon className="w-4 h-4 text-green-700" />
                )}
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setIsNicknameAvailable(false); // 입력 변경 시 중복확인 결과 초기화
                  }}
                  placeholder="닉네임을 입력하세요"
                  className="flex-1 border border-[#d1d5dc] rounded-[8px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#b89a7c]"
                />
                <button
                  onClick={handleCheckDuplicate}
                  disabled={isCheckingNickname || !nickname.trim()}
                  className="bg-white border border-[rgba(0,0,0,0.1)] px-4 py-2 rounded-[8px] text-[14px] font-semibold text-[#0a0a0a] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isCheckingNickname ? "확인 중..." : "중복확인"}
                </button>
              </div>
              <p className="text-[12px] text-[#e17100]">
                *닉네임은 2~10자의 한글만이 가능
              </p>
            </div>

            {/* 닉네임 변경 버튼 */}
            <button
              onClick={handleChangeNickname}
              disabled={!isNicknameAvailable}
              className="w-full bg-[#bb4d00] text-white py-3 rounded-[10px] text-[14px] font-semibold hover:bg-[#a64400] transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#bb4d00] cursor-pointer"
            >
              닉네임 변경
            </button>

            {/* 구분선 */}
            <div className="border-t border-[#d1d5dc] mb-6"></div>

            {/* 메뉴 */}
            <div className="flex items-center justify-center gap-2 pt-3 text-[14px]">
              <button
                onClick={handleFAQ}
                className="font-medium text-[#4a5565] hover:text-[#2d2520] transition-colors cursor-pointer"
              >
                자주묻는질문
              </button>
              <span className="text-[#d1d5dc] select-none">|</span>
              <button
                onClick={handleWithdraw}
                className="font-medium text-[#4a5565] hover:text-[#2d2520] transition-colors cursor-pointer"
              >
                회원탈퇴
              </button>
            </div>
          </div>

          {/* 오른쪽: 최근 주문 내역 패널 */}
          <div className="bg-white rounded-[16px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] w-[588px] p-8">
            <h2 className="text-[20px] font-semibold text-[#0a0a0a] mb-6">
              최근 주문 내역
            </h2>

            <div className="space-y-6">
              {recentOrders &&
                recentOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="border-b border-[#f3f4f6] pb-6 last:border-b-0 last:pb-0"
                  >
                    {/* 주문번호 */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[14px] text-[#6a7282]">
                        주문번호
                      </span>
                      <span className="text-[14px] text-[#364153]">
                        #{order.orderNumber}
                      </span>
                    </div>

                    {/* 주문 정보 */}
                    <div className="flex gap-4">
                      {/* 주문 이미지 */}
                      <div className="w-20 h-20 rounded-[10px] overflow-hidden bg-gray-100 shrink-0">
                        <img
                          src={getImageUrl(order.goodsUrl)}
                          alt="주문 이미지"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* 주문 상세 */}
                      <div className="flex-1">
                        <h3 className="text-[16px] font-semibold text-[#0a0a0a] mb-1">
                          {order.orderTitle}
                        </h3>
                        <p className="text-[14px] text-[#6a7282] mb-3">
                          {order.orderedAt}
                        </p>

                        {/* 버튼들 */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewOrderDetail(order.orderId)}
                            className="bg-[#b89a7c] text-white px-4 py-2 rounded-[10px] text-[14px] font-semibold hover:bg-[#a68a6c] transition-colors cursor-pointer"
                          >
                            상세보기
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* 구분선 + 전체 주문 보기 */}
            <div className="border-t border-[#e5e7eb] pt-4 mt-6 text-center">
              <button
                onClick={handleViewAllOrders}
                className="text-[15px] font-medium text-[#6a7282] hover:text-[#4a5565] transition-colors cursor-pointer"
              >
                전체 주문 보기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
