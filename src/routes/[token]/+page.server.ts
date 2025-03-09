import { uuid } from "$lib/uuid";
import type { PageServerLoad } from "./$types";
export const prerender = false;
export const load: PageServerLoad = ({url, params}) => {
    return {
        mode: url.searchParams.get("mode") || "normal",
        token: params.token,
        connectionToken: uuid()
    }
}
