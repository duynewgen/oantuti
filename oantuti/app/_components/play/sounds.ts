export const SESSION_KEY = "oantuti-character-poses";

export const SOUND_WIN = "https://www.myinstants.com/media/sounds/siuuuuu.mp3";
export const SOUND_LOSE =
  "https://www.myinstants.com/media/sounds/fahhhhhhhhhhhhhh.mp3";
export const SOUND_DRAW =
  "https://www.myinstants.com/media/sounds/aww-sound-effect_OII2eTh.mp3";

export function playSound(url: string) {
  try {
    const audio = new Audio(url);
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {
    // Ignore audio errors
  }
}
