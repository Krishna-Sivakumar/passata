import { LogEvent } from "./structs";
import sqlite3 from "sqlite3";

export async function setupDB(): Promise<sqlite3.Database> {
    let db = new sqlite3.Database("../passata.sqlite3");
    db.run("PRAGMA journal_mode=WAL;")
    db.run("CREATE TABLE IF NOT EXISTS log (token TEXT, log JSONB, timestamp INTEGER DEFAULT CURRENT_TIMESTAMP, connection TEXT);")
    db.run("CREATE INDEX IF NOT EXISTS token_index ON log(token);")
    db.run("CREATE INDEX IF NOT EXISTS timestamp_index ON log(timestamp);")
    return db;
}

export async function fetchRow<T>(statement: sqlite3.Statement): Promise<T> {
    return new Promise((resolve, reject) => {
        statement.get((err, row) => {
            if (err) {
                reject(err)
            }
            resolve(row as T)
        })
    })
}

export async function fetchRows<T>(statement: sqlite3.Statement, params: any[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
        statement.all(params, (err, rows) => {
            if (err) {
                reject(err)
            }
            resolve(rows as T[])
        })
    })
}

export async function insertLog(token: string, log: LogEvent, connectionToken: string) {
    try {
        let db = await setupDB();
        let record = await fetchRow<{log: string, connection: string}>(db.prepare("SELECT log, connection FROM log ORDER BY timestamp DESC LIMIT 1"))
        if (record.log && (JSON.parse(record.log) as LogEvent).state == log.state && connectionToken != record.connection) {
            // we don't process identical logs from multiple sources.
            return;
        }
        db.prepare("INSERT INTO log(log, token, timestamp, connection) VALUES(?,?,?,?)").run(JSON.stringify(log), token, Date.now(), connectionToken);
    } catch (e) {
        console.log(e)
    }
}