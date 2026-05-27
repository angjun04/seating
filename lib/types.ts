export type Gender = "M" | "F";
export const GENDERS: Gender[] = ["M", "F"];
export const GENDER_LABEL: Record<Gender, string> = { M: "남", F: "여" };

export type Level = "상" | "중" | "하";
export const LEVELS: Level[] = ["상", "중", "하"];

// Which student attribute the arrangement uses for group balancing and the
// "하-하 짝꿍 회피" rule. `level` = 성적, `behavior` = 생활태도.
export type StudentMetric = "level" | "behavior";
export const STUDENT_METRIC_LABEL: Record<StudentMetric, string> = {
  level: "성적",
  behavior: "생활태도",
};

export type Student = {
  id: string;
  name: string;
  gender: Gender;
  level: Level; // 성적
  // 생활태도. Optional for students persisted before this field existed;
  // the store migration backfills "중".
  behavior?: Level;
};

export type CellType = "desk" | "empty";

export type Layout = {
  rows: number;
  cols: number;
  // row-major flattened cells; length === rows*cols
  cells: CellType[];
  // Parallel to cells; 0 = no group, 1..numGroups = group id.
  // Optional for layouts persisted before this feature existed.
  groups?: number[];
  numGroups?: number;
};

export type IncompatiblePair = [string, string];

export type Arrangement = {
  // seatIndex (row * cols + col) -> studentId
  seats: Record<number, string>;
  createdAt: number;
};

export type ConfirmedArrangement = {
  seats: Record<number, string>;
  confirmedAt: number;
};

export type SeatmatePolicy = "opposite" | "same" | "random";
export const SEATMATE_POLICIES: SeatmatePolicy[] = [
  "opposite",
  "same",
  "random",
];
export const SEATMATE_POLICY_LABEL: Record<SeatmatePolicy, string> = {
  opposite: "이성 짝꿍",
  same: "동성 짝꿍",
  random: "랜덤",
};

// seatIndex (row * cols + col) -> studentId that must sit there.
export type PinnedSeats = Record<number, string>;

export type SeatingState = {
  layout: Layout | null;
  students: Student[];
  frontPriorityIds: string[];
  // 맨 뒷자리 우선 학생 (키 큰 학생이 시야를 가리지 않도록).
  backPriorityIds: string[];
  incompatiblePairs: IncompatiblePair[];
  // 미리 자리를 지정해 둔 학생 (문제행동 학생 등).
  pinnedSeats: PinnedSeats;
  current: Arrangement | null;
  confirmed: ConfirmedArrangement | null;
  history: Arrangement[];
  seatmatePolicy: SeatmatePolicy;
  // 어떤 지표를 입력/표시할지. 최소 하나는 true.
  useLevel: boolean;
  useBehavior: boolean;
  // 모둠 균형·하-하 회피에 사용할 기준 지표 (useLevel/useBehavior 중 켜진 것).
  balanceMetric: StudentMetric;
  // 기준 '하' 학생끼리 짝꿍이 되지 않게 한다.
  avoidLowLowSeatmates: boolean;
  // 배치 생성 시 카운트다운 효과음 재생 여부.
  soundEnabled: boolean;
};
