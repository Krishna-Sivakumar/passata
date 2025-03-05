/** Generates a random alphanumeric ID of size `length` */
export function randomId(length: number): string {
    let result = "";
    for (let i = 0; i < length; i ++) {
        // choose a number from 0 to 9
        let numRand = 48 + Math.floor(Math.random() * 9);
        // character can be upper or lower case
        let alphaRand = Math.floor(Math.random() * 25) + (Math.random() < 0.5 ? 65 : 97);
        // a number is 10 out of the 60 characters in our set 
        let rand = (Math.random() < 10 / 60) ? numRand : alphaRand;
        result += String.fromCharCode(rand);
    }
    return result;
}