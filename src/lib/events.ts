import sqlite3 from "better-sqlite3";
import { TimerState, type LogEvent, type Timer } from "$lib/structs";

function setupDB(): sqlite3.Database {
    let db = new sqlite3("../local.sqlite3");
    db.pragma("journal_mode=WAL");
    db.exec("CREATE TABLE IF NOT EXISTS log (token text, log JSONB, timestamp INTEGER DEFAULT CURRENT_TIMESTAMP);")
    db.exec("CREATE INDEX IF NOT EXISTS token_index ON log(token);")
    db.exec("CREATE INDEX IF NOT EXISTS timestamp_index ON log(timestamp);")
    return db;
}

export function insertLog(token: string, log: LogEvent) {
    try {
        let db = setupDB();
        db.prepare("INSERT INTO log(log, token, timestamp) VALUES(?,?,?)").run(JSON.stringify(log), token, Date.now());
    } catch (e) {
        console.log(e)
    }
}

enum ReplayErrorTypes {
    UnInitialized = "state is uninitialized",
    WasNotPlaying = "the timer was not playing",
    InvalidLog = "invalid log sequence"
}

export class ReplayError extends Error {
}


export function ReplayLog(logs: LogEvent[], serverTimestamp: number): Timer {
    // TODO replay through the logs
    let state: Timer = {
        state: TimerState.Uninitialized,
        duration: 0,
        repeatForever: false,
        currentSecondsLeft: 0,
        log: [],
    }

    const checkUninitialized = (state: Timer) => {
        if (state.state == TimerState.Uninitialized) {
            throw new ReplayError(ReplayErrorTypes.UnInitialized)
        }
    }

    // TODO the loop needs to start from the latest initialization / config changeover

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i]
        switch (log.state) {
            case TimerState.Initial:
                state.duration = log.config[0].duration;
                state.currentSecondsLeft = state.duration;
                state.repeatForever = false;
                state.state = TimerState.Initial;
                break;

            case TimerState.Playing:
                checkUninitialized(state)
                state.state = TimerState.Playing;
                // state.currentSecondsLeft = Math.max(logs[i].currenSecondsLeft - (serverTimestamp - logs[i].realTimestamp), 0)
                break;

            case TimerState.Paused:
                checkUninitialized(state)
                if (i == 0 || logs[i-1].state != TimerState.Playing) {
                    throw new ReplayError(ReplayErrorTypes.WasNotPlaying)
                }
                state.currentSecondsLeft = log.currenSecondsLeft
                state.state = TimerState.Paused;
                break;

            case TimerState.NextPeriod:
                checkUninitialized(state)
                // TODO switch to next period
                break;
            
            case TimerState.RepeatForever:
                checkUninitialized(state)
                state.repeatForever = true;
                break;

            case TimerState.DontRepeatForever:
                checkUninitialized(state)
                state.repeatForever = false;
                break;
            
            default:
                throw new ReplayError(ReplayErrorTypes.InvalidLog)
        }
        state.log = [logs[i], ...state.log]
    }

    const finalLog = logs[logs.length - 1]
    if (finalLog.state == TimerState.Playing) {
        state.currentSecondsLeft = Math.max(finalLog.currenSecondsLeft - (serverTimestamp - finalLog.realTimestamp), 0);
    }


    return state;
}
