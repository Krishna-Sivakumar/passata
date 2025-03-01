import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({url}) => {
    return {
        mode: url.searchParams.get("mode") || "normal"
    }
}
