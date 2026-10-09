import { Schedule } from '@/api/server/schedules/getServerSchedules';

export interface ServerScheduleState {
    data: Schedule[];
}

export interface ServerScheduleActions {
    setSchedules: (payload: Schedule[]) => void;
    appendSchedule: (payload: Schedule) => void;
    removeSchedule: (payload: number) => void;
}

export type ServerScheduleStore = ServerScheduleState & ServerScheduleActions;

export const createSchedulesSlice = (set: (fn: (state: any) => any) => void): ServerScheduleStore => ({
    data: [],

    setSchedules: (payload) =>
        set((state) => ({
            schedules: {
                ...state.schedules,
                data: payload,
            },
        })),

    appendSchedule: (payload) =>
        set((state) => {
            const exists = state.schedules.data.some((sched: Schedule) => sched.id === payload.id);
            const updated = exists
                ? state.schedules.data.map((sched: Schedule) => (sched.id === payload.id ? payload : sched))
                : [...state.schedules.data, payload];

            return {
                schedules: {
                    ...state.schedules,
                    data: updated,
                },
            };
        }),

    removeSchedule: (payload) =>
        set((state) => ({
            schedules: {
                ...state.schedules,
                data: state.schedules.data.filter((sched: Schedule) => sched.id !== payload),
            },
        })),
});

export default createSchedulesSlice;
