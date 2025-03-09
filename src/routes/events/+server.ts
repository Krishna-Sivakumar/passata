import type { RequestHandler } from "@sveltejs/kit";
import { Emitter, produce } from "sveltekit-sse";
import type { LogEvent, TimestampedLogs } from "$lib/structs";
import { insertLog, findLogs } from "$lib/db";

// used to measure the RTT for corrections
export const GET: RequestHandler = async () => {
    return new Response(`${Date.now()}`);
};

// maps from a room token to a set of connections.
const visitorSet: Map<
    string,
    Array<{
        connectionToken: string,
        lastTimestamp: number,
        emit: Emitter,
    }>
> = new Map()

async function update(token: string) {
    const connections = visitorSet.get(token);
    if (connections == undefined) {
        return;
    }

    let idsToRemove: number[] = [];
    for (let idx = 0; idx < connections.length; idx++) {
        let logs = await findLogs(token, connections[idx].lastTimestamp, connections[idx].connectionToken)
        if (logs.length > 0) {
            connections[idx].lastTimestamp = logs[0].timestamp;
        } else {
            continue;
        }

        let repsonse: TimestampedLogs = {
            logs: logs.map(item => JSON.parse(item.log)),
            responseTimestamp: Date.now()
        }

        const { error } = connections[idx].emit("update", JSON.stringify(repsonse))
        if (error) {
            idsToRemove.push(idx)
        }
        visitorSet.set(token, connections.filter((item, idx) => {
            if (idsToRemove.indexOf(idx) == -1) {
                return item;
            }
        }))
    }
}

export const POST: RequestHandler = async ({ url }) => {
    return produce(
        async function start({ emit }) {
            const token = url.searchParams.get("token");
            const connection = url.searchParams.get("connectionToken");
            if (token && connection) {
                // sending the initial logs
                const connections = visitorSet.get(token) || []

                const logs = await findLogs(token, -1, connection);
                const initialResponse: TimestampedLogs = {
                    logs: logs.map(item => JSON.parse(item.log)),
                    responseTimestamp: Date.now()
                };

                const latestTimestamp = logs.length > 0 ? logs[0].timestamp : -1;
                emit("update", JSON.stringify(initialResponse));

                // don't create duplicate connections
                if (connections.find(item => {
                    return item.connectionToken == connection
                }) != undefined) {
                    return;
                }

                // adding the connection to the room pool
                visitorSet.set(token, [...connections, {
                    connectionToken: connection,
                    lastTimestamp: latestTimestamp,
                    emit: emit,
                }]);

            }
        },
        {
            stop() {
                const token = url.searchParams.get("token");
                const connection = url.searchParams.get("connectionToken");
                if (token && connection) {
                    const connections = visitorSet.get(token)
                    if (connections) {
                        visitorSet.set(token, connections.filter((item) => {
                            if (item.connectionToken != connection) {
                                return item
                            }
                        }))
                    }
                }
            },
        },
    );
};

// we're using the PUT method since the POST method is reserved for Server-Sent-Event responses
export const PUT: RequestHandler = async ({ request, url }) => {
    let event: LogEvent = await request.json();
    event.realTimestamp = Date.now(); // every timestamp is pegged to the server's time
    let token = url.searchParams.get("token");
    let connection = url.searchParams.get("connectionToken");
    if (token && connection) {
        await insertLog(token, event, connection);

        // Update all other clients with this token.
        await update(token);

        return new Response(JSON.stringify(event), {
            headers: {
                "Content-Type": "text/event-stream",
            },
        });
    } else {
        throw new Error("token invalid.");
    }
};
