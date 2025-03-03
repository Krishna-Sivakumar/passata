import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({url, params}) => {
    return {
        mode: url.searchParams.get("mode") || "normal",
        token: params.token,
    }
}
