import { LogAction, TimerState, type LogEvent, type Timer } from "./structs";

export enum ReplayErrorTypes {
    UnInitialized = "state is uninitialized",
    WasNotPlaying = "the timer was not playing",
    InvalidLog = "invalid log sequence",
    EmptyConfig = "empty config"
}

export class ReplayError extends Error {
}

const checkUninitialized = (state: Timer) => {
    if (state.state == TimerState.Uninitialized || state.config.length == 0) {
        throw new ReplayError(ReplayErrorTypes.UnInitialized)
    }
}

/**
 * Transforms a state according to an event.
 * 
 * This exists so that the client can formalize and apply events to its own timer state as well.
 * @param log the event that changes the state
 * @param state the state to be transformed
 * @returns the modified state
 */
export function PerformEvent(log: LogEvent, state: Timer): Timer {
    switch (log.action) {
        case LogAction.Initialize:
            if (log.config.length == 0) {
                throw new ReplayError(ReplayErrorTypes.EmptyConfig)
            }
            state.configIndex = 0
            state.config = log.config
            state.duration = state.config[state.configIndex].duration
            state.currentSecondsLeft = state.duration
            state.state = TimerState.Steady
            break
        
        case LogAction.Reset:
            checkUninitialized(state)
            state.configIndex = 0
            state.duration = state.config[state.configIndex].duration
            state.currentSecondsLeft = state.duration
            state.state = TimerState.Steady
            break

        case LogAction.Play:
            checkUninitialized(state)
            if (state.state != TimerState.Steady && state.state != TimerState.Paused) {
                throw new ReplayError(ReplayErrorTypes.InvalidLog)
            }
            state.state = TimerState.Playing
            break

        case LogAction.Pause:
            checkUninitialized(state)
            state.currentSecondsLeft = log.currenSecondsLeft
            state.state = TimerState.Paused
            break

        case LogAction.NextPeriod:
            checkUninitialized(state)
            state.configIndex = log.configIndex,
            state.duration = state.config[state.configIndex].duration
            state.currentSecondsLeft = state.duration
            state.state = TimerState.Steady
            break

        case LogAction.Repeat:
            checkUninitialized(state)
            state.repeatForever = true
            break
        
        case LogAction.DontRepeat:
            checkUninitialized(state)
            state.repeatForever = false
            break
        
        default:
            throw new ReplayError(ReplayErrorTypes.InvalidLog)
    }
    state.log = [log, ...state.log]
    return state
}

/**
 * Generates the current state from a series of logs. Useful for new clients joining in.
 * @param logs The trace of logs provided by the server.
 * @param serverTimestamp the current timestamp (with correction) provided by the server.
 * @returns The state produced by processing the logs.
 */
export function ReplayLog(logs: LogEvent[], serverTimestamp: number): Timer {
    let state: Timer = {
        config: [],
        configIndex: 0,
        state: TimerState.Uninitialized,
        duration: 0,
        repeatForever: false,
        currentSecondsLeft: 0,
        log: [],
    }

    // TODO the loop needs to start from the latest initialization / config changeover

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i]
        state = PerformEvent(log, state)
    }

    const finalLog = logs[logs.length - 1]
    if (finalLog.action == LogAction.Play) {
        // If the timer is still playing, check how many seconds have elapsed since the start.
        // If the time elapsed is more than the duration of the timer, the timer is done.
        // It's up to the browser to change over to the next config.
        state.currentSecondsLeft = Math.max(finalLog.currenSecondsLeft - (serverTimestamp - finalLog.realTimestamp), 0);
    }


    return state;
}
