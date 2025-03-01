import type { RequestHandler } from '@sveltejs/kit';
import sqlite3 from "better-sqlite3";
import { writable, type Writable } from 'svelte/store';

const cache: Map<string, Writable<number>> = new Map();

function insertLog(token: string, log: any) {
    let db = new sqlite3("local.sqlite3");
    db.exec("CREATE TABLE IF NOT EXISTS log (token text primary key, log JSONB);")
    let oldLog: any[] = db.prepare("SELECT log FROM log WHERE token = ?").pluck().get(token) as any[]
    oldLog.push(log)
    db.prepare("UPDATE log SET log = ? WHERE token = ?").run(oldLog, token)
}

export const GET: RequestHandler = async({request}) => {
    //TODO setup a thread that keeps listening for events on a token
    //TODO return never-ending response stream
    //TODO cleanup stream in the case the connection terminates
    const response = new Response();
    response.headers.set("Content-Type", "text/event-stream");
    response.headers.set("Cache-Control", "no-cache");
    response.headers.set("Connection", "keep-alive");
    cache.get((new URLSearchParams(request.url)).get('token'))?.subscribe(() => {
        // whenever we get an event here, send something along the response channel
    })
    return response
}

export const POST: RequestHandler = async ({ request }) => {
    //TODO register event in logs for this token
    //TODO send a notification to every listener on this token
    let params = await request.json();
    insertLog(params.token, params.event)
    if (!cache.has(params.token)) {
        cache.set(params.token, writable(0))
    }
    const responseStream = new Response(JSON.stringify(params), {
        headers: {
            "Content-Type": "text/event-stream",
        },
    });

    return responseStream;
}
