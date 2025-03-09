<script lang="ts">
    let { data }: PageProps = $props();

    import chime from "$lib/assets/chime.wav";
    import ResetIcon from "$lib/assets/ResetIcon.svelte";
    import PlayIcon from "$lib/assets/PlayIcon.svelte";
    import PauseIcon from "$lib/assets/PauseIcon.svelte";
    import type { PageProps } from "./$types";
    import {
        TimerState,
        type LogEvent,
        type Timer,
        type TimestampedLogs,
    } from "$lib/structs";
    import { PerformEvent } from "$lib/events";
    import { source } from "sveltekit-sse";
    import { onMount } from "svelte";

    let timerState: Timer = $state({
        config: [
            {
                duration: 20,
                name: "",
            },
        ],
        configIndex: 0,
        state: TimerState.Initial,
        duration: 20,
        currentSecondsLeft: 20,
        repeatForever: false,
        log: [],
    });

    // TODO if the timer is uninitialized while provided a query parameter (no logs):
    // 1. TODO initialize it with a form if it's a custom timer or a kitchen timer
    // 2. TODO intiailize it with a preset if it's a pomodoro timer
    // TODO if the timer is initialized, ignore the query parameter

    if (data.mode == "normal") {
        timerState = PerformEvent({
            config: [{
                name: "Period 1",
                duration: 120
            }],
            realTimestamp: Date.now(),
            state: TimerState.Initial
        }, timerState)
    }

    let intervalId: number = $state(-1);
    let correction = $state(-1); // NTP-Based clock correction for syncing timestamps
    let gap = $state(-1); // gap between server time and client time
    let audioElement: HTMLAudioElement;

    onMount(() => {
        async function correct() {
            const start = performance.now();
            const response = await fetch("/events", { method: "GET" });
            const timeAtResponse = Date.now();
            const totalTime = performance.now() - start;
            correction = totalTime / 2;
            // gap is the server time stamp + ntp correction + how long we waited for the correction to be computed
            gap = parseInt(await response.text()) + correction - timeAtResponse; // sometimes overshoots the current time when time to receive request > response time at server locally
            console.log("correction:", correction + "ms", "gap:", gap + "ms");
        }

        if (correction == -1) {
            correct();
        }

        // setInterval(correct, 5000);

        const messages = source(`/events?token=${data.token}&connectionToken=${data.connectionToken}`).select("update");
        messages.subscribe((newValues) => {
            const timeAtResponse = Date.now();
            // adding items to the log
            if (newValues.length == 0) {
                return;
            }
            let response = JSON.parse(newValues) as TimestampedLogs;

            let logArray = response.logs;
            // console.log(`got ${logArray.length} event(s):`, logArray)

            // replay events in log
            for (let i = logArray.length - 1; i >= 0; i --) {
                timerState = PerformEvent(logArray[i], timerState)
            }
            const finalLog = logArray[0]
            if (finalLog.state == TimerState.Playing) {
                // If the timer is still playing, check how many seconds have elapsed since the start.
                // If the time elapsed is more than the duration of the timer, the timer is done.
                // It's up to the browser to change over to the next config.
                timerState.currentSecondsLeft = Math.max(finalLog.currenSecondsLeft - (Date.now() + gap - finalLog.realTimestamp)/1000, 0);
            }
            PerformBrowserEvent();
        });
    });

    function PerformBrowserEvent() {
        // console.log(timerState.currentSecondsLeft)
        if (timerState.state == TimerState.Playing || timerState.state == TimerState.NextPeriod) {
            let timestamp = Date.now() + 1000 * timerState.currentSecondsLeft;
            intervalId = window.setInterval(() => {
                timerState.currentSecondsLeft = (timestamp - Date.now()) / 1000;
                if (timerState.currentSecondsLeft <= 0) {
                    if (audioElement != undefined) {
                        audioElement.play();
                    }
                    timerState.currentSecondsLeft = 0;
                    resetTimer(); // reset the timer when it ends
                    // if the timer can be repeated forever, start it up
                    // TODO use a move to next stage signal to reset the timer instead
                    // if repeat forever is set, reset the timer THERE.
                }
            });
        }

        if (timerState.state == TimerState.Paused || timerState.state == TimerState.Initial) {
            if (intervalId != -1) {
                clearInterval(intervalId);
            }
            intervalId = -1;
        }
    }

    async function sendEvent(event: LogEvent) {
        // TODO protect against XSS attacks on our site. Or DDOSing the API.
        // timerState.log = [...timerState.log, {realTimestamp: Date.now(), state: event.type}]
        const response = await fetch(`/events?token=${data.token}&connectionToken=${data.connectionToken}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...event }),
        });
    }

    function nextPeriod() {
        timerState = PerformEvent({
            state: TimerState.NextPeriod,
            currenSecondsLeft: timerState.currentSecondsLeft,
            realTimestamp: Date.now(),
        }, timerState)
        sendEvent(timerState.log[0])
        PerformBrowserEvent();
    }

    function pause() {
        timerState = PerformEvent(
            {
                state: TimerState.Paused,
                currenSecondsLeft: timerState.currentSecondsLeft,
                realTimestamp: Date.now(),
            },
            timerState,
        );
        sendEvent(timerState.log[0])
        PerformBrowserEvent();
    }

    function play() {
        timerState = PerformEvent(
            {
                state: TimerState.Playing,
                currenSecondsLeft: timerState.currentSecondsLeft,
                realTimestamp: Date.now(),
            },
            timerState,
        );
        sendEvent(timerState.log[0])
        PerformBrowserEvent()
    }

    function playButtonClick() {
        if (timerState.state == TimerState.Playing) {
            pause();
        } else {
            play();
        }
    }

    function resetTimer() {
        timerState = PerformEvent({
            state: TimerState.Initial,
            realTimestamp: Date.now() + gap,
            config: timerState.config
        }, timerState)

        if (intervalId != -1) {
            clearInterval(intervalId);
            intervalId = -1;
        }
        sendEvent(timerState.log[0])
        PerformBrowserEvent();
    }
</script>

<nav class="h-[10vh] flex bg-[#020202] items-center px-10">
    <a href="/" class="text-4xl text-red-500 font-bold">Passata</a>
</nav>
<timer class="h-[40vh] flex flex-col py-10 items-center gap-2 select-none">
    <p
        class="text-white font-bold text-8xl tabular-nums shadow-red-800 shadow-red"
    >
        {#if timerState.state == TimerState.Paused}
            PAUSED
        {:else}
            {timerState.currentSecondsLeft.toFixed(1)}s
        {/if}
    </p>
    <button
        class="flex gap-2 border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer"
        onclick={playButtonClick}
    >
        {#if timerState.state == TimerState.Paused || timerState.state == TimerState.Initial}
            <PlayIcon/> START
        {:else}
            <PauseIcon/> PAUSE
        {/if}
    </button>
    <button
        class="flex gap-2 border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer"
        onclick={resetTimer}><ResetIcon/>RESET</button
    >
    <div
        class="flex gap-1 text-white items-center border border-red-500 px-2 py-2 rounded"
    >
        <input
            type="checkbox"
            bind:checked={timerState.repeatForever}
            id="repeat"
        />
        <label for="repeat" class="select-none">Repeat Forever</label>
    </div>

    <audio src={chime} bind:this={audioElement}> </audio>
</timer>
<history class="flex flex-col items-center pt-4">
    <p class="capitalize text-3xl text-white font-bold select-none">Status</p>
    <div class="grid grid-cols-2 sm:w-2/5 pb-8">
        <p class="text-red-500 text-center select-none">Timestamp</p>
        <p class="text-red-500 text-center select-none">Event</p>
        {#each timerState.log as log}
            <p class="text-white text-center">
                {new Date(log.realTimestamp).toLocaleTimeString("en-US", {
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })}
            </p>
            <p class="text-white text-center">{log.state}</p>
        {/each}
    </div>
</history>

<div class="flex justify-center text-white mt-auto mb-8">
    <p>
        2025, <a
            href="https://krishna-sivakumar.github.io"
            target="_blank"
            class="underline">Krishna Sivakumar</a
        >
    </p>
</div>

<style lang="scss">
    .shadow-red {
        text-shadow: 0 0.7vh 0 var(--color-red-800);
        @media (min-width: 640px) {
            text-shadow: 0 0.5vh 0 var(--color-red-800);
        }
    }
</style>
