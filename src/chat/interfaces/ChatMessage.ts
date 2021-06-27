import ChatSender from "./ChatSender";

export default interface ChatMessage {
    space: string;
    sender: ChatSender;
    command: string;
    args: string[];
    reply: (message: string) => Promise<void>;
}