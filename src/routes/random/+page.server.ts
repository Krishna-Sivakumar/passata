import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { uuid } from "$lib/uuid";

export const load: PageServerLoad = ({url}) => {
    redirect(307, `/${uuid()}?` + url.searchParams)
}
