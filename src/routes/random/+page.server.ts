import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({}) => {
    let base64Key = Array(8)
        .fill(0)
        .map(() => {
            return Math.floor(Math.random() * 64).toString(36);
        })
        .join("");
    redirect(307, `/${base64Key}`)
}
