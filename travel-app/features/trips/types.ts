export type ItineraryItem = { id: string; placeId: string; order: number; visitTime?: string | null; memo?: string | null };
export type TripDay = { id: string; dayNumber: number; date: string; items: ItineraryItem[] };
export type Trip = {
  id: string;
  city: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  companion: string;
  style: string;
  status: 'planning' | 'done';
  fromGuidebookId?: string | null;
  createdAt: string;
  days: TripDay[];
};
export type NewTripInput = Pick<Trip, 'city' | 'startDate' | 'endDate' | 'companion' | 'style'>;

/** 무료 5회를 다 쓴 상태에서 새 여행을 만들려 할 때 */
export class FreeLimitError extends Error {
  constructor() {
    super('FREE_LIMIT_REACHED');
    this.name = 'FreeLimitError';
  }
}
