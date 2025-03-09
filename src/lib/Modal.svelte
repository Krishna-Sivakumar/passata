<div class="modal flex flex-col p-4 border-red-500 border rounded-xl">
    <slot/>
</div>

<style lang="scss">
    .modal {
        background-color: rgba(15, 10, 10, 0.9);
        backdrop-filter: blur(6px);
        position: absolute;
        top: 10vh;
        left: 15vw;
        height: 75vh;
        width: 75vw;

        @media (min-width: 640px) {
            top: 25vh;
            left: 25vw;
            height: 50vh;
            width: 50vw;
        }
    }
</style>