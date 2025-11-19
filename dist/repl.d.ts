export declare class LLMMeterREPL {
    private rl;
    private running;
    constructor();
    start(): void;
    private printWelcome;
    private handleInput;
    private parseCommand;
    private executeCommand;
    private showHelp;
    private completer;
}
