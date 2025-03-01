import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({}) => {
    let base64Key = Array(8)
        .fill(0)
        .map(() => {
            return Math.floor(Math.random() * 64).toString(36);
        })
        .join("");
    // check if random string exists
    // and generate another one on collision
    return {
        newId: base64Key,
    };
};
