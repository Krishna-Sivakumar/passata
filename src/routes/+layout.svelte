<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<main class="h-screen">
{@render children()}
</main>

<style>
    main {
        background-color: #050002;
        background-image: radial-gradient(#393939 10%, transparent 10%);
        background-size: 15px 15px;
        display: flex;
        flex-direction: column;
    }
</style>
