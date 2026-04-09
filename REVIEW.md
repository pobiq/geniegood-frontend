# Review Logs

- [2026-03-19] 이미지 경로 로컬 전환 (Storage Refactoring) - 검토 결과 및 보안 취약점 유무: 없음 - 수정 사항 요약:
  - `utils/pathUtils.js`의 `getImageUrl` 함수가 누락된 모든 컴포넌트(`SelectGoodsPage`, `MyPage`, `OrderAllListPage`, `OrderDetailPage`, `BrowsePage`, `MyGoodsPage`, `Header`)에 적용 완료.
  - 이제 백엔드의 로컬 저장소에서 제공하는 `/images/**` 경로를 프론트엔드에서 정상적으로 미리보기 할 수 있음.
