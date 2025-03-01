<script lang="ts">
    let { data }: PageProps = $props();

    import chime from "$lib/assets/chime.wav";
    import ResetIcon from "$lib/assets/ResetIcon.svelte";
    import PlayIcon from "$lib/assets/PlayIcon.svelte";
    import PauseIcon from "$lib/assets/PauseIcon.svelte";
    import type { PageProps } from "./$types";
    import { TimerState, type Timer } from "./structs";


    let timerState: Timer = $state({
        state: TimerState.Initial,
        duration: 5,
        currentSecondsLeft: 5,
        repeatForever: false,
        log: [],
    })

    if (data.mode == "normal") {
        timerState.duration = 120;
        timerState.currentSecondsLeft = 120;
    }

    let intervalId: number = $state(-1);
    let audioElement: HTMLAudioElement;

    async function sendEvent(event: {type: TimerState}) {
        timerState.log = [...timerState.log, {realTimestamp: Date.now(), state: event.type}]
        const response = await fetch("/events", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...event, token: data.newId }),
        });
        console.log(await response.json());
    }

    function startInterval() {
        if (timerState.state == TimerState.Playing) {
            timerState.state = TimerState.Paused
            sendEvent({ type: timerState.state})
            clearInterval(intervalId);
            intervalId = -1;
            return;
        } else {
            timerState.state = TimerState.Playing
        }

        // isPaused = !isPaused;
        if (intervalId != -1) {
            return;
        }
        // TODO send timer start event
        sendEvent({ type: timerState.state });
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
        console.log(intervalId);
    }

    function resetTimer() {
        timerState.currentSecondsLeft = timerState.duration;
        timerState.state = TimerState.Initial;
        sendEvent({ type: timerState.state });
        if (intervalId != -1) {
            clearInterval(intervalId);
            intervalId = -1;
        }
        // TODO send reset event
    }
</script>

<nav class="h-[10vh] flex bg-[#020202] items-center px-10">
    <a href="/" class="text-4xl text-red-500 font-bold">Passata</a>
</nav>
<timer class="h-[40vh] flex flex-col py-10 items-center gap-2">
    <p class="text-white font-bold text-8xl tabular-nums shadow-red-800 shadow-red">
        {#if timerState.state == TimerState.Paused}
            PAUSED
        {:else}
            {timerState.currentSecondsLeft.toFixed(1)}s
        {/if}
    </p>
    <button
        class="flex gap-2 border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer"
        onclick={startInterval}>
        {#if timerState.state == TimerState.Paused || timerState.state == TimerState.Initial}
        <PlayIcon class="text-white"/> START
        {:else}
        <PauseIcon class="text-white"/> PAUSE
        {/if}
    </button>
    <button
        class="flex gap-2 border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer"
        onclick={resetTimer}><ResetIcon class="text-white" />RESET</button
    >
    <div class="flex gap-1 text-white items-center border border-red-500 px-2 py-2 rounded">
        <input type="checkbox" bind:checked={timerState.repeatForever} id="repeat" />
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
        <p class="text-white text-center">{(new Date(log.realTimestamp)).toLocaleTimeString('en-US', {})}</p>
        <p class="text-white text-center ">{log.state}</p>
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

<style>
    .shadow-red {
        text-shadow: 0 0.35vw 0 var(--color-red-800)
    }
    .reset-button {
        background: linear-gradient(
            to right,
            #1f1f20 0%,
            #000000 100%
        ); /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */
    }
</style>
