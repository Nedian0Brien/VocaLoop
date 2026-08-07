import { hapticError, hapticSuccess } from '../native/haptics';

/**
 * 퀴즈에서 사용하는 효과음 URL 정의
 */
const SOUND_URLS = {
  SUCCESS: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  FAIL: 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3',
  COMPLETE: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
};

/**
 * 효과음 타입별 네이티브 햅틱 매핑.
 * 네이티브가 아니면 각 함수가 즉시 no-op이라 웹 동작은 그대로다.
 */
const SOUND_HAPTICS = {
  SUCCESS: hapticSuccess,
  FAIL: hapticError,
  COMPLETE: hapticSuccess,
};

/**
 * 효과음을 재생하는 유틸리티 함수
 * @param {keyof typeof SOUND_URLS} type - 재생할 사운드 타입
 */
export const playSound = (type) => {
  SOUND_HAPTICS[type]?.();

  try {
    const audio = new Audio(SOUND_URLS[type]);
    audio.volume = 0.5; // 볼륨 조절
    audio.play().catch(error => {
      // 브라우저 정책으로 인해 자동 재생이 차단될 수 있음
      console.warn('사운드 재생 실패:', error);
    });
  } catch (error) {
    console.error('사운드 객체 생성 실패:', error);
  }
};
