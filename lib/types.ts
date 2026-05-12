export type Student = {
  id: string;
  name: string;
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

export type SeatingState = {
  layout: Layout | null;
  students: Student[];
  frontPriorityIds: string[];
  incompatiblePairs: IncompatiblePair[];
  current: Arrangement | null;
  history: Arrangement[];
};
