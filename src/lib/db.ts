import { LogEvent } from "./structs";
import sqlite3 from "sqlite3";

let dbInstance: sqlite3.Database;

export function database(): Promise<sqlite3.Database> {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        dbInstance = new sqlite3.Database("../passata.sqlite3");
        dbInstance.run("PRAGMA journal_mode=WAL;", (_: any, err: Error | null) => {
            if (err) {
                reject(err);
                return;
            }
            dbInstance.run(
                "CREATE TABLE IF NOT EXISTS log (token TEXT, log JSONB, timestamp INTEGER DEFAULT CURRENT_TIMESTAMP, connection TEXT);",
                (_: any, err: Error | null) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    dbInstance.run(
                        "CREATE INDEX IF NOT EXISTS token_index ON log(token);",
                        (_: any, err: Error | null) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            dbInstance.run(
                                "CREATE INDEX IF NOT EXISTS timestamp_index ON log(timestamp);",
                                (_: any, err: Error | null) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    resolve(dbInstance);
                                },
                            );
                        },
                    );
                },
            );
        });
    });
}

export async function fetchRow<T>(statement: sqlite3.Statement): Promise<T> {
    return new Promise((resolve, reject) => {
        statement.get((err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row as T);
        });
    });
}

export async function fetchRows<T>(
    statement: sqlite3.Statement,
    params: any[],
): Promise<T[]> {
    return new Promise((resolve, reject) => {
        statement.all(params, (err, rows) => {
            if (err) {
                reject(err);
            }
            resolve(rows as T[]);
        });
    });
}

export async function findLogs(
    token: string,
    last_timestamp: number,
): Promise<Array<{ log: string; timestamp: number }>> {
    const db = await database();
    if (last_timestamp == -1) {
        const statement = db.prepare(
            "SELECT log, timestamp FROM log WHERE token = ? AND timestamp > ? ORDER BY timestamp DESC",
        );
        return await fetchRows(statement, [token, last_timestamp]);
    }
    const statement = db.prepare(
        "SELECT log, timestamp FROM log WHERE token = ? AND timestamp > ? AND connection <> ? ORDER BY timestamp DESC",
    );
    return await fetchRows(statement, [token, last_timestamp]);
}

export async function insertLog(
    token: string,
    log: LogEvent,
    connectionToken: string,
) {
    try {
        const db = await database();
        const selectStatement = db.prepare(
            "SELECT log, connection FROM log ORDER BY timestamp DESC LIMIT 1",
        );
        let record = await fetchRow<{ log: string; connection: string }>(
            selectStatement,
        );
        if (
            record &&
            record.log &&
            (JSON.parse(record.log) as LogEvent).state == log.state &&
            connectionToken != record.connection
        ) {
            // we don't process identical logs from multiple sources.
            return;
        }
        const insertStatement = db.prepare(
            "INSERT INTO log(log, token, timestamp, connection) VALUES(?,?,?,?)",
        );
        insertStatement.run(
            JSON.stringify(log),
            token,
            Date.now(),
            connectionToken,
        );
    } catch (e) {
        console.log(e);
    }
}
