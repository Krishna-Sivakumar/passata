<script lang="ts">
    import type { PageProps } from "./$types";
    let { data }: PageProps = $props();
    data.newId;
</script>

<div class="h-5/6 flex flex-col items-center justify-center sm:h-3/4">
    <h1 class="text-red-500 font-bold text-7xl md:text-9xl">Passata</h1>
    <p
        class="text-white font-bold text-lg text-center mt-8 mx-4 md:m-0 md:text-4xl"
    >
        Stop Burning Your Sauce, and Use This Instead.
    </p>
    <div
        class="flex flex-col w-1/2 justify-around gap-4 md:gap-0 mt-16 md:flex-row"
    >
        <a href="/{data.newId}" class="pomo-button">pomodoro timer</a>
        <a href="/{data.newId}" class="pomo-button">custom timer</a>
        <a href="/{data.newId}" class="pomo-button">kitchen timer</a>
    </div>
</div>

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
    .pomo-button {
        text-align: center;
        font-size: 1.5rem;
        font-weight: bold;
        color: var(--color-red-500);
        border: 1px solid var(--color-red-500);
        border-radius: 5px;
        padding: 0.25rem 1rem;
        text-transform: capitalize;
        transition: 250ms ease-in-out;
        &:hover {
            color: white;
            background-color: var(--color-red-500);
        }
    }
</style>
