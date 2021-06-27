import {Database, open} from "sqlite";
import * as sqlite3 from "sqlite3";
import {OPEN_CREATE, OPEN_READWRITE} from "sqlite3";

let db: Database<sqlite3.Database, sqlite3.Statement>;
export async function getDb() {

    if(!db) {
        db = await open({
            filename: './data/database.sqlite',
            driver: sqlite3.Database,
            mode: OPEN_READWRITE | OPEN_CREATE,
        });
    }

    return db;
}

export async function createTables(db: Database<sqlite3.Database, sqlite3.Statement>) {

    // Create table to store chat users
    await db.exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name VARCHAR(255), ' +
        'display_name VARCHAR(255), email VARCHAR(255), space VARCHAR(255), ' +
        'UNIQUE(name), UNIQUE(space))');

    // Create table to store ldap users
    await db.exec('CREATE TABLE IF NOT EXISTS users_ldap (id INTEGER PRIMARY KEY, user_id INTEGER, username VARCHAR(255), ' +
        'user_principal_name VARCHAR(255), last_logon_time DATETIME, password_expiry_time DATETIME, ' +
        'UNIQUE(user_id, password_expiry_time))');

    // Create table to store notification settings
    await db.exec('CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY, send_before INTEGER, UNIQUE(send_before))');

    // Create table to store notifications sent to users
    await db.exec('CREATE TABLE IF NOT EXISTS notifications_sent (id INTEGER PRIMARY KEY, ldap_user_id INTEGER, notification_id INTEGER, ' +
        'sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(ldap_user_id, notification_id))');

}
