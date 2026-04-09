import { getBaseUrl } from "../stores/apiStore";

/**
 * 이미지 URL이 로컬 경로(/images/...)인 경우 백엔드 베이스 URL을 붙여줍니다.
 * (로컬 저장소 전환 대응 - Storage Refactoring)
 * @param {string} url 이미지 URL
 * @returns {string} 보정된 이미지 URL
 */
export const getImageUrl = (url) => {
  if (!url) return "";

  // 이미 풀 URL(http...)이거나 blob URL인 경우 그대로 반환
  if (url.startsWith("http") || url.startsWith("blob:")) {
    return url;
  }

  // /images/로 시작하는 로컬 경로인 경우 백엔드 URL을 붙임
  if (url.startsWith("/images/")) {
    return `${getBaseUrl()}${url}`;
  }

  return url;
};
