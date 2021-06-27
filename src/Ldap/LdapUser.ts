
interface LdapUserProps {
    displayName: string;
    name: string;
    username: string;
    userPrincipalName: string;
    mail?: string;
    lastLogonTime?: string;
    passwordExpiryTime: string;
}

export default class LdapUser {
    private readonly properties: LdapUserProps;

    constructor(properties: LdapUserProps) {
        this.properties = properties;
    }

    get displayName(): string {
        return this.properties.displayName;
    }

    get name(): string {
        return this.properties.name;
    }

    get username(): string {
        return this.properties.username;
    }

    get userPrincipalName(): string {
        return this.properties.userPrincipalName;
    }

    get lastLogonTime(): Date {
        if (this.properties.lastLogonTime === undefined) return new Date(0);
        return new Date(this.convertToUnix(parseInt(this.properties.lastLogonTime)) * 1000);
    }

    get passwordExpiryTime(): Date {
        return new Date(this.convertToUnix(parseInt(this.properties.passwordExpiryTime)) * 1000);
    }

    private convertToUnix(number: number) {
        return (number / 10000000 - 11644473600);
    }

    public toString() {
        return JSON.stringify({
            displayName: this.displayName,
            name: this.name,
            username: this.username,
            userPrincipalName: this.userPrincipalName,
            lastLogonTime: this.lastLogonTime,
            passwordExpiryTime: this.passwordExpiryTime
        });
    }

}