import LdapClient from "../Ldap/LdapClient";
import {PubSub} from "@google-cloud/pubsub";
import {getDb} from "../database";
import {DbUser} from "../database/DbUser";
import {DbLdapUser} from "../database/DbLdapUser";
import {chat_v1, google} from "googleapis";
import Chat = chat_v1.Chat;
import {GoogleAuth} from "google-auth-library/build/src/auth/googleauth";
import ChatMessage from "./interfaces/ChatMessage";

export default class ChatSub {
    private readonly projectId: string;
    private readonly subscriptionName: string;
    private auth?: GoogleAuth;
    private client?: Chat;

    private commandListeners: {
        [key: string]: Array<(message: ChatMessage) => void>
    } = {};

    constructor(projectId = 'your-project-id', subscriptionName = 'my-sub', autoConnect = true) {
        this.projectId = projectId;
        this.subscriptionName = subscriptionName;

        if (autoConnect) {
            this.connect();
        }
    }

    connect() {
        // Connect to google chat api
        this.auth = new google.auth.GoogleAuth({
            keyFilename: `${process.env.GOOGLE_APPLICATION_CREDENTIALS}`,
            scopes: ['https://www.googleapis.com/auth/chat.bot']
        });

        this.client = new Chat({
            auth: this.auth,
        });

        this.listen();
    }

    private listen() {
        // Instantiates a client
        const pubsub = new PubSub({projectId: this.projectId});

        // Get subscription
        const subscription = pubsub.subscription(this.subscriptionName);

        subscription.on('message', this.messageHandler.bind(this));

        console.log("Listening to chat messages");
    }

    private messageHandler(message: any) {
        message.ack();

        const messageObj = JSON.parse(message.data);

        if (messageObj.type !== "MESSAGE") {
            console.log("Got unknown message type", messageObj);
            return;
        }

        if (!messageObj.space.singleUserBotDm) {
            console.log(`Got message on a space that is not a DM: ${messageObj.space.name}`);
            return;
        }

        const parsedArgs = messageObj.message.text.split(" ");

        const finalMessage: ChatMessage = {
            space: messageObj.space.name,
            sender: messageObj.user,
            command: parsedArgs.shift(),
            args: [...parsedArgs], // Make array copy (in case of multiple listeners),
            reply: this.sendMessage.bind(this, messageObj.space.name),
        };

        this.getCommandListeners(finalMessage.command).forEach((cmdListener) => {
            cmdListener(finalMessage);
        });
    }

    private getCommandListeners(command: string) {
        return this.commandListeners[command] ? this.commandListeners[command] : [];
    }

    public addCommandListener(command: string, listener: (message: ChatMessage) => void) {
        // Initialize listener array for command if not initialized
        if (!this.commandListeners[command]) this.commandListeners[command] = [];

        this.commandListeners[command].push(listener);
    }

    public removeCommandListener(command: string, listener: (...args: any[]) => void) {
        if (!this.commandListeners[command]) return;

        this.commandListeners[command] = this.commandListeners[command].filter((c) => c !== listener);
    }

    async sendMessage(space: string, message: string) {
        if (!this.client) {
            throw new Error("Client not connected");
        }

        await this.client.dms.messages({
            parent: space,
            requestBody: {
                text: message
            }
        });
    }

    public getClient(): Chat | undefined {
        return this.client;
    }

}