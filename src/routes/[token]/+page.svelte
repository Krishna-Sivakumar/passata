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
                duration: 5,
                name: "",
            },
        ],
        configIndex: 0,
        state: TimerState.Initial,
        duration: 5,
        currentSecondsLeft: 5,
        repeatForever: false,
        log: [],
    });

    if (data.mode == "normal") {
        timerState.duration = 120;
        timerState.currentSecondsLeft = 120;
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
            console.log(
                "performance counter:",
                performance.now(),
                start,
                performance.now() - start,
            );
            correction = totalTime / 2;
            // gap is the server time stamp + ntp correction + how long we waited for the correction to be computed
            gap = parseInt(await response.text()) + correction - timeAtResponse; // sometimes overshoots the current time when time to receive request > response time at server locally
            console.log("correction:", correction, "gap:", gap);
        }

        if (correction == -1) {
            correct();
        }

        setInterval(correct, 5000);

        const messages = source(`/events?token=${data.token}&connectionToken=${data.connectionToken}`).select("update");
        messages.subscribe((newValues) => {
            const timeAtResponse = Date.now();
            // adding items to the log
            if (newValues.length == 0) {
                return;
            }
            let response = JSON.parse(newValues) as TimestampedLogs;

            let logArray = response.logs;
            timerState.log = [...logArray, ...timerState.log];

            // replay events in log
        });
    });

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

    //TODO separate controlling the state from sending an event.
    function pause() {
        timerState = PerformEvent(
            {
                state: TimerState.Paused,
                currenSecondsLeft: timerState.currentSecondsLeft,
                realTimestamp: Date.now(),
            },
            timerState,
        );
        if (intervalId != -1) {
            clearInterval(intervalId);
        }
        intervalId = -1;
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
        let timestamp = Date.now() + 1000 * timerState.currentSecondsLeft;
        intervalId = window.setInterval(() => {
            timerState.currentSecondsLeft = (timestamp - Date.now()) / 1000;
            if (timerState.currentSecondsLeft <= 0) {
                if (audioElement != undefined) {
                    audioElement.play();
                }
                timerState.currentSecondsLeft = 0;
                // TODO restarting the timer is coupled with sending an event. deal with this.
                if (intervalId != -1) {
                }
            }
        });
    }

    function startInterval() {
        if (timerState.state == TimerState.Playing) {
            timerState.state = TimerState.Paused;
            clearInterval(intervalId);
            intervalId = -1;
            sendEvent({
                state: timerState.state,
                currenSecondsLeft: timerState.currentSecondsLeft,
                realTimestamp: Date.now(),
            });
            return;
        } else {
            timerState.state = TimerState.Playing;
            sendEvent({
                state: timerState.state,
                currenSecondsLeft: timerState.currentSecondsLeft,
                realTimestamp: Date.now(),
            });
        }

        // isPaused = !isPaused;
        if (intervalId != -1) {
            return;
        }
        let timestamp = Date.now() + 1000 * timerState.currentSecondsLeft;
        timerState.currentSecondsLeft = (timestamp - Date.now()) / 1000;
        intervalId = window.setInterval(() => {
            timerState.currentSecondsLeft = (timestamp - Date.now()) / 1000;
            if (timerState.currentSecondsLeft <= 0) {
                if (audioElement != undefined) {
                    audioElement.play();
                }
                timerState.currentSecondsLeft = 0;
                if (intervalId != -1) {
                    resetTimer();

                    if (timerState.repeatForever) {
                        startInterval();
                    }
                }
            }
        }, 10);
    }

    function applyReset() {
        timerState.currentSecondsLeft = timerState.duration;
        timerState.state = TimerState.Initial;
        if (intervalId != -1) {
            clearInterval(intervalId);
            intervalId = -1;
        }
    }

    function resetTimer() {
        applyReset();
        sendEvent({
            state: timerState.state,
            currenSecondsLeft: timerState.currentSecondsLeft,
            realTimestamp: Date.now(),
        });
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
        onclick={startInterval}
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
