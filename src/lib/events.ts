import { TimerState, type LogEvent, type Timer } from "./structs";

enum ReplayErrorTypes {
    UnInitialized = "state is uninitialized",
    WasNotPlaying = "the timer was not playing",
    InvalidLog = "invalid log sequence"
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
    switch (log.state) {
        case TimerState.Initial:
            state.configIndex = 0
            state.config = log.config
            state.duration = state.config[state.configIndex].duration
            state.currentSecondsLeft = state.duration
            state.state = TimerState.Initial
            break

        case TimerState.Playing:
            checkUninitialized(state)
            state.state = TimerState.Playing
            break

        case TimerState.Paused:
            checkUninitialized(state)
            if (state.state != TimerState.Playing) {
                throw new ReplayError(ReplayErrorTypes.WasNotPlaying)
            }
            state.currentSecondsLeft = log.currenSecondsLeft
            state.state = TimerState.Paused
            break

        case TimerState.NextPeriod:
            checkUninitialized(state)
            state.configIndex = (state.configIndex + 1) % state.config.length
            state.duration = state.config[state.configIndex].duration
            state.currentSecondsLeft = state.duration
            break

        case TimerState.RepeatForever:
            checkUninitialized(state)
            state.repeatForever = true
            break
        
        case TimerState.DontRepeatForever:
            checkUninitialized(state)
            state.repeatForever = false
        
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
    if (finalLog.state == TimerState.Playing) {
        // If the timer is still playing, check how many seconds have elapsed since the start.
        // If the time elapsed is more than the duration of the timer, the timer is done.
        // It's up to the browser to change over to the next config.
        state.currentSecondsLeft = Math.max(finalLog.currenSecondsLeft - (serverTimestamp - finalLog.realTimestamp), 0);
    }


    return state;
}
