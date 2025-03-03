export enum TimerState {
    Uninitialized = "Uninitialized",
    Initial = "Initial",
    Playing = "Playing",
    Paused = "Paused",
    NextPeriod = "Next Period",
    RepeatForever = "Repeat Forever",
    DontRepeatForever = "Don't Repeat Forever"
}

export type TimerConfig = {
    name: string,
    duration: number
}

type LogEventInitial = {
    state: TimerState.Initial,
    realTimestamp: number,
    config: TimerConfig[]
}

type GenericLogEvent = {
    state: TimerState.Uninitialized | TimerState.Playing | TimerState.Paused | TimerState.NextPeriod | TimerState.RepeatForever | TimerState.DontRepeatForever,
    currenSecondsLeft: number,
    realTimestamp: number,
}

export type LogEvent = GenericLogEvent | LogEventInitial

export type TimestampedLogs = {
    responseTimestamp: number,
    logs: LogEvent[]
}

/*
    initialize this type with variables wrapped in $state()
*/
export type Timer = {
    config: TimerConfig[],
    state: TimerState,
    duration: number,
    repeatForever: boolean,
    currentSecondsLeft: number,
    log: LogEvent[],
}
