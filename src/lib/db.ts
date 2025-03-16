import { LogAction, LogEvent } from "./structs";
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

export async function fetchRow<T>(statement: sqlite3.Statement, params: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
        statement.get(params, (err, row) => {
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
    connectionToken: string,
): Promise<Array<{ log: string; timestamp: number }>> {
    const db = await database();
    const statement = db.prepare(
        "SELECT log, timestamp FROM log WHERE token = ? AND timestamp > ? AND connection <> ? ORDER BY timestamp DESC",
    );
    return await fetchRows(statement, [token, last_timestamp, connectionToken]);
}

export async function insertLog(
    token: string,
    log: LogEvent,
    connectionToken: string,
) {
    try {
        const db = await database();
        const selectStatement = db.prepare(
            "SELECT log, connection FROM log WHERE token = ? ORDER BY timestamp DESC LIMIT 1",
        );
        let record = await fetchRow<{ log: string; connection: string }>(
            selectStatement, [token]
        );

        if (record && record.log) {
            // we don't process NextPeriod events from multiple sources.
            // this is buggy, and it does not register consecutive NextPeriod actions with different config indices
            let lastLog = JSON.parse(record.log) as LogEvent
            if (lastLog.action == LogAction.NextPeriod && log.action == LogAction.NextPeriod) {
                if (lastLog.configIndex == log.configIndex) {
                    return;
                }
            }
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
