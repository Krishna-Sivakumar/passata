<script lang="ts">
    let { data }: PageProps = $props();

    import chime from "$lib/assets/chime.wav";
    import ResetIcon from "$lib/assets/ResetIcon.svelte";
    import PlayIcon from "$lib/assets/PlayIcon.svelte";
    import PauseIcon from "$lib/assets/PauseIcon.svelte";
    import type { PageProps } from "./$types";
    import {
        type TimerConfig,
        TimerState,
        type LogEvent,
        type Timer,
        type TimestampedLogs,
        LogAction,
    } from "$lib/structs";
    import { PerformEvent } from "$lib/events";
    import { source } from "sveltekit-sse";
    import { onMount } from "svelte";
    import Modal from "$lib/Modal.svelte";
    import CheckIcon from "$lib/assets/CheckIcon.svelte";
    import BanIcon from "$lib/assets/BanIcon.svelte";
    import RepeatIcon from "$lib/assets/RepeatIcon.svelte";
    import ShareIcon from "$lib/assets/ShareIcon.svelte";
    import { generic, pomodoro } from "./configs";
    import AddIcon from "$lib/assets/AddIcon.svelte";

    let timerState: Timer = $state({
        config: data.mode == "pomodoro" ? pomodoro : generic,
        configIndex: 0,
        state: TimerState.Initial,
        duration: 0,
        currentSecondsLeft: 0,
        repeatForever: false,
        log: [],
    });

    // TODO if the preset is pomodoro, don't show the form
    // TODO automatically start playing after the initialization

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

        const messages = source(
            `/events?token=${data.token}&connectionToken=${data.connectionToken}`,
        ).select("update");
        messages.subscribe((newValues) => {
            // adding items to the log
            if (newValues.length == 0) {
                return;
            }
            let response = JSON.parse(newValues) as TimestampedLogs;

            let logArray = response.logs;
            // console.log(`got ${logArray.length} event(s):`, logArray)

            console.log(logArray, timerState.log);

            // replay events in log
            for (let i = logArray.length - 1; i >= 0; i--) {
                try {
                    timerState = PerformEvent(logArray[i], timerState);
                } catch (e) {
                    console.log(e)
                }
            }

            if (logArray.length > 0) {
                const finalLog = logArray[0];
                // TODO Treat a NextPeriod event in the same way
                if (finalLog.action == LogAction.Play) {
                    // If the timer is still playing, check how many seconds have elapsed since the start.
                    // If the time elapsed is more than the duration of the timer, the timer is done.
                    // It's up to the browser to change over to the next config.
                    timerState.currentSecondsLeft = Math.max(
                        finalLog.currenSecondsLeft -
                            (Date.now() + gap - finalLog.realTimestamp) / 1000,
                        0,
                    );
                } else if (finalLog.action == LogAction.NextPeriod) {
                    timerState.currentSecondsLeft = Math.max(
                        timerState.currentSecondsLeft -
                            (Date.now() + gap - finalLog.realTimestamp),
                        0,
                    );
                }
                // console.log("f")
                PerformBrowserEvent();
            }
        });
    });

    function PerformBrowserEvent() {
        // TODO if we're in Steady for the first time and configIndex = 0, start playing (after initialization)
        // TODO If we're in steady for the second time or more and configIndex = 0, check if repeatForever is enabled and start playing if so
        // TODO If we're in steady and configIndex > 0, start playing
        // TODO If we're in steady and configIndex = 0 and repeatForever is false, don't play automatically
        // console.log(timerState.currentSecondsLeft)
        switch (timerState.state) {
            case TimerState.Uninitialized:
                throw new Error("undefined behaviour");
            case TimerState.Initial:
                // do nothing
                break;
            case TimerState.Steady:
                // clear the interval before doing anything
                if (intervalId != -1) {
                    clearInterval(intervalId);
                    intervalId = -1;
                }
                // TODO bundle this together with the playing state below as the same function
                // man I was right to try to separate play() into two different sub functions
                if (
                    timerState.configIndex > 0 ||
                    (timerState.configIndex == 0 && timerState.repeatForever)
                ) {
                    if (intervalId != -1) {
                        clearInterval(intervalId);
                        intervalId = -1;
                    }
                    timerState.state = TimerState.Playing;
                    PerformBrowserEvent();
                }
                break;
            case TimerState.Playing:
                let timestamp = Date.now() + 1000 * timerState.currentSecondsLeft;
                intervalId = window.setInterval(() => {
                    timerState.currentSecondsLeft = (timestamp - Date.now()) / 1000;
                    if (timerState.currentSecondsLeft <= 0) {
                        if (audioElement != undefined) {
                            audioElement.play();
                        }
                        timerState.currentSecondsLeft = 0;
                        nextPeriod(); // reset the timer when it ends
                    }
                });
                break;
            case TimerState.Paused:
                if (intervalId != -1) {
                    clearInterval(intervalId);
                    intervalId = -1;
                }
                break;
        }
    }

    async function sendEvent(event: LogEvent) {
        // TODO protect against XSS attacks on our site. Or DDOSing the API.
        // timerState.log = [...timerState.log, {realTimestamp: Date.now(), state: event.type}]
        const response = await fetch(
            `/events?token=${data.token}&connectionToken=${data.connectionToken}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...event }),
            },
        );
        console.log(await response.text());
    }

    function nextPeriod() {
        timerState = PerformEvent(
            {
                action: LogAction.NextPeriod,
                realTimestamp: Date.now(),
                configIndex: (timerState.configIndex + 1) % timerState.config.length
            },
            timerState,
        );
        if (intervalId != -1) {
            clearInterval(intervalId);
            intervalId = -1;
        }
        sendEvent(timerState.log[0]);
        console.log("a");
        PerformBrowserEvent();
    }

    function pause() {
        timerState = PerformEvent(
            {
                action: LogAction.Pause,
                currenSecondsLeft: timerState.currentSecondsLeft,
                realTimestamp: Date.now(),
            },
            timerState,
        );
        sendEvent(timerState.log[0]);
        console.log("b");
        PerformBrowserEvent();
    }

    function play() {
        timerState = PerformEvent(
            {
                action: LogAction.Play,
                currenSecondsLeft: timerState.currentSecondsLeft,
                realTimestamp: Date.now(),
            },
            timerState,
        );
        sendEvent(timerState.log[0]);
        console.log("c");
        PerformBrowserEvent();
    }

    function toggleRepeat() {
        let toggledEvent = timerState.repeatForever
            ? LogAction.DontRepeat
            : LogAction.Repeat;
        timerState = PerformEvent(
            {
                action: toggledEvent,
                currenSecondsLeft: timerState.currentSecondsLeft,
                realTimestamp: Date.now(),
            },
            timerState,
        );
        sendEvent(timerState.log[0]);
    }

    function playButtonClick() {
        console.log("toggle");
        if (timerState.state == TimerState.Playing) {
            pause();
        } else {
            play();
        }
    }

    function resetTimer() {
        timerState = PerformEvent(
            {
                action: LogAction.Initialize,
                realTimestamp: Date.now() + gap,
                config: timerState.config,
            },
            timerState,
        );

        if (intervalId != -1) {
            clearInterval(intervalId);
            intervalId = -1;
        }
        sendEvent(timerState.log[0]);
        console.log("d");
        PerformBrowserEvent();
    }

    let shareModal = $state(false);

    // Modal Section

    setTimeout(() => {
        // hacky solution to bring up the modal if uninitialized by SSEs
        if (timerState.log.length == 0) {
            formModal = true;
        }
    }, 250);

    let formModal = $state(false);
    let tempConfig: {
        name: string;
        seconds: number | null;
        minutes: number | null;
        hours: number | null;
    }[] = $state([
        {
            name: "",
            seconds: null,
            minutes: null,
            hours: null,
        },
    ]);

    $effect(() => {
        tempConfig = timerState.config.map((row) => {
            const hours = Math.floor(row.duration / 3600);
            const minutes = Math.floor(row.duration / 60) % 60;
            const seconds = Math.floor(row.duration) % 60;
            // nulled items have placeholders visible, makes UI user-friendly.
            return {
                name: row.name,
                seconds: seconds == 0 ? null : seconds,
                minutes: minutes == 0 ? null : minutes,
                hours: hours == 0 ? null : hours,
            };
        });
    });

    function addRow(index: number) {
        tempConfig = [
            ...tempConfig.slice(0, index + 1),
            { name: "", seconds: null, minutes: null, hours: null },
            ...tempConfig.slice(index + 1),
        ];
    }

    function removeRow(index: number) {
        tempConfig = tempConfig.filter((item, idx) => {
            if (idx != index) {
                return item;
            }
        });
    }

    function setNewConfig() {
        const config: TimerConfig[] = tempConfig.map((row) => {
            return {
                name: row.name,
                duration:
                    Math.min(row.hours || 0, 24) * 60 * 60 +
                    Math.min(row.minutes || 0, 60) * 60 +
                    Math.min(row.seconds || 0, 60),
            };
        });
        timerState = PerformEvent(
            {
                action: LogAction.Initialize,
                realTimestamp: Date.now(),
                config: config,
            },
            timerState,
        );
        formModal = false;
        sendEvent(timerState.log[0]);
        console.log("e");
        PerformBrowserEvent();
    }
    // End Modal Section

    // convert current seconds left to a HH:MM:SS string
    function ToTimeExtendedString(seconds: number): [string, string] {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor(seconds / 60) % 60;
        const realSeconds = Math.floor(seconds) % 60;
        const milliseconds = Math.floor(
            Math.floor((seconds - Math.floor(seconds)) * 1000),
        );
        if (hours > 0) {
            return [
                `${hours}h ${minutes}m ${realSeconds}s`,
                "0".repeat(3 - milliseconds.toString().length) +
                    milliseconds.toString(),
            ];
        } else if (minutes > 0) {
            return [
                `${minutes}m ${realSeconds}s`,
                "0".repeat(3 - milliseconds.toString().length) +
                    milliseconds.toString(),
            ];
        } else {
            return [
                `${realSeconds}s`,
                "0".repeat(3 - milliseconds.toString().length) +
                    milliseconds.toString(),
            ];
        }
    }

    function HistoryDurationString(current: number, next: number): string {
        const [timeString, millis] = ToTimeExtendedString(
            (next - current) / 1000,
        );
        if (timeString == "0s" && millis == "000") {
            return "--";
        } else if (timeString == "0s" && millis != "000") {
            return `${millis}ms`;
        } else {
            return timeString;
        }
    }
</script>

{#if shareModal}{/if}

{#if formModal}
    <Modal>
        <p class="text-white font-bold text-3xl">Setup the Timer!</p>
        <hr class="border border-t-red-500/40 my-2" />
        <div class="grid grid-cols-6 overflow-y-scroll pb-4 pt-8">
            {#each tempConfig as _, index}
                <input
                    type="text"
                    class="px-2 py-1 text-white border-y border-white/10"
                    bind:value={tempConfig[index].name}
                    placeholder="Period Name"
                />
                <input
                    type="number"
                    class="px-2 py-1 text-white border-y border-white/10"
                    min={0}
                    max={60}
                    bind:value={tempConfig[index].hours}
                    placeholder="0h"
                />
                <input
                    type="number"
                    class="px-2 py-1 text-white border-y border-white/10"
                    min={0}
                    max={60}
                    bind:value={tempConfig[index].minutes}
                    placeholder="0m"
                />
                <input
                    type="number"
                    class="px-2 py-1 text-white border-y border-white/10"
                    min={0}
                    max={60}
                    bind:value={tempConfig[index].seconds}
                    placeholder="0s"
                />
                <button
                    class="text-white cursor-pointer py-1 px-2 border border-white/10 hover:bg-white/20"
                    onclick={() => addRow(index)}>+</button
                >
                {#if index > 0}
                    <button
                        class="text-white cursor-pointer py-1 px-2 border border-white/10 hover:bg-white/20"
                        onclick={() => removeRow(index)}>-</button
                    >
                {:else}
                    <span></span>
                {/if}
            {/each}
        </div>
        <div class="flex gap-2 mt-auto">
            <button
                class="flex gap-2 border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer"
                onclick={setNewConfig}><CheckIcon />Confirm</button
            >
            {#if timerState.log.length > 0}
                <button
                    class="flex gap-2 border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer"
                    onclick={() => (formModal = false)}
                    ><BanIcon />Cancel</button
                >
            {/if}
        </div>
    </Modal>
{/if}

<nav class="h-[10vh] flex bg-[#020202] items-center px-10 gap-3">
    <a href="/" class="text-4xl text-red-500 font-bold">Passata</a>
    <button
        class="ml-auto flex items-center gap-2 border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer text-xs sm:text-md"
        ><ShareIcon /> Share</button
    >
    <button
        class="flex items-center gap-2 border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer text-xs sm:text-md"
        onclick={() => {
            formModal = true;
        }}><AddIcon /> New Timer</button
    >
</nav>
<timer class="h-[40vh] flex flex-col py-10 items-center gap-2 select-none">
    <p class="font-bold text-gray-300 text-2xl m-0">
        {timerState.config[timerState.configIndex].name}
    </p>
    {#if timerState.state == TimerState.Paused}
        <p
            class="text-white font-bold text-6xl sm:text-8xl tabular-nums shadow-red-800 shadow-red"
        >
            PAUSED
        </p>
    {:else}
        <div class="time-grid items-baseline">
            <p
                class="text-white font-bold text-6xl sm:text-8xl tabular-nums shadow-red-800 shadow-red pl-12"
            >
                {ToTimeExtendedString(timerState.currentSecondsLeft)[0]}
            </p>
            <p class="text-gray-500 sm:text-xl mt-auto font-bold pb-1">
                {ToTimeExtendedString(timerState.currentSecondsLeft)[1]}
            </p>
        </div>
    {/if}

    <button
        class="w-24 flex gap-2 justify-center border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer"
        onclick={playButtonClick}
    >
        {#if timerState.state == TimerState.Paused || timerState.state == TimerState.Initial || timerState.state == TimerState.Steady}
            <PlayIcon /> START
        {:else}
            <PauseIcon /> PAUSE
        {/if}
    </button>
    <button
        class="w-24 flex gap-2 justify-center border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer"
        onclick={resetTimer}><ResetIcon />RESET</button
    >
    <button
        class="w-24 flex gap-1 justify-center text-white items-center border border-red-500 px-2 py-2 hover:bg-red-500 rounded transition ease-in-out"
        class:bg-red-800={timerState.repeatForever}
        class:border-red-800={timerState.repeatForever}
        onclick={toggleRepeat}
    >
        <RepeatIcon />
        <span class="select-none cursor-pointer">Repeat</span>
    </button>

    <audio src={chime} bind:this={audioElement}> </audio>
</timer>
<history class="flex flex-col items-center pt-4">
    <p class="capitalize text-3xl text-white font-bold select-none">History</p>
    <div class="history-grid w-full sm:w-2/7 pb-8 text-sm sm:text-base">
        <p class="text-red-500 text-center select-none">Date & Time</p>
        <p class="text-red-500 text-center select-none">Type</p>
        <p class="text-red-500 text-center select-none">Duration</p>
        <hr class="border border-t-red-500 col-span-3" />
        {#each timerState.log as log, index}
            <p class="text-white text-center mt-1">
                {new Date(log.realTimestamp).toLocaleString(
                    Intl.DateTimeFormat().resolvedOptions().locale,
                    {
                        timeZone:
                            Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                )}
            </p>
            <p class="text-white text-center">{log.action}</p>
            <p class="text-white text-center">
                {HistoryDurationString(
                    log.realTimestamp,
                    (timerState.log[index - 1] || log).realTimestamp,
                )}
            </p>
            <hr class="border border-t-red-500/40 col-span-3" />
        {/each}
    </div>
</history>

<div class="flex justify-center text-white sm:mt-auto mb-8">
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

    .time-grid {
        display: grid;
        grid-template-columns: auto 3rem;
        gap: 1rem;
    }

    .history-grid {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
    }
</style>
