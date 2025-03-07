import { randomId } from "$lib/utils";
import type { PageServerLoad } from "./$types";
export const prerender = false;
export const load: PageServerLoad = ({url, params}) => {
    return {
        mode: url.searchParams.get("mode") || "normal",
        token: params.token,
        connectionToken: randomId(1000)
    }
}
