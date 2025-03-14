import { LogAction, TimerState, type LogEvent } from "./structs";
import { ReplayErrorTypes, ReplayLog } from "./events";

// Log Replay Tests

test('LogReplay.IsInitialized', function IsInitialized() {
    const serverTimestamp = 0;
    const events: LogEvent[] = [
        {
            action: LogAction.Play,
            currenSecondsLeft: 5,
            realTimestamp: 0
        }
    ]

    expect(() => ReplayLog(events, serverTimestamp)).toThrow(ReplayErrorTypes.UnInitialized)
})

test('LogReplay.ConfigNonEmpty', function ConfigNonEmpty() {
    const serverTimestamp = 0;
    const events: LogEvent[] = [
        {
            config: [
            ],
            action: LogAction.Initialize,
            realTimestamp: 0
        }
    ]
    expect(() => ReplayLog(events, serverTimestamp)).toThrow(ReplayErrorTypes.EmptyConfig)
})

test('LogReplay.InitialTransitionsToSteady', () => {
    const serverTimestamp = 1;
    const  events: LogEvent[] = [
        {
            action: LogAction.Initialize,
            realTimestamp: 0,
            config: [
                {
                    name: "Period 1",
                    duration: 5,
                }
            ]
        }
    ]
    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.state).toBe(TimerState.Steady)
})

test('LogReplay.Playing.TimeLeftIsUpdated1', function TimeLeftIsUpdated1() {
    const serverTimestamp = 4;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            action: LogAction.Initialize,
            realTimestamp: 0
        },
        {
            action: LogAction.Play,
            currenSecondsLeft: 5,
            realTimestamp: 1
        }
    ]
    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.currentSecondsLeft).toBe(2);
})

test('LogReplay.Playing.TimeLeftIsUpdated2', function TimeLeftIsUpdated2() {
    const serverTimestamp = 6;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            action: LogAction.Initialize,
            realTimestamp: 0
        },
        {
            action: LogAction.Play,
            currenSecondsLeft: 5,
            realTimestamp: 1
        }
    ]
    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.currentSecondsLeft).toBe(0);
})

test('LogReplay.Resuming.TimeLeftIsUpdated1', function TimeLeftIsUpdated1() {
    const serverTimestamp = 7;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            action: LogAction.Initialize,
            realTimestamp: 0
        },
        {
            action: LogAction.Play,
            currenSecondsLeft: 5,
            realTimestamp: 1
        },
        {
            action: LogAction.Pause,
            currenSecondsLeft: 4,
            realTimestamp: 2
        },
        {
            action: LogAction.Play,
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
            action: LogAction.Initialize,
            realTimestamp: 0
        },
        {
            action: LogAction.Play,
            currenSecondsLeft: 5,
            realTimestamp: 1
        },
        {
            action: LogAction.Pause,
            currenSecondsLeft: 4,
            realTimestamp: 2
        },
        {
            action: LogAction.Play,
            currenSecondsLeft: 4,
            realTimestamp: 5
        }
    ]

    for (let serverTimestamp = 7; serverTimestamp <= 10; serverTimestamp++) {
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

test('LogReplay.Playing.TimeLeftIsUpdated3', function TimeLeftIsUpdated3() {
    const serverTimestamp = 7;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            action: LogAction.Initialize,
            realTimestamp: 0
        },
        {
            action: LogAction.Play,
            currenSecondsLeft: 5,
            realTimestamp: 1
        }
    ]
    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.currentSecondsLeft).toBe(0);
})

test('LogReplay.Paused.TimeLeftIsNotUpdated1', function TimeLeftIsNotUpdated1() {
    const serverTimestamp = 7;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            action: LogAction.Initialize,
            realTimestamp: 0
        },
        {
            action: LogAction.Play,
            currenSecondsLeft: 5,
            realTimestamp: 1
        },
        {
            action: LogAction.Pause,
            currenSecondsLeft: 4,
            realTimestamp: 2
        }
    ]
    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.currentSecondsLeft).toBe(4);
})

test('LogReplay.Paused.TimeLeftIsNotUpdated2', function TimeLeftIsNotUpdated2() {
    const serverTimestamp = 6;
    const events: LogEvent[] = [
        {
            config: [
                {
                    name: "period 1",
                    duration: 5
                },
            ],
            action: LogAction.Initialize,
            realTimestamp: 0
        },
        {
            action: LogAction.Play,
            currenSecondsLeft: 5,
            realTimestamp: 1
        },
        {
            action: LogAction.Pause,
            currenSecondsLeft: 4,
            realTimestamp: 2
        }
    ]
    const timer = ReplayLog(events, serverTimestamp)
    expect(timer.currentSecondsLeft).toBe(4);
})

/** Peculiarity: the client is expected to start playing the next period. 
 * If the configIndex is lesser than the length of the index, this is supposed to happen automatically.
 * If the configIndex is at the end, repeatForever must be enabled to go back to the beginning.
*/
test('LogReplay.ChangeOver1', function ChangeOver1() {
    const config = [
        {
            name: "a",
            duration: 5
        },
        {
            name: "b",
            duration: 6
        }
    ]
    
    const eventSet1: LogEvent[] = [
        {
            config: config,
            action: LogAction.Initialize,
            realTimestamp: 0
        },
        {
            action: LogAction.Play,
            realTimestamp: 1,
            currenSecondsLeft: 5
        },
        {
            action: LogAction.NextPeriod,
            realTimestamp: 6,
            configIndex: 1,
        },
    ]

    const eventSet2: LogEvent[] = [
        {
            config: config,
            action: LogAction.Initialize,
            realTimestamp: 0
        },
        {
            action: LogAction.Play,
            realTimestamp: 1,
            currenSecondsLeft: 5
        },
        {
            action: LogAction.NextPeriod,
            realTimestamp: 6,
            configIndex: 1,
        },
        {
            action: LogAction.Play,
            realTimestamp: 6,
            currenSecondsLeft: 5
        },
        {
            action: LogAction.NextPeriod,
            realTimestamp: 11,
            configIndex: 0
        }
    ]

    const serverTimestamp = 7
    const timer = ReplayLog(eventSet1, serverTimestamp)
    expect(timer.configIndex).toBe(1)
    expect(timer.config[timer.configIndex].name).toBe("b")
    expect(timer.currentSecondsLeft).toBe(config[1].duration)
    expect(timer.state).toBe(TimerState.Steady)

    const timer2 = ReplayLog(eventSet2, serverTimestamp)
    expect(timer2.configIndex).toBe(0)
    expect(timer2.config[timer2.configIndex].name).toBe("a")
    expect(timer2.currentSecondsLeft).toBe(config[0].duration)
    expect(timer2.state).toBe(TimerState.Steady)
})

// TODO add tests for log compaction / skipping
test('LogReplay.SkipLogs', () => { })
