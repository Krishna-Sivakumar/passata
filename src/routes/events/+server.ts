export async function GET() {
    //TODO setup a thread that keeps listening for events on a token
    //TODO return never-ending response stream
    //TODO cleanup stream in the case the connection terminates
    const response = new Response();
    response.headers.set("Content-Type", "text/event-stream");
    response.headers.set("Cache-Control", "no-cache");
    response.headers.set("Connection", "keep-alive");
}

export async function POST({ request }) {
    //TODO register event in logs for this token
    //TODO send a notification to every listener on this token
    let params = await request.json();
    const responseStream = new Response(JSON.stringify(params), {
        headers: {
            "Content-Type": "text/event-stream",
        },
    });

    return responseStream;
}
