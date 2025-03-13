import type { TimerConfig } from "$lib/structs"
export const pomodoro: TimerConfig[] = [
    {
        name: "Work",
        duration: 25 * 60
    },
    {
        name: "Rest",
        duration: 5 * 60
    },
    {
        name: "Work",
        duration: 25 * 60
    },
    {
        name: "Rest",
        duration: 5 * 60
    },
    {
        name: "Work",
        duration: 25 * 60
    },
    {
        name: "Rest",
        duration: 5 * 60
    },
    {
        name: "Work",
        duration: 25 * 60
    },
    {
        name: "Rest",
        duration: 15 * 60
    }
]

export const generic: TimerConfig[] = [
    {
        name: "",
        duration: 600,
    }
]