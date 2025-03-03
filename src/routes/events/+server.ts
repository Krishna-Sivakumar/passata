import type { RequestHandler } from '@sveltejs/kit';
import sqlite3 from "better-sqlite3";
import { writable, type Writable } from 'svelte/store';
import {produce} from 'sveltekit-sse';
import type { LogEvent, TimestampedLogs } from '$lib/structs';

const eventObserver: Map<string, Writable<number>> = new Map();

function setupDB(): sqlite3.Database {
    let db = new sqlite3("../local.sqlite3");
    db.pragma("journal_mode=WAL");
    db.exec("CREATE TABLE IF NOT EXISTS log (token text, log JSONB, timestamp INTEGER DEFAULT CURRENT_TIMESTAMP);")
    db.exec("CREATE INDEX IF NOT EXISTS token_index ON log(token);")
    db.exec("CREATE INDEX IF NOT EXISTS timestamp_index ON log(timestamp);")
    return db;
}

function insertLog(token: string, log: LogEvent) {
    try {
        let db = setupDB();
        db.prepare("INSERT INTO log(log, token, timestamp) VALUES(?,?,?)").run(JSON.stringify(log), token, Date.now());
    } catch (e) {
        console.log(e)
    }
}

// used to measure the RTT for corrections
export const GET: RequestHandler = async () => {
    return new Response(`${Date.now()}`);
}

export const POST: RequestHandler = async ({ url }) => {
    let last_timestamp = -1;
    return produce(async function start({emit}) {
        const token = url.searchParams.get("token");
        if (token) {
            console.log("sent updates to", token)
            let store = eventObserver.get(token);
            if (!store) {
                eventObserver.set(token, writable(0));
                store = eventObserver.get(token);
            }

            // each SSE stream subscribes to the event observer to check if there have been writes to a particular token.
            store?.subscribe(() => {
                let db = setupDB();
                let logs = db.prepare("SELECT log, timestamp FROM log WHERE token = ? AND timestamp > ? ORDER BY timestamp DESC").all(token, last_timestamp) as {log: string, timestamp: number}[];
                if (logs.length > 0) {
                    last_timestamp = logs[0].timestamp;
                }
                let response: TimestampedLogs = {
                    logs: logs.map(item => JSON.parse(item.log) as LogEvent),
                    responseTimestamp: Date.now(),
                }
                emit('update', JSON.stringify(response));
            })
        }
    });
}

// we're using the PUT method since the POST method is reserved for Server-Sent-Event responses
export const PUT: RequestHandler = async ({ request, url }) => {
    let event: LogEvent = await request.json();
    event.realTimestamp = Date.now(); // every timestamp is pegged to the server's time
    let token = url.searchParams.get("token")
    if (token) {
        insertLog(token, event)
        let store = eventObserver.get(token);
        if (!store) {
            eventObserver.set(token, writable(0));
            store = eventObserver.get(token);
        }
        // notifying subscribers by bumping the store's value
        store?.update((oldValue) => {
            return oldValue + 1;
        })

        return new Response(JSON.stringify(event), {
            headers: {
                "Content-Type": "text/event-stream",
            },
        });
    } else {
        throw new Error("token invalid.")
    }
}
