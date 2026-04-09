import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../services/authService";
import {
  createGoodsSample,
  deleteSampleImg,
  getTodayGoodsCount,
  selectGoods,
} from "../services/goodsService";
import { useAuthStore } from "../stores/authStore";

import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Toast from "../components/common/Toast";
import { getImageUrl } from "../utils/pathUtils";

export default function SelectGoodsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  // CreatePage에서 전달받은 상태값
  const createPageState = location.state?.createPageState || null;

  const [designSamples, setDesignSamples] = useState([]);
  const [selectedDesign, setSelectedDesign] = useState(null);

  const [toastOption, setToastOption] = useState({
    type: "",
    show: false,
    message: "",
    duration: 2000,
  });

  // 오늘 생성한 굿즈 개수 조회
  const { data: todayCount } = useQuery({
    queryKey: ["todayGoodsCount"],
    queryFn: getTodayGoodsCount,
    enabled: !!user && user.subscriptionPlan === "FREE",
    refetchOnMount: "always",
  });

  // 시안 생성 mutation
  const createGoodsSampleMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await createGoodsSample(formData);
      return response;
    },
    onSuccess: (data) => {
      if (data.goodsSampleImgUrls) {
        // API 응답으로 받은 시안 이미지 사용
        const samples = data.goodsSampleImgUrls.map((url, index) => ({
          id: index + 1,
          image: url,
          isSelected: index === 1, // 중앙 이미지 기본 선택
        }));
        setDesignSamples(samples);
        setSelectedDesign(
          samples.find((d) => d.isSelected)?.id || samples[0]?.id,
        );
        setToastOption({
          type: "success",
          show: true,
          message: "시안 생성 완료!",
          duration: 2000,
        });
      }
    },
    onError: (error) => {
      console.error("시안 생성 실패:", error);
      setToastOption({
        type: "error",
        show: true,
        message: "시안 생성에 실패했습니다.",
        duration: 2000,
      });
    },
    onSettled: () => {
      createGoodsSampleMutation.reset();
    },
  });

  // 중복 호출 방지를 위한 ref
  const hasCalledApi = useRef(false);

  // 컴포넌트 마운트 시 시안 생성 API 호출
  useEffect(() => {
    // 이미 API를 호출했으면 다시 호출하지 않음 (StrictMode 이중 실행 방지)
    if (hasCalledApi.current) {
      return;
    }

    if (!createPageState?.resultImage) {
      // resultImage가 없으면 CreatePage로 리다이렉트
      navigate("/create");
      return;
    }

    // API 호출 플래그 설정
    hasCalledApi.current = true;

    // resultImageUrl만 백엔드로 전송 (백엔드에서 다운로드 처리)
    const formData = new FormData();
    formData.append("resultImageUrl", createPageState.resultImage);
    formData.append("description", createPageState.description || "");
    formData.append("category", createPageState.selectedOption?.category || "");
    formData.append("style", createPageState.selectedOption?.style || "");
    formData.append("color", createPageState.selectedOption?.color || "");
    formData.append("mood", createPageState.selectedOption?.mood || "");
    formData.append("uploadImgGroupId", createPageState.uploadImgGroupId || "");

    // 시안 생성 API 호출
    createGoodsSampleMutation.mutate(formData);
  }, []);

  const handleSelect = (id) => {
    setSelectedDesign(id);
  };

  // 시안 삭제 mutation 추가
  const deleteSampleImgMutation = useMutation({
    mutationFn: async (requestBody) => {
      return await deleteSampleImg(requestBody);
    },
    onSuccess: (data) => {
      // 삭제 성공 후 CreatePage로 이동
      navigate("/create", {
        state: {
          selectGoodsPageState: createPageState,
        },
      });
    },
    onError: (error) => {
      console.error("시안 삭제 실패:", error);
      // 에러가 발생해도 CreatePage로 이동 (사용자 경험을 위해)
      navigate("/create", {
        state: {
          selectGoodsPageState: createPageState,
        },
      });
    },
  });

  const handleBack = () => {
    // 시안이 있으면 삭제 API 호출
    if (designSamples.length > 0) {
      const requestBody = {
        goodsSampleImgUrl: designSamples.map((d) => d.image),
      };
      deleteSampleImgMutation.mutate(requestBody);
    } else {
      // 시안이 없으면 바로 이동
      navigate("/create", {
        state: {
          selectGoodsPageState: createPageState,
        },
      });
    }
  };

  // 굿즈 선택 함수
  const handleSelectGoods = () => {
    // selectedDesign은 ID만 저장되어 있으므로 designSamples에서 찾아야 함
    const selectedSample = designSamples.find((d) => d.id === selectedDesign);

    if (!selectedSample || !selectedSample.image) {
      setToastOption({
        type: "error",
        show: true,
        message: "시안을 선택해주세요.",
        duration: 2000,
      });
      return;
    }

    // FREE 플랜 사용자의 경우 일일 5개 제한 체크
    if (user && user.subscriptionPlan === "FREE" && todayCount >= 5) {
      setToastOption({
        type: "error",
        show: true,
        message:
          "FREE 플랜은 하루에 5개까지만 생성할 수 있습니다. PRO 플랜으로 업그레이드하시면 무제한으로 생성할 수 있습니다.",
        duration: 4000,
      });
      return;
    }

    const requestBody = {
      resultImageUrl: createPageState.resultImage,
      sampleGoodsImageUrl: designSamples.map((d) => d.image),
      goodsImgUrl: selectedSample.image,
      prompt: createPageState.description,
      category: createPageState.selectedOption.category,
      goodsStyle: createPageState.selectedOption.style,
      goodsTone: createPageState.selectedOption.color,
      goodsMood: createPageState.selectedOption.mood,
      uploadImgGroupId: createPageState.uploadImgGroupId,
    };
    selectGoodsMutation.mutate(requestBody);
  };

  // 굿즈 선택 mutation
  const selectGoodsMutation = useMutation({
    mutationFn: async (requestBody) => {
      const response = await selectGoods(requestBody);
      return response;
    },
    onSuccess: (data) => {
      navigate("/mygoods", {
        state: {
          toastOption: {
            type: "success",
            show: true,
            message: "굿즈 선택 완료!",
            duration: 2000,
          },
        },
      });
    },
    onError: (error) => {
      console.error("굿즈 선택 실패:", error);
      const errorMessage = error.message || "굿즈 선택에 실패했습니다.";
      setToastOption({
        type: "error",
        show: true,
        message: errorMessage,
        duration: errorMessage.includes("FREE 플랜") ? 4000 : 2000,
      });
    },
  });

  const handleDownload = async () => {
    const selected = designSamples.find((d) => d.id === selectedDesign);

    if (!selected || !selected.image) {
      alert("다운로드할 시안이 선택되지 않았습니다.");
      return;
    }

    try {
      // 백엔드 프록시를 통해 이미지 다운로드 (CORS 문제 해결)
      const imageUrl = encodeURIComponent(selected.image);
      const response = await apiClient.get(
        `/api/goods/download-image?url=${imageUrl}`,
        {
          responseType: "blob",
        },
      );

      const blob = response.data;

      // Blob URL 생성
      const blobUrl = window.URL.createObjectURL(blob);

      // 다운로드 링크 생성
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `시안-${selected.id}.jpg`; // 파일명 설정
      document.body.appendChild(link);

      // 다운로드 트리거
      link.click();

      // 정리
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("다운로드 실패:", error);
      alert("이미지 다운로드에 실패했습니다.");
    }
  };

  return (
    <div className="bg-[#f5f3f0] h-[calc(100vh-112px)]">
      {/* 로딩 스피너 */}
      {createGoodsSampleMutation.isPending && (
        <LoadingSpinner message="시안 생성 중..." position="top-right" />
      )}
      {selectGoodsMutation.isPending && (
        <LoadingSpinner message="굿즈 선택 중..." position="top-right" />
      )}
      {deleteSampleImgMutation.isPending && (
        <LoadingSpinner message="시안 삭제 중..." position="top-right" />
      )}
      {/* 토스트 */}
      {toastOption.show && !createGoodsSampleMutation.isPending && (
        <Toast
          type={toastOption.type}
          message={toastOption.message}
          position="top-right"
          duration={toastOption.duration}
          onClose={() => setToastOption({ ...toastOption, show: false })}
        />
      )}
      <div className="max-w-[1440px] mx-auto px-8 py-8">
        {/* 제목 섹션 */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-[#2d2520] leading-[36px] mb-4">
            굿즈 시안 선택
          </h1>
          {user && user.subscriptionPlan === "FREE" && (
            <div className="flex flex-col items-center gap-2 mb-6">
              {/* 진행률 바 */}
              <div className="w-full max-w-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[16px] font-medium text-[#6b7280]">
                    오늘 생성한 굿즈
                  </span>
                  <span
                    className={`text-[16px] font-semibold ${
                      todayCount >= 5
                        ? "text-red-500"
                        : todayCount >= 3
                          ? "text-orange-500"
                          : "text-[#6b7280]"
                    }`}
                  >
                    {todayCount} / 5
                  </span>
                </div>
                {/* 진행률 바 */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      todayCount >= 5
                        ? "bg-red-500"
                        : todayCount >= 3
                          ? "bg-orange-500"
                          : "bg-[#b89a7c]"
                    }`}
                    style={{
                      width: `${Math.min((todayCount / 5) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          <p className="text-[16px] text-[#6b7280] leading-[26px] tracking-[-0.3px]">
            AI 분석으로 더 귀여워진 반려동물 사진 시안을 선택해 굿즈를
            만들어보세요
          </p>
        </div>

        {/* 시안 카드 그리드 */}
        {designSamples.length > 0 ? (
          <div className="flex items-center justify-center gap-6 mb-12 mt-10">
            {designSamples.map((design, index) => {
              const isSelected = selectedDesign === design.id;

              return (
                <div
                  key={design.id}
                  className={`relative transition-all duration-300 ${
                    isSelected ? "scale-[1.03] z-10" : "scale-95 opacity-70"
                  }`}
                >
                  <div
                    onClick={() => handleSelect(design.id)}
                    className={`
                  relative
                  bg-white rounded-[20px]
                  cursor-pointer
                  transition-all duration-300 ease-out
                  shadow-[0_8px_24px_rgba(0,0,0,0.08)]
                  ${
                    isSelected
                      ? "border border-[#d1d5db] scale-105"
                      : "border border-transparent opacity-80 hover:opacity-100"
                  }
                `}
                    style={{
                      width: "320px",
                      height: "460px",
                    }}
                  >
                    {/* 선택 표시 아이콘 */}
                    {isSelected && (
                      <div className="absolute top-4 left-4 bg-[#b89a7c] rounded-full w-9 h-9 flex items-center justify-center shadow-md">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          className="text-white"
                        >
                          <path
                            d="M16.667 5L7.5 14.167 3.333 10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}

                    {/* 이미지 */}
                    <div className="w-full h-full flex items-center justify-center p-6">
                      <img
                        src={getImageUrl(design.image)}
                        alt={`시안 ${design.id}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-[16px] text-[#4a5565]">
              시안을 생성하는 중입니다...
            </p>
          </div>
        )}

        {/* 하단 버튼들 */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={handleBack}
            className="bg-white border border-[#e5e7eb] h-[48px] px-8 rounded-[10px] text-[18px] text-[#364153] hover:bg-gray-50 transition-colors cursor-pointer"
          >
            뒤로
          </button>
          <button
            onClick={handleSelectGoods}
            className="bg-[#b89a7c] h-[48px] px-8 rounded-[10px] text-[18px] text-white hover:bg-[#a68a6c] transition-colors shadow-md cursor-pointer"
          >
            굿즈 선택
          </button>
          <button
            onClick={handleDownload}
            className="bg-white border border-[#e5e7eb] h-[48px] px-8 rounded-[10px] text-[18px] text-[#364153] hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4 text-[#364153]" />
            다운로드
          </button>
        </div>
      </div>
    </div>
  );
}
