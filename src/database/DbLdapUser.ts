
export interface DbLdapUser {
    id?: number;
    user_id: number;
    username: string;
    user_principal_name: string;
    last_logon_time: Date;
    password_expiry_time: Date;
}