import ldap, {Client} from 'ldapjs';
import LdapUser from "./LdapUser";

export default class LdapClient {
    private readonly url: string;
    private readonly cn: string;
    private readonly dn: string;
    private readonly password: string;
    private client: Client | undefined;

    constructor(url: string, cn: string, password: string, dn: string) {
        this.url = url;
        this.cn = cn;
        this.password = password;
        this.dn = dn;
    }

    /**
     * Connect to the LDAP server
     */
    public connect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.client = ldap.createClient({
                url: this.url
            });

            this.client.on('error', (err) => {
                reject(err);
            });

            this.client.on('connect', () => {
                this.client!.bind(this.cn, this.password, (err) => {
                    if(err) reject(err);
                    resolve();
                });
            });
        });
    }

    /**
     * Search for a user
     * @param username
     * @param customKey By default it searches for the username used to log in, change this to search by something else (eg. email, display name)
     */
    public searchUser(username: string, customKey: string = 'sAMAccountName'): Promise<LdapUser | undefined> {
        return new Promise<LdapUser | undefined>((resolve, reject) => {

            const opts = {
                filter: `(${customKey}=${username})`,
                scope: "sub" as "sub",
                attributes: [
                    "msDS-UserPasswordExpiryTimeComputed", "displayName", "name",
                    "sAMAccountName", "userPrincipalName", "lastLogonTime", "mail"
                ]
            };

            this.client!.search(this.dn, opts, (err, res) => {
                res.on('searchEntry', (entry) => {

                    resolve(new LdapUser({
                        displayName: entry.object.displayName.toString(),
                        name: entry.object.name.toString(),
                        username: entry.object.sAMAccountName.toString(),
                        userPrincipalName: entry.object.userPrincipalName.toString(),
                        mail: entry.object.mail.toString(),
                        lastLogonTime: entry.object.lastLogonTime?.toString(),
                        passwordExpiryTime: entry.object['msDS-UserPasswordExpiryTimeComputed'].toString()
                    }));
                });

                res.on('error', (err) => {
                    reject(err);
                });

                res.on('end', (result) => {
                    if(result == null) return;
                    if(result.status !== 0) reject(result.errorMessage);

                    resolve(undefined);
                });
            });
        });
    }

}