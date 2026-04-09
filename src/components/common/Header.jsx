import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import defaultProfileIcon from "../../assets/img/defaultProfileIcon.png";
import { logout } from "../../services/authService";
import { useAuthStore } from "../../stores/authStore";
import { getImageUrl } from "../../utils/pathUtils";

export default function Header() {
  const navigate = useNavigate();
  const { user, setUser, clearAuth } = useAuthStore();
  const hasProcessed = useRef(false);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    // 상태 초기화
    clearAuth();
    hasProcessed.current = false;

    try {
      // 로그아웃 API 호출 (쿠키 삭제)
      await logout();
    } catch (error) {
      console.error("로그아웃 처리 중 오류:", error);
    }

    navigate("/login");
  };

  const handleGoCreatePage = () => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }
    navigate("/create");
  };

  const handleProfileClick = () => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const handleGoMyGoodsPage = () => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }
    navigate("/mygoods");
  };

  const handleGoSubscribePage = () => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }
    navigate("/subscribe");
  };

  const handleMyPage = () => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }
    setIsProfileMenuOpen(false);
    navigate("/mypage");
  };

  return (
    <header className="bg-white border-b border-[#e5e7eb] h-14 w-full relative z-50">
      <div className="h-full flex items-center justify-between px-4 md:px-8 max-w-[1440px] mx-auto">
        {/* 왼쪽: 로고 + 네비 */}
        <div className="flex items-center gap-8">
          {/* 로고 */}
          <p
            onClick={() => navigate("/")}
            className="text-[18px] md:text-[20px] text-[#4a3f35] font-normal leading-[28px] cursor-pointer"
          >
            🐾 GenieGoods
          </p>

          {/* 네비게이션 메뉴 (태블릿 이상 가로 유지) */}
          <div className="flex flex-row items-center gap-4">
            <button
              onClick={handleGoCreatePage}
              className="h-[37px] px-4 rounded-[10px] hover:bg-gray-200 cursor-pointer transition-colors"
            >
              <span className="text-[14px] text-[#4a5565] whitespace-nowrap">
                굿즈 만들기
              </span>
            </button>

            <button
              onClick={() => navigate("/browse")}
              className="h-[37px] px-4 rounded-[10px] hover:bg-gray-200 cursor-pointer transition-colors"
            >
              <span className="text-[14px] text-[#4a5565] whitespace-nowrap">
                굿즈 둘러보기
              </span>
            </button>

            <button
              onClick={handleGoMyGoodsPage}
              className="h-[37px] px-4 rounded-[10px] hover:bg-gray-200 cursor-pointer transition-colors"
            >
              <span className="text-[14px] text-[#4a5565] whitespace-nowrap">
                내가 생성한 굿즈
              </span>
            </button>

            <button
              onClick={handleGoSubscribePage}
              className="h-[37px] px-4 rounded-[10px] hover:bg-gray-200 cursor-pointer transition-colors"
            >
              <span className="text-[14px] text-[#4a5565] whitespace-nowrap">
                구독하기
              </span>
            </button>
          </div>
        </div>

        {/* 오른쪽: 사용자 정보 */}
        {user ? (
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3">
              {/* 프로필 이미지 또는 이니셜 */}
              <div className="relative">
                <img
                  src={getImageUrl(user.profileUrl ? user.profileUrl : defaultProfileIcon)}
                  alt={user.nickname || "default"}
                  className="rounded-full w-9 h-9 object-cover shadow-md cursor-pointer"
                  onClick={handleProfileClick}
                />
                {/* 프로필 메뉴 창 */}
                {isProfileMenuOpen && (
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* 닫기 버튼 */}
                    <button
                      className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 z-10 cursor-pointer"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>

                    {/* 프로필 헤더 섹션 */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 pt-6 pb-4 px-4">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <img
                            src={getImageUrl(
                              user.profileUrl
                                ? user.profileUrl
                                : defaultProfileIcon,
                            )}
                            alt={user.nickname || "default"}
                            className="rounded-full w-16 h-16 object-cover shadow-lg ring-2 ring-white"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-[16px] font-semibold text-gray-800">
                            {user?.nickname}님 안녕하세요!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 메뉴 아이템 섹션 */}
                    <div className="py-2 px-2">
                      <button
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-[14px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group cursor-pointer"
                        onClick={handleMyPage}
                      >
                        <span className="font-medium">내 정보</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 닉네임 */}
              <span className="text-[16px] text-black">{user?.nickname}님</span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-white border border-[#e2e8f0] h-[38.6px] px-4 rounded-[10px] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="text-[14px] text-[#6b6560]">로그아웃</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="hidden md:block bg-white border border-[#e2e8f0] h-[38.6px] px-4 rounded-[10px] hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span className="text-[14px] text-[#6b6560]">로그인</span>
          </button>
        )}
      </div>
    </header>
  );
}
