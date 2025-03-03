import { TimerState, type LogEvent } from "$lib/structs";
import { ReplayError, ReplayLog } from "./events";

// Log Replay Tests

test('LogReplay.IsInitialized', () => {
    const serverTimestamp = 0;
    const events: LogEvent[] = [
        {
            state: TimerState.Playing,
            currenSecondsLeft: 5,
            realTimestamp: 0
        }
    ]

    expect(() => ReplayLog(events, serverTimestamp)).toThrow(ReplayError)
})

test('LogReplay.Playing.TimeLeftIsUpdated1', () => {
    const serverTimestamp = 4;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            state: TimerState.Initial,
            realTimestamp: 0
        },
        {
            state: TimerState.Playing,
            currenSecondsLeft: 5,
            realTimestamp: 1
        }
    ]
    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.currentSecondsLeft).toBe(2);
})

test('LogReplay.Playing.TimeLeftIsUpdated2', () => {
    const serverTimestamp = 6;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            state: TimerState.Initial,
            realTimestamp: 0
        },
        {
            state: TimerState.Playing,
            currenSecondsLeft: 5,
            realTimestamp: 1
        }
    ]
    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.currentSecondsLeft).toBe(0);
})

test('LogReplay.Resuming.TimeLeftIsUpdated1', () => {
    const serverTimestamp = 7;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            state: TimerState.Initial,
            realTimestamp: 0
        },
        {
            state: TimerState.Playing,
            currenSecondsLeft: 5,
            realTimestamp: 1
        },
        {
            state: TimerState.Paused,
            currenSecondsLeft: 4,
            realTimestamp: 2
        },
        {
            state:TimerState.Playing,
            currenSecondsLeft: 4,
            realTimestamp: 5
        }
    ]

    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.currentSecondsLeft).toBe(2)
})

test('LogReplay.Resuming.TimeLeftIsUpdated1', () => {
    const serverTimestamp = 7;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            state: TimerState.Initial,
            realTimestamp: 0
        },
        {
            state: TimerState.Playing,
            currenSecondsLeft: 5,
            realTimestamp: 1
        },
        {
            state: TimerState.Paused,
            currenSecondsLeft: 4,
            realTimestamp: 2
        },
        {
            state:TimerState.Playing,
            currenSecondsLeft: 4,
            realTimestamp: 5
        }
    ]

    for (let serverTimestamp = 7; serverTimestamp <= 10; serverTimestamp ++) {
        const timer = ReplayLog(events, serverTimestamp)
        if (serverTimestamp == 7) {
            expect(timer.currentSecondsLeft).toBe(2);
        } else if (serverTimestamp == 8) {
            expect(timer.currentSecondsLeft).toBe(1);
        } else {
            expect(timer.currentSecondsLeft).toBe(0);
        }
    }
})

test('LogReplay.Playing.TimeLeftIsUpdated3', () => {
    const serverTimestamp = 7;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            state: TimerState.Initial,
            realTimestamp: 0
        },
        {
            state: TimerState.Playing,
            currenSecondsLeft: 5,
            realTimestamp: 1
        }
    ]
    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.currentSecondsLeft).toBe(0);
})

test('LogReplay.Paused.TimeLeftIsNotUpdated1', () => {
    const serverTimestamp = 7;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            state: TimerState.Initial,
            realTimestamp: 0
        },
        {
            state: TimerState.Playing,
            currenSecondsLeft: 5,
            realTimestamp: 1
        },
        {
            state: TimerState.Paused,
            currenSecondsLeft: 4,
            realTimestamp: 2
        }
    ]
    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.currentSecondsLeft).toBe(4);
})

test('LogReplay.Paused.TimeLeftIsNotUpdated2', () => {
    const serverTimestamp = 6;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            state: TimerState.Initial,
            realTimestamp: 0
        },
        {
            state: TimerState.Playing,
            currenSecondsLeft: 5,
            realTimestamp: 1
        },
        {
            state: TimerState.Paused,
            currenSecondsLeft: 4,
            realTimestamp: 2
        }
    ]
    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.currentSecondsLeft).toBe(4);
})
