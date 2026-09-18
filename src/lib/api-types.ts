export type ReservationResult =
  | { status: "created"; reservationId: string }
  | { status: "duplicate"; reservationId: string | null };

export type EarlyAccessResult = { status: "created" | "existing"; email: string };
