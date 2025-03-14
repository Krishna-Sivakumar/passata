export enum TimerState {
    Uninitialized = "Uninitialized",
    Initial = "Reset",
    Steady = "Steady",
    Playing = "Playing",
    Paused = "Paused",
}

export enum LogAction {
    Initialize = "Initialize",
    NextPeriod = "NextPeriod",
    Play = "Play",
    Pause = "Pause",
    Reset = "Reset",
    Repeat = "Repeat",
    DontRepeat = "Don't Repeat",
}

export type TimerConfig = {
    name: string,
    duration: number
}

export type RepeatedTimerConfig = {
    count: number,
    config: TimerConfig[]
}

type LogEventInitial = {
    action: LogAction.Initialize,
    realTimestamp: number,
    config: TimerConfig[]
}

type LogEventNextPeriod = {
    action: LogAction.NextPeriod,
    realTimestamp: number,
    configIndex: number,
}

type GenericLogEvent = {
    action: LogAction.DontRepeat | LogAction.Pause | LogAction.Play | LogAction.Repeat | LogAction.Reset,
    currenSecondsLeft: number,
    realTimestamp: number,
}

export type LogEvent = GenericLogEvent | LogEventInitial | LogEventNextPeriod

export type TimestampedLogs = {
    responseTimestamp: number,
    logs: LogEvent[]
}

/*
    initialize this type with variables wrapped in $state()
*/
export type Timer = {
    config: TimerConfig[],
    configIndex: number,
    state: TimerState,
    duration: number,
    repeatForever: boolean,
    currentSecondsLeft: number,
    log: LogEvent[],
}
