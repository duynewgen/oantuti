export type Move = "rock" | "paper" | "scissors";
export type RoundResult = "win" | "lose" | "draw";
export type OpponentState = "idle" | "thinking" | "reveal";

export type Landmark = {
  x: number;
  y: number;
  z?: number;
};

export type HandResults = {
  multiHandLandmarks?: Landmark[][];
  image: CanvasImageSource;
};

export type CharacterPoses = Record<Move, string>;

declare global {
  interface Window {
    Hands?: new (config: { locateFile: (file: string) => string }) => {
      setOptions: (options: Record<string, unknown>) => void;
      onResults: (callback: (results: HandResults) => void) => void;
      send: (input: { image: HTMLVideoElement }) => Promise<void>;
    };
    Camera?: new (
      video: HTMLVideoElement,
      options: {
        onFrame: () => Promise<void>;
        width: number;
        height: number;
      },
    ) => {
      start: () => void;
      stop?: () => void;
    };
    drawConnectors?: (
      ctx: CanvasRenderingContext2D,
      landmarks: Landmark[],
      connections: unknown,
      options: { color: string; lineWidth: number },
    ) => void;
    drawLandmarks?: (
      ctx: CanvasRenderingContext2D,
      landmarks: Landmark[],
      options: { color: string; lineWidth: number },
    ) => void;
    HAND_CONNECTIONS?: unknown;
  }
}
