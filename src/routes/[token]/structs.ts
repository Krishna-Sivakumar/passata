export enum TimerState {
    Uninitialized = "Uninitialized",
    Initial = "Initial",
    Playing = "Playing",
    Paused = "Paused",
}

export type Log = {
    state: TimerState,
    realTimestamp: number,
}

/*
    initialize this type with variables wrapped in $state()
*/
export type Timer = {
    state: TimerState,
    duration: number,
    repeatForever: boolean,
    currentSecondsLeft: number,
    log: Log[],
}
