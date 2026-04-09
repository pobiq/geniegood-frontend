import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { selectGoodsData, selectGoodsDetail } from "../services/goodsService";
import { getImageUrl } from "../utils/pathUtils";

import {
 useAuthStore } from "../stores/authStore";

const categories = [
  { id: 0, name: "전체" },
  { id: 1, name: "키링" },
  { id: 2, name: "핸드폰케이스" },
  { id: 3, name: "그립톡" },
  { id: 4, name: "카드 지갑" },
  { id: 5, name: "머그컵" },
];

const PAGE_SIZE = 8;

export default function BrowsePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedGoods, setSelectedGoods] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isGoodsDataLoading,
    error: goodsDataError,
  } = useInfiniteQuery({
    queryKey: ["goodsData", selectedCategory],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await selectGoodsData(
        selectedCategory === 0 ? null : selectedCategory,
        pageParam,
        PAGE_SIZE,
      );
      return response;
    },
    refetchOnMount: "always",
    getNextPageParam: (lastPage, allPages) => {
      // 응답 배열의 길이가 PAGE_SIZE보다 작으면 마지막 페이지
      if (lastPage.length < PAGE_SIZE) {
        return undefined;
      }
      // 다음 페이지 번호 반환
      return allPages.length;
    },
    initialPageParam: 0,
  });

  // 모든 페이지의 데이터를 하나의 배열로 합치기
  const goodsData = data?.pages.flat() ?? [];

  // 굿즈 상세 조회 mutation
  const goodsDetailMutation = useMutation({
    mutationFn: async (requestBody) => {
      const response = await selectGoodsDetail(requestBody.goodsId);
      return response;
    },
    onSuccess: (data) => {
      setSelectedGoods(data);
    },
  });

  // 굿즈 클릭시 굿즈 상세 조회
  const handleGoodsClick = (goods) => {
    setSelectedGoods(goods);
    setIsModalOpen(true);
    goodsDetailMutation.mutate({ goodsId: goods.goodsId });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGoods(null);
  };

  const handleCustomizeGoods = () => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }
    navigate("/create", { state: { goodsDetail: selectedGoods } });
    handleCloseModal();
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  // 스크롤을 마지막까지 내릴 시 다음 페이지 로드
  useEffect(() => {
    const handleScroll = () => {
      if (isFetchingNextPage || !hasNextPage) return;

      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100
      ) {
        fetchNextPage();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="bg-[#f5f3f0] min-h-screen pb-16">
      <div className="max-w-[1440px] mx-auto px-8">
        {/* 제목 섹션 */}
        <div className="text-center pt-24 pb-8">
          <h1 className="text-[28px] font-normal text-[#2d2520] leading-[54px] mb-4">
            지금 인기굿즈 만나보세요
          </h1>
          <p className="text-[16px] text-[#4a5565] leading-[30px]">
            다른 고객님들이 만든 다양한 AI 굿즈들을 확인해보세요
          </p>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`h-[38.484px] px-4 rounded-[10px] text-[15px] font-normal leading-[22.5px] transition-colors ${
                selectedCategory === category.id
                  ? "bg-[#b89a7c] text-white"
                  : "bg-white border border-[#99a1af] text-[#364153] hover:bg-gray-50"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* 굿즈 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {goodsData.map((good) => (
            <div
              key={good.goodsId}
              onClick={() => handleGoodsClick(good)}
              className="bg-white border border-[#f5f0eb] rounded-[16px] overflow-hidden shadow-sm hover:shadow-md transition-shadow relative cursor-pointer"
            >
              {/* 이미지 */}
              <div className="relative w-full h-[367px] bg-gray-100">
                <img
                  src={getImageUrl(good.goodsUrl)}
                  alt={`굿즈 이미지`}
                  className="w-full h-full object-cover"
                />
                {/* 조회수 배지 */}
                <div className="absolute top-3 left-3 bg-[rgba(255,255,255,0.9)] rounded-[10px] px-3 py-1.5 flex items-center gap-1.5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-[#4a5565]"
                  >
                    <path
                      d="M8 2.667C5.333 2.667 3.067 4.267 2.133 6.667c0.933 2.4 3.2 4 5.867 4s4.933-1.6 5.867-4c-0.933-2.4-3.2-4-5.867-4zm0 6.666c-1.467 0-2.667-1.2-2.667-2.666S6.533 3 8 3s2.667 1.2 2.667 2.667S9.467 9.333 8 9.333z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="text-[13px] text-[#4a5565] font-normal">
                    {good.viewCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 굿즈 상세 모달 */}
        {isModalOpen && selectedGoods && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-[16px] shadow-lg w-[900px] max-w-[90vw] max-h-[90vh] overflow-hidden relative flex">
              {/* 닫기 버튼 */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors z-10 bg-white rounded-full cursor-pointer"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>

              {/* 왼쪽: 굿즈 이미지 */}
              <div className="w-1/2 bg-gray-100 flex-shrink-0 relative">
                <img
                  src={getImageUrl(selectedGoods.goodsUrl)}
                  alt={selectedGoods.categoryKoreanName}
                  className="w-full h-full object-cover"
                />
                {/* 조회수 배지 */}
                <div className="absolute top-3 left-3 bg-[rgba(255,255,255,0.9)] rounded-[10px] px-3 py-1.5 flex items-center gap-1.5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-[#4a5565]"
                  >
                    <path
                      d="M8 2.667C5.333 2.667 3.067 4.267 2.133 6.667c0.933 2.4 3.2 4 5.867 4s4.933-1.6 5.867-4c-0.933-2.4-3.2-4-5.867-4zm0 6.666c-1.467 0-2.667-1.2-2.667-2.666S6.533 3 8 3s2.667 1.2 2.667 2.667S9.467 9.333 8 9.333z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="text-[13px] text-[#4a5565] font-normal">
                    {selectedGoods.viewCount}
                  </span>
                </div>
              </div>

              {/* 오른쪽: 굿즈 정보 */}
              <div className="w-1/2 p-6 overflow-y-auto">
                {/* 카테고리 */}
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-[#f5f3f0] rounded-[6px] text-[14px] text-[#364153]">
                    {selectedGoods.categoryKoreanName}
                  </span>
                </div>

                {/* 제작자 및 제작일 */}
                <div className="mb-4 text-[14px] text-[#6a7282]">
                  <div className="mb-1">
                    제작자: {selectedGoods.creatorNickname}
                  </div>
                  <div>제작일: {selectedGoods.createdAt}</div>
                </div>

                {/* 옵션 정보 */}

                <div className="mb-4">
                  <h3 className="text-[16px] font-semibold text-[#0a0a0a] mb-2">
                    옵션
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {selectedGoods.goodsStyle && (
                      <span className="px-3 py-1 bg-[#f5f3f0] rounded-[6px] text-[14px] text-[#364153]">
                        {selectedGoods.goodsStyle}
                      </span>
                    )}
                    {selectedGoods.goodsTone && (
                      <span className="px-3 py-1 bg-[#f5f3f0] rounded-[6px] text-[14px] text-[#364153]">
                        {selectedGoods.goodsTone}
                      </span>
                    )}
                    {selectedGoods.goodsMood && (
                      <span className="px-3 py-1 bg-[#f5f3f0] rounded-[6px] text-[14px] text-[#364153]">
                        {selectedGoods.goodsMood}
                      </span>
                    )}
                  </div>
                </div>

                {/* 프롬프트 */}
                <div className="mb-6">
                  <h3 className="text-[16px] font-semibold text-[#0a0a0a] mb-2">
                    프롬프트
                  </h3>
                  <p className="text-[14px] text-[#364153] bg-[#f5f3f0] rounded-[8px] p-3">
                    {selectedGoods.prompt}
                  </p>
                </div>

                {/* 굿즈 커스텀하기 버튼 */}
                <button
                  onClick={handleCustomizeGoods}
                  className="w-full bg-[#b89a7c] text-white py-3 rounded-[10px] text-[14px] font-semibold hover:bg-[#a68a6c] transition-colors cursor-pointer"
                >
                  굿즈 커스텀하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 결과가 없을 때 */}
        {goodsData.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[16px] text-[#4a5565]">
              선택한 카테고리에 해당하는 굿즈가 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
