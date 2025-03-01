<script lang="ts">
    let { data }: PageProps = $props();

    import chime from "$lib/assets/chime.wav";
    import ResetIcon from "$lib/assets/ResetIcon.svelte";
    import PlayIcon from "$lib/assets/PlayIcon.svelte";
    import type { PageProps } from "../$types";

    let intervalId: number = $state(-1);
    let duration = 5;
    let audioElement: HTMLAudioElement;
    let currentSecondsLeft = $state(duration);
    let repeatForever = $state(false);

    async function sendEvent(event: any) {
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
        if (intervalId != -1) {
            return;
        }
        // TODO send timer start event
        sendEvent({ type: "StartTimer" });
        let timestamp = Date.now() + 1000 * duration;
        currentSecondsLeft = (timestamp - Date.now()) / 1000;
        intervalId = window.setInterval(() => {
            currentSecondsLeft = (timestamp - Date.now()) / 1000;
            if (currentSecondsLeft <= 0) {
                if (audioElement != undefined) {
                    audioElement.play();
                }
                currentSecondsLeft = 0;
                if (intervalId != -1) {
                    clearInterval(intervalId);
                    intervalId = -1;
                    // TODO send timer end event
                    sendEvent({ type: "StopTimer" });

                    if (repeatForever) {
                        startInterval();
                    }
                }
            }
        }, 10);
        console.log(intervalId);
    }

    function resetTimer() {
        currentSecondsLeft = duration;
        if (intervalId != -1) {
            clearInterval(intervalId);
            intervalId = -1;
        }
        // TODO send reset event
        sendEvent({ type: "ResetTimer" });
    }
</script>

<nav class="h-1/10 flex bg-[#020202] items-center px-10">
    <a href="/" class="text-4xl text-red-500 font-bold">Passata</a>
</nav>
<timer class="h-4/10 flex flex-col py-10 items-center gap-2">
    <p class="text-white font-bold text-8xl tabular-nums">
        {currentSecondsLeft.toFixed(1)}s
    </p>
    <button
        class="flex gap-2 border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer"
        onclick={startInterval}><PlayIcon class="text-white" /> START</button
    >
    <button
        class="flex gap-2 border border-red-500 text-white font-bold px-2 py-2 hover:bg-red-500 hover:text-black transition ease-in-out rounded cursor-pointer"
        onclick={resetTimer}><ResetIcon class="text-white" />RESET</button
    >
    <div class="flex gap-1 text-white">
        <input type="checkbox" bind:checked={repeatForever} id="repeat" />
        <label for="repeat">Repeat Forever</label>
    </div>

    <audio src={chime} bind:this={audioElement}> </audio>
</timer>
<history class="h-5/10 flex flex-col items-center">
    <p class="capitalize text-3xl text-white font-bold">Status</p>
</history>

<style>
    .reset-button {
        background: linear-gradient(
            to right,
            #1f1f20 0%,
            #000000 100%
        ); /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */
    }
</style>
