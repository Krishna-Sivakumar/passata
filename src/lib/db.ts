import sqlite3 from "better-sqlite3";
import { LogEvent } from "./structs";

export function setupDB(): sqlite3.Database {
    let db = new sqlite3("../passata.sqlite3");
    db.pragma("journal_mode=WAL");
    db.exec("CREATE TABLE IF NOT EXISTS log (token TEXT, log JSONB, timestamp INTEGER DEFAULT CURRENT_TIMESTAMP, connection TEXT);")
    db.exec("CREATE INDEX IF NOT EXISTS token_index ON log(token);")
    db.exec("CREATE INDEX IF NOT EXISTS timestamp_index ON log(timestamp);")
    return db;
}

export function insertLog(token: string, log: LogEvent, connectionToken: string) {
    try {
        let db = setupDB();
        let record = db.prepare("SELECT log, connection FROM log ORDER BY timestamp DESC LIMIT 1").get() as {log: string, connection: string}
        if ( record && (JSON.parse(record.log) as LogEvent).state == log.state && connectionToken != record.connection) {
            // we don't process identical logs from multiple sources.
            return;
        }
        db.prepare("INSERT INTO log(log, token, timestamp, connection) VALUES(?,?,?,?)").run(JSON.stringify(log), token, Date.now(), connectionToken);
    } catch (e) {
        console.log(e)
    }
}