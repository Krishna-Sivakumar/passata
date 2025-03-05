<script lang="ts">
    import type { PageProps } from "./$types";
    let { data }: PageProps = $props();
    data.newId;
</script>

<div class="flex flex-col items-center justify-center sm:h-3/4" style="height: 100vh;">
    <h1 class="text-red-500 font-bold text-7xl md:text-9xl mt-auto">Passata</h1>
    <p
        class="text-white font-bold text-lg text-center mt-8 mx-4 md:m-0 md:text-4xl"
    >
        Stop Burning Your Sauce, and Use This Instead.
    </p>
    <div
        class="flex flex-col w-1/2 justify-around gap-4 md:gap-0 mt-16 md:flex-row"
    >
        <!-- TODO sections must be smaller on mobile. All of the properties rn must be namespaced under sm: -->
        <div class="flex flex-col sm:w-1/3 sm:px-4 sm:text-center sm:gap-2 sm:border-r border-trans">
            <a href="/random?mode=pomodoro" class="pomo-button">pomodoro timer</a>
            <p class="text-white hidden sm:block">Use the standard pomodoro timer. <br/> 25 minutes of work, 15 minutes of rest. 4 times over.</p>
        </div>
        <div class="flex flex-col sm:w-1/3 sm:px-4 sm:text-center sm:gap-2 sm:border-r border-trans">
            <a href="/random?mode=custom" class="pomo-button">custom timer</a>
            <p class="text-white hidden sm:block">Come up with a custom timer for your own needs.</p>
        </div>
        <div class="flex flex-col sm:w-1/3 sm:px-4 sm:text-center sm:gap-2 sm:border-trans">
            <a href="/random?mode=normal" class="pomo-button">kitchen timer</a>
            <p class="text-white hidden sm:block">A normal countdown timer with a set duration.</p>
        </div>
    </div>

    <div class="flex justify-center text-white mb-8 mt-auto">
        <p>
            2025, <a
                href="https://krishna-sivakumar.github.io"
                target="_blank"
                class="underline">Krishna Sivakumar</a
            >
        </p>
    </div>
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

    .border-trans {
        border-color: rgba(255, 255, 255, 0.3);
    }
</style>
