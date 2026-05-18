export type Gender = "M" | "F";
export const GENDERS: Gender[] = ["M", "F"];
export const GENDER_LABEL: Record<Gender, string> = { M: "남", F: "여" };

export type Level = "상" | "중" | "하";
export const LEVELS: Level[] = ["상", "중", "하"];

export type Student = {
  id: string;
  name: string;
  gender: Gender;
  level: Level;
};

export type CellType = "desk" | "empty";

export type Layout = {
  rows: number;
  cols: number;
  // row-major flattened cells; length === rows*cols
  cells: CellType[];
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

export type SeatingState = {
  layout: Layout | null;
  students: Student[];
  frontPriorityIds: string[];
  incompatiblePairs: IncompatiblePair[];
  current: Arrangement | null;
  confirmed: ConfirmedArrangement | null;
  history: Arrangement[];
};
